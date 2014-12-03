function sendByKeyword(data, socket)
{
	var keyword = data.keyword;

	fastPool.connect(function(err, keyspace)
	{
		if(err){
			socket.emit("error");
			console.error("[ERR] Error searching influencers - %s", err);
			return;
		}
		else {

			/*for( var i in keywords )
			{
				var keyword = keywords[i].key;*/

				var cql = "", filter=[];

				if(keyword!="") {
					cql = "SELECT * FROM influencers WHERE keyword=%s";
					filter.push(keyword);
				}
				else
					cql = "SELECT * FROM influencers";

				fastPool.cql(cql, filter, function(err, results)
				{
					if(err) {
						socket.emit("error");
						console.error("[ERR] Error getting influencers - %s", err);
						return;
					}

					var influencers = [];
					results.forEach(function(row)
					{
						var influencer = {};
						row.forEach(function(name,value,ts,tttl) {
							influencer[name] = value;
						});

						if(influencer.name!="")
							influencers.push(influencer);
					});

					influencers.sort(function(a,b){ return b.score - a.score; });
					influencers = influencers.slice(0,4);
					socket.emit("got-maindashboard-influencers", {keyword: keyword, influencers:influencers });
				});

			//}
		}
	});	
}

function getTopInfluencers(limit, callback)
{
	var influencers = [];

	fastPool.connect(function(err, keyspace)
	{
		if(err){
			socket.emit("error");
			console.error("[ERR] Error connecting to Cassandra - %s", err);
			return;
		}
		else {
			fastPool.cql("SELECT * FROM influencers LIMIT %d", [limit], function(err, results)
			{
				if(err) {
					socket.emit("error");
					console.error("[ERR] Error getting influencers - %s", err);
					return;
				}

				results.forEach(function(row)
				{
					if(row.get("name").value != "")
						influencers.push({
										key: row.get("key").value,
										score: row.get("score").value,
										name: row.get("name").value,
										username: row.get("username").value,
										image: row.get("user_profile_image_url").value,
										location: row.get("location").value
									});
				});

				influencers.sort(function(a,b){ return b.score - a.score; });

				if(callback)
					callback(influencers);
			});
		}
	});
}

function getDetails(data, socket)
{
	fastPool.connect(function(err, keyspace)
	{
		if(err) {
			socket.emit("error");
			console.error("[ERR] Error connecting to Cassandra - %s", err);
			return;
		}
		else {
			//fastPool.cql("SELECT * FROM influencers WHERE key=%s", [data.infl_id], function(err, results)
			fastPool.cql("SELECT * FROM influencers", function(err, results)
			{
				if(err) {
					socket.emit("error");
					console.error("[ERR] Error getting influencers - %s", err);
					return;
				}

				var infl_details = {};
				for( var i in results )
				{
					if( results[i].get('key').value == data.infl_id )
					{
						results[i].forEach(function(key, value) {
							infl_details[key] = value;
						})

						break;
					}
					
				}

				// var details = results[0];
				// var infl_details = {};
				// details.forEach(function(name,value,ts,ttl) {
				// 	infl_details[name] = value;
				// });

				socket.emit("got-influencer-details", {details: infl_details});
			});

			fastPool.cql("SELECT * FROM followers WHERE twitter_username=%s LIMIT 100", [data.infl_username], function(err, results)
			{
				if(err) {
					socket.emit("error");
					console.error("[ERR] Error getting followers - %s", err);
					return;
				}

				var followers = [];
				results.forEach(function(f)
				{
					followers.push(
							{
								name: f.get("name").value, 
								location: f.get("location").value, 
								user_profile_image_url: f.get("user_profile_image_url").value
							});
				});

				socket.emit("got-influencer-followers", {followers: followers})
			});

			fastPool.cql("SELECT * FROM following WHERE twitter_username=%s LIMIT 100", [data.infl_username], function(err, results)
			{
				if(err) {
					socket.emit("error");
					console.error("[ERR] Error getting following - %s", err);
					return;
				}

				var following = [];
				results.forEach(function(f)
				{
					following.push(
							{
								name: f.get("name").value, 
								location: f.get("location").value, 
								user_profile_image_url: f.get("user_profile_image_url").value
							});
				});

				socket.emit("got-influencer-following", {following: following})
			});
		}
	})
}

function getTweets(data, socket)
{
	fastPool.connect(function(err, keyspace)
	{
		if(err) {
			socket.emit("error");
			console.error("[ERR] Error connecting to Cassandra - %s", err);
			return;
		}
		else {
			fastPool.cql("SELECT * FROM tweets WHERE twitter_username=%s", [data.infl_username], function(err, tweets)
			{
				if( err ) {
					socket.emit("error");
					console.error("[ERR] Error getting tweets - %s", err);
					return;
				}

				var tweets_arr = [];
				for( var i in tweets )
				{
					var tweet = {};
					tweets[i].forEach(function(name,value,ts,tttl) {
						tweet[name] = value;
					});

					tweets_arr.push(tweet);
				}
				
				socket.emit("got-influencer-tweets", {tweets:tweets_arr});
			});
		}
	});
}

function broadcastInfluencersUpdates(socket)
{
	fastPool.connect(function(err, keyspace)
	{
		if(err) {
			socket.emit("error");
			console.error("[ERR] Error connecting to Cassandra - %s", err);
			return;
		}

		updateInfluencers();
		function updateInfluencers()
		{
			fastPool.cql("SELECT * FROM influencers LIMIT 20", function(err, results)			
			{
				if(err) {
					socket.emit("error");
					console.error("[ERR] Error getting influencers - %s", err);
					return;
				}

				var influencers = [];
				results.forEach(function(infl)
				{
					if( infl.get("name").value!="" )
						influencers.push({
							key: infl.get("key").value,
							name :  infl.get("name").value,
							username: infl.get("username").value,
							score :  infl.get("score").value,
							keyword :  infl.get("keyword").value,
							location: infl.get("location").value,
							user_profile_image_url: infl.get("user_profile_image_url").value
						});
				});

				influencers.sort(function(a,b){ return b.score - a.score; });
				socket.emit("got-influencers", {influencers: influencers});
				setTimeout(updateInfluencers, 5000);
			});
		}
	});
}

exports.getDetails		  = getDetails;
exports.getTweets		  = getTweets;
exports.sendByKeyword 	  = sendByKeyword;
exports.getTopInfluencers = getTopInfluencers;
exports.broadcastInfluencersUpdates = broadcastInfluencersUpdates;