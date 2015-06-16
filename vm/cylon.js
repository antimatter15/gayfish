// asynchronous worker bundle v2

import babel from 'babel-core/lib/babel/api/browser.js';
// import babel from 'babel-core/browser.js';
import * as mininpm from './mininpm'


console.log('hello world', mininpm);

var code = `

var hello = 42;

2 + 2

merp(48)

function merp(){
	var blah = turd;
	for(var i = 0; i < 100; i++){
		(i + 5 - 5) / 2

		i + 2 - 7 * i;
	}
}



merp = function(){

}

[1,2,3].forEach(function(){
	return 48
})


[1,2,3].map(x => x + 2)


var x = 323,
	y = 38

`;



// import normalizeAst from "./normalize-ast";
// import estraverse from "estraverse";
// import * as acorn from "../../acorn";

import BabelFile from "babel-core/lib/babel/transformation/file";

import normalizeAst from "babel-core/lib/babel/helpers/normalize-ast";
import estraverse from "estraverse";
import * as acorn from "babel-core/lib/acorn";

acorn.plugins.Gilbert = function(instance){
    instance.extend("parseExpressionStatement", function(inner){
        return function(node, expr){
              node.expression = expr
              if(!this.eat(acorn.tokTypes.semi)){
                  if(this.canInsertSemicolon()){
                      var cLog = this.startNode()
                      cLog.name = "LOG"
                      var Ludacris = this.startNode()
                      Ludacris.arguments = [expr]
                      Ludacris.callee = this.finishNode(cLog, "Identifier")
                      node.expression = this.finishNode(Ludacris, "CallExpression")
                      
                  }else{
                      this.unexpected()
                  }
              }
              return this.finishNode(node, "ExpressionStatement")
        }
    })
    instance.extend("parseVarStatement", function(inner){
    	return function(node, kind){
    		this.next()
			this.parseVar(node, false, kind)
			// this.semicolon()
			var thing = this.finishNode(node, "VariableDeclaration")

			if(!this.eat(acorn.tokTypes.semi)){
				if(!this.canInsertSemicolon()) this.unexpected();
				var cLog = this.startNode()
				cLog.name = "VERILOG"
				var Ludacris = this.startNode()
				Ludacris.arguments = []
				Ludacris.callee = this.finishNode(cLog, "Identifier")
				var Richmond = this.startNode()
				Richmond.expression = this.finishNode(Ludacris, "CallExpression")
				
				this.finishNode(Richmond, "ExpressionStatement")
				return thing

			}
			
			return thing;
    	}
    })
}

// babel/helpers/parse.js
function babelParseHelper(code, opts = {}) {
  var commentsAndTokens = [];
  var comments          = [];
  var tokens            = [];

  var parseOpts = {
    allowImportExportEverywhere: opts.looseModules,
    allowReturnOutsideFunction:  opts.looseModules,
    allowHashBang:               true,
    ecmaVersion:                 6,
    strictMode:                  opts.strictMode,
    sourceType:                  opts.sourceType,
    locations:                   true,
    features:                    opts.features || {},
    plugins:                     opts.plugins || {},
    onToken:                     tokens,
    ranges:                      true
  };

  parseOpts.onToken = function (token) {
    tokens.push(token);
    commentsAndTokens.push(token);
  };

  parseOpts.onComment = function (block, text, start, end, startLoc, endLoc) {
    var comment = {
      type: block ? "CommentBlock" : "CommentLine",
      value: text,
      start: start,
      end: end,
      loc: new acorn.SourceLocation(this, startLoc, endLoc),
      range: [start, end]
    };

    commentsAndTokens.push(comment);
    comments.push(comment);
  };

  if (opts.nonStandard) {
    parseOpts.plugins.jsx = true;
    parseOpts.plugins.flow = true;
  }

  var ast = acorn.parse(code, parseOpts);
  estraverse.attachComments(ast, comments, tokens);
  ast = normalizeAst(ast, comments, commentsAndTokens);
  return ast;
}

// babel/transformation/file/index.js
var babelParseCode = (function(code, opts){
	// var opts = this.opts;

	var parseOpts = {
	  highlightCode: opts.highlightCode,
	  nonStandard:   opts.nonStandard,
	  filename:      opts.filename,
	  plugins:       {
	  	Gilbert: true
	  }
	};

	// var features = parseOpts.features = {};
	// for (var key in this.transformers) {
	//   var transformer = this.transformers[key];
	//   console.log(transformer)
	//   features[key] = transformer.canTransform();
	// }

  	// isLoose(key: string) { return includes(this.opts.loose, key); }
	// parseOpts.looseModules = this.isLoose("es6.modules");
	// parseOpts.strictMode = features.strict;
	parseOpts.sourceType = "module";

	// this.log.debug("Parse start");
	var tree = babelParseHelper(code, parseOpts);
	// this.log.debug("Parse stop");
	return tree
}).bind(babel.transform.pipeline);


var megatron = new babel.Transformer("foo-bar", {
	FunctionDeclaration(node, parent, scope) {
		scope.hasBinding("name");
    }
})


// ast = normalizeAst(ast);
var ast = babelParseCode(code, {});
console.log(ast)
var file = new BabelFile({
	optional: ["runtime"],
    stage: 0,
    plugins: [{
        transformer: megatron,
        position: 'before'
    }]
}, babel.transform.pipeline);
var earth = file.wrap(code, function () {
	file.addCode(code);
	file.addAst(ast);
	return file.transform();
});
// babelParseCode


console.log(earth)
console.log(earth.code)

// var middle = babel.transform.fromAst(ast, code, {
//     optional: ["runtime"],
//     stage: 0
// }).code;


// var middle = babel.transform(code, {
//     optional: ["runtime"],
//     stage: 0
// }).code;

// console.log(middle)

// https://github.com/jrburke/requirejs/wiki/Differences-between-the-simplified-CommonJS-wrapper-and-standard-AMD-define#cjs
// ;(async function(){
// 	var deps = mininpm.extract_deps(middle);
// 	for(let dep of deps){
// 		await mininpm.recursiveResolve(dep)
// 	}
// 	//@ sourceURL=foo.js
// })();





// global.define = function define(deps, callback){
// 	console.log(deps, callback)
// }


// console.log(middle)

// eval.call(null, middle);




// var code = `
// var bigInt = require("big-integer");
// var ndarray = require("ndarray");
// var jade = require('jade')

// function* calculatePi(){
//     let [q, r, t] = [1, 0, 1].map(x => bigInt(x)); // big
//     let [k, n, l] = [1, 3, 3]

//     while(true){
//         if(q.times(4).plus(r).minus(t).lesser(t.times(n))){
//             yield n
//             let nr = r.minus(t.times(n)).times(10)
//             n = +q.times(3).plus(r).times(10).divide(t).minus(n*10)
// 	        q = q.times(10)
//             r = nr
//         }else{
//             n = +q.times(k*7).plus(2).plus(r.times(l)).divide(t.times(l))
//             r = q.times(2).plus(r).times(l)
//             q = q.times(k)
//             t = t.times(l)
//             l += 2
//             k += 1
//         }
//     }
// }

// var it = calculatePi(), str = '';
// for(var i = 0; i < 2000; i++){
//     str += it.next().value;
// }
// str
// `;
