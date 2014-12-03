module = {}; //allows us to reuse code client and server-side
var sentimentWdg;
var selKeyword = "";
var gMainWidgetsKeywordsInit = {};

var socket;
var TWEETS_IN_4WDG = 20;

socket = io.connect(window.location.hostname, {port: 2800});

socket.on("error", errorOccured);
socket.on("got-sentiments", populateSentiments);
socket.on("got-sentimentmap", populateMapTweet);

socket.on("got-maindashboard-influencers", populateMainDashboardInfluencers);
// socket.on("got-influencers", populateMainDashboardInfluencers);

socket.on("got-retweets",  populateReTweets);
socket.on("got-tweets-by-keyword", populateTweetsByKeyword);


socket.on("got-realtime-tweets",  function(data) {
	populateTweets(data, true);
});


socket.on("got-latest-tweets",  function(data){ populateTweets(data, false) });
socket.on("got-keywords",populateKeywords);
socket.on("got-total-tweets", populateTotalTweetCount);
socket.on("set-widgets-keywords", populateWidgetsKeywords);

$(document).ready(function()
{
	socket.emit("get-influencers", {keyword: ""});

	$(".chosen-select").chosen({allow_single_deselect:true});
    
    $('div[id*="widget_keyword"]').each(function(index) {
        $(this).css("width", "90%");
    });
    
	$(".datepicker").datepicker();

	$("#influencers-keyword").change(function()
	{
		showLoader(true);
		var keyword = $("#influencers-keyword").val();
		socket.emit("get-influencers", {keyword:keyword});
	});

	$(".chosen-select").change(function()
	{
		var wdg_id = parseInt($(this).attr("id").replace("widget-keyword-", ""));
		var keyword= $(this).val();

		if( !isNaN(wdg_id) ) {
			$("#content-widget-" + wdg_id).empty();
			socket.emit("save-widget-keyword", {keyword:keyword, widget_id:wdg_id});
		}
	});

	$("#sentiments-keywords").live("change", function(e) {
		e.preventDefault();
		var keywrd = $(this).val();

		socket.emit("get-sentiments", {keyword: keywrd});
	});

	$("#map-keywords").live("change", function(e) {
		e.preventDefault();
		var keywrd = $(this).val();

		showLoader(true);				
		$("#lazy-loader").show();

		socket.emit("get_sentimentmap", {keyword: keywrd});
	});

	//tweets in the keyword page
	$("ul#keyword-dashboard-list > li").live('click', function(e) {
		e.preventDefault();
		var keyw = $(this).data("key");
		selKeyword = keyw;

		showLoader(true);				
		$("#lazy-loader").show();

		socket.emit("get-tweets", {keyword:keyw});			
		
		reset();

		$("ul#keyword-dashboard-list li").removeClass("active");
		$(this).addClass("active");

		$("#tweet-scroll-widget").empty();
		$("#tweet-scroll-widget").removeClass().addClass("tweet-" + keyw.split(' ').join(''));
        
        $(this).parent().find("a.btn").removeClass('active');
        $(this).addClass('active');
	});

	$("#widget-keyword-1 , #widget-keyword-2 , #widget-keyword-3, #widget-keyword-4").live('change',function(e) {
		e.preventDefault();

		var id = $(this).attr("id").replace("widget-keyword-", "");
		var new_keyw = $(this).val();

		socket.emit("get-latest-tweets", {keyword: new_keyw});
		$("#content-widget-"+id).removeClass().addClass("keyw-" + new_keyw.split(' ').join(''));
	});

	if( typeof sentimentWidget!="undefined" )
	{ 
		sentimentWdg = new sentimentWidget('sentiments-widget', 'sentiments-keywords');
		socket.emit("get-sentiments", {keyword: "all"});		
	}
    
    $('.keyword-checkbox label').click(function () {    
        var obj = $(this).parent().find('input[type=checkbox]');
        if (obj.is(':checked'))
            obj.prop("checked", false);        
        else
            obj.prop("checked", true);
    });
    
    $('.sentiment-radio label').click(function () {    
        $(this).parent().find('input[type=radio][value='+ $(this).html().toLowerCase() + ']').prop('checked', true);
    });
    
	/*$(".tweet-scroll-block").mCustomScrollbar(
	{
		callbacks:
		{
			//updateOnContentResize: true,
			//onTotalScrollOffset: 200,
			onTotalScroll: 
				function()
				{
					var last_query_data_obj = $("input[name=keyword_client_data]").val();
					if( last_query_data_obj == 0 )
						return;

					var last_query_data = JSON.parse( last_query_data_obj );
					showLoader(true);
				
					$("#lazy-loader").show();
					socket.emit("search-tweets", last_query_data);
				}
		}
	});*/

	if( $('#search-content.scroll-block.tweet.new').length ) {
		$('#search-content.scroll-block.tweet.new').height(($(window).height() - $('#search-content.scroll-block.tweet.new').offset().top) * 0.83);
	}
    
    $(window).resize(function() {
        $(".chosen-select").chosen({allow_single_deselect:true}); 
        mobilization();
        
        if ($(document).width() > $('#loader-gif').outerWidth()) {
            $('#loader-gif').css({'left':($(document).width() - $('#loader-gif').outerWidth()) / 2, 'top':($(window).height() - $('#loader-gif').outerHeight()) / 2 + $(window).scrollTop()});
        }
        else
        {
            $('#loader-gif').css({'left':0, 'top':($(window).height() - $('#loader-gif').outerHeight()) / 2 + $(window).scrollTop()});
        }
        
        var flashWidth = $('.flashpic').width();
        var flashHeight = flashWidth * 500 / 570;
        //console.log(flashWidth + ' ' + flashHeight);
        $('embed#flexApp').css('width', flashWidth).css('height', flashHeight);
    });
    
    mobilization();
});

