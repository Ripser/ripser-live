importScripts('ripser.js');

Module.onRuntimeInitialized = _ => {
addEventListener('message', function(e) {
    var data = e.data;
    tic = (new Date()).getTime();
    Module.ripser_emscripten(data.file, data.dim, data.threshold, data.format);
    toc = (new Date()).getTime();

	postMessage({"type": "finished"});
}, false);

	postMessage({"type": "ready"});
}

Module.onAbort = _ => {
	postMessage({"type": "abort"});
}