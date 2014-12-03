(function() {
	
var searchUsersRequestTime = Date.now();	
var searchKeywordsRequestTime = Date.now();
var searchAlertRulesRequestTime = Date.now();

socket.on("search-users-response", populateUsers);
socket.on("search-keywords-response", populateKeywords);
socket.on("search-alert-rules-response", populateAlertRules);

socket.on("got-loggedin-user-email", populateAlertRulesAdd);

socket.on("get-user-response", function(data){ populateEditUser(data, "edit") });
socket.on("get-alert-rule-response", function(data){ populateEditAlertRules(data, "edit") });

socket.on("item-added", itemAdded);
socket.on("item-saved", itemSaved);
socket.on("item-deleted", itemDeleted);

var widgetsToLoad = 3;

function itemAdded(data)
{
	showLoader(false);

	if( data.added ) {	
	
		socket.emit("search-users-request", {
			skip	: 0,
			limit : 20,
			requestTime : searchUsersRequestTime = Date.now()
		});
		
		socket.emit("search-keywords-request", {
			skip	: 0,
			limit : 20,
			requestTime : searchKeywordsRequestTime = Date.now()
		});
		
		socket.emit("search-alert-rules-request", {
			requestTime : searchAlertRulesRequestTime = Date.now()
		});

		$("#detail_view").empty();
		$.jGrowl(data.type.replace("_", " ") + " added successful");
	}
	else {
		var err = "Error adding " + data.type.replace("_", " ");
		if( data.msg!=undefined )
			err += "<br/>" + data.msg;

		$.jGrowl(err);
	}
}

function itemSaved(data)
{
	showLoader(false);

	if( data.saved )
	{
		switch(data.type) {
			case "user":
				var li = $("#users_content ul.list").find("li[data-user-key='"+ data.value.username +"']");
				li.find(".list-info h2").text(data.value.fullname);
				li.find(".list-info p").text(data.value.username);
				break;
		}

		$("#detail_view").empty();
		$.jGrowl(data.type.replace("_", " ") + " saved");
	}
	else
		$.jGrowl("Error saving " + data.type.replace("_", " "));
}

function itemDeleted(data)
{
	showLoader(false);

	if( data.deleted ) {
		$("ul li.active").slideUp();
		$("#detail_view").empty();
		$(window).resize();

		$.jGrowl(data.type.replace("_", " ") + " deleted successful");
	}
	else
		$.jGrowl("Error deleting " + data.type.replace("_", " "));
}

$(document).ready(function(){
	
	showLoader(true);

	$('.users-head .add').click(populateAddNewUser);
	$('.keywords-head .add').click(populateAddNewKeyword);
	$('.alert-rules-head .add').click(populateAddNewAlertRules);
	
	socket.emit("search-users-request", {
		skip	: 0,
		limit : 20,
		requestTime : searchUsersRequestTime = Date.now()
	});
	
	socket.emit("search-keywords-request", {
		skip	: 0,
		limit : 20,
		requestTime : searchKeywordsRequestTime = Date.now()
	});
	
	socket.emit("search-alert-rules-request", {
		requestTime : searchAlertRulesRequestTime = Date.now()
	})
})

// TODO: Check listeners are removed when element is discarded
function populateUsers(data)
{
	if( !--widgetsToLoad )
		showLoader(false);

	if (data.requestTime !== searchUsersRequestTime)
		return;

	new EJS({url: '/widgets/user-list.ejs'}).update('users_content', data);
	$("#users_content").mCustomScrollbar();

	$('#users_content li').click(function(event)
	{
		showLoader(true);

		socket.emit("get-user-request", {key: $(this).data("user-key")});

		$(this).parent().find('li').removeClass('active');
		$('#keywords_content li').removeClass('active');
		$(this).addClass('active');
		$("#detail_view .list-wrapper").fadeTo("slow", 0.1);

/*		userIndex = $(this).data('user-index')
        $(this).parent().find('li').removeClass('active');
        $('#keywords_content li').removeClass('active');
        $(this).addClass('active');

       	if( $("#detail_view .list-wrapper").length )
			$("#detail_view .list-wrapper").fadeTo("slow", 0.1, function()
			{
				populateEditUser(data.users[userIndex], 'edit');
				$(this).fadeTo("slow", 1);
			});
		else
			populateEditUser(data.users[userIndex], 'edit');*/
	});
}

// TODO: Check listeners are removed when element is discarded
function populateKeywords(data)
{
	if( !--widgetsToLoad )
		showLoader(false);

	if (data.requestTime !== searchKeywordsRequestTime)
		return;

	new EJS({url: '/widgets/keyword-list.ejs'}).update('keywords_content', data);
	$("#keywords_content").mCustomScrollbar();

	$('#keywords_content li').click(function(event)
	{
		showLoader(true);

		keywordIndex = $(this).data('keyword-index')
        $(this).parent().find('li').removeClass('active');
        $('#users_content li').removeClass('active');
        $(this).addClass('active');

       	if( $("#detail_view .list-wrapper").length )
			$("#detail_view .list-wrapper").fadeTo("slow", 0.1, function()
			{
				populateEditKeyword(data.keywords[keywordIndex], 'edit');
				$(this).fadeTo("slow", 1);
			});
		else
			populateEditKeyword(data.keywords[keywordIndex], 'edit');
	});
}

function populateAlertRules(data)
{
	if( !--widgetsToLoad )
		showLoader(false);

	if (data.requestTime !== searchAlertRulesRequestTime)
		return;

	new EJS({url: '/widgets/alert-rule-list.ejs'}).update('alert_rules_content', data);
	$("#alert_rules_content").mCustomScrollbar();

	$('#alert_rules_content li').click(function(event)
	{
		showLoader(true);

		socket.emit("get-alert-rule-request", {key: $(this).data("alert-rule-key")});

		$(this).parent().find('li').removeClass('active');
		$('#alert_rules_content li').removeClass('active');
		$(this).addClass('active');
		$("#detail_view .list-wrapper").fadeTo("slow", 0.1);

/*		alertRuleIndex = $(this).data('alert-rule-index')
        $(this).parent().find('li').removeClass('active');
        $('#keywords_content li').removeClass('active');
        $(this).addClass('active');

       	if( $("#detail_view .list-wrapper").length )
			$("#detail_view .list-wrapper").fadeTo("slow", 0.1, function()
			{
				populateEditAlertRules(data.alertRules[alertRuleIndex], 'edit');
				$(this).fadeTo("slow", 1);
			});
		else
			populateEditAlertRules(data.alertRules[alertRuleIndex], 'edit');*/
	});
}

// TODO: Check listeners are removed when element is discarded
function populateAddNewAlertRules() {

	newAlertRule.flag.value = "";

	socket.emit('get-loggedin-user-email', newAlertRule);
}

function populateAlertRulesAdd(data) 
{
	populateEditAlertRules(data.alert_rule, 'add');
}

function populateAddNewUser() {
	populateEditUser(newUser, 'add');
}

function populateAddNewKeyword() {
	populateEditKeyword(newKeyword, 'add')
}

// TODO: Check listeners are removed when element is discarded
function populateEditUser(data, editType) {
	
	if( data.user != undefined )
		data = data.user;
	
	new EJS({url: '/widgets/user-detail.ejs'}).update('detail_view', { data: data, editType: editType });
	$("#detail_view .list-wrapper").fadeTo("slow", 1);

 	// if( $("#detail_view .list-wrapper").length )
	// 	$("#detail_view .list-wrapper").fadeTo("slow", 0.1, function()
	// 	{
	// 		new EJS({url: '/widgets/user-detail.ejs'}).update('detail_view', { data: data.user, editType: editType });
	// 		$(this).fadeTo("slow", 1);
	// 	});
	// else
	// 	new EJS({url: '/widgets/user-detail.ejs'}).update('detail_view', { data: data.user, editType: editType });


	$('.user-edit.add-form #save').click(function(e) {return doUserAdd(e, serializeFormData($('.user-edit')))});
	$('.user-edit.edit-form #save').click(function(e) {return doUserSave(e, serializeFormData($('.user-edit')))});
	$('.user-edit.edit-form #delete').click(function(e) {

		e.preventDefault();

		var msg = 'Are you sure you want to permanently delete the selected element ?';
        var div = $("<div>" + msg + "</div>");
        div.dialog({
            title: "Confirm",
            buttons: [
                        {
                            text: "Yes",
                            click: function () {
                                //add ur stuffs here
								doUserDelete(e, serializeFormData($('.user-edit')));

								div.dialog("close");
                            }
                        },
                        {
                            text: "No",
                            click: function () {
                                div.dialog("close");
                            }
                        }
                    ]
        });	
	});
	$('.user-edit #cancel').click(function(e) {return removeDetailView()});

	showLoader(false);
}

// TODO: Check listeners are removed when element is discarded
function populateEditKeyword(data, editType) {

	new EJS({url: '/widgets/keyword-detail.ejs'}).update('detail_view', {
		data: data,
		editType: editType
	});
	$('.keyword-edit.add-form #save').click(function(e) {return doKeywordAdd(e, serializeFormData($('.keyword-edit')))});
	$('.keyword-edit.edit-form #delete').click(function(e) {
		
		e.preventDefault();

		var msg = 'Are you sure you want to permanently delete the selected element ?';
        var div = $("<div>" + msg + "</div>");
        div.dialog({
            title: "Confirm",
            buttons: [
                        {
                            text: "Yes",
                            click: function () {
                                //add ur stuffs here
								doKeywordDelete(e, serializeFormData($('.keyword-edit')));

								div.dialog("close");
                            }
                        },
                        {
                            text: "No",
                            click: function () {
                                div.dialog("close");
                            }
                        }
                    ]
        });		
	});

	$('.keyword-edit #cancel').click(function(e) {return removeDetailView()});

	showLoader(false);
}

function populateEditAlertRules(data, editType) {

	if( data.alert_rule != undefined )
		data = data.alert_rule;

	var _i, _len, obj,
		keywordOptions = [];
	for (_i in keywords) {
	  obj = keywords[_i];
	  keywordOptions.push(obj.keyword.value);
	}
	data.keyword.options = keywordOptions;	
	data.sentiment.options || (data.sentiment.options = newAlertRule.sentiment.options)

	new EJS({url: '/widgets/alert-rule-detail.ejs'}).update('detail_view', {
		data: data,
		editType: editType
	});

	// chosen plugin for keyword drop down boxes
	$("#detail_view #keyword").chosen({allow_single_deselect:true});
	$("#detail_view #keyword").each(function(){

		$(this).empty();
		$(this).prepend("<option></option>");

		for(var _i=0, _len=data.keyword.options.length; _i < _len; _i++) {               
			var s = '<option value="'+data.keyword.options[_i]+ '">'+data.keyword.options[_i]+'</option>';
			$(this).append(s);
		}

		$(this).val(data.keyword.value);
	});
	$("#detail_view #keyword").trigger("liszt:updated");

	// chosen plugin for sentiment drop down boxes
	$("#detail_view #sentiment").chosen({allow_single_deselect:true});
	$("#detail_view #sentiment").each(function(){

		$(this).empty();
		$(this).prepend("<option></option>");

		for(var _i=0, _len=data.sentiment.options.length; _i < _len; _i++) {               
			var value = data.sentiment.options[_i];
			if (data.sentiment.options[_i] == 'all') {
				value = "";
			}

			var s = '<option value="'+ value + '">'+data.sentiment.options[_i]+'</option>';
			$(this).append(s);
		}

		$(this).val(data.sentiment.value);
	});
	$("#detail_view #sentiment").trigger("liszt:updated");
			

	$('.alert-rule-edit.add-form #save').click(function(e) {return doAlertRuleAdd(e, serializeFormData($(  '.alert-rule-edit')))});
	$('.alert-rule-edit.edit-form #save').click(function(e) {return doAlertRuleSave(e, serializeFormData($('.alert-rule-edit')))});
	$('.alert-rule-edit.edit-form #delete').click(function(e) {		
		e.preventDefault();

		var msg = 'Are you sure you want to permanently delete the selected element ?';
        var div = $("<div>" + msg + "</div>");
        div.dialog({
            title: "Confirm",
            buttons: [
                        {
                            text: "Yes",
                            click: function () {
                                //add ur stuffs here
								doAlertRuleDelete(e, serializeFormData($( '.alert-rule-edit')));
								div.dialog("close");
                            }
                        },
                        {
                            text: "No",
                            click: function () {
                                div.dialog("close");
                            }
                        }
                    ]
        });

	});
	$('.alert-rule-edit #cancel').click(function(e) {return removeDetailView()});

	showLoader(false);
}

function removeDetailView() {
	$('#detail_view').html('');
}

function doUserAdd(event, data) {
	//showLoader(true);
	var saltAndHashedPassword = saltAndHashPassword(data.password);
	data.salt = saltAndHashedPassword.salt
	data.password = saltAndHashedPassword.password
	socket.emit('add-user-request', data);
	return false;
}

function doUserSave(event, data) {
	showLoader(true);

	var rawPassword = data.password,
		saltAndHashedPassword = saltAndHashPassword(rawPassword);

	data.salt = saltAndHashedPassword.salt
	data.password = saltAndHashedPassword.password
	socket.emit('edit-user-request', data);
	return false;
}

function doUserDelete(event, data) {
	showLoader(true);
	socket.emit('delete-user-request', data);
	return false;
}

function doKeywordAdd(event, data) {
	showLoader(true);
	socket.emit('add-keyword-request', data);
	return false;
}

// function doKeywordSave(event, data) {
// 	socket.emit('edit-keyword-request', data);
// 	return false;
// }

function doKeywordDelete(event, data) {
	showLoader(true);
	socket.emit('delete-keyword-request', data);
	return false;
}

function doAlertRuleAdd(event, data) {
	showLoader(true);

	socket.emit('add-alert-rule-request', data);
	return false;
}

function doAlertRuleSave(event, data) {
	showLoader(true);

	socket.emit('edit-alert-rule-request', data);
	return false;
}

function doAlertRuleDelete(event, data) {
	showLoader(true);

	socket.emit('delete-alert-rule-request', data);
	return false;
}

var newUser = {
	username: {
		placeholder: 'Username'
	},
	fullname: {
		placeholder: 'Full Name'
	},
	email: {
		placeholder: 'Email'
	},
	password: {
		placeholder: 'password'
	},
	sendAlerts: {
		default: true
	}
}

var newKeyword = {
	keyword: {
		placeholder: 'Keyword'
	},
	isPhrase: {
		default: false
	}
}

var newAlertRule = {
	ruleName: {
		placeholder: 'Rule Name'
	},
	twitterUsername: {
		placeholder: "Twitter Username"
	},
	email: {
		placeholder: "Logged In Email"
	},
	mobile: {
		placeholder: "Mobile Number"
	},
	keyword: {
		options: {}
	},
	sentiment: {
		options: ['all', 'positive', 'negative', 'neutral']
	},
	flag: {
		value: ""
	}
}

})()

// takes a jquery form element
function serializeFormData(form) {
	var result = {}

	var disabled = form.find(':input:disabled').removeAttr('disabled');

	form.serializeArray().forEach(function(element){
		result[element.name] = element.value;
	});

	disabled.attr('disabled','disabled');

	return result;
}