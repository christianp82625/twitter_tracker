var search_limit= 20;

function searchTweets(data, socket)
{
	var query		= data.query,
		keyword		= data.keyword,
		date_to		= parseInt( (data.date_to)/1000 ),
		date_from = parseInt( (data.date_from)/1000 ),
		sentiment = data.sentiment,
		with_retweets = data.with_retweets,
		offset 	  = data.offset;

	var solr_query_params = {},
		range_params = [];

	var isTwitterLinkRx = /http([s]{0,1}):\/\/twitter.com\/(.+)\/status\/([0-9]+)/

	if( isTwitterLinkRx.test(query) ) {
		solr_query_params.id = query.replace(isTwitterLinkRx, "$3");
	}
	else {
		if(keyword.indexOf(" ")>0)
			keyword = '"'+keyword+'"';

		solr_query_params.text = (query=="") ? "*" : query;
		solr_query_params.keyword = ( keyword != "" ) ? keyword : "*";
		solr_query_params.sentiment = (sentiment != undefined && ['positive', 'negative', 'neutral'].indexOf(sentiment)>-1) ? sentiment : "*";

		range_params.push({
						field: 'created_at',
						start: (date_from > 0) ? date_from : "*",
						end: (date_to > 0) ? (date_to +  + 24*60*60): "*"
					});

		range_params.push({
						field: 'retweet_count', 
						start: (with_retweets) ? 1 : "*", 
						end: '*'});
	}

	var query = null;
	if( range_params.length > 0 ) {
		query = solr.createQuery()
				   .q(solr_query_params)
				   .rangeFilter(range_params)
				   .sort({'created_at': 'desc'})
				   .start(offset)
				   .rows(search_limit);
	}
	else
		query = solr.createQuery()
				   .q(solr_query_params)
				   .sort({'created_at': 'desc'})				   
				   .start(offset)
				   .rows(search_limit);

	var queryStr = JSON.stringify(query);

	if( offset == 0 ) { // Save this search obj, and broadcast search results updates 
		if( activeSearches[queryStr] == undefined ) {
			activeSearches[queryStr] = {listeners: [socket], interval: null, last_result: null};
			
			activeSearches[queryStr].interval = setInterval( 
				function() {
					//console.log("search results interval [%s]", queryStr);
					performSearch(socket, query, data, offset, queryStr)
				}, 5000 );
		}
		else
			activeSearches[queryStr].listeners.push(socket);
	}
	else {
		performSearch(socket, query, data, offset);
	}
}

function performSearch(socket, queryObj, data, offset, queryStr)
{
	//console.log(queryObj);

	solr.search(queryObj,function(err,obj){
		if(err) {
			console.log("Err:");
			console.log(err);
		}
		else {
			// This search listening was canceled between solr.search start and got the results
			//if( activeSearches[queryStr]==undefined ) 
			//	return;

			var totalTweets = obj.response.numFound;
			var tweets = obj.response.docs;

			if( tweets.length == 0 )
			{
				var objResult = {tweets:[], total:0, clientdata:data};

				if( activeSearches[queryStr]!=undefined )
					activeSearches[queryStr].listeners.forEach(function(sock){
						sock.emit("got-search-results", objResult);
					})

				if( queryStr!=undefined )
					activeSearches[queryStr].last_result = {tweets: tweets, fullResult: objResult};

				return;
			}

			if( queryStr!=undefined && activeSearches[queryStr]!=undefined )
			{
				if( activeSearches[queryStr].last_result == null )
					activeSearches[queryStr].last_result = {tweets: tweets, fullResult: {}};
				else if( JSON.stringify(activeSearches[queryStr].last_result.tweets) == JSON.stringify(tweets) )
					return;
				else
					activeSearches[queryStr].last_result.tweets = tweets;
			}

			fastPool.connect(function(err, keyspace)
			{
				if(err)
				{
					socket.emit("error");
					console.error("[ERR] Error connecting to Cassandra - %s", err);
					return;
				}

				var tweets_arr = [];
				var tweets_count = 0;
				for( var i in tweets )
				{
					(function(iter)
					{
						var tweet = tweets[iter];
						fastPool.cql("select * from retweets where tweet_id=%d LIMIT 5", [tweet.id], function(err, retweets)
							{
								if(err) {
									socket.emit("error");
									console.error("[ERR] Error searching for retweets - %s", err);
									return;	
								}

								var retweets_arr = [];
								for(var i in retweets)
								{
									var retweet = {};
									retweet.key = retweets[i].get("key").value;
									retweet.twitter_username = retweets[i].get("name").value;
									retweet.user_profile_image_url = retweets[i].get("profile_image_url").value;
									retweet.text = retweets[i].get("text").value;

									if( retweets[i].get("created_at")!=undefined )
										retweet.created_at = retweets[i].get("created_at").value;

									retweets_arr.push(retweet);
								}

								tweets_arr.push({tweet: tweet, retweets: retweets_arr});
								
								tweets_arr.sort(function(a,b) {
									return a.tweet.created_at - b.tweet.created_at;
								});
								
								if( parseInt(tweets_count+1) == tweets.length )
								{
									var objResult = {tweets:tweets_arr, total:totalTweets, clientdata:data, search_limit:search_limit, last_result: ((offset+search_limit) >= totalTweets) };

									if( queryStr==undefined ) {
										data.offset += search_limit;
										objResult = {tweets:tweets_arr, total:totalTweets, clientdata:data, search_limit:search_limit, last_result: ((offset+search_limit) >= totalTweets) };

										if( activeSearches[queryStr]!=undefined )
											activeSearches[queryStr].listeners.forEach(function(sock){
												sock.emit("got-search-results", objResult);
											})
										else
											socket.emit("got-search-results", objResult);
									}
									else if( JSON.stringify(activeSearches[queryStr].last_result.fullResult)!=JSON.stringify(objResult) )
									{
										activeSearches[queryStr].last_result.fullResult = objResult;

										if( activeSearches[queryStr]!=undefined )
											activeSearches[queryStr].listeners.forEach(function(sock){
												sock.emit("got-search-results", objResult);
											})
									}
								}

								tweets_count++;
							});
					})(i);
				}
			});
		}
	});
}

exports.searchTweets = searchTweets;