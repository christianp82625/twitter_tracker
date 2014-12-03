/*
(function($){
	$(window).load(function(){
		$("#content_1,#content_2,#content_3,#content_4").mCustomScrollbar({
			set_width:false, 
			set_height:false,
			horizontalScroll:false,
			scrollInertia:550, 
			scrollEasing:"easeOutCirc",
			mouseWheel:"auto", 
			autoDraggerLength:true,
			scrollButtons:{
				enable:false,
				scrollType:"continuous",
				scrollSpeed:20,
				scrollAmount:40
			},
			advanced:{
				updateOnBrowserResize:true,
				updateOnContentResize:false,
				autoExpandHorizontalScroll:false
			},
			callbacks:{
				onScroll:function(){},
				onTotalScroll:function(){},
				onTotalScrollOffset:0 
			}
		});
	});
})(jQuery);
*/

(function($){
	$(window).load(function(){
		$("#content_1,#content_2,#content_3,#content_4, #users_content").mCustomScrollbar()
	})
})(jQuery);