module = {}; //allows us to reuse code client and server-side
var sentimentWdg;
var selKeyword = "";
var gMainWidgetsKeywordsInit = {};

var socket;

socket = io.connect(window.location.hostname, {port: 2800});

socket.on("got-sentiments", populateSentiments);
socket.on("got-maindashboard-influencers", populateMainDashboardInfluencers);
socket.on("got-sentimentmap", populateMapTweet);

socket.on("got-retweets",  populateReTweets);
socket.on("got-tweets-by-keyword", populateTweetsByKeyword);
socket.on("got-realtime-tweets",  populateTweets);
socket.on("got-latest-tweets",  populateTweets);
socket.on("got-keywords",populateKeywords);
socket.on("got-total-tweets", populateTotalTweetCount);
socket.on("set-widgets-keywords", populateWidgetsKeywords);

var jsPane = null;
$(document).ready(function()
{
	jsPane = $('#pane1').jScrollPane().data("jsp");

	$(".chosen-select").chosen({allow_single_deselect:true});
    
    $('div[id*="widget_keyword"]').each(function(index) {
        $(this).css("width", "90%");
    });
    
	$(".datepicker").datepicker();

	$(".chosen-select").change(function()
	{
		var wdg_id = parseInt($(this).attr("id").replace("widget-keyword-", ""));
		var keyword= $(this).val();

		if( !isNaN(wdg_id) )
			socket.emit("save-widget-keyword", {keyword:keyword, widget_id:wdg_id});
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
	$(".tags-keyword > a").live('click',function(e) {
		e.preventDefault();
		var keyw = $(this).text();
		selKeyword = keyw;

		/*var queryObj = {
							keyword:keyw, 
							offset: 0
						 }
		*/

		showLoader(true);				
		$("#lazy-loader").show();

		socket.emit("get-tweets", {keyword:keyw});			
		
		$("#tweet-scroll-widget").removeClass().addClass("tweet-" + keyw);
        
        $(this).parent().find("a.btn").removeClass('active');
        $(this).addClass('active');
	});


	$("#widget-keyword-1 , #widget-keyword-2 , #widget-keyword-3, #widget-keyword-4").live('change',function(e) {
		e.preventDefault();

		var id = $(this).attr("id").replace("widget-keyword-", "");
		var new_keyw = $(this).val();

		$("#content-widget-"+id).removeClass().addClass("keyw-" + new_keyw.replace(" ", ""));
		socket.emit("get-latest-tweets", {keyword: new_keyw});
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
    });
    
    mobilization();
});

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
                    $(this).removeClass('hide');
                    $(this).addClass('original');
                }
                else
                    $(this).addClass('hide');
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
    var active_keyword = $(".tags-keyword a.btn.active").html();

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
        if (keywords[i].key == active_keyword)
            $(".tags-keyword").append('<a class="btn active" href="#">'+keywords[i].key+'</a>');
        else
            $(".tags-keyword").append('<a class="btn" href="#">'+keywords[i].key+'</a>');
    }

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

		var custom_obj = {
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

		tweets_arr.push(custom_obj);	

		$(tweet_bubble).hide().prependTo(".tweet-" + tweet.keyword).fadeIn("slow", function(){
			$(window).resize();
		});

		$(window).resize();
	}

	if( tweets_arr.length > 0 ) 	
		addTweetsToWidget(tweets_arr);
}

function populateReTweets(data)
{
	retweets_array = data.retweets;
	displayRetweets(data.id);
}

function populateTweets(data)
{
	var sentiments_arr = ['positive', 'negative', 'neutral'];
	var tweets_arr = [];

	for( var i in data.tweets )
	{
		var sentiments_idx = Math.floor( Math.random() * sentiments_arr.length);

		var tweet = data.tweets[i];
		var tweet_bubble = renderTweetBubble(tweet);

		if ( tweet.keyword == selKeyword)
		{
			var retweetCount = 0;
			if (tweet.retweet_count)
				retweetCount = tweet.retweet_count;			

			var custom_obj = {
				id:tweet.key + "",
				username:tweet.twitter_username,
				text:tweet.text,
				profile_image_url:tweet.user_profile_image_url,
				tweet_url:"http://twitter.com/"+tweet.twitter_username+"/status/" + tweet.key,
				user_url:"http://twitter.com/" + tweet.twitter_username,
				timestamp:tweet.created_at,
				sentiment: sentiments_arr[sentiments_idx],
				retweet_count: tweet.retweet_count
			}

			tweets_arr.push(custom_obj);	

			$(tweet_bubble).hide().prependTo(".tweet-" + tweet.keyword).fadeIn("slow", function(){
				$(window).resize();
			});
		}

		$(tweet_bubble).hide().prependTo(".keyw-" + tweet.keyword.replace(" ", "")).slideDown("slow", function(){
			$(window).resize();
		});

		$(window).resize();
		$(".easydate").easydate();
	}

	if( tweets_arr.length > 0 ) 	
		addTweetsToWidget(tweets_arr);
}

function populateSentiments(data)
{	
/*	var defaultData = [{
		name: 'Positive',
		data: [7.0, 6.9, 9.5, 14.5, 18.2, 21.5, 25.2, 26.5, 23.3, 18.3, 13.9, 9.6]
	}, {
		name: 'Negative',
		data: [-0.2, 0.8, 5.7, 11.3, 17.0, 22.0, 24.8, 24.1, 20.1, 14.1, 8.6, 2.5]
	}, {
		name: 'Neutral',
		data: [-0.9, 0.6, 3.5, 8.4, 13.5, 17.0, 18.6, 17.9, 14.3, 9.0, 3.9, 1.0]
	}];*/
	
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
	//console.log("Got influencers");
	$("#influencers-list").empty();

	var sentiments_arr = ['positive', 'negative', 'neutral'];

	for( var i in data.influencers )
	{
		var sentiments_idx = Math.floor( Math.random() * sentiments_arr.length);

		var influencer = data.influencers[i];
		var baloon_color = 'yellow';//['green', 'yellow', 'red'][Math.floor(Math.random()*3)];

		var baloon = 
			'<li>'+
			'<a href="/influencers">'+
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

		//console.log("key  " + influencer.key);
	}

	$("#influencers-list li").click(function()
	{
		$("#influencers-list li").removeClass("active");
		$(this).addClass("active");
	});
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

	var baloon = 
		'<li class="tweet-'+ baloon_color +'">'+
		'	<div class="tweet-image">'+
		'		<a href="#">'+
		'			<img src="'+tweet.user_profile_image_url+'" alt="" />'+
		'		</a>'+
		'	</div>'+
		'	<div class="tweet-info">'+
		'		<h2>'+ tweet.twitter_username +'</h2>'+
		'		<p>'+  tweet.text +'</p>'+
		'		<p class="easydate">'+ new Date(tweet.created_at*1000) +'</p>'+
		
		'	</div>'+
		'	<div class="tweet-icon">'+
		'		<a href="http://twitter.com/'+tweet.twitter_username+'/status/'+tweet.key+'">'+
		'			<img src="img/icon_twitter.png" alt="" />'+
		'		</a>'+
		'		<a href="http://twitter.com/'+tweet.twitter_username+'">'+
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