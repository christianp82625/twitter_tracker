var express = require('express'),
	expose = require('express-expose'),
	util = require('util'),
	helenus = require('helenus'),
	//CassandraStore = require('connect-cassandra')(express),
	//MongoStore = require('connect-mongo')(express),
	hashUtil = require('./public/js/crypto');

var mod_influencers = require('./modules/influencers'),
	mod_admin 		= require('./modules/admin'),
	mod_search 		= require('./modules/search');

//var sessionStore = new express.session.MemoryStore(),
var sessionStore = new express.session.MemoryStore(),
	cookieParser = require('cookie');

// var sessionMongoStore = new MongoStore({ db: "carsinretford" });

// activeSearches array stores all searches, which are running now, 
// and which must be updated on client in realtime (broadcasting)
global.activeSearches = [];

global.pool = new helenus.ConnectionPool({
		hosts			: ['localhost:9160', '50.28.39.189:9160'],
		keyspace	 : 'twittertracker',
		user			 :	'zestyand',
		password	 : 'Y3d1]CJIjZlq',
		timeout		: 3000,
		cqlVersion : '3.0.0'
	});

var solrOpts = {core: "twittertracker"};
//if(process.env.USERNAME == "patison")
	solrOpts.host = "50.28.39.189";

global.solr = require('solr-client').createClient(solrOpts);

// this pool object will be used for fast requests (such as get total tweets count, etc)
// DO NOT USE IT pls for slow/heavy requests, such as selecting tweets
global.fastPool = new helenus.ConnectionPool({
		hosts			: ['localhost:9160', '50.28.39.189:9160'],
		keyspace	 : 'twittertracker',
		user			 :	'zestyand',
		password	 : 'Y3d1]CJIjZlq',
		timeout		: 3000,
		cqlVersion : '3.0.0'
	});

var sessionPool = new helenus.ConnectionPool({
		hosts		: ['localhost:9160', '50.28.39.189:9160'],
		keyspace	: 'twittertracker',
		user		:	'zestyand',
		password	: 'Y3d1]CJIjZlq',
		timeout		: 3000,
		cqlVersion : '3.0.0'
})

pool 	.on('error', function(err){ console.error(err.name, err.message); });
fastPool.on('error', function(err){ console.error(err.name, err.message); });
sessionPool.on('error', function(err){ console.error(err.name, err.message); });

var global_keywords = [],
	global_latest_tweets = {};

fastPool.connect(function(err, keyspace)
{
	if(err) {
		console.error("[ERR] Error connecting to Cassandra - %s", err);
		return;
	}

	emitTotalTweets();
	function emitTotalTweets()
	{
		fastPool.cql("SELECT * FROM daemon_state WHERE key='twitterd'", function(err, result)
		{
			if( !err && result.length>0 )
				io.sockets.emit("got-total-tweets", {count: result[0].get("total_tweet_count").value});

			setTimeout(emitTotalTweets, 1000);
		});
	};

	emitKeywords();
	function emitKeywords()
	{
		fastPool.cql("SELECT * FROM keywords", function(err, keywords)
		{
			global_keywords = [];

			keywords.forEach(function(row){
				global_keywords.push({key: row.get('key').value})
			});

			io.sockets.emit("got-keywords", {keywords: global_keywords});
			setTimeout(emitKeywords, 3000);
		});
	}
});

// Realtime stuff for the main dashboard
// ~~~ keep the connection persistent. No need to connect each N seconds

var app = module.exports = express.createServer();
var io	= require('socket.io').listen(app);

var check_arr = [];

