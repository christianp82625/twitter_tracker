
var sentimentWidget = (function(container, selectBox){
	
	var containerId = container,
  	myData = new Array(),	
	keywordChange = '#'+selectBox,
	
	addSentiments = function(keyword, data) {	 
	  	//alert(keyword);
		//$(keywordChange).append('<option value="'+keyword+'">'+keyword+'</option>');
		//$(keywordChange).append('<li><a href="#">'+keyword+'</a></li>');

		myData[keyword] = data;		
	},
	
	bindSelectBox = function(keyword) {	  	
		//$(keywordChange).bind('change', sentimentKeywordChangeHandler);
		//$(keywordChange).live('change', sentimentKeywordChangeHandler);
	},
	
	sentimentKeywordChangeHandler = function() {		
		//e.preventDefault();
		var selectedValue = $(this).val();

		drawChart(myData[selectedValue]);		
	},
	
	drawChart = function(data, xAxisCategory)
		{
			Highcharts.setOptions({                                            
                global : {
                    useUTC : true
                }
            });

			var	chart = new Highcharts.Chart({
				chart: {
					renderTo: containerId,
					type: 'spline',
					marginRight: 25,
					marginBottom: 25
				},
				exporting: { enabled: false },
				title: {
					text: '  ', //'Sentiments',
					x: -20 //center
				},
				/*subtitle: {
					text: '  ',// 'Source: Sentiments.com',
					x: -20
				},*/
				xAxis: {
					type: 'datetime',
					labels: {
						formatter: function() {
//							return Highcharts.dateFormat('%d/%b:%H', this.value);
							return Highcharts.dateFormat('%H', this.value);
						}
					},
					categories: xAxisCategory
				},
				yAxis: {

					title: {
						text: '   ' //'Sentiments'
					},

					/*title: {
						text: 'Sentiments'
					},*/

					plotLines: [{
						value: 0,
						width: 1,
						color: '#808080'
					}]
				},
				tooltip: {
					formatter: function() {
							return '<b>'+ this.series.name +'</b><br/>'+
							Highcharts.dateFormat('%Y-%m-%d %H', this.x) + ': '+ this.y +'';
					}
				},
				legend: {
					layout: 'vertical',
					align: 'right',
					verticalAlign: 'top',
					x: -10,
					y: 100,
					borderWidth: 0
				},
				series: data
			});
		};
		
	return {
		
		addSentiments:addSentiments,
		bindSelectBox:bindSelectBox,
		sentimentKeywordChangeHandler:sentimentKeywordChangeHandler,
		drawChart:drawChart		
	};
});
