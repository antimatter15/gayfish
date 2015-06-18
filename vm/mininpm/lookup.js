import path from 'path';


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

export default function lookup_path(pkg, files, filepath){
	if(!filepath || path.normalize(filepath) == '.'){
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