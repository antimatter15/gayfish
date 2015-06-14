var gzip = require('gzip-js'),
	untar = require('untar.js');

exports.tarball = function(input){
	return untar.untar(gzip.unzip(input))
}