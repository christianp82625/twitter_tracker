// TODO: implement limit and skip
function doSearchUsers(data, socket)
{
	var limit = data.limit,
		email = socket.handshake.session.user.email.value,
		skip = data.skip;

	fastPool.connect(function(err, keyspace){
		if(err){
			socket.emit("error");
			console.error("[ERR] Error searching user - %s", err);
			return;
		}
		else {
			var cql = "SELECT * FROM users";
			fastPool.cql(cql, function(err,results) {

				if(err) {
					socket.emit("error");
					console.error("[ERR] Error getting users - %s", err);
					return;
				}

				var users = [];
				results.forEach(function(row) {
					result = {
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
						},
						password: {
							value: row.get('password').value
						}
					}
					users.push(result);
				})
				console.log('user search finished');
				socket.emit('search-users-response', {users: users, requestTime: data.requestTime, loggedInEmail: email});
			})
		}
	})
}

// TODO: implement limit and skip
function doSearchKeywords(data, socket)
{
	searchKeywords(data, function(results) {
		socket.emit('search-keywords-response', {keywords: results, requestTime: data.requestTime});
	})
}

function searchKeywords(request, callback)
{
	if (typeof request === 'function') {
		callback = request;
	}

	var limit = request.limit,
		skip = request.skip;

	fastPool.connect(function(err, keyspace){
		if(err){
			socket.emit("error");
			console.error("[ERR] Error searching keyword - %s", err);
			return;
		}
		else {
			var cql = "SELECT * FROM keywords";
			fastPool.cql(cql, function(err,results)
			{
				if(err) {
					socket.emit("error");
					console.error("[ERR] Error getting keywords - %s", err);
					return;	
				}

				var keywords = [];
				results.forEach(function(row) {
					result = {
						keyword : {
							value : row.get('key').value
						},
						isPhrase : {
							value : row.get('is_phrase').value
						}
					};
					keywords.push(result);
				});
				callback(keywords);
			})
		}
	})
}

// TODO: implement limit and skip
function doSearchAlertRules(data, socket) {
	console.log('alert_rules search start');
	var limit = data.limit,
		skip = data.skip,
		username = socket.handshake.session.user.username.value;
		//username = "dev";

	fastPool.connect(function(err, keyspace){
		if(err){
			socket.emit("error");
			console.error("[ERR] Error searching alert rules - %s", err);
			return;
		}
		else {
			var cql = "SELECT * FROM alert_rules WHERE username = %s";
			fastPool.cql(cql, [username], function(err,results)
			{
				if(err) {
					socket.emit("error");
					console.error("[ERR] Error getting alert rules - %s", err);
					return;	
				}

				var rules = [];
				results.forEach(function(row) {
					result = {
						ruleName: {
							value: row.get('rule_name').value
						},
						twitterUsername: {
							value: row.get('twitter_username').value
						},
						keyword: {
							value: row.get('keyword').value
						},
						sentiment: {
							value: row.get('sentiment').value
						},
						key: {
							value: row.get('key').value
						},
						email: {
							value: row.get('email').value
						},
						mobile: {
							value: row.get('mobile').value
						}
					}
					rules.push(result);
				})
				console.log('alert_rules search finished');
				socket.emit('search-alert-rules-response', {alertRules: rules, requestTime: data.requestTime});
			})
		}
	})
}

function doAddUser(data,socket) {
	data.sendAlerts = 0 + !!data.sendAlerts // cast as a number (0|1);
	var values = [data.username, data.fullname, data.email, data.password, data.salt, data.sendAlerts];

	pool.connect(function(err, keyspace) {
		if(err){
			socket.emit("error");
			console.error("[ERR] Error adding user - %s", err);
			return;
		}
		else {
			pool.cql("SELECT * FROM users WHERE key=%s", [data.username], function(err, results)
			{
				if(err) {
					socket.emit("error");
					console.error("[ERR] Error getting user - %s", err);
					return;	
				}

				if(results.length)
					socket.emit("item-added", {added:false, msg: "Such username exists", type: "user"});
				else {
					var cql = "INSERT INTO users (KEY, fullname, email, password, salt, send_alerts) VALUES (%s, %s, %s, %s, %s, %d)";
					pool.cql(cql, values, function(err, results) {
						if(err) {
							console.warn(err);
							socket.emit("item-added", {added:false, type: "user"});
						}
						else {
							socket.emit("item-added", {added:true, value: data.username, type: "user"});
						}
					});
				}
			});
		}
	});
}

