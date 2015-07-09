// simple memoized package management stuff
import semver from 'semver';
import {untar} from 'untar.js';
// import {unzip} from 'gzip-js';
import {inflate} from 'pako';

var npm_package_cache = {};
var npm_tarball_cache = {};

npm_package_cache['_empty'] = {
	'dist-tags': {
		'latest': '1.0.0'
	}, 
	'versions': {
		'1.0.0': {
			'_id': '_empty@1.0.0',
			'name': '_empty',
			'version': '1.0.0'
		}
	}
}
npm_tarball_cache['_empty@1.0.0'] = {
	'index.js': {
		filename: 'index.js',
		data: ''	
	}
}

function fetch(url, type = 'json'){
	var gretchen = new XMLHttpRequest();
	gretchen.responseType = type
	gretchen.open('GET', url, true)
	// console.log('loading', url)
	var promise = new Promise((resolve, reject) => {
		gretchen.onload = () => {
			// console.log('loaded', gretchen.response)
			resolve(gretchen.response);
		}
		gretchen.onerror = reject;
	})
	gretchen.send(null)
	return promise;
}

export async function package_fetch(name){
	// be somewhat efficient and memoize it
	if(name in npm_package_cache) return npm_package_cache[name];
	// NPM registry doesn't support CORS yet
	// https://github.com/npm/npm-registry-couchapp/issues/108
	var json = await fetch('http://npm-registry-cors-proxy.herokuapp.com/' + name)
	npm_package_cache[name] = json;
	return json;
}

export function package_cache(name){
	if(name in npm_package_cache) return npm_package_cache[name];
	if(!meta) throw new Error(`Package ${name} not found in package cache!`);
}

export async function version_fetch(name, version){
	let meta = await package_fetch(name);
	if(!meta) throw new Error(`package ${id.split('@')[0]} not found!`); 
	return version_cache(name, version);
}

export function version_cache(name, version){
	let meta = package_cache(name);
	if(!meta) throw new Error(`package ${name} not found in cache`);
	
	if(meta['dist-tags'][version]) version = meta['dist-tags'][version];
	version = semver.maxSatisfying(Object.keys(meta['versions']), version) // resolve range with semver

	let pkg = meta.versions[version];
	if(!pkg) throw new Error(`version ${version} of ${name} not found!`)
	return pkg;
}

export async function tarball_fetch(id){
	if(id in npm_tarball_cache) return npm_tarball_cache[id];
	let pkg = await version_fetch(...id.split('@')); // the id is in the form of carbide@1.0.4
	let data = new Uint8Array(await fetch(pkg.dist.tarball, 'arraybuffer'))
	let inflated = inflate(data);
	let files = {};
	untar(inflated).filter(x => x).forEach(e => {
		// turns out it's not always in a folder named "package"
		let filename = e.filename.split('/').slice(1).join('/');
		
		// if(filename.endsWith(".jar")) return;
		// based on http://stackoverflow.com/a/13533390/205784
		var ascii = 0, other = 0;
		for(var i = Math.min(e.fileData.length, 1024); i--;){
			var b = e.fileData[i];
			(b === 0x09 || b === 0x0A || b === 0x0C || b === 0x0D || 
				(b >= 32 && b <= 126)) ? (ascii++) : (other++);
		}
		var isText = 100 * ascii / (ascii + other) > 90;
		// console.log(filename, ascii, other)
		if(!isText) return;

		files[filename] = {
			filename,
			// For some reason, for idb-wrapper's bundled copy of closure.jar
			// this thing freezes or locks up or something
			data: new Buffer(e.fileData).toString('utf8')
		}
	})
	npm_tarball_cache[id] = files;
	return files;
}

export function tarball_cache(id){
	if(id in npm_tarball_cache) return npm_tarball_cache[id];
	throw new Error(`Tarball ${id} mssing from tarball cache`)
}