pool.connect(function(err, keyspace)
{
	if(err) {
		console.error("[ERR] Error connecting to Cassandra - %s", err);
		return;
	}

	var timestamp = +new Date();
	//timestamp = parseInt(timestamp/1000) - 60*5;
	timestamp = parseInt(timestamp) - 500;
	run();

	var timestampsPerKeywords = new Array();

	function run()
	{
		pool.cql("SELECT * FROM keywords", function(err, keywords)
		{
			var keywords_arr = [];

			keywords.forEach(function(row){
				keywords_arr.push({key: row.get('key').value})
			});

			keywords = keywords_arr;

			var queriesDone = 0;
			for( var i in keywords )
			{
				var keyword = keywords[i].key;

				if(timestampsPerKeywords[keyword]==undefined)
					timestampsPerKeywords[keyword] = timestamp;

				var query = solr.createQuery()
					   .q({keyword: keyword})
					   /*.rangeFilter({field: 'created_at', start: timestampsPerKeywords[keyword], end: '*'})
					   .sort({'created_at': 'asc'})*/
					   .rangeFilter({field: 'timestamp', start: timestampsPerKeywords[keyword], end: '*'})
					   .sort({'created_at': 'desc'})
					   .start(0)
					   .rows(2);

				(function(keyword, query){
					solr.search(query, function(err, obj){
						if(err) {
							console.warn(err);
							return;
						}

						var totalTweets = obj.response.numFound;
						var tweets = obj.response.docs;


/*if(keyword=="europe") {
	console.log("%d / %d / %d", totalTweets, tweets.length, check_arr.length);
	if(tweets.length>0) {

		for(var i in tweets)
			if(check_arr.indexOf(tweets[i].id)>-1) {
				console.log("Duplicate!");
				console.log(tweets[i]);
				console.log(query);
			}
			else
				check_arr.push(tweets[i].id);
	}
}*/
						if( totalTweets == 0 ) {
							if( ++queriesDone == keywords.length )
								setTimeout(run, 3000);
						}
						else {
							tweets.forEach(function(tweet){
								if( tweet.timestamp >= timestampsPerKeywords[keyword] )
									timestampsPerKeywords[keyword] = tweet.timestamp + 1500;
							});

							global_latest_tweets[keyword] = tweets;

							io.sockets.emit("got-realtime-tweets", {keyword: keyword, tweets:tweets});

							if( ++queriesDone == keywords.length ) // set timeout just in case that all Tweet queries was performed
								setTimeout(run, 3000);
						}
					});
				})(keyword, query);
			}
		});
	}
});

// Configuration
io.configure(function(){
	io.set('log level', 1);

	io.set('authorization', function(data, callback) {
		if (data.headers.cookie) {
			var cookie = cookieParser.parse(data.headers.cookie);
			//sessionMongoStore.get(cookie['connect.sid'], function(err, session) {
			sessionStore.get(cookie['connect.sid'], function(err, session) {
				if (err || !session) {
					callback('Error', false);
				} else {
					data.session = session;
					callback(null, true);
				}
			});
		} else {
			callback('No cookie', false);
		}
	});
});

