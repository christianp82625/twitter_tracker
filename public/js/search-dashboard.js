socket.on("got-search-results", populateSearchResults);

var search_lazy_loader = $('<div id="search-lazy-loading">....loading....</div>');
$(document).ready(function()
{	
	$("#search-content").mCustomScrollbar(
	{
		callbacks:
		{
			//updateOnContentResize: true,
			//onTotalScrollOffset: 200,
			onTotalScroll: 
				function()
				{
					var last_query_data_obj = $("input[name=search_client_data]").val();
					if( last_query_data_obj == 0 )
						return;

					var last_query_data = JSON.parse( last_query_data_obj );
					showLoader(true);
				
					$("#lazy-loader").show();
					socket.emit("search-tweets", last_query_data);
				}
		}
	});
/*

$("#search-content").scroll(function() { 
    if( parseInt($(this).scrollTop()+800) > $("#search-content .search").height() )
    {
		var last_query_data = JSON.parse( $("input[name=search_client_data]").val() );
		showLoader(true);
		$("#lazy-loader").show();
		socket.emit("search-tweets", last_query_data);
    }
});
*/
	

	$(".searhbox-input").live("keyup", function(e) {
		if(e.keyCode==13) {
			e.preventDefault();
			$("#do-search-button").click();

			return false;
		}
	});

	$("#do-search-button").click(function(e) {
		e.preventDefault();
		
		$(".search-results-list").empty();
		var query 	  = $(".searhbox-input").val();
		var keyword   = $("#search-keyword-list").val(); //$(".keyword-span").text();
		var date_to   = (new Date($("#search-date-to").val())).getTime();
		var date_from = (new Date($("#search-date-from").val())).getTime();
		var sentiment = $('input[name=search-sentiment]:checked').val();
		var with_retweets = $('input[name=search-has-retweets]').is(":checked");

		if( date_from > date_to ) {
			alert("Date from must be less then Date to!");
			return;
		}

		var queryObj = {
						query:query, 
						keyword:keyword, 
						date_to:date_to, 
						date_from:date_from,
						sentiment: sentiment,
						with_retweets: with_retweets,
						offset: 0
					}

		var formIsEmpty = true;
		for( var i in queryObj )
		{
			
			switch( typeof queryObj[i] )
			{
				case "string": 
					if(queryObj[i].length)
						formIsEmpty = false;
					break;

				case "boolean":
					if(queryObj[i])
						formIsEmpty = false;
					break;

				case "number":
					if( !isNaN(queryObj[i]) && queryObj[i]>0 )
						formIsEmpty = false;
					break;
			}
		}

		if( formIsEmpty ) {
			$("#search-status-message").html("Please select something to search with");
			return;
		}


		var msg = buildSearchFriendlyString(queryObj);
		$("#search-status-message").html(msg);
		showLoader(true);
		socket.emit("search-tweets", queryObj);

		DisableSearchBtn();
	});

	showLoader(true);
});

$(window).load(function()
{
	showLoader(false);
});

function DisableSearchBtn()
{
	$("#do-search-button").html("Searching...");
	$('#do-search-button').attr('disabled', 'disabled');
}

function EnableSearchBtn()
{
	$("#do-search-button").html("Search");
	$('#do-search-button').removeAttr('disabled');
}