// This is insecure, in that there is no test that the username is not changed\
// so therefore no guarantee that we're supposed to be editing the user we are
function doEditUser(data,socket) {
	var values;
	data.sendAlerts = 0 + !!data.sendAlerts // cast as a number (0|1);
	if (data.password == null || data.password == '')
		values = [data.fullname, data.email, data.sendAlerts, data.username];
	else
		values = [data.fullname, data.email, data.password, data.salt, data.sendAlerts, data.username];
	pool.connect(function(err, keyspace) {
		if(err){
			socket.emit("error");
			console.error("[ERR] Error connecting to Cassandra - %s", err);
			return;
		}
		else {
			var cql = "UPDATE users\
			 	SET fullname = %s,\
					email = %s,\
					" + ((data.password != null && data.password != '') ? 'password = %s,' : '') + "\
					" + ((data.salt 	!= null && data.salt 	 != '') ? 'salt = %s,' : '') + "\
					send_alerts = %d\
				WHERE KEY = %s";
			pool.cql(cql, values, function(err, results) {
				if(err) {
					console.warn(err);
					socket.emit("item-saved", {saved:false, type: "user"});
				}
				else {
					socket.emit("item-saved", {saved:true, value: data, type: "user"});
				}
			});
		}
	});
}

function doDeleteUser(data,socket) {
	var values = [data.username];
	pool.connect(function(err, keyspace) {
		if(err){
			socket.emit("error");
			console.error("[ERR] Error deleting user - %s", err);
			return;
		}
		else {
			var cql = 'DELETE FROM users WHERE KEY = %s';
			pool.cql(cql, values, function(err, results) {
				if(err) {
					console.warn(err);
					socket.emit("item-deleted", {deleted:false, type: "users"});
				}
				else {
					socket.emit("item-deleted", {deleted:true, value: data, type: "users"});
				}
			});
		}
	});
}

function doAddKeyword(data,socket) {
	data.isPhrase = 0 + !!data.isPhrase // cast as a number (0|1);
	var values = [data.keyword, data.isPhrase];
	pool.connect(function(err, keyspace) {
		if(err){
			socket.emit("error");
			console.error("[ERR] Error adding keyword - %s", err);
			return;
		}
		else {
			pool.cql("SELECT * FROM keywords WHERE key=%s", [data.keyword], function(err, res)
			{
				if(err) {
					socket.emit("error");
					console.error("[ERR] Error getting keywords - %s", err);
					return;	
				}

				if(res!=undefined && res.length)
					socket.emit("item-added", {added:false, msg: "Keyword exists", type: "keyword"});
				else {
					var cql = "INSERT INTO keywords (KEY, is_phrase) VALUES (%s, %d)";
					pool.cql(cql, values, function(err, results) {
						if(err) {
							console.warn(err);
							socket.emit("item-added", {added:false, type: "keyword"});
						}
						else {
							socket.emit("item-added", {added:true, value: data.keyword, type: "keyword"});
						}
					});
				}
			});
		}
	});
}

function doDeleteKeyword(data,socket) {
	var values = [data.keyword]
	pool.connect(function(err, keyspace) {
		if(err){
			socket.emit("error");
			console.error("[ERR] Error deleting keyword - %s", err);
			return;
		}
		else {
			var cql = 'DELETE FROM keywords WHERE KEY = %s';
			pool.cql(cql, values, function(err, results) {
				if(err) {
					console.warn(err);
					socket.emit("item-deleted", {deleted:false, type: "keyword"});
				}
				else {
					socket.emit("item-deleted", {deleted:true, value: data.keyword, type: "keyword"});
				}
			});
		}
	});
}

function doAddAlertRule(data, socket) {
	var username = socket.handshake.session.user.username.value,		
		ruleName = data.ruleName,
		key = username + ruleName,
		sentiment = data.sentiment;
	
	if (sentiment == "all")
		sentiment = "";	

	var values = [key, username, ruleName, data.twitterUsername, data.keyword, sentiment, data.email, data.mobile];
	pool.connect(function(err, keyspace) {
		if (err) {
			socket.emit("error");
			console.error("[ERR] Error adding alert rule - %s", err);
			return;
		}
		else {
			pool.cql("SELECT * FROM alert_rules WHERE rule_name=%s", [ruleName], function(err, res)
			{
				if(err) {
					socket.emit("error");
					console.error("[ERR] Error getting alert rules - %s", err);
					return;	
				}

				if(res!=undefined && res.length)
					socket.emit("item-added", {added:false, msg: "Such rule name exists", type: "alert_rule"});
				else {
					var cql = 'INSERT INTO alert_rules (KEY, username, rule_name, twitter_username, keyword, sentiment, email, mobile) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)';
					pool.cql(cql, values, function(err, results) {
						if(err) {
							console.warn(err);
							socket.emit("item-added", {added:false, type: "alert_rule"});
						}
						else {
							socket.emit("item-added", {added:true, value: data, type: "alert_rule"});
						}
					})
				}
			})
		}
	})
}

function doEditAlertRule(data, socket) {
	var username = socket.handshake.session.user.username.value,
		ruleName = data.ruleName,
		key = username + ruleName;

	var values = [data.twitterUsername, data.keyword, data.sentiment, data.email, data.mobile, key];
	pool.connect(function(err, keyspace) {
		if (err) {
			socket.emit("error");
			console.error("[ERR] Error editting alert rule- %s", err);
			return;
		}
		else {
			var cql = 'UPDATE alert_rules\
				SET twitter_username = %s,\
					keyword = %s,\
					sentiment = %s,\
					email = %s,\
					mobile	= %s\
				WHERE KEY = %s';
			pool.cql(cql, values, function(err, results) {
				if(err) {
					console.warn(err);
					socket.emit("item-saved", {saved:false, type: "alert_rule"});
				}
				else {
					socket.emit("item-saved", {saved:true, value: data, type: "alert_rule"});
				}
			})
		}
	})
}

function doDeleteAlertRule(data, socket) {
	var username = socket.handshake.session.user.username.value,
		key = username + data.ruleName;
	var values = [key];
	pool.connect(function(err, keyspace) {
		if (err) {
			socket.emit("error");
			console.error("[ERR] Error deleting alert rule - %s", err);
			return;
		}
		else {
			var cql = 'DELETE FROM alert_rules WHERE key = %s';
			pool.cql(cql, values, function(err, results) {
				if(err) {
					console.warn(err);
					socket.emit("item-deleted", {deleted:false, type: "alert_rule"});
				}
				else {
					socket.emit("item-deleted", {deleted:true, value: data, type: "alert_rule"});
				}
			})
		}
	})
}

function doGetUser(data, socket) {
	pool.connect(function(err, keyspace) {
		if( err )
		{
			socket.emit("error");
			console.error("[ERR] Error getting user - %s", err);
			return;
		}

		var cql = "SELECT * FROM users WHERE key = %s";
		pool.cql(cql, [data.key], function(err, results)
		{
			if(err) {
				socket.emit("error");
				console.error("[ERR] Error getting user - %s", err);
				return;	
			}
			else {
				var user = {
					username: {
						value: results[0].key
					},
					fullname: {
						value: results[0].get('fullname').value
					},
					email: {
						value: results[0].get('email').value
					},
					password: {
						value: results[0].get('password').value
					},
					sendAlerts: {
						value: results[0].get('send_alerts').value
					}
				}

				socket.emit("get-user-response", {user: user})
			}
		})
	})
}

function doGetAlertRule(data, socket) {
	pool.connect(function(err, keyspace)
	{
		if( err ) {
			socket.emit("error");
			console.error("[ERR] Error connecting to Cassandra - %s", err);
			return;
		}

		var cql = "SELECT * FROM alert_rules WHERE key = %s";
		pool.cql(cql, [data.key], function(err, results) {
			if(err) {
				socket.emit("error");
				console.error("[ERR] Error getting alert rule - %s", err);
				return;	
			}
			else {
				var alert_rule = {
					key: {
						value: results[0].key
					},
					ruleName: {
						value: results[0].get('rule_name').value
					},
					keyword: {
						value: results[0].get('keyword').value
					},
					sentiment: {
						value: results[0].get('sentiment').value
					},
					twitterUsername: {
						value: results[0].get('twitter_username').value
					},
					username: {
						value: results[0].get('username').value
					},
					email: {
						value: results[0].get('email').value
					},
					mobile: {
						value: results[0].get('mobile').value
					},
					flag: {
						value: "disabled"
					}
				}

				socket.emit("get-alert-rule-response", {alert_rule: alert_rule})
			}
		})
	})
}

function doGetLoggedInUserEmail(data, socket)
{
	var email	 = socket.handshake.session.user.email.value;

	data.email.value = email;

	socket.emit("got-loggedin-user-email", { alert_rule: data });

}

exports.doSearchUsers		= doSearchUsers;
exports.doSearchKeywords 	= doSearchKeywords;
exports.searchKeywords 	 	= searchKeywords;
exports.doSearchAlertRules  = doSearchAlertRules;
exports.doAddUser 		= doAddUser;
exports.doEditUser 		= doEditUser;
exports.doDeleteUser	= doDeleteUser;
exports.doAddKeyword 	= doAddKeyword;
exports.doDeleteKeyword = doDeleteKeyword;
exports.doAddAlertRule 	= doAddAlertRule;
exports.doEditAlertRule = doEditAlertRule;
exports.doDeleteAlertRule = doDeleteAlertRule;

exports.doGetUser = doGetUser;
exports.doGetAlertRule = doGetAlertRule;
exports.doGetLoggedInUserEmail = doGetLoggedInUserEmail;