/*sessionPool.connect(function(err, keyspace)
{
	if( err ) {
		console.log("ASDASD");
		throw err;
	}*/

	app.configure(function(){
		app.set('views', __dirname + '/views');
		app.set('view engine', 'ejs');
		app.set('view options', { layout:true });
		app.use(express.bodyParser());
		app.use(express.methodOverride());
		app.use(express.cookieParser());

		app.use(express.session({ 
								secret: 'qweaslkjgdsgsdfvxc,mvn$J#!@#J!@$HG!@#HJ)(*DSA',
								store: sessionStore
								// store: sessionMongoStore
								// store: new CassandraStore({ pool: sessionPool })
							}));

		app.use(express.static(__dirname + '/public'));

		app.helpers({
			renderScriptsTags: function (all) {
				if (all != undefined) {
					return all.map(function(script) {
						return '<script src="' + script + '"></script>';
					}).join('\n ');
				}
				else {
					return '';
				}
			},
			renderCssTags: function (all) {
				if (all != undefined) {
					return all.map(function(css) {
						return '<link href="' + css + '" rel="stylesheet" type="text/css" />';
					}).join('\n ');
				}
			}
		})
		app.dynamicHelpers({
			scripts: function(req, res){
				return [];
			},
			styles: function(req, res){
				return [];
			},
			session: function(req, res){
				 return req.session;
			},
			flash: function(req, res) {
				 return req.flash();
			}
		});
		
	});

	io.sockets.on('connection', function (socket)
	{
		socket.on('disconnect', function()
		{
			unsubscribeFromSearchRealtimeUpdates(socket);
		})

		if( socket.handshake.session.user != undefined )
			fastPool.connect(function(err, keyspace)
			{
				if(err) {
					socket.emit("error");
					console.error("[ERR] Error connecting to Cassandra - %s", err);
					return;	
				}

				fastPool.cql("SELECT * FROM users WHERE key = %s", [socket.handshake.session.user.username.value], function(err, user)
				{
					if( user != undefined ) {
						user = user[0];
						var keywords = {};

						for( var i=1; i<7; i++ )
							if( user.get("keyword_"+i).value != null )
								keywords[i] = user.get("keyword_"+i).value;

						socket.emit("set-widgets-keywords", {keywords:keywords});
					}
				});
			});

		// Start broadcasting the influencers 
		mod_influencers.broadcastInfluencersUpdates(socket);

		//socket.emit("got-keywords", {keywords: global_keywords});
		socket.on("get-sentiments", function(data){ sendSentiments(data, socket) });
		socket.on("get-influencers", function(data){ mod_influencers.sendByKeyword(data, socket) });

		socket.on("get-influencer-details", function(data) {
			mod_influencers.getDetails(data, socket);
			mod_influencers.getTweets(data, socket);
		});

		socket.on("search-tweets", function(data) {
			if( data.offset == 0 )
				unsubscribeFromSearchRealtimeUpdates(socket);
			
			mod_search.searchTweets(data, socket);
		});

		socket.on("get_sentimentmap", function(data){ sendSentimentMap(data, socket) }  );
		socket.on("get-tweets", function(data){ sendLatestTweetsByKeyword(data, socket) });
		socket.on("search-retweets", function(data){ doSearchRetweets(data, socket) });
		socket.on("get-latest-tweets",function(data){ sendLatestTweets(data, socket) });

		// Admin stuff
		socket.on("get-loggedin-user-email", function(data) { mod_admin.doGetLoggedInUserEmail(data, socket) });
		socket.on("get-alert-rule-request", function(data){ mod_admin.doGetAlertRule(data, socket) });
		socket.on("get-user-request", function(data){ mod_admin.doGetUser(data, socket) });
		socket.on("search-users-request", function(data){ mod_admin.doSearchUsers(data, socket) });
		socket.on("search-keywords-request", function(data){ mod_admin.doSearchKeywords(data, socket) });
		socket.on("search-alert-rules-request", function(data){ mod_admin.doSearchAlertRules(data, socket) });
		socket.on("add-user-request", function(data) { mod_admin.doAddUser(data, socket); });
		socket.on("edit-user-request", function(data) { mod_admin.doEditUser(data, socket) });
		socket.on("delete-user-request", function(data) { mod_admin.doDeleteUser(data, socket) });
		socket.on("add-keyword-request", function(data) { mod_admin.doAddKeyword(data, socket) });
		socket.on("delete-keyword-request", function(data) { mod_admin.doDeleteKeyword(data, socket) });
		socket.on("add-alert-rule-request", function(data) { mod_admin.doAddAlertRule(data, socket) });
		socket.on("edit-alert-rule-request", function(data) { mod_admin.doEditAlertRule(data, socket) });
		socket.on("delete-alert-rule-request", function(data) { mod_admin.doDeleteAlertRule(data, socket) });
		// socket.on("edit-keyword-request", function(data) { doEditKeyword(data, socket) });
		// ~~~ admin stuff

		socket.on("save-widget-keyword", function(data){ doSaveUserWidgetKeyword(data, socket) });
	});

	app.configure('development', function(){
		app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
		app.use(app.router);
	});

	app.configure('production', function(){
		app.use(express.errorHandler());
		app.use(authenticateSession);
		app.use(app.router);
	});

	// Routes
	app.get("/login", function(req, res) {
		res.render("login", {title: "LOGIN"})
	});

	app.post("/login", function(req, res) {
		authenticateUser(req.body.username, req.body.passwordHash, function(user){
			if (user) {
				req.session.user = user;
				res.redirect(req.body.redir || '/');
			}
			else {
				req.flash('warn', 'Login Failed');
				res.render('login', {title: "LOGIN"});
			}
		});
	})

	app.get("/logout", function(req, res) {
		delete req.session.user;
		res.redirect("/login");
	})

	app.get("/", function(req, res) {
		res.render("index", {title: "MAIN DASHBOARD"});
	});

	app.get("/influencers", function(req, res) {
		mod_influencers.getTopInfluencers(20, function(influencers){
			res.render("influencers", {title: "INFLUENCERS", influencers: influencers});
		});
	});

	app.get("/keywords", function(req, res) {
		res.render("keywords", {title: "KEYWORDS"});
	});

	app.get("/search", function(req, res) {
		res.render("search", {title: "SEARCH"});
	});

	app.get("/admin", getKeywords, function(req, res) {
		if (req.session.user) res.expose(req.session.user, 'user');
		res.expose(req.keywords, 'keywords');
		res.render("admin", {title: "ADMIN PANEL"});
	})

	app.listen(2800, function() {
		console.log("Express server listening on port %d in %s mode", 2800, app.settings.env);
	});
