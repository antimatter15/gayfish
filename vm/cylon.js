// asynchronous worker bundle v2

import * as babel from 'babel-core/lib/babel/api/node.js';
// import babel from 'babel-core/browser.js';
import * as mininpm from './mininpm'


console.log('hello world', mininpm);

var code = `
(function(){

let wumbo = 5+5;

var hello = 42;
let zombocom = 5+8;
const margleflarg = hello + wumbo;


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

})();

`;


// var code = `

// var hello = 42;


// let wumbo = 5+5;

// const margleflarg = hello + wumbo;

// 2 + 2

// merp(48)

// function merp(){
// 	var blah = turd;
// 	for(var i = 0; i < 100; i++){
// 		(i + 5 - 5) / 2

// 		i + 2 - 7 * i;
// 	}
// }

// 4 + 4

// var x = merp()!

// merp = function(){

// }

// [1,2,3].forEach(function(){
// 	return 48
// })


// [1,2,3].map(x => x + 2)


// var x = 323,
// 	y = 38

// `;



// import normalizeAst from "./normalize-ast";
// import estraverse from "estraverse";
// import * as acorn from "../../acorn";

import BabelFile from "babel-core/lib/babel/transformation/file";

import normalizeAst from "babel-core/lib/babel/helpers/normalize-ast";
import estraverse from "estraverse";
import * as acorn from "babel-core/lib/acorn";

// acorn.plugins.Gilbert = function(instance){
//     instance.extend("parseExpressionStatement", function(inner){
//         return function(node, expr){
//               node.expression = expr
//               if(!this.eat(acorn.tokTypes.semi)){
//                   if(this.canInsertSemicolon()){
//                       var cLog = this.startNode()
//                       cLog.name = "LOG"
//                       var Ludacris = this.startNode()
//                       Ludacris.arguments = [expr]
//                       Ludacris.callee = this.finishNode(cLog, "Identifier")
//                       node.expression = this.finishNode(Ludacris, "CallExpression")
                      
//                   }else{
//                       this.unexpected()
//                   }
//               }
//               return this.finishNode(node, "ExpressionStatement")
//         }
//     })
//     instance.extend("parseVarStatement", function(inner){
//     	return function(node, kind){
//     		this.next()
// 			this.parseVar(node, false, kind)
// 			// this.semicolon()
// 			var thing = this.finishNode(node, "VariableDeclaration")

// 			if(!this.eat(acorn.tokTypes.semi)){
// 				if(!this.canInsertSemicolon()) this.unexpected();
// 				// var cLog = this.startNode()
// 				// cLog.name = "VERILOG"
// 				// var Ludacris = this.startNode()
// 				// Ludacris.arguments = []
// 				// Ludacris.callee = this.finishNode(cLog, "Identifier")
// 				// var Richmond = this.startNode()
// 				// Richmond.expression = this.finishNode(Ludacris, "CallExpression")
				
// 				// this.finishNode(Richmond, "ExpressionStatement")
// 				node.OHMYGOD='SODIJFOWIEJFSLDFN'
// 				return thing

// 			}
			
// 			return thing;
//     	}
//     })
// }

acorn.plugins.YALP = function(instance){
	acorn.tokTypes.YALP = new acorn.TokenType("YALP")
	instance.extend("readToken", function(inner){
        return function(code){
            var context = this.curContext();
            if(code == 33){ // !
                ++this.pos;
                return this.finishToken(acorn.tokTypes.YALP)
            }
            return inner.call(this, code)
        }
    });
    instance.extend("parseExpressionStatement", function(inner){
        return function(node, expr){
			node.expression = expr
			if(this.eat(acorn.tokTypes.YALP)){
				node.logStatement = true;
			}else this.semicolon();
			return this.finishNode(node, "ExpressionStatement")
        }
    })
    instance.extend("parseVarStatement", function(inner){
    	return function(node, kind){
    		this.next()
			this.parseVar(node, false, kind)
			if(this.eat(acorn.tokTypes.YALP)){
				node.logStatement = true;
			}else this.semicolon();
			return this.finishNode(node, "VariableDeclaration")
        }
    })
}


acorn.plugins.Gilbert = function(instance){
	instance.extend("parseExpressionStatement", function(inner){
        return function(node, expr){
			node.expression = expr
			if(!this.eat(acorn.tokTypes.semi)){
				if(!this.canInsertSemicolon()) this.unexpected();
				node.logStatement = true;
			}
			return this.finishNode(node, "ExpressionStatement")
        }
    })
    instance.extend("parseVarStatement", function(inner){
    	return function(node, kind){
    		this.next()
			this.parseVar(node, false, kind)
			if(!this.eat(acorn.tokTypes.semi)){
				if(!this.canInsertSemicolon()) this.unexpected();
				node.logStatement = true;
			}
			return this.finishNode(node, "VariableDeclaration")
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

console.log(babel)

// babel/transformation/file/index.js
var babelParseCode = (function(code, opts){
	// var opts = this.opts;

	var parseOpts = {
	  highlightCode: opts.highlightCode,
	  nonStandard:   opts.nonStandard,
	  filename:      opts.filename,
	  plugins:       {
	  	YALP: true
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

import babelGenerator from 'babel-core/lib/babel/generation';

var t = babel.types;
var megatron = new babel.Transformer("log-statements", {
	// FunctionDeclaration(node, parent, scope) {
	// 	console.log('fundecl', node)
	// 	scope.hasBinding("name");
 //    },
    VariableDeclaration(node, parent, scope){
    	// console.log('vardecl', node)
    	if(node.logStatement){
    		// console.log(node)
	    	return [
	    		node
	    	].concat(
		    	node.declarations.map(x => 
		    		t.expressionStatement(t.callExpression(t.identifier('omglog'), [
		    			t.identifier(x.id.name),
		    			t.literal(x.id.name)
		    		]))
		    	)
	    	)
	    }
    },
    ExpressionStatement(node, parent, scope){
    	
    	if(node.logStatement){
    		// console.log('merpyderp')
    		// console.log(, node)
    		node.expression =  t.callExpression(t.identifier('explog'), [
    			node.expression, 
    			t.literal(babelGenerator(node.expression).code)
    		])
    	}
    }
})

var derpsacola = new babel.Transformer("for-annotation", {
	ForStatement(node, parent, scope){
		console.log('forstatement', node, parent, scope, scope.getAllBindings())
		scope.rename("merp", "_____MERP_____")
	},
	FunctionDeclaration(node, parent) {
      var id = node.id;
      node.type = "FunctionExpression";
      node.id   = null;

      return t.variableDeclaration("var", [
        t.variableDeclarator(id, node)
      ]);
    },
    VariableDeclaration(node, parent, scope){
    	// don't apply to let or const
    	if(node.kind == 'var'){
    		console.log('vardecl', scope)	

    		return node.declarations.map(x => {
    			return t.expressionStatement(
	    			t.assignmentExpression("=", x.id, x.init)
	    		);
    		})
    		
    	}
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
    }, {
        transformer: derpsacola,
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