function populateSearchResults(data)
{
	//$("#search-status-message").empty();
	EnableSearchBtn();

	showLoader(false);
	$("#lazy-loader").hide();

	var tweets = data.tweets;
	var total  = data.total;
	var client_data = data.clientdata;
	var total_retweets = 0;
	
	client_data.offset += data.search_limit;

	var str_client_data = JSON.stringify(client_data);
	if( data.last_result )
		$("input[name=search_client_data]").val(0);
	else
		$("input[name=search_client_data]").val(str_client_data);

	if( total>999 )
		total = addNumberCommas(total);

	for( var i in tweets )
		total_retweets += tweets[i].retweets.length;

 	$("#results-keyword-span").html(client_data.keyword);
	$("#retweets-found-span").html(total_retweets);
	$("#tweets-found-span").html(total);

	// if( client_data.offset == 0 )
	// 	$(".search-results-list").empty();

	var searchResultsOutput = "";

	if( (client_data.offset - data.search_limit) == 0 ) {

		for( var i in tweets )
		{
			tweet_bubble = addTweetToResultList(tweets, i);
//			$(tweet_bubble).hide().prependTo(".search-results-list").slideDown();
			$(tweet_bubble).hide().prependTo(".search").slideDown();

			$(window).resize();
		}		
	} else {

		for( var i = tweets.length-1; i>0; i-- ) {
			tweet_bubble = addTweetToResultList(tweets, i);		

			$(".search").append(tweet_bubble);
			$(window).resize();			
		}
		
		var diff = ($('#search-content ul li').length - tweets.length) * 750/23;
		$("#search-content").mCustomScrollbar("scrollTo", diff);
	}

	/*for( var i in tweets )
	{
		tweet_bubble = addTweetToResultList(tweets, i, tweet);

		if( (client_data.offset - data.search_limit) == 0 ) {
			$(tweet_bubble).hide().prependTo(".search-results-list").slideDown();
			//$(".search-results-list").prepend(searchResultsOutput);
		}
		else {
			$(".search-results-list").append(tweet_bubble);
		}

		$(window).resize();

		//searchResultsOutput += tweet_bubble;
	}*/

/*	if( parseInt(data.clientdata.offset) == 0 ) {
		console.log("Prepending search updates to results list");
		$(searchResultsOutput).hide().prependTo(".search-results-list").slideDown();
		//$(".search-results-list").prepend(searchResultsOutput);
	}
	else {
		console.log("Appending search updates to results list");
		$(".search-results-list").append(searchResultsOutput);
	}

	$(window).resize();*/
}

function addTweetToResultList(tweets, i)
{
	var tweet = tweets[i].tweet;
	tweet.key = tweet.id;
	
	var bubble_color = 'yellow';//['green', 'yellow', 'red'][Math.floor(Math.random()*3)];
	if( tweet.sentiment!=null )
		switch(tweet.sentiment) {
			case "positive": bubble_color = "green"; break;
			case "neutral":  bubble_color = "yellow"; break;
			case "negative": bubble_color = "red"; break;
		}		

	var tweet_bubble = renderTweetBubble(tweet);

	if( tweets[i].retweets.length > 0 )
		tweet_bubble += '<div class="greyboxes">';

	for( var j in tweets[i].retweets )
	{
		var retweet_created_at = tweets[i].retweets[j].created_at ? '<p class="easydate">'+ new Date(tweet.created_at*1000) +'</p>' : "";
		var retweet_location = tweets[i].retweets[j].location!=undefined ? "<span>"+tweets[i].retweets[j].location+"</span>" : "";
		tweet_bubble += 
			'	<div class="grey-bg">'+
			'		<div class="tweet-image">'+
			'			<a href="#"><img src="'+ tweets[i].retweets[j].user_profile_image_url +'" alt="" /></a>'+
			'		</div>'+
			'		<div class="tweet-info">'+
			'			<h2>'+ tweets[i].retweets[j].twitter_username +'</h2>' +
				retweet_location +
			'			<p>'+ tweets[i].retweets[j].text +'</p>' +
				retweet_created_at +
			'			<div class="tweet-icon">'+
			'				<a href="http://twitter.com/'+tweets[i].retweets[j].twitter_username+'/status/'+tweets[i].retweets[j].key+'">'+
			'					<img src="img/icon_twitter.png" alt="" />'+
			'				</a>'+
			'				<a href="http://twitter.com/'+tweets[i].retweets[j].twitter_username+'">'+
			'					<img src="img/icon_user.png" alt="" />'+
			'				</a>'+
			'			</div>'+
			'		</div>'+
			'	</div>';
	}

	if( tweets[i].retweets.length > 0 )
		tweet_bubble += '</div>';

	return tweet_bubble;
}

function buildSearchFriendlyString(queryObj)
{
	// Searching for football in keyword europe with negative sentiment 
	// between 10th July 2012 and 5th August 2012
	var search_string = "Search for ";

	search_string += ( queryObj.query.length ) ? queryObj.query : "tweets";

	if( queryObj.keyword.length )
		search_string += " with keyword " + queryObj.keyword;

	if( queryObj.sentiment!=undefined && queryObj.sentiment.length && queryObj.sentiment != "all")
		search_string += " with " + queryObj.sentiment + " sentiment";

	// date
	if( !isNaN(queryObj.date_to) && !isNaN(queryObj.date_from) )
		search_string += " between " + (new Date(queryObj.date_from)).format("longDate") + " and " + (new Date(queryObj.date_to)).format("longDate");
	else if( !isNaN(queryObj.date_from) )
		search_string += " from " + (new Date(queryObj.date_from)).format("longDate");
	else if( !isNaN(queryObj.date_to) )
		search_string += " to " + (new Date(queryObj.date_to)).format("longDate");

	return search_string;
}