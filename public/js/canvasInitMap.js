function initCanvas(canvas) {
	if (typeof G_vmlCanvasManager != "undefined") {
	  G_vmlCanvasManager.initElement(canvas);
	}
	return canvas;
}
/*
jQuery(function($){
	$('#maps').smoothZoom({
		width: 537,
		height:357,
		responsive: false,
		responsive_maintain_ratio: true,
		max_WIDTH: '',
		max_HEIGHT: ''
	});
});
*/
jQuery(function($){
    $('#maps').smoothZoom({
        width: 537,
        height:300,
        responsive: false,
        responsive_maintain_ratio: true,
        max_WIDTH: '',
        max_HEIGHT: ''
    });
});