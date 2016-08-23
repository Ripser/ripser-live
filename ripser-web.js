var running_since;

var f = "";
var fileInput;

var range;

var worker;

function init() {
    (worker = new Worker('ripser-worker.js')).addEventListener('message', handleMessage, false);

    fileInput = document.getElementById('fileInput');

    fileInput.addEventListener('change', read_and_compute);
    
    document.getElementById('dim').addEventListener('change', compute);
    document.getElementById('threshold').addEventListener('change', compute);
    
    document.getElementById('format').addEventListener('change', function(e) {fileInput.value = null; read_and_compute()});
}

function moduleDidLoad() {
    common.hideModule();
    worker = common.naclModule;
}

function handleCrash(event) {
    fileInput.value = null;
    common.removeModule();
    document.dispatchEvent(new Event('DOMContentLoaded'));
}

function read_and_compute() {
    document.getElementById('log').textContent = "";
    document.getElementById('time').innerHTML = "";
	document.getElementById('barcodes').innerHTML = "";
	
	f = "";
	
    var file = fileInput.files[0];
    
    if (file == undefined) return;
    
    var reader = new FileReader();
    reader.onload = function(e) {
        f = reader.result;
		
		if (f != "") compute();
    }
    reader.readAsText(file);
}

function parseFloatWithDefault(s, d) {
	var result = parseFloat(s);
	return isNaN(result) ? d : result;
}

function compute() {
    
	document.getElementById('log').textContent = "";
	document.getElementById('time').innerHTML = "";
	document.getElementById('barcodes').innerHTML = "";
	
	if (f == "") return;
	
	if (running_since != undefined) {
		worker.terminate();
		(worker = new Worker('ripser-worker.js')).addEventListener('message', handleMessage, false);
	}
	
    running_since = (new Date()).getTime();
    
    worker.postMessage({ 'file': f, 'dim': parseInt(dim.value), 'threshold': parseFloatWithDefault(threshold.value, Infinity), 'format': parseInt(format.value) });
    
}

function chop(x) {
	return typeof x == "number" ? x.toPrecision(3) / 1 : x;
}

function handleMessage(message) {
    document.getElementById("time").innerHTML = "Elapsed time: " + ((new Date()).getTime() - running_since)/1000.0 + " seconds" + ((message.data == undefined) ? "" : "&hellip;");
    if (message.data == undefined) {
        running_since = undefined;
	} else if (message.data.type == "dim") {
		document.getElementById('log').innerHTML += "persistence intervals in dim " + message.data.dim + ":\n";
		//document.getElementById('barcodes').innerHTML += "<p>persistence intervals in dim " + message.data.dim + ":</p>";
		if (message.data.dim > 0)
		{
			d3.select("#barcodes").append("p").text("Persistence intervals in dimension " + message.data.dim + ":\n");
			initBarcode(range, message.data.dim);
		}
	} else if (message.data.type == "interval") {
		if (message.data.dim > 0)
		{
			insertBar(message.data.birth, (message.data.death ? message.data.death : range[1] + 0.01*(range[1] - range[0])));
		}
		document.getElementById('log').innerHTML += " [" + chop(message.data.birth) + "," +
		(message.data.death ? chop(message.data.death) + ")\n" : (isNaN(parseFloat(threshold.value))? "&infin;)\n" : parseFloat(threshold.value) + "]\n"));
	} else if (message.data.type == "point-cloud") {
		document.getElementById('log').innerHTML += "point cloud with " + message.data.number + " points in dimension " + message.data.dim + "\n";
	} else if (message.data.type == "distance-matrix") {
		document.getElementById('log').innerHTML += "distance matrix with " + message.data.number + " points\n" +
		"value range: [" + chop(message.data.min) + ',' + chop(message.data.max) + "]\n";
		range = [0, Math.min(message.data.max,parseFloat(threshold.value)||Infinity)];
	} else if (typeof message.data == "string") {
		document.getElementById('log').innerHTML += message.data;
    }
}



var index = [],data = [];

var x, y, g, svg, barcode;

var margin = {top: 24, right: 12, bottom: 0, left: 12},
width = 890 - margin.left - margin.right,
height = barcodeHeight();


function barcodeHeight() {
	return 8 * data.length;
}

function initBarcode(valueRange, dim) {
	
	index = [],data = [];
	//console.log(data);
	
	x = d3.scaleLinear()
	.domain(valueRange)
	.range([0, width]);
	
	y = d3.scaleBand()
	.domain(index)
	.range([0, height])
	.paddingInner(0.5)
	.paddingOuter(0.25)
	.round(.5);
	
	svg = d3.select("#barcodes").append("svg")
	.attr("width", width + margin.left + margin.right)
	.attr("height", margin.top + margin.bottom);
	
	svg.append("g")
	.attr("class", "x axis")
	.attr("transform", "translate(" + margin.left + "," + (margin.top - 3) + ")")
	.call(d3.axisTop().scale(x));
	
	g = svg.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
	.attr("fill", d3.schemeCategory10[dim - 1]);
	
}

function insertBar(birth, death) {
	
	index.push(data.length);
	data.push({"birth": birth, "death": death});
	index.sort(function(a, b) { return data[b].death - data[b].birth - data[a].death + data[a].birth; });
	
	height = barcodeHeight();
	y.domain(index).range([0, height]);
		
	svg.transition().attr("height", height + margin.top + margin.bottom);

	g.selectAll(".bar").data(data)
	.enter()
	.append("g")
	.attr("class", "bar")
	.attr("transform", function(d, i) { return "translate(0," + y(i)  + ")"; })
	.append("rect")
	.attr("height", y.bandwidth())
	.attr("width", function(d) { return x(d.death) - x(d.birth); })
	.attr("x", function(d) { return x(d.birth); });

	g.selectAll(".bar").data(data)
	.transition()
	.attr("transform", function(d, i) { return "translate(0," + y(i) + ")"; });

}

