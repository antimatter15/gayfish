// asynchronous worker bundle v2

// import babel from 'babel-core/lib/babel/api/browser.js';
import babel from 'babel-core/browser.js';
import {untar} from 'untar.js';
import {unzip} from 'gzip-js';
import path from 'path';
import semver from 'semver';
// import process from 'process';


console.log('hello world');

function untarball(input){
	return untar(unzip(input))
}

console.log(process, path)


var code = `
var bigInt = require("big-integer");
var ndarray = require("ndarray");
var jade = require('jade')

function* calculatePi(){
    let [q, r, t] = [1, 0, 1].map(x => bigInt(x)); // big
    let [k, n, l] = [1, 3, 3]

    while(true){
        if(q.times(4).plus(r).minus(t).lesser(t.times(n))){
            yield n
            let nr = r.minus(t.times(n)).times(10)
            n = +q.times(3).plus(r).times(10).divide(t).minus(n*10)
	        q = q.times(10)
            r = nr
        }else{
            n = +q.times(k*7).plus(2).plus(r.times(l)).divide(t.times(l))
            r = q.times(2).plus(r).times(l)
            q = q.times(k)
            t = t.times(l)
            l += 2
            k += 1
        }
    }
}

var it = calculatePi(), str = '';
for(var i = 0; i < 2000; i++){
    str += it.next().value;
}
str
`;

var middle = babel.transform(code, {
    optional: ["runtime"],
    stage: 0
}).code;


function extract_deps(code){
	// https://github.com/jrburke/requirejs/blob/master/require.js#L2033
	var commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
	    cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g;
	var johnny_deps = [];
	code    
		.replace(commentRegExp, '')
		.replace(cjsRequireRegExp, function (match, dep) {
		    johnny_deps.push(dep);
		});
	return johnny_deps;
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

var npm_package_cache = {};
var npm_tarball_cache = {};
var npm_resolve_cache = {};

async function fetch_package(name){
	// be somewhat efficient and memoize it
	if(name in npm_package_cache) return npm_package_cache[name];
	// NPM registry doesn't support CORS yet
	// https://github.com/npm/npm-registry-couchapp/issues/108
	var json = await fetch('http://npm-registry-cors-proxy.herokuapp.com/' + name)
	npm_package_cache[name] = json;
	return json;
}

async function fetch_version(id){
	let meta = await fetch_package(id.split('@')[0]);
	if(!meta) throw new Error(`package ${id.split('@')[0]} not found!`); 
	let pkg = meta.versions[id.split('@')[1]];
	if(!pkg) throw new Error(`version ${id.split('@')[1]} of ${id.split('@')[0]} not found!`); 

	return pkg
}

async function fetch_tarball(id){
	if(id in npm_tarball_cache) return npm_tarball_cache[id];
	let pkg = await fetch_version(id);
	let data = new Uint8Array(await fetch(pkg.dist.tarball, 'arraybuffer'))
	let files = {};
	untar(unzip(data)).filter(x => x).forEach(e => {
		let filename = e.filename.replace(/^package\//, '')
		files[filename] = {
			filename,
			data: new Buffer(e.fileData).toString('utf8')
		}
	})
	npm_tarball_cache[id] = files;
	return files;
}

function match_variants(filepath, filenames){
	var include_suffix = ['', '.js', '.json'],
		include_prefix = ['', '/index'];
	var variants = {}
	for(let suffix of include_suffix){
		for(let prefix of include_prefix){
			variants[path.normalize(filepath + prefix + suffix)] = 1;
		}
	}
	// console.log(filepath, Object.keys(variants), filenames)
	return filenames.filter(f => (path.normalize(f) in variants))[0];
}

function lookup_path(pkg, files, filepath){
	if(!filepath){
		if(typeof pkg.browser == 'string'){
			filepath = pkg.browser
		}else{
			filepath = pkg.main || '';
		}
	}
	filepath = path.normalize(filepath);
	if(typeof pkg.browser == 'object'){
		let match = match_variants(filepath, Object.keys(pkg.browser))
		if(match) filepath = pkg.browser[match];
	}
	let match = files[match_variants(filepath, Object.keys(files))]
	return match;
}

function resolveSync(dep, version = 'latest'){
	let name = dep.split("/")[0],
		main = dep.split("/").slice(1).join('/');
	let meta = npm_package_cache[name];
	// packages have to be cached for synchronous resolution
	if(!meta) throw new Error(`Package ${name} not found in package cache!`);
	if(meta['dist-tags'][version]) version = meta['dist-tags'][version];
	version = semver.maxSatisfying(Object.keys(meta['versions']), version) // resolve range with semver
	
	let pkg = meta['versions'][version]
	if(!pkg) throw new Error(`Version ${version} of package ${name} not found!`); 
	let id = pkg._id;
	let files = npm_tarball_cache[id];
	if(!files) throw new Error(`Tarball ${id} mssing from tarball cache`);
	var contents = lookup_path(pkg, files, main)
	return contents;
}

async function resolve(dep, version = 'latest'){
	let name = dep.split("/")[0],
		main = dep.split("/").slice(1).join('/');
	let meta = await fetch_package(name);

	if(meta['dist-tags'][version]) version = meta['dist-tags'][version];
	version = semver.maxSatisfying(Object.keys(meta['versions']), version) // resolve range with semver
	if(!meta['versions'][version]) throw new Error("Version " + version + " not found on NPM");

	if(dep + '@' + version in npm_resolve_cache) return; // it's already been resolved woo

	let pkg = meta['versions'][version],
		id = pkg._id;

	let files = await fetch_tarball(id);
	var contents = lookup_path(pkg, files, main)
	if(!contents){	
		console.log(main, files)
		throw new Error(`No file found at "${main}" for package ${id} `)
	}
	
	npm_resolve_cache[dep + '@' + version] = 1;
	var subdeps = extract_deps(contents.data)
	// console.log(id, contents.filename, subdeps)
	console.group(id + ':' + contents.filename)
	for(let subdep of subdeps){
		if(subdep.split("/")[0] == name){
			// loading another file from same package but by name
			await resolve(subdep, version)
		}else if(subdep.startsWith('.')){
			// resolve a local dependency by turning it into an external one
			await resolve(name + '/' + path.join(path.dirname(contents.filename), subdep), version)
		}else{
			// resolve an external dependency
			var subver = (pkg.dependencies && pkg.dependencies[subdep]) ||
						 (pkg.devDependencies && pkg.devDependencies[subdep]) ||
						 'latest';
			await resolve(subdep, subver)
		}
	}
	console.groupEnd(id + ':' + contents.filename)
}
// https://github.com/jrburke/requirejs/wiki/Differences-between-the-simplified-CommonJS-wrapper-and-standard-AMD-define#cjs
;(async function(){
	var deps = extract_deps(middle);
	for(let dep of deps){
		await resolve(dep)

		
	}
})();


// console.log('', deps)

// deps.forEach(dep => {

// 	fetch_package(pkg)
// 	console.log(pkg, path)
// })



// global.define = function define(deps, callback){
// 	console.log(deps, callback)
// }


// console.log(middle)

// eval.call(null, middle);



