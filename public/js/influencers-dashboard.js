socket.on("got-influencer-details", populateInfluencerDetails);
socket.on("got-influencer-followers", populateInfluencerFollowers);
socket.on("got-influencer-following", populateInfluencerFollowing);
socket.on("got-influencer-tweets", populateInfluencerTweets);

// Listen for global influencers updates
socket.on("got-influencers", updateInfluencersList);

var widgetsLoaded = 0,
	lastInfluencersUpdate = "";

$(document).ready(function()
{
	$("ul#influencers-dashboard-list > li").live('click', function()
	{
		showLoader(true);
		var infl_id   = $(this).data("infl-id");
		var infl_username = $(this).data("infl-username");

		reset();

		$(".follows-list").empty();

		$("ul#influencers-dashboard-list li").removeClass("active");
		$(this).addClass("active");
		socket.emit("get-influencer-details", {infl_id:infl_id, infl_username:infl_username});
	});

	$("#keyword-sel").change(function() {
		var keyword = $("#keyword-sel").val();
		populateInfluencersList(lastInfluencersUpdate, keyword);
	});

	showLoader(true);
});

$(window).load(function()
{
	showLoader(false);
});

function updateInfluencersList(data)
{
	if( JSON.stringify(lastInfluencersUpdate) == JSON.stringify(data.influencers) )
		return;

	lastInfluencersUpdate = data.influencers;
	populateInfluencersList(data.influencers);
	$("#top-infl-count").html(data.influencers.length);
	console.log("Influencers changed %d", data.influencers.length);
	// console.log(data);
}

function populateInfluencersList(influencers, keyword)
{
	new EJS({url: '/widgets/influencers-list.ejs'}).update('influencers-dashboard-list', {influencers:influencers, keyword:keyword});
}

function populateInfluencerDetails(data)
{
	widgetsLoaded++;
	if( widgetsLoaded >= 3 ) {
		showLoader(false);
		widgetsLoaded = 0;
	}

	var details = data.details;

	$("#details_name").html(details.name);
	$("#details_location").html(details.location);
	$("#details_followers").html(details.follower_count);	
	$("#details_following").html(details.following_count); // <--- need to count followers 
	$("#details_total_tweets").html(details.tweet_count);
	$("#details_retweets").html(details.retweet_count);
	$("#details_positive").html(details.positive_count);
	$("#details_negative").html(details.negative_count);
	$("#details_neutral").html(details.neutral_count);

	console.log(details);
}

function populateInfluencerFollowers(data)
{
	widgetsLoaded++;
	if( widgetsLoaded >= 3 ) {
		showLoader(false);
		widgetsLoaded = 0;
	}

	$("#content_2 .list").empty();

	for( var i in data.followers ) {
		var item = renderUserBubble(data.followers[i]);
		$("#content_2 .list").append(item);
	}

	$(window).resize();
}

function populateInfluencerFollowing(data)
{
	widgetsLoaded++;
	if( widgetsLoaded >= 3 ) {
		showLoader(false);
		widgetsLoaded = 0;
	}

	$("#content_3 .list").empty();

	for( var i in data.following ) {
		var item = renderUserBubble(data.following[i]);
		$("#content_3 .list").append(item);
	}

	$(window).resize();
}

function populateInfluencerTweets(data)
{
	var sentiments_arr = ['positive', 'negative', 'neutral'];
	var tweets_arr = [];

	for( var i in data.tweets )
	{
		var sentiments_idx = Math.floor( Math.random() * sentiments_arr.length);

		var tweet = data.tweets[i];
		var tweet_bubble = renderTweetBubble(tweet);

		var retweetCount = 0;
		if (tweet.retweet_count)
			retweetCount = tweet.retweet_count;		

		var tweet_obj = {
            id:tweet.key,
            username:tweet.twitter_username,
            text:tweet.text,
            profile_image_url:tweet.user_profile_image_url,
            tweet_url:"http://twitter.com/"+tweet.twitter_username+"/status/" + tweet.key,
            user_url:"http://twitter.com/" + tweet.twitter_username,
            timestamp:tweet.created_at,
            sentiment: sentiments_arr[sentiments_idx],
			retweet_count: retweetCount
        }

		tweets_arr.push(tweet_obj);
	}

	if( tweets_arr.length > 0 )
		addTweetsToWidget(tweets_arr);
}

function renderUserBubble(user)
{
	return $('<li>'+
			'<div class="list-image"><img src="'+ user.user_profile_image_url +'" alt="" /></div>'+
			'<div class="list-info">'+
			'	<h2>'+ user.name +'</h2>'+
			'	<p>'+ user.location +'</p>'+
			'</div>'+
		'</li>');
}