// });


// ******************* ecdeveloper socket callbacks ****************** //
function sendSentimentMap(data, socket)
{
	var keyw	 = data.keyword;

	pool.connect(function(err, keyspace)
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

				var cql = "SELECT * FROM tweets";

				if (keyw == "all")	{
					cql += " LIMIT 70";				
				} else {
					cql += " WHERE keyword='" + keyw + "' LIMIT 100";				
				}

				pool.cql(cql, function(err, results)
				{
					if(err) {
						socket.emit("error");
						console.error("[ERR] Error getting tweets - %s", err);
						return;	
					}

					var sentiments = [];
					var len = 0;
					if ( ! results ) return;
					results.forEach(function(row)
					{
						var tweet = {};
						row.forEach(function(name,value,ts,tttl) {
							tweet[name] = value;
						});
						sentiments.push(tweet);
						len++;
					});

					socket.emit("got-sentimentmap", {keyword: keyw, length: len, sentiments:sentiments });
				});

			//}
		}
	});	
}

function sendSentiments(data, socket)
{
	var keyw	 = data.keyword;

	pool.connect(function(err, keyspace)
	{
		if(err){
			socket.emit("error");
			console.error("[ERR] Error sending sentiments- %s", err);
			return;
		}
		else {
			var cql = "SELECT * FROM sentiment_trends";				

			if (keyw == "all")	{
				cql += " LIMIT 13";				
			} else {
				cql += " WHERE keyword='" + keyw + "' LIMIT 13";				
			}
						
			pool.cql(cql, function(err, results)
			{
				var sentiment_trends  = [];
				if ( ! results ) return;
				results.forEach(function(row)
				{
					var sentiment_trend = {};
					row.forEach(function(name,value,ts,tttl) {
						 sentiment_trend[name] = value;
					});
					sentiment_trends.push( sentiment_trend);
				});

				for( var i in sentiment_trends )
				{					
					for( var j in sentiment_trends )
					{					
						var time1 = Date.UTC(sentiment_trends[i].timeval.substring(0,4), sentiment_trends[i].timeval.substring(4,6), sentiment_trends[i].timeval.substring(6,8), sentiment_trends[i].timeval.substring(10,12),0,0,0);
						var time2 = Date.UTC(sentiment_trends[j].timeval.substring(0,4), sentiment_trends[j].timeval.substring(4,6), sentiment_trends[j].timeval.substring(6,8), sentiment_trends[j].timeval.substring(10,12),0,0,0);						
						
						if (time1 < time2)
						{				
							var key1			= sentiment_trends[j].key;
							var keyword1		= sentiment_trends[j].keyword;
							var	negative_count1	= sentiment_trends[j].negative_count;
							var	neutral_count1	= sentiment_trends[j].neutral_count;
							var	positive_count1	= sentiment_trends[j].positive_count;
							var	sentiment_all1	= sentiment_trends[j].sentiment_all;
							var	timeval1		= sentiment_trends[j].timeval;

							sentiment_trends[j].key				= sentiment_trends[i].key;              
							sentiment_trends[j].keyword			= sentiment_trends[i].keyword;          
							sentiment_trends[j].negative_count	= sentiment_trends[i].negative_count;   
							sentiment_trends[j].neutral_count	= sentiment_trends[i].neutral_count;    
							sentiment_trends[j].positive_count	= sentiment_trends[i].positive_count;   
							sentiment_trends[j].sentiment_all	= sentiment_trends[i].sentiment_all;    
							sentiment_trends[j].timeval			= sentiment_trends[i].timeval;          

							sentiment_trends[i].key				= key1;                
							sentiment_trends[i].keyword			= keyword1;            
							sentiment_trends[i].negative_count	= negative_count1;     
							sentiment_trends[i].neutral_count	= neutral_count1;      
							sentiment_trends[i].positive_count	= positive_count1;     
							sentiment_trends[i].sentiment_all	= sentiment_all1;      
							sentiment_trends[i].timeval			= timeval1;            							
						}
					}
				}

				socket.emit("got-sentiments", { keyword: keyw , sentiment_trends: sentiment_trends });
				
			});
		}
	});	

}

function sendLatestTweetsByKeyword(data, socket)
{
	var keyw = data.keyword;

	pool.connect(function(err, keyspace)
	{
		if(err){
			socket.emit("error");
			console.error("[ERR] Error connecting to Cassandra - %s", err);
			return;
		}
		else {
			var cql = "SELECT * FROM tweets WHERE keyword='" + keyw + "' LIMIT 30";

			pool.cql(cql, function(err, results)
				{					
					var tweets = [];
					if ( ! results ) return;
					results.forEach(function(row)
					{
						var tweet = {};
						row.forEach(function(name,value,ts,tttl) {
							tweet[name] = value;
						});
						tweets.push(tweet);
					});


					for( var i=0; i<tweets.length; i++ )
					{						
						for( var j=i+1; j<tweets.length; j++ )
						{					
							if (tweets[i].created_at > tweets[j].created_at)
							{				
								var key1			= tweets[j].key;
								var created_at1		= tweets[j].created_at;
								var keyword1		= tweets[j].keyword;
								var	lat1			= tweets[j].lat;
								var location1		= tweets[j].location;
								var	long1			= tweets[j].long;
								var text1			= tweets[j].text;
								var timestamp1		= tweets[j].timestamp;
								var twitter_user_id1	=	tweets[j].twitter_user_id;
								var twitter_username1	=	tweets[j].twitter_username;								
								var user_profile_image_url1	= tweets[j].user_profile_image_url;
								var sentiment1				= tweets[j].sentiment;

								tweets[j].key			= tweets[i].key;                           
								tweets[j].created_at	= tweets[i].created_at;                    
								tweets[j].keyword		= tweets[i].keyword;                       
								tweets[j].lat			= tweets[i].lat;                           
								tweets[j].location		= tweets[i].location;                      
								tweets[j].long			= tweets[i].long;                          
								tweets[j].text			= tweets[i].text;                          
								tweets[j].timestamp		= tweets[i].timestamp;                     
								tweets[j].twitter_user_id	= tweets[i].twitter_user_id;         
								tweets[j].twitter_username	= tweets[i].twitter_username;			
								tweets[j].user_profile_image_url = tweets[i].user_profile_image_url;
								tweets[j].sentiment				 = tweets[i].sentiment;

								tweets[i].key			= key1;
								tweets[i].created_at	= created_at1;
								tweets[i].keyword		= keyword1;
								tweets[i].lat			= lat1;
								tweets[i].location		= location1;
								tweets[i].long			= long1;
								tweets[i].text			= text1;
								tweets[i].timestamp		= timestamp1;
								tweets[i].twitter_user_id	=	twitter_user_id1;
								tweets[i].twitter_username	=	twitter_username1;								
								tweets[i].user_profile_image_url	= user_profile_image_url1;
								tweets[i].sentiment					= sentiment1;
							}
						}
					}

					socket.emit("got-tweets-by-keyword", {keyword: keyw, tweets:tweets});
				});
		}
	});	
}

function doSearchRetweets(data, socket)
{	
	id = data.id;

	pool.connect(function(err, keyspace)
	{
		if(err){
			socket.emit("error");
			console.error("[ERR] Error connecting to Cassandra - %s", err);
			return;
		}
		else {
			//pool.cql("select * from retweets where tweet_id='"+ id + "' LIMIT 30", function(err, retweets)
			pool.cql("select * from retweets where tweet_id='"+ id + "' LIMIT 30", function(err, retweets)
			{
				var arr = [];
				for(var i in retweets) {
					var retweet = {};
					retweet.key = retweets[i].get("key").value;
					retweet.twitter_username = retweets[i].get("name").value;
					retweet.user_profile_image_url = retweets[i].get("profile_image_url").value;
					retweet.text = retweets[i].get("text").value;
					retweet.tweet_id = retweets[i].get("tweet_id").value;
					retweet.created_at = retweets[i].get("created_at").value;

					arr.push(retweet);
				}
				
				socket.emit("got-retweets", {id: id, retweets:arr});
			});							
		}
	});	
}

function doSaveUserWidgetKeyword(data, socket)
{
	var session = socket.handshake.session;
	if( session.user == undefined )
		return;

	var username  = session.user.username.value;
	var keyword   = data.keyword;
	var widget_id = data.widget_id;

	if( [1,2,3,4,5,6].indexOf(widget_id) == -1 )
		widget_id = 1;

	var cql = "UPDATE users SET keyword_"+widget_id+" = %s WHERE KEY = %s";
	pool.cql(cql, [keyword, username], function(err, results) {
			if(err){
				console.warn(err);
			}
			else {
				//console.log('Keyword saved');
			}
	});	
}

function sendLatestTweets(data, socket)
{
	var keyword = data.keyword;

/*	if( global_latest_tweets[keyw]!=undefined ) {
		// for(var i in global_latest_tweets[keyw])
			// console.log(global_latest_tweets[keyw][i].id);

		socket.emit("got-latest-tweets", {keyword: keyw, tweets: global_latest_tweets[keyw]});
		// console.log("-------");
	}
	else
		pool.connect(function(err, keyspace)
		{
			if(err){
				socket.emit("error");
				console.error("[ERR] Error connecting to Cassandra - %s", err);
				return;
			}
			else {
				var cql = "SELECT * FROM tweets WHERE keyword='"+keyword+"' LIMIT 30";
				pool.cql(cql, function(err, results)
				{
					var tweets = [];
					if ( ! results ) return;
					results.forEach(function(row)
					{
						var tweet = {};
						row.forEach(function(name,value,ts,tttl) {
							tweet[name] = value;
						});
						tweets.push(tweet);
					});

					for( var i=0; i<tweets.length; i++ )
					{						
						for( var j=i+1; j<tweets.length; j++ )
						{					
							if (tweets[i].created_at > tweets[j].created_at)
							{				
								var key1			= tweets[j].key;
								var created_at1		= tweets[j].created_at;
								var keyword1		= tweets[j].keyword;
								var	lat1			= tweets[j].lat;
								var location1		= tweets[j].location;
								var	long1			= tweets[j].long;
								var text1			= tweets[j].text;
								var timestamp1		= tweets[j].timestamp;
								var twitter_user_id1	=	tweets[j].twitter_user_id;
								var twitter_username1	=	tweets[j].twitter_username;								
								var user_profile_image_url1	= tweets[j].user_profile_image_url;
								var sentiment1				= tweets[j].sentiment;

								tweets[j].key			= tweets[i].key;                           
								tweets[j].created_at	= tweets[i].created_at;                    
								tweets[j].keyword		= tweets[i].keyword;                       
								tweets[j].lat			= tweets[i].lat;                           
								tweets[j].location		= tweets[i].location;                      
								tweets[j].long			= tweets[i].long;                          
								tweets[j].text			= tweets[i].text;                          
								tweets[j].timestamp		= tweets[i].timestamp;                     
								tweets[j].twitter_user_id	= tweets[i].twitter_user_id;         
								tweets[j].twitter_username	= tweets[i].twitter_username;			
								tweets[j].user_profile_image_url = tweets[i].user_profile_image_url;
								tweets[j].sentiment				 = tweets[i].sentiment;

								tweets[i].key			= key1;
								tweets[i].created_at	= created_at1;
								tweets[i].keyword		= keyword1;
								tweets[i].lat			= lat1;
								tweets[i].location		= location1;
								tweets[i].long			= long1;
								tweets[i].text			= text1;
								tweets[i].timestamp		= timestamp1;
								tweets[i].twitter_user_id	=	twitter_user_id1;
								tweets[i].twitter_username	=	twitter_username1;								
								tweets[i].user_profile_image_url	= user_profile_image_url1;
								tweets[i].sentiment					= sentiment1;
							}
						}
					}

					socket.emit("got-latest-tweets", {keyword: keyword, tweets:tweets});
				});
			}
		});*/

	var timestamp = +new Date();
	timestamp = parseInt(timestamp)- 500;

	if(keyword.indexOf(" ")>0)
		keyword = '"'+keyword+'"';

	var query = solr.createQuery()
		   .q({keyword: keyword})
		   //.rangeFilter({field: 'timestamp', start: "*", end: timestamp})
		   .sort({'created_at': 'desc'})
		   .start(0)
		   .rows(20);

	(function(keyword, query){
		solr.search(query, function(err, obj){
			if(err) {
				console.warn(err);
				return;
			}

			var totalTweets = obj.response.numFound;
			var tweets = obj.response.docs;

			socket.emit("got-latest-tweets", {keyword: keyword, tweets:tweets});
		
		});
	})(keyword, query);
}


// ******************* // ecdeveloper socket callbacks ****************** //


// ******************* middleware ****************** //

function authenticateSession(req, res, next) {
	if (req.session.user || /^\/login/.test(req.url) ) {
		next();
	}
	else {
		res.redirect('/login?redir=' + req.url);
	}	
}

function getKeywords(req, res, next) {
	mod_admin.searchKeywords(function(results) {
		req.keywords = results;
		next()
	})
}

// ******************* // middleware ****************** //


function unsubscribeFromSearchRealtimeUpdates(socket)
{
	for( var i in activeSearches )
		for( var j in activeSearches[i].listeners )
			if( activeSearches[i].listeners[j].id == socket.id ) { // Kill this bastard!!! :)))
				activeSearches[i].listeners.splice(j, 1);
				if( activeSearches[i].listeners.length == 0 ) {
					clearInterval( activeSearches[i].interval );
					delete activeSearches[i];
				}
			}
}

// ********************* // user authentication ************************** //
function authenticateUser(username, password, callback) {
	pool.connect(function(err,keyspace) {
		if (err) {
			socket.emit("error");
			console.error("Error connecting to Cassandra - %s", err);
			return;
		}
		else {
			var cql = "SELECT * FROM users WHERE KEY = %s";
			pool.cql(cql, [username], function(err, results) {
				if (err) {
					console.warn(err);
				}
				else {
					if (results.length > 0) {
						var row = results[0];//,
							salt = row.get('salt').value,
							saltAndHashedPassword = row.get('password').value;

						if (hashUtil.hashSaltAndPassword(salt, password) === saltAndHashedPassword) {
						//if ( true ) {
							callback({
								username: {
									value: row.key
								},
								fullname: {
									value: row.get('fullname').value
								},
								email: {
									value: row.get('email').value
								},
								sendAlerts: {
									value: row.get('send_alerts').value
								}
								// role: {
								// 	value: row.get('role').value
								// }
							});
						}
						else {
							callback();
						}
					}
					else {
						callback();
					}
				}
			});
		}
	})
	return;
}
