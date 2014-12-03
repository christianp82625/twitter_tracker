//window.$yellowhost="/js/sentimentdata.js"; // sentimants

var dots=[];
var delta=60;
var w=922,h=666;
var fr=Math.ceil(1000/60);

var dot_size = 2;
var longitude_shift = 0;   // number of pixels your map's prime meridian is off-center.
var x_pos = -30;
var y_pos = 0;
var map_width = 922;
var map_height = 666;
var map_diagonal=Math.sqrt(map_width*map_width + map_height*map_height);
var half_dot = Math.floor(dot_size / 2);
var min_x=w,min_y=h,min_w=60,min_h=delta+30;
var your_country="XX";

var running_time=0;
window.show_labels=false;
window.d3=false;
window.sat=false;
window.starting_time=new Date().getTime();

var heatmap=new heatmapApp();

var PI=Math.PI,TWO_PI=PI*2,PI_QUARTER=PI/4,DEG_TO_RAD=PI/180;

var interval=null;

var canvas,ctx,bcanvas,bctx,tcanvas,tctx;

var _ceil=function(n){
		var f = (n << 0),
			f = f == n ? f : f + 1;
		return f;
	};

var last_id=0,
	span=60;

var sentimap_index;

var jsondata = [];

window._dot=function(x,y,a) {
	try{
		ctx.beginPath();
		ctx.arc(x-half_dot, y-half_dot, dot_size, 0, TWO_PI, false); 
		ctx.fill();
		//var maps = document.getElementById("maps");
		//maps.appendChild(canvas)		
	} catch(e){
	}
};

function clearDots(t){
	while(dots.length>0 && dots[0].t<t) {
		dots.splice(0,1);
	}
}
function get_point(lat, lng) {
    // Mercator projection

    // longitude: just scale and shift
    x = (map_width * (180 + lng) / 360 + longitude_shift) % map_width;

    // latitude: using the Mercator projection
    lat = lat * DEG_TO_RAD;  // convert from degrees to radians
    y = Math.log(Math.tan((lat/2) + (PI_QUARTER)));  // do the Mercator projection (w/ equator of 2pi units)
    y = (map_height / 2) - (map_width * y / (TWO_PI)) + y_pos;   // fit it to our map

    return {
		x:x - half_dot,
		y:y - half_dot
	};
};

function passSentimentMap(data) 
{
	jsondata = data;

	sentimap_index = 0;

	showLoader(false);				
	$("#lazy-loader").hide();

	DrawMap();


};