function errorOccured()
{
	showLoader(false);
	$.jGrowl("An error occured performing your query");
}

/**************************** Added by Henry Start************************************/
function mobilization() {
    var container_width = $('.container.header').width();
    var width = ($('.container.header h1').outerWidth() == null)?0:$('.container.header h1').outerWidth();
    width += ($('.header-title').outerWidth() == null)?0:$('.header-title').outerWidth();
    width += ($('.header-info').outerWidth() == null)?0:$('.header-info').outerWidth(); 
    
    $('.header-search').each(function() {
        width += $(this).outerWidth();
    });
    
    if ($('.container.header h1').css('float') != 'none') {
        
        if (container_width > (150 + width)) {
            $('ul.header-nav').each(function() {
                if (!$(this).hasClass('nav-pills')) {    
                    $(this).addClass('hide');        
                }
                else {
                    $('.header-wrapper').addClass('original');
                    $('.header').addClass('original');
                    $('.header-title').addClass('original');
                    $('.header-info').addClass('original');
                    $('.header-search').addClass('original');
                    $(this).removeClass('hide');
                }
            });
        }
        else {
            $('ul.header-nav').each(function() {
                if ($(this).hasClass('nav-pills')) {
                    $(this).removeClass('hide');
                    $('.header-wrapper').addClass('original');
                    $('.header').addClass('original');
                    $('.header-title').addClass('original');
                    $('.header-info').addClass('original');
                    $('.header-search').addClass('original');
                }
                else
                    $(this).addClass('hide');    
            });
        }
        
    }
    else {
        $('ul.header-nav').each(function() {
            if (!$(this).hasClass('nav-pills')) {    
                $(this).removeClass('hide');
                $(this).removeClass('original');
            }
            else
                $(this).addClass('hide');
        });
    }
}
/**************************** Added by Henry End************************************/

$(window).resize(function() {
    $('div[id*="widget_keyword"]').each(function(index) {
        $(this).css("width", "90%");
        var width = $(this).outerWidth(true);
        $(this).find('.chzn-drop').css('width', width - 2);
        $(this).find('.chzn-search input[type="text"]').css('width', width - 37);
    });
    
    $('div[id*="search_keyword_list"]').each(function(index) {
        $(this).css("width", "100%");
        var width = $(this).outerWidth(true);
        $(this).find('.chzn-drop').css('width', width - 2);
        $(this).find('.chzn-search input[type="text"]').css('width', width - 37);
    });    
});

function showLoader(show)
{	
    if ($(document).width() > $('#loader-gif').outerWidth()) {
        $('#loader-gif').css({'left':($(document).width() - $('#loader-gif').outerWidth()) / 2, 'top':($(window).height() - $('#loader-gif').outerHeight()) / 2 + $(window).scrollTop()});
    }
    else
    {
        $('#loader-gif').css({'left':0, 'top':($(window).height() - $('#loader-gif').outerHeight()) / 2 + $(window).scrollTop()});
    }
    
	if(show)
		$("#loader-gif").show();
	else
		$("#loader-gif").hide();
}

function populateKeywords(data)
{
	//showLoader(false);
	$("#lazy-loader").hide();

	var keywords = data.keywords;
    
	$(".keyword-span").text("Choose a keyword...");

	$("#total-keywords-span").html(keywords.length);

	$(".dropdown-menu.keywords").empty();
	$(".tags-keyword").empty();

	$(".chosen-select").each(function(){

		var curr_val = $(this).val();

		$(this).empty();
		$(this).prepend("<option></option>");

		for(var i=0; i<keywords.length; i++) {               
			$(this).append('<option value="'+keywords[i].key+'">'+keywords[i].key+'</option>');                                                                                   
		}

		$(this).val(curr_val);
	});

	for(var i=0; i<keywords.length; i++)
    {
		var item = renderKeywordBubble(keywords[i]);
		$(".tags-keyword").append(item);
    }
	$(window).resize();

	$(".chosen-select").trigger("liszt:updated");

	if( Object.keys(gMainWidgetsKeywordsInit).length > 0 ) {
		for( var i in gMainWidgetsKeywordsInit ) {
			$("#widget-keyword-" + i).val(gMainWidgetsKeywordsInit[i]);
			$("#widget-keyword-" + i).trigger("change");
		}

		$(".chosen-select").trigger("liszt:updated");
		gMainWidgetsKeywordsInit = {};
	}
}

function populateWidgetsKeywords(data)
{
	if( $("#widget-keyword-1 option").length == 0 ) {
		gMainWidgetsKeywordsInit = data.keywords;
	}
	else {
		for( var i in gMainWidgetsKeywordsInit ) {
			$("#widget-keyword-" + i).val(data.keywords[i]);
			$("#widget-keyword-" + i).trigger("change");
		}

		$(".chosen-select").trigger("liszt:updated");
	}
}

function populateTweetsByKeyword(data) 
{
	showLoader(false);
	$("#lazy-loader").hide();

	var tweets_arr = [];

	for( var i in data.tweets )
	{
		var tweet = data.tweets[i];
		var tweet_bubble = renderTweetBubble(tweet);

		var retweetCount = 0;
		if (tweet.retweet_count)
			retweetCount = tweet.retweet_count;			

		var custom_obj = {
            id:tweet.key,
            username:tweet.twitter_username,
            text:tweet.text,
            profile_image_url:tweet.user_profile_image_url,
            tweet_url:"http://twitter.com/"+tweet.twitter_username+"/status/" + tweet.key,
            user_url:"http://twitter.com/" + tweet.twitter_username,
            timestamp:tweet.created_at,
            sentiment: tweet.sentiment,
			retweet_count: retweetCount
        }

		tweets_arr.push(custom_obj);	

		$(tweet_bubble).hide().prependTo(".tweet-" + tweet.keyword.split(' ').join('')).fadeIn("slow", function(){
			$(window).resize();
		});

		$(window).resize();
	}

	if( tweets_arr.length > 0 )  	
		addTweetsToWidget(tweets_arr);

}

function populateReTweets(data)
{
	retweets_array = [];	

	for( var i in data.retweets )
	{
		
		var retweet = data.retweets[i];

		var custom_obj = {
            id:retweet.tweet_id,
            username:retweet.twitter_username,
            text:retweet.text,
            profile_image_url:retweet.user_profile_image_url,
            tweet_url:"http://twitter.com/"+retweet.twitter_username+"/status/" + retweet.key,
            user_url:"http://twitter.com/" + retweet.twitter_username,
            timestamp:retweet.created_at
            //sentiment: sentiments_arr[sentiments_idx],
			//retweet_count: retweetCount
        }

		retweets_array.push(custom_obj);	
	}

	displayRetweets(data.id);
}

function populateTweets(data, animate)
{
	var tweets_arr = [];

	//for( var i in data.tweets )	
	for (var i=data.tweets.length-1; i>=0 ; i-- )
	{	
		var tweet = data.tweets[i];
		var tweet_bubble = renderTweetBubble(tweet);

		var tw_keyword = tweet.keyword.split(' ').join('');

		if ( tweet.keyword == selKeyword)
		{
			var retweetCount = 0;
			if (tweet.retweet_count)
				retweetCount = tweet.retweet_count;			

			var custom_obj = {
				id:tweet.key,
				username:tweet.twitter_username,
				text:tweet.text,
				profile_image_url:tweet.user_profile_image_url,
				tweet_url:"http://twitter.com/"+tweet.twitter_username+"/status/" + tweet.key,
				user_url:"http://twitter.com/" + tweet.twitter_username,
				timestamp:tweet.created_at,
				sentiment: tweet.sentiment,
				retweet_count: tweet.retweet_count
			}

			tweets_arr.push(custom_obj);	

			if(animate) {
				$(tweet_bubble).hide().prependTo(".tweet-" + tw_keyword).fadeIn("slow", function(){
					$(window).resize();
				});
			}
			else {
				$(tweet_bubble).prependTo(".tweet-" + tw_keyword);
				$(window).resize();
			}
		}

		if(animate) {
			$(tweet_bubble).hide().prependTo(".keyw-" + tw_keyword).slideDown("slow", function(){
				$(window).resize();
			});
		}
		else {
			$(tweet_bubble).prependTo(".keyw-" + tw_keyword);
			$(window).resize();
		}

/*		while( $(".keyw-" + tw_keyword + " > li").length > TWEETS_IN_4WDG )
			$(".keyw-" + tw_keyword + " > li").eq( $(".keyw-" + tw_keyword + " > li").length-1 ).remove();*/
	
		$(window).resize();
		$(".easydate").easydate();
	}

	if( tweets_arr.length > 0 ) 	
		addTweetsToWidget(tweets_arr);
}

function populateSentiments(data)
{	
	var defaultData = [];
	var xAxisCategory = [];

	var Positive	 = {name: 'Positive'};
	var PositiveData = [];

	var Negative	 = {name: 'Negative'};
	var NegativeData = [];

	var Neutral		 = {name: 'Neutral'};
	var NeutralData	 = [];

	for( var i in data.sentiment_trends )
	{		
		var sentiment_trend = data.sentiment_trends[i];		

		if (sentiment_trend.positive_count)	
			PositiveData.push(sentiment_trend.positive_count);
	
		if (sentiment_trend.negative_count)		
			NegativeData.push(sentiment_trend.negative_count);

		if (sentiment_trend.neutral_count)		
			NeutralData.push(sentiment_trend.neutral_count);	

		xAxisCategory.push(new Date(sentiment_trend.timeval.substring(0,4),sentiment_trend.timeval.substring(4,6), sentiment_trend.timeval.substring(6,8), sentiment_trend.timeval.substring(10, 12),0,0,0));

	}

	Positive['data'] = PositiveData;
	Negative['data'] = NegativeData;
	Neutral['data']	 = NeutralData;

	defaultData.push(Neutral);
	defaultData.push(Negative);
	defaultData.push(Positive);

	sentimentWdg.addSentiments(data.keyword, defaultData);
	
	sentimentWdg.bindSelectBox();
	sentimentWdg.drawChart(defaultData, xAxisCategory);
}

// Populate influencers in the main dashboard widget
function populateMainDashboardInfluencers(data)
{
	showLoader(false);
	var infl_keyword = $("#influencers-keyword").val();

	$("#influencers-list").empty();
	var sentiments_arr = ['positive', 'negative', 'neutral'];

	var sum = 0;

	data.influencers = data.influencers.slice(0,4);

	for( var i in data.influencers )
	{
		var sentiments_idx = Math.floor( Math.random() * sentiments_arr.length);

		var influencer = data.influencers[i];
		var baloon_color = 'yellow';//['green', 'yellow', 'red'][Math.floor(Math.random()*3)];

		if (infl_keyword=="" || infl_keyword==null || infl_keyword==influencer.keyword)
		{
			var baloon = 
				'<li>'+
				'<a href="/influencers" target="_blank">'+
				'	<div class="infl-list-image">'+
				//'		<a href="#">'+
				'			<img src="'+influencer.user_profile_image_url+'" alt="" />'+
				//'		</a>'+
				'	</div>'+
				'	<div class="infl-list-info">'+
				'		<h2>'+ influencer.name +'</h2>'+
				'		<p>'+  influencer.location +'</p>'+
				'	</div>'+			
				'</a>'+
				'</li>';

			$("#influencers-list").prepend(baloon);
		}
	}

	$("#influencers-list li").click(function()
	{
		$("#influencers-list li").removeClass("active");
		$(this).addClass("active");
	});

/*	if( data.influencers.length == 0 )
		$("#influencer-maindashboard").empty();*/
}

function populateTotalTweetCount(data)
{
	var count = (data.count > 999) ? addNumberCommas(data.count) : data.count;
	//count = count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); // thousands comma seperator
	$('#total-tweets-span').html(count);
}

function populateMapTweet(data)
{
	passSentimentMap(data);
}

function renderKeywordBubble(keyword)
{
	return $('<li data-key="'+ keyword.key + '">'+
			'<div class="list-info">'+
			'	<h2>'+ keyword.key +'</h2>'+
			//'	<p>'+ user.location +'</p>'+
			'</div>'+
		'</li>');
}

function renderTweetBubble(tweet)
{
	tweet.created_at_formatted = formatTime(tweet.created_at);//new Date(tweet.created_at*1000);

	var baloon_color = 'yellow'; //['green', 'yellow', 'red'][Math.floor(Math.random()*3)];
	if( tweet.sentiment!=null )
		switch(tweet.sentiment) {
			case "positive": baloon_color = "green"; break;
			case "neutral":  baloon_color = "yellow"; break;
			case "negative": baloon_color = "red"; break;
		}

	var tweet_location = tweet.location!=undefined ? "<span>"+tweet.location+"</span>" : "";

	var baloon = 
		'<li class="tweet-'+ baloon_color +'" >'+
		'	<div class="tweet-image">'+
		'		<a href="#">'+
		'			<img src="'+tweet.user_profile_image_url+'" alt="" />'+
		'		</a>'+
		'	</div>'+
		'	<div class="tweet-info">'+
		'		<h2>'+ tweet.twitter_username +'</h2>'+
		tweet_location +
		'		<p>'+  tweet.text +'</p>'+
		'		<p class="easydate">'+ new Date(tweet.created_at*1000) +'</p>'+
		
		'	</div>'+
		'	<div class="tweet-icon">'+
		'		<a href="http://twitter.com/'+tweet.twitter_username+'/status/'+(tweet.key ? tweet.key : tweet.id)+'" target="_blank">'+
		'			<img src="img/icon_twitter.png" alt="" />'+
		'		</a>'+
		'		<a href="http://twitter.com/'+tweet.twitter_username+'" target="_blank">'+
		'			<img src="img/icon_user.png" alt="" />'+
		'		</a>'+
		'	</div>'+
		'</li>';
	return baloon;
}

// Helper for formatting the timestamp
var formatTime = function(unixTimestamp)
{
	var dt = new Date(unixTimestamp * 1000);

	var day 	= dt.getDate();
	var month   = dt.getMonth()+1;
	var year 	= dt.getFullYear();

	var hours = dt.getHours();
	var minutes = dt.getMinutes();
	var seconds = dt.getSeconds();

    if( day < 10 )
    	day = '0' + day;

    if( month < 10 )
    	month = '0' + month;

	if (hours < 10) 
		hours = '0' + hours;

	if (minutes < 10) 
		minutes = '0' + minutes;

	if (seconds < 10) 
		seconds = '0' + seconds;

	return day + "/" + month + "/" + year + ", " + hours + ":" + minutes + ":" + seconds;
}

// Helper for adding commas to long integers
function addNumberCommas(nStr)
{
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}


var getStackTrace = function() {
	var obj = {};
	Error.captureStackTrace(obj, getStackTrace);
	return obj.stack;
};
