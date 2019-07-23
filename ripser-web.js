var running_since;

var f = "";

var range;

var worker;

var worker_ready = false;

var dimMin;

function init() {

    (worker = new Worker("ripser-worker.js")).addEventListener("message", handleMessage, false);
    fileInput.addEventListener("change", read_and_compute);
    
	dim.addEventListener("change", compute);
	dim_min.addEventListener("change", compute);
    threshold.addEventListener("change", compute);
    
    format.addEventListener("change", function(e) {fileInput.value = null; read_and_compute()});
		
	var searchVars = {};
	if (window.location.search.length > 1) {
		var pairs = window.location.search.substr(1).split('&');
		for (var key_ix = 0; key_ix < pairs.length; key_ix++) {
			var keyValue = pairs[key_ix].split('=');
			searchVars[unescape(keyValue[0])] =
			keyValue.length > 1 ? unescape(keyValue[1]) : '';
		}
	}
	
	var HttpClient = function() {
		this.get = function(aUrl, aCallback) {
			var anHttpRequest = new XMLHttpRequest();
			anHttpRequest.onreadystatechange = function() {
				if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200)
					aCallback(anHttpRequest.responseText);
			}
			
			anHttpRequest.open( "GET", aUrl, true );
			anHttpRequest.send( null );
		}
	}
	
	if (searchVars.dim) {
		dim.value = searchVars.dim;
	}
	
	if (searchVars.dim_min) {
		dim_min.value = searchVars.dim_min;
	}
	
	if (searchVars.threshold) {
		threshold.value = searchVars.threshold;
	}
	
	if (searchVars.format) {
		format.value =
		{
			"lower-distance" : 0,
			"upper-distance" : 1,
			"distance" : 2,
			"point-cloud" : 3,
			"dipha" : 4,
		}[searchVars.format];
	}
	
	if (searchVars.url) {
		var client = new HttpClient();
		client.get(searchVars.url, function(data) {
			  f = data;
			  compute();
			  });
	}
	
}

function read_and_compute() {
    log.textContent = "";
    time.innerHTML = "";
	barcodes.innerHTML = "";
	
	f = "";
	
    var file = fileInput.files[0];
    
    if (file == undefined) return;
    
    var reader = new FileReader();
    reader.onload = function(e) {
        f = reader.result;
		
		compute();
    }
    reader.readAsBinaryString(file);
}

function parseFloatWithDefault(s, d) {
	var result = parseFloat(s);
	return isNaN(result) ? d : result;
}

function compute() {
    
	if (f == "") return;
	
	if (worker == undefined) return;
	
	if (!worker_ready) return;
	
	log.textContent = "";
	time.innerHTML = "";
	barcodes.innerHTML = "";
	
	
	if (running_since != undefined) {
		worker.terminate();
		(worker = new Worker("ripser-worker.js")).addEventListener("message", handleMessage, false);
	}
	
    running_since = (new Date()).getTime();
	
	dimMin = parseInt(document.getElementById("dim_min").value) || 0;
	
    worker.postMessage({ "file": f, "dim": parseInt(dim.value), "threshold": parseFloatWithDefault(threshold.value, Infinity), "format": parseInt(format.value) });
    
}

function chop(x) {
	return typeof x == "number" ? x.toPrecision(6) / 1 : x;
}

function handleMessage(message) {
	if (message.data.type == "ready") {
		worker_ready = true;
		compute();
	} else if (message.data.type == "abort") {
		worker.terminate();
		worker_ready = false;

		log.textContent = "";
		time.innerHTML = "";
		barcodes.innerHTML = "";
	} else {
		time.innerHTML = "Elapsed time: " + ((new Date()).getTime() - running_since)/1000.0 + " seconds" + ((message.data.type == "finished") ? "" : "&hellip;");

		if (message.data.type == "finished") {
        	running_since = undefined;
		} else if (message.data.type == "dim") {
			log.innerHTML += "persistence intervals in dim " + message.data.dim + ":\n";
			//document.getElementById("barcodes").innerHTML += "<p>persistence intervals in dim " + message.data.dim + ":</p>";
			if (message.data.dim >= dimMin)
			{
				d3.select("#barcodes").append("p").text("Persistence intervals in dimension " + message.data.dim + ":\n");
				initBarcode(range, message.data.dim);
			}
		} else if (message.data.type == "interval") {
			if (message.data.dim >= dimMin) // && (message.data.death - message.data.birth > 0.005 * range[1]))
			{
				insertBar(message.data.birth, (message.data.death ? message.data.death : range[1]));
			}
			log.innerHTML += " [" + chop(message.data.birth) + "," +
			(message.data.death ? chop(message.data.death) + ")\n" : (isNaN(parseFloat(threshold.value))? "&infin;)\n" : parseFloat(threshold.value) + "]\n"));
		} else if (message.data.type == "point-cloud") {
			log.innerHTML += "point cloud with " + message.data.size + " points in dimension " + message.data.dim + "\n";
		} else if (message.data.type == "distance-matrix") {
			log.innerHTML += "distance matrix with " + message.data.size + " points\n" +
			"value range: [" + chop(message.data.min) + "," + chop(message.data.max) + "]\n";
			range = [0, parseFloat(threshold.value)||message.data.max];
		} else if (typeof message.data == "string") {
			log.innerHTML += message.data;
		}
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

function initBarcode(valueRange, colorIndex) {
	
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
	.attr("fill", d3.schemeCategory10[(10 + colorIndex) % 10]);
	
}

function insertBar(birth, death) {
	
	index.push(data.length);
	data.push({"birth": birth, "death": death});
	index.sort(function(a, b) { return (data[b].death - data[b].birth - data[a].death + data[a].birth) || (a - b) ; });
	
	height = barcodeHeight();
	y.domain(index).range([0, height]);
		
	svg//.transition().delay(50)
	.attr("height", height + margin.top + margin.bottom);

	g.selectAll(".bar").data(data)
	.enter()
	.append("g")
	.attr("class", "bar")
	.attr("transform", function(d, i) { return "translate(0," + y(i) + ")"; })
	.append("rect")
	.attr("height", y.bandwidth())
	.attr("width", function(d) { return x(d.death) - x(d.birth); })
	.attr("x", function(d) { return x(d.birth); })
    .append("title").html(function(d) { return "[" + chop(d.birth).toString() + ",&thinsp;" + chop(d.death).toString() + ")"; } );

	g.selectAll(".bar")//.data(data)
	//.transition().delay(50)
	.attr("transform", function(d, i) { return "translate(0," + y(i) + ")"; });

}