//(function($){
function DrawMap() {

	window.getFlashMovie=function(movieName) {
	  	var isIE = navigator.appName.indexOf("Microsoft") != -1;
	  	var r=(isIE) ? window[movieName] : document[movieName];
		return r;
	}

	window.executeFunction=function(fn,par){
		try {
			getFlashMovie("flash").executeFunction(fn,par);
		} catch(e) {
		}
	}
	
	if(!window.degrade) {
		canvas = initCanvas(document.getElementById("d"));
		//canvas=document.getElementById("d");		
		if( canvas!=null )
			ctx=canvas.getContext("2d");	
	}
	var x=0;

	var easeOutQuad= function (x, t, b, c, d) {
		return -c *(t/=d)*(t-2) + b;
	}	 	
	
	function fake_jump(dot){
		if(!dot.placed){
			dot.placed=1;
			//increaseTotalTweets();
		}
	}
	
	function jump(dot){
		//alert(sentiment);
		var d=(dot.y2-dot.y);
		if(dot.a>0)
			_dot(dot.x,dot.y+= _ceil((d/delta)));
		if(d>2){
		} else {
			var c;
			if(!dot.placed){
				dot.placed=1;
				if(dot.senti == "neutral")
				{
					heatmap.addSpotYellow(dot.x,dot.y);
				}
				if(dot.senti == "positive")
				{
					heatmap.addSpotGreen(dot.x,dot.y);
				}
				if(dot.senti == "negative")
				{
					heatmap.addSpotRed(dot.x,dot.y);
				}
			}
			dot.a=(dot.a>0)?dot.a-0.025:0;
		}
	}

	function sentimentResult() {

		var sentiment;		
		
		/*if (jsondata.length)
		{			
			if(window.degrade) {
				var t=setInterval(function(){
					try {								
						executeFunction("getJSON",jsondata.sentiments);
					} catch(e) {

					} finally {
						clearInterval(t);
					}
				},1000);						
			}*/

			(function createDotFromTweets(){
				sentiment = jsondata.sentiments[sentimap_index++];
				//console.log (sentiment.lat + "," + sentiment.long);
				if (jsondata.length != 0)
				{
					if (sentiment.lat != "" && sentiment.long != "")
					{
						//console.log ("pass : "+sentiment.lat + "," + sentiment.long);
						var lat= parseFloat(sentiment.lat),
							lng= parseFloat(sentiment.long);
						
				
						if(lat!=0 && lng!=0) {
							p=get_point(lat, lng)
							min_x=Math.min(min_x,p.x-5+x_pos);
							min_y=Math.min(min_y,p.y-delta-5);
							min_w=Math.max(min_w,p.x-min_x+30+x_pos);
							min_h=Math.max(min_h,p.y-min_y+5);
							dots.push({
								x:p.x+x_pos,
								y:p.y-delta,
								y2:p.y,
								moving:true,
								senti:sentiment.sentiment,
								//cc:sentiment.cc,
								n:null,
								a:1
							});
							last_id=sentiment.key;
						}
					}				
				}
				//alert(json.sentiments.length);
				//clearDots();
			
				if(sentimap_index <jsondata.length) {
					setTimeout(createDotFromTweets,1000);
				} 
			})();		
		/*} else {
			setTimeout(sentimentResult,1000);
		}*/
	}

/*	function getSentiment() {		
		var url = $yellowhost;		
		$.ajax({
		    url: url,			
			dataType: 'json',
			success: function(json){				
				
				if(json.sentiments.length) {
					var sentiment;					
					if(window.degrade) {
						var t=setInterval(function(){
							try {								
								executeFunction("getJSON",json);
							} catch(e) {

							} finally {
								clearInterval(t);
							}
						},1000);						
					}
					(function createDotFromTweets(){
						sentiment=json.sentiments[0];						
						var lat= parseFloat(sentiment.lat),
							lng= parseFloat(sentiment.lng);
						if(lat!=0 && lng!=0) {
							p=get_point(lat, lng)
							min_x=Math.min(min_x,p.x-5+x_pos);
							min_y=Math.min(min_y,p.y-delta-5);
							min_w=Math.max(min_w,p.x-min_x+30+x_pos);
							min_h=Math.max(min_h,p.y-min_y+5);
							dots.push({
								x:p.x+x_pos,
								y:p.y-delta,
								y2:p.y,
								moving:true,
								senti:sentiment.senti,
								//cc:sentiment.cc,
								n:null,
								a:1
							});
							//last_id=sentiment.id;
						}
						json.sentiments.splice(0,1);
						//alert(json.sentiments.length);
						//clearDots();
						if(json.sentiments.length>1) {
							setTimeout(createDotFromTweets,1000);
						} else {
							try {
								last_id=json.sentiments[json.sentiments.length-1].id;
								setTimeout(getSentiment,2000);

							} catch(e){							
								setTimeout(getSentiment,5000);
							}
						}
					})();
					
				} else {
					setTimeout(getSentiment,1000);
				}
			}
		});		
	};*/
	
	(function drawChart(){
		var data=[20,30,30,20,10,30,20,30];
		var str="",margin=3,w=Math.floor(922/data.length)-margin*2;
		
		$.each(data,function(i,d){
				str+="<div><div style=\"height:40px\"></div><h5>UK</h5></div>";
		});
		$("#chart").html(str);
	});
	
	var i=0,l,to=0,imgs=["img/world_map_5467_1_2.jpg"],loaded=0;
	
	jQuery.each(imgs,function(index,img){
		var image=new Image();

		image.onload=function(){
			loaded++;
		}
		image.src=img;
	});
	(function startSentiments(){
		if((loaded==1 && !window.degrade)) {
			//$(".loading").fadeOut(500);		
			//getSentiment();
			sentimentResult();
			loop();					
		} else
			setTimeout(startSentiments,1000);
	}());
	
	
	function loop(){
		//alert(sentiment);

		if( ctx==undefined )
			return;
		
		if(!window.degrade) {
			ctx.globalCompositeOperation = 'source-in';
			ctx.fillStyle = 'rgba(84,238,255,0.8)';
			ctx.fillRect(min_x,min_y,min_w,min_h+span);

			ctx.globalCompositeOperation = 'source-over';
			ctx.fillStyle = 'rgba(84,238,255,1)';
		}
		l=dots.length,i=0;

		while(i<l) {
			if(!window.degrade) {
				jump(dots[i]);
			} else {
				fake_jump(dots[i])
			} 
			i++;
		}		
		to=setTimeout(loop,fr);
	};
	
	if(!window.degrade) {
		heatmap.initialize("hmap",922,666);
		//tctx.font="30px CABNDWebBold";
	}		
};
//}(jQuery))

sentimap_index = 0;
socket.emit("get_sentimentmap", {keyword: "all"});

