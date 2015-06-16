import path from 'path';
var browserifyBuiltins = require('./builtins.json')
import lookup_path from './lookup';
import {package_fetch, version_fetch, tarball_fetch,
		package_cache, version_cache, tarball_cache} from './cache';


var npm_modules_cache = {};
var npm_resolve_cache = {};


export function extract_deps(code){
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


function subresolve(pkg, filename, subdep){
	if(subdep.split("/")[0] == pkg.name){
		// loading another file from same package but by name
		return [subdep, pkg.version]
	}else if(subdep.startsWith('.')){
		// resolve a local dependency by turning it into an external one
		return [pkg.name + '/' + path.join(path.dirname(filename), subdep), pkg.version]
	}else{
		// resolve an external dependency
		var subname = subdep.split("/")[0];
		var subver = (pkg.dependencies && pkg.dependencies[subname]) ||
					 (pkg.devDependencies && pkg.devDependencies[subname]) ||
					 'latest';
		return [subdep, subver]
	}
}

async function resolve(dep, version = 'latest'){
	if(dep in browserifyBuiltins){
		console.debug('substituting', browserifyBuiltins[dep], 'for package', dep)
		dep = browserifyBuiltins[dep];
	}
	let name = dep.split("/")[0],
		main = dep.split("/").slice(1).join('/');
	let pkg = await version_fetch(name, version);
	let files = await tarball_fetch(pkg._id);
	var contents = lookup_path(pkg, files, main)
	return { pkg, contents }
}

function resolveSync(dep, version = 'latest'){
	if(dep in browserifyBuiltins) dep = browserifyBuiltins[dep];
	let name = dep.split("/")[0],
		main = dep.split("/").slice(1).join('/');
	let pkg = version_cache(name, version);
	let files = npm_tarball_cache[pkg._id];
	if(!files) throw new Error(`Tarball ${pkg._id} mssing from tarball cache`);
	var contents = lookup_path(pkg, files, main)
	return { pkg, contents }
}


export async function recursiveResolve(dep, version = 'latest'){
	if((dep + '@' + version) in npm_resolve_cache) return; // it's already been resolved woo
	let { pkg, contents } = await resolve(dep, version);
	let id = pkg._id;
	if(!contents) throw new Error(`No file found at "${main}" for package ${id} `);
	npm_resolve_cache[dep + '@' + version] = 1;
	var subdeps = extract_deps(contents.data)
	console.group(id + ':' + contents.filename)
	for(let subdep of subdeps){
		await recursiveResolve(...subresolve(pkg, contents.filename, subdep))
	}
	console.groupEnd(id + ':' + contents.filename)	
}


export function requireModule(dep, version = 'latest'){
	var {contents, pkg} = resolveSync(dep, version)
	if(!contents) throw new Error(`File "${dep}" not found in package ${pkg._id}`);
	if(pkg._id in npm_modules_cache && contents.filename in npm_modules_cache[pkg._id]){
		return npm_modules_cache[pkg._id][contents.filename].exports
	}

	var preamble = 'var '+['exports', 'require', 'process', '__filename', '__dirname', 'Buffer', 'global']
		.map(x => `${x} = module.${x}`).join(', ') + ';';

	var fullpath = pkg._id + '/' + contents.filename;
	var config = { fullpath, filename: contents.filename, id: pkg._id };
	
	eval.call(null, `// Module wrapped for Carbide VM
	;(function(module){\n${preamble};
	\n\n${contents.data}\n\n
	})(__prepareModule(${JSON.stringify(config)}));
	//@ sourceURL=${fullpath}`);

	return npm_modules_cache[pkg._id][contents.filename].exports;
}


global.__prepareModule = function __prepareModule(config){
	var {filename, id, fullpath} = config;
	if(!(id in npm_modules_cache)) npm_modules_cache[id] = {};
	var [name, version] = id.split('@');
	var pkg = version_cache(name, version);
	npm_modules_cache[id][filename] = {
		exports: {},
		require: function(path){
			
			console.log('require', path, 'from', id, filename)
			return requireModule(...subresolve(pkg, filename, path))
		},
		Buffer: Buffer,
		// console: {},
		process: process,
		global: global,
		__filename: fullpath,
		__dirname: path.dirname(fullpath)
	}
	return npm_modules_cache[id][filename];
}