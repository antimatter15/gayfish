// this is the webworker
importScripts("tarball/dist/tarball.js")
importScripts("utf8.js")
importScripts("path.js")
importScripts("process.js")

var __latestCellID;
function __track$loop__(i, total){
	postMessage({ type: 'progress', frac: i / total, cell: __latestCellID })
}

var npm_package_cache = {};
var npm_version_cache = {}
var npm_require_cache = {}
var browserifyBuiltins = {
	assert: 'assert',
	buffer: 'buffer',
	child_process: false,
	cluster: false,
	console: 'console-browserify',
	constants: 'constants-browserify',
	crypto: 'crypto-browserify',
	dgram: false,
	dns: false,
	domain: 'domain-browser',
	events: 'events',
	fs: false,
	http: 'http-browserify',
	https: 'https-browserify',
	module: false,
	net: false,
	os: 'os-browserify/browser.js',
	path: 'path-browserify',
	punycode: 'punycode',
	querystring: 'querystring-es3',
	readline: false,
	repl: false,
	stream: 'stream-browserify',
	_stream_duplex: 'readable-stream/duplex.js',
	_stream_passthrough: 'readable-stream/passthrough.js',
	_stream_readable: 'readable-stream/readable.js',
	_stream_transform: 'readable-stream/transform.js',
	_stream_writable: 'readable-stream/writable.js',
	string_decoder: 'string_decoder',
	sys: 'util/util.js',
	timers: 'timers-browserify',
	tls: false,
	tty: 'tty-browserify',
	url: 'url',
	util: 'util/util.js',
	vm: 'vm-browserify',
	zlib: 'browserify-zlib',
	_process: 'process/browser'
};

function require(path){
	
	if(path in browserifyBuiltins && browserifyBuiltins[path] != path){
		path = browserifyBuiltins[path]
		if(path === false) return {};
	}

	var id = path.split("/")[0],
		path = path.split("/").slice(1).join('/');
	var version = id.split('@')[1] || 'latest',
		package = id.split('@')[0];

	// console.log('require', path, package, version)

	if(!(package in npm_package_cache)){
		var xhr = new XMLHttpRequest();
		xhr.responseType = 'json'
		// NPM registry doesn't support CORS yet
		// https://github.com/npm/npm-registry-couchapp/issues/108
		xhr.open('GET', 'http://npm-registry-cors-proxy.herokuapp.com/' + package, false)
		xhr.send(null)
		npm_package_cache[package] = xhr.response;
	}
	var meta = npm_package_cache[package];
	
	if(meta['dist-tags'][version]) version = meta['dist-tags'][version];
	if(!meta['versions'][version]) throw new Error("Version " + version + " not found on NPM");
	var pkg = meta['versions'][version];
	if(!(pkg._id in npm_version_cache)){
		var xhr = new XMLHttpRequest();
		xhr.responseType = 'arraybuffer'
		xhr.open('GET', pkg.dist.tarball, false)
		xhr.send(null)
		
		postMessage({ type: 'activity', activity: "downloading " + pkg._id, cell: __latestCellID })

		// download and extract the tarball
		npm_version_cache[pkg._id] = tarball.tarball(new Uint8Array(xhr.response)).filter(function(e){
			return e
		}).map(function(e){
		    return {
		    	filename: e.filename.replace(/^package\//, ''),
		    	data: Utf8ArrayToStr(e.fileData)
		    }
		})
		npm_require_cache[pkg._id] = {};
		console.log('downloaded', pkg._id, "(" +npm_version_cache[pkg._id].length+" files)");


	}
	
	if(!path){
		if(typeof pkg.browser == 'string'){
			path = pkg.browser
		}else if(pkg.main){
			path = pkg.main
		}else{
			path = 'index.js'
		}
	}
	
	// console.log(pkg._id, path)
	return require_relative(pkg, Path.relative('', path));
}


function require_relative(pkg, path){
	// console.log('rel', pkg._id, path)

	var files = npm_version_cache[pkg._id];
	var include_prefix = ['', '.js', '.json'];

	// TODO: make this algorithm make more sense 
	if(typeof pkg.browser == 'object'){
		var canonical_mapping = {}
		Object.keys(pkg.browser).forEach(function(e){ 
			canonical_mapping[Path.relative('', e)] = pkg.browser[e] && Path.relative('', pkg.browser[e])
		});
		var match = Object.keys(canonical_mapping).filter(function(n){
			return include_prefix.some(function(prefix){
				return (n == path + prefix || n == path + '/index' + prefix)	
			})
		})[0];
		if(match){
			console.log('browser substitution', path, canonical_mapping[match])
			path = canonical_mapping[match];
			if(path === false) return {};
		}
	}
		
		
	function locate(name){
		return files.filter(function(n){
			return include_prefix.some(function(prefix){
				return (n.filename == name + prefix || n.filename == name + '/index' + prefix)	
			})
		})[0]
	}
	var file = locate(path);

	if(!file){
		throw new Error("File "+path+" not found in package " + pkg._id)
	}
	// 
	// console.log(pkg, path, file)

	var modules = npm_require_cache[pkg._id];
	if(file.filename in modules) return modules[file.filename].exports;

	
	if(/\.json$/.test(file.filename)){
		// load JSON
		var module = {
			exports: JSON.parse(file.data)
		}

	}else{
		// load javascript
		var extras = "";
		// exports = module.exports, require = module.require, process = module.process

		var module_globals = ['exports', 'require', 'process', '__dirname', '__filename']

		extras += 'var ' + module_globals.map(function(e){ return e + ' = module.' + e }).join(', ') + ';';

		if(pkg.name == 'http-browserify' || pkg.name == 'https-browserify'){
			extras += "var window = self;"; // get it to work in a webworker
		}

		if(/[^A-Za-z]Buffer/.test(file.data) && pkg.name != 'buffer'){
			extras += 'var Buffer = require("buffer").Buffer;';
			// console.log(file.data)
		}
		var code = "(function(module){\
			var global = self; " + extras + " \n\
			" + file.data + "\
			\n\n;return module})(prepare_module.apply(null, " + 
				JSON.stringify([pkg._id, file.filename]) + "))";
		try {
			console.group(pkg._id + ":" + file.filename)
			var module = eval.call(null, code);
			console.groupEnd(pkg._id + ":" + file.filename)
		} catch (err) {
			console.groupEnd(pkg._id + ":" + file.filename)

			console.groupCollapsed('code '+ pkg._id + ":" + file.filename)
			console.info(file.filename, pkg._id)
			console.log(code)
			console.groupEnd('code '+ pkg._id + ":" + file.filename)
			console.error(err)
			// throw err;

			var module = { exports: {} }
		}
	}

	modules[file.filename] = module;
	
	return module.exports;
}


function prepare_module(id, filename){
	var pkg = npm_package_cache[id.split('@')[0]]['versions'][id.split('@')[1]];
	var module = {
		exports: {},
		require: function(path){
			// console.log('require', path, 'from', id, filename)
			if(path.startsWith('.')){
				// console.log('TODO: relative requires', path, filename)
				return require_relative(pkg, Path.join(Path.dirname(filename), path))
			}else{
				// console.log('submodule require', path)
				// download the newest version which matches the package
				return require(path)
			}
		},
		process: process,
		__filename: filename,
		__dirname: Path.dirname(filename)
	}
	var modules = npm_require_cache[id];
	modules[filename] = module;

	return module;
}


onmessage = function(e) {
	var packet = e.data;
	console.log(packet)
	if(packet.type == 'exec'){
		__latestCellID = packet.cell;

		try{
			var result = eval.call(self, packet.code)
			postMessage({ type: 'result', result: result, cell: packet.cell })
		} catch (err) {
			console.error(err)
			postMessage({ type: 'error', error: err.toString(), cell: packet.cell })
		}
		
	}
}