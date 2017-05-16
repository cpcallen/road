
var size = {width: 1000, height:400};
var padding = {left:40, right:10, top:10, bottom:30};

var rawknots = [[1431606400,0],[1441606400,0], [1454284800,2], [1457284800,5], [1460284800,0], [1463284800,-1], [1493284800,-1]];
var knots = [];
updateKnotArray();
var xMin = d3.min(knots.slice(1,knots.length), function(d) { return d[0]; });
var xMax = d3.max(knots, function(d) { return d[0]; });
var yMin = d3.min(knots, function(d) { return d[1]; });
var yMax = d3.max(knots, function(d) { return d[1]; });
xMin = xMin - 0.05*(xMax - xMin);
xMax = xMax + 0.05*(xMax - xMin);
yMin = yMin - 0.05*(yMax - yMin);
yMax = yMax + 0.05*(yMax - yMin);

// Create and initialize the SVG chart and its components
var chart = d3.select('.content')
	.append('svg:svg')
	.attr('width', size.width)
	.attr('height', size.height)
	.attr('id', 'roadchart')
	.attr('class', 'chart');
chart.append('def').append("clipPath")
    .attr("id", "clipper")
    .append("rect")
    .attr("x", padding.left)
    .attr("y", padding.right)
    .attr("width", size.width-padding.left-padding.right)
    .attr("height", size.height-padding.top-padding.bottom);

// Create a rectange to monitor zoom events and install initial handlers
var zoomarea = chart.append('rect')
    .attr("class", "zoomarea")
    .attr("x", padding.left)
    .attr("y", padding.right)
    .attr("width", size.width-padding.left-padding.right)
    .attr("height", size.height-padding.top-padding.bottom);
var axisZoom = d3.zoom()
        .scaleExtent([1, 10])
        .translateExtent([[0, 0], [size.width, size.height]])
        .on("zoom", updateZoom);
zoomarea.call(axisZoom);

// Create plotting area above the zooming area so points can be selected
var plot = chart.append('g')
	    .attr('class', 'main')
        .attr('clip-path', 'url(#clipper)')
        .append('g')
	    .attr('class', 'plot');

// Create and initialize the x and y axes
var xScale = d3.scaleTime()
        .domain([new Date(xMin*1000), new Date(xMax*1000)])
        .range([padding.left,size.width-padding.right]);
var xAxis = d3.axisBottom(xScale).ticks(6);
var xAxisObj = chart.append('g')        
        .attr("class", "axis")
        .attr("transform", "translate(0," + (size.height - padding.bottom) + ")")
        .call(xAxis);
var yScale = d3.scaleLinear()
        .domain([yMin, yMax])
        .range([size.height-padding.bottom, padding.top]);
var yAxis = d3.axisLeft(yScale);
var yAxisObj = chart.append('g')        
        .attr("class", "axis")
        .attr("transform", "translate(" + padding.left + ",0)")
        .call(yAxis);

// These keep the current scaling factors for x and y axes
var xFactor = 1, yFactor = 1;
// These are the updated scale objects based on the current transform
var newXScale = xScale, newYScale = yScale;

function updateZoom() {
    // Inject the current transform into the plot element
    var tr = d3.event.transform;
    plot.attr("transform", tr);

    // Rescale x and y axes
    newXScale = tr.rescaleX(xScale);
    newYScale = tr.rescaleY(yScale);
    xAxisObj.call(xAxis.scale(newXScale));
    yAxisObj.call(yAxis.scale(newYScale));

    // Compute scaling factors and adjust translation limits for zooming
    xFactor = tr.applyX(1) - tr.applyX(0);
    yFactor = tr.applyY(1) - tr.applyY(0);
    axisZoom.translateExtent([[xScale(xMin*1000)-padding.left/xFactor, yScale(yMax)-padding.top/yFactor], [xScale(xMax*1000)+padding.right/xFactor, yScale(yMin)+padding.bottom/yFactor]]);

    // Readjust point sizes and line widths with the current scale
    plot.selectAll("line.roads").style("stroke-width",2/xFactor);
    plot.selectAll("line.knots").style("stroke-width",3/xFactor);
    plot.selectAll("circle.dots").attr("r",5/xFactor);
    plot.selectAll("circle.dots").style("stroke-width",1/xFactor);
}

function updateKnotArray() {
    for (var i = 0; i < rawknots.length-1; i++) {
        knots.push(rawknots[i].concat(rawknots[i+1]));
    }
}

function updateData() {

    kn = plot.selectAll("line.knots").data(knots);
    kn.exit().remove();
    kn.enter().append("svg:line")
		.attr("class","knots")
		.attr("y1",yScale(yMin))
		.attr("y2",yScale(yMax))
		.attr("x1", function(d){ return xScale(d[0]*1000)})
		.attr("x2", function(d){ return xScale(d[0]*1000)})
		.attr("stroke", "rgb(200,200,200)") 
		.style("stroke-width",3/xFactor)
		.attr("id", function(d,i) {return i;})
		.attr("name", function(d,i) {return "knot"+i;})
		.on("mouseover",function() {
			d3.select(this).style("stroke-width",6/xFactor);})
		.on("mouseout",function() {
			d3.select(this).style("stroke-width",3/xFactor);});

    // Create, update and delete road lines
    kn = plot.selectAll("line.roads").data(knots);
    kn.attr("y1",function(d){ return yScale(d[1]);})
		.attr("y2",function(d){ return yScale(d[3]);})
		.attr("x1", function(d){ return xScale(d[0]*1000);})
		.attr("x2", function(d){ return xScale(d[2]*1000);})
		.style("stroke-width",2/xFactor);
    
    kn.exit().remove();
    kn.enter().append("svg:line")
		.attr("class","roads")
		.attr("y1",function(d){ return yScale(d[1]);})
		.attr("y2",function(d){ return yScale(d[3]);})
		.attr("x1", function(d){ return xScale(d[0]*1000);})
		.attr("x2", function(d){ return xScale(d[2]*1000);})
		.style("stroke-width",2/xFactor)
		.attr("id", function(d,i) {return i;})
		.attr("name", function(d,i) {return "road"+i;});

    // Create, update and delete inflection points
    kn = plot.selectAll("circle.dots").data(knots);
    kn.attr("cy",function(d){ return yScale(d[1]);})
		.attr("cx", function(d){ return xScale(d[0]*1000);})
		.attr("stroke-width", 1/xFactor);
    kn.exit().remove();
    kn.enter().append("svg:circle")
		.attr("class","dots")
		.attr("cy",function(d){ return yScale(d[1]);})
		.attr("cx", function(d){ return xScale(d[0]*1000);})
		.style("stroke-width", 1/xFactor) 
		.attr("r",5/xFactor)
		.attr("id", function(d,i) {return i;})
		.attr("name", function(d,i) {return "dot"+i;});

}

// Reset button restores zooming transformation to identity
function resetZoom() {
    xFactor = 1; yFactor = 1;
    newXScale = xScale; newYScale = yScale;
    zoomarea.call(axisZoom.transform, d3.zoomIdentity);
}
d3.select("button#reset").on("click", resetZoom);

// Saving the current zoom updates x and y scale objects and resets
// the zoom transform to identity afterwards. This also requires an
// update to data elements
function saveZoom() {
    var curScale = axisZoom.scaleExtent();
    axisZoom.scaleExtent([curScale[0]/xFactor, curScale[1]/yFactor]);
    xFactor = 1; yFactor = 1;
    xScale = newXScale; yScale = newYScale;
    zoomarea.call(axisZoom.transform, d3.zoomIdentity);
    // This ensures that data components are moved to their new coordinates
    updateData();
}
d3.select("button#savezoom").on("click", saveZoom);

updateData();

//self.setInterval(function() {data.push([10*Math.random(), 10*Math.random()]); updateData();}, 100);
