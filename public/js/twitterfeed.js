
var NUM_TWEETS_PER_PAGE = 5;
var TWEETS_SEARCH_TERM = "ufc";

var socket = io.connect(window.location.hostname, {port: 2800});

var timer_id;
var tweets_array = [];
var retweets_array = [];

function onLoad() {
    txt_output = document.getElementById("output");
}

function getTweets() {
    $.ajax({
        url:"http://search.twitter.com/search.json?q="+TWEETS_SEARCH_TERM+"&rpp="+NUM_TWEETS_PER_PAGE+"&include_entities=true&result_type=mixed",
		cache: false,
        dataType:"jsonp",
        jsonpCallback:"handleTweetsGot"
    });
}

function handleTweetsGot(data) {

    var results = data.results;
    var sentiments_arr = ['positive', 'negative', 'neutral'];

    $.each(results, function (key, val) {
        var sentiments_idx = Math.floor( Math.random() * sentiments_arr.length);

        var tweet_obj = val;
        var custom_obj = {
            id:val.id,
            username:val.from_user,
            text:val.text,
            profile_image_url:val.profile_image_url,
            tweet_url:"http://twitter.com/"+val.from_user+"/status/" + val.id,
            user_url:"http://twitter.com/" + val.from_user,
            timestamp:val.created_at,
            //recent_retweets: val.metadata.recent_retweets,
            sentiment: sentiments_arr[sentiments_idx]
        }

        //console.log(custom_obj);

        tweets_arr.push(custom_obj);
    });

    addTweetsToWidget(tweets_arr);
}

function addTweetsToWidget(tweets_arr){
	
	tweets_array = tweets_arr;

    var flexApp = FABridge.example.root();
    flexApp.getTweets(tweets_array);
}

function reset(){
    var flexApp = FABridge.example.root();
    flexApp.resetTweets();
}

function handleSliderChange( slider_coef ) {
    console.log("Slider change: " + slider_coef);
}

function getRetweetsFromJS( id ) {

    console.log("get retweets for ID: " + id );
	socket.emit("search-retweets", {id: id});	

	//fake data passed, need real retweets for ID
/*    var flexApp = FABridge.example.root();
    flexApp.getRetweets(id, tweets_array);*/
}

function displayRetweets(id) {

    var flexApp = FABridge.example.root();
    flexApp.getRetweets(id, retweets_array);	
}

//
//function exec3() {
//    var flexApp = FABridge.example.root();
//    var callback = function () {
//        alert("Hello, Javascript! Love, Actionscript...");
//    }
//    flexApp.getButton().addEventListener("click", callback);
//}

//function exec4() {
//    var flexApp = FABridge.example.root();
//    var callback = function (event) {
//        trace(event.getValue());
//    }
//    flexApp.getSlider().addEventListener("change", callback);
//}
//



function setTweetsBufferSize(val ) {
    var flexApp = FABridge.example.root();
   // flexApp.setTweetsBufferSize(val);  //uncomment for using setTweetsBufferSize somewhere
    flexApp.setTweetsBufferSize(40);
}



function trace(msg) {
    txt_output.value = msg.toString() + "\n" + txt_output.value;
    console.log(msg);

}
