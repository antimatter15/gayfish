// this is the webworker
importScripts("tarball/dist/tarball.js")
importScripts("utf8.js")
importScripts("path.js")

var __latestCellID;
function __track$loop__(i, total){
	postMessage({ type: 'progress', frac: i / total, cell: __latestCellID })
}

var npm_package_cache = {};
var npm_version_cache = {}
var npm_require_cache = {}


function require(path){
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
	
	if(!path) path = pkg.main;
	return require_relative(pkg, Path.relative('', path));
}


function require_relative(pkg, path){
	var files = npm_version_cache[pkg._id];

	function locate(name){
		// name = name.replace(/)
		return files.filter(function(n){
			return ['', '.js'].some(function(prefix){
				return (n.filename == name + prefix || n.filename == name + '/index' + prefix)	
			})
		})[0]
	}
	var file = locate(path);
	// 
	// console.log(pkg, path, file)

	var modules = npm_require_cache[pkg._id];

	if(!(file.filename in modules)){
		var code = "(function(module){\
			var exports = module.exports, require = module.require;\
			" + file.data + "\
			;return module})(prepare_module.apply(null, " + 
				JSON.stringify([pkg._id, file.filename]) + "))";
		// console.log(code)
		modules[file.filename] = eval.call(null, code);	
	}

	return modules[file.filename].exports;
}


function prepare_module(id, filename){
	var pkg = npm_package_cache[id.split('@')[0]]['versions'][id.split('@')[1]];

	return {
		exports: {},
		require: function(path){
			if(path.startsWith('.')){
				// console.log('TODO: relative requires', path, filename)
				return require_relative(pkg, Path.join(Path.dirname(filename), path))
			}else{
				// console.log('submodule require', path)
				return require(path)	
			}
			
		}
	}
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