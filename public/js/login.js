(function() {

$(document).ready(function(){
	$('.login form.login-form').submit(function() {
		var form = this;
		
		form.passwordHash.value = hashPassword(form.password.value);
		form.password.value = ''
		queryStringMatch = window.location.search.match(/(\?redir=)(.*(\?.*)?)(&.*)*/)
		if (queryStringMatch){
			form.redir.value = queryStringMatch[2]
		}
		
		return true;
	})
})

})();