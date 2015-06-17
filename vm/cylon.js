// asynchronous worker bundle v2

import * as babel from 'babel-core/lib/babel/api/node.js';
// import babel from 'babel-core/browser.js';
import * as mininpm from './mininpm'


console.log('hello world', mininpm);

var code = `
(function(){

var aosdifjwoie;
let wumbo = 5+5;

var marray = [1,2,3,4,5,5,5];
5+2!

marray.map(x => x).map(function(e){
	return e + 1
});

[1,2,3,4,5,6].forEach(function(e){
	var blah = e + 2;
})


var hello = 42,
	hallu = wumbo * wumbo,
	bonsoir = hallu - hello;

let zombocom = 5+8;
const margleflarg = hello + wumbo;

while(zombocom < 100){
	console.log(zombocom)
}


2 + 2

let q = 323;

function merp(){
	var blah = turd;
	var n = 5;
	let k = 72;
	for(var i = 0; i < 100; i++){
		(i + 5 - 5) / 2
		q = q+1;
		i + 2 - 7 * i;
	}
}

merp(48)

for(var i = 0; i < 100; i++){
	for(var j = 0; j < i; j++){
		for(var k = 0; k < i; k++){
			k += i
		}
	}
}
for(let i = 0; i < 100; i++){
	for(let j = 0; j < 100; j++){
		for(let k = 0; k < 100; k++){
			console.log(i + j + k)
		}
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



// import normalizeAst from "./normalize-ast";
// import estraverse from "estraverse";
// import * as acorn from "../../acorn";

import BabelFile from "babel-core/lib/babel/transformation/file";

import normalizeAst from "babel-core/lib/babel/helpers/normalize-ast";
import estraverse from "estraverse";
import * as acorn from "babel-core/lib/acorn";

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
import babelParseHelper from 'babel-core/lib/babel/helpers/parse.js'

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

var derpsacola = new babel.Transformer("globalization", {

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
    	if(node.kind == 'var' && !scope.parent.parent){
    		// console.log('vardecl', node.declarations, scope)

    		return [
    			t.expressionStatement(
    				t.callExpression(t.identifier('__declareGlobals'), 
    					node.declarations.map(x => t.literal(x.id.name))
    				)
    			)
    		].concat(node.declarations.filter(x => x.init).map(x => {
    			return t.expressionStatement(
	    			t.assignmentExpression("=", x.id, x.init)
	    		);
    		}))
    		
    	}
    },

})

console.log('TYPES', t)


var BruceWillis = new babel.Transformer("BruceWillis", {
	ForStatement(node, parent, scope){
		if(!scope.parent.parent.parent &&
			node.test.type == "BinaryExpression" &&
			["<", "<="].indexOf(node.test.operator) != -1 &&
			node.test.left.type == 'Identifier' &&
			node.test.right.type == 'Literal'
			){

			// console.log('forstatement', node, parent, scope)	
			// return t.binaryExpression("<", )
			// return t.forStatement()
			// ["init", "test", "update", "body"]
			return t.forStatement(node.init, node.test, t.sequenceExpression([
				node.update,
				t.callExpression(t.identifier('__trackLoop'), [
					node.test.left,
					node.test.right
				])
			]), node.body)
		}
		// scope.rename("merp", "_____MERP_____")
	},
	CallExpression(node, parent, scope) {
		if(!(node.callee.type == 'MemberExpression' &&
			node.callee.property.type == 'Identifier' &&
			['map', 'forEach'].indexOf(node.callee.property.name) != -1 &&
			node.arguments.length == 1
			)) return;

		var fn = node.arguments[0];
		if(!(fn.type == 'FunctionExpression' &&
			fn.body.type == 'BlockStatement'
			)) return;
		// console.log('call expression', node)
		return t.callExpression(node.callee, [
			t.functionExpression(
				fn.id, fn.params, 
				t.blockStatement([
					t.expressionStatement(t.callExpression(t.identifier('__trackLoop'), [
						t.memberExpression(t.identifier('arguments'), t.literal(1)),
						t.memberExpression(t.memberExpression(t.identifier('arguments'), t.literal(2)), t.identifier('length'))
					]))
				].concat(fn.body.body)), 
				fn.returnType, fn.typeParameters
			)
		])
	},
	WhileStatement(node, parent, scope) {
		if(!(node.test.type == 'BinaryExpression' &&
			node.body.type == 'BlockStatement')) return;

		var id, lit;
		if( ['<', '<='].indexOf(node.test.operator) != -1 && 
			node.test.left.type == 'Identifier' && 
			node.test.right.type == 'Literal'){
			id = node.test.left;
			lit = node.test.right;
		}else if( ['>', '>='].indexOf(node.test.operator) != -1  && 
			node.test.right.type == 'Identifier' && 
			node.test.left.type == 'Literal'){
			id = node.test.right;
			lit = node.test.left;
		}else return;

		return t.whileStatement(node.test, t.blockStatement([
			t.expressionStatement(t.callExpression(t.identifier('__trackLoop'), [id, lit]))
		].concat(node.body.body)))
		console.log('whileloop', node)
	},

	Program: {
			exit(node, parent, scope, file) {
			console.log('derp program')
			var counterCount = 0;
			this.traverse({
				CallExpression(node, parent, scope){
					if(node.callee.name != "__trackLoop") return;
					counterCount++;
				}
			}, {});
			var countCountaculous = 0;
			this.traverse({
				CallExpression(node, parent, scope){
					if(node.callee.name != "__trackLoop") return;
					countCountaculous++;
					return t.callExpression(node.callee, node.arguments.concat([
						t.literal(countCountaculous),
						t.literal(counterCount)
					]))
				}
			}, {});
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
    }, {
        transformer: BruceWillis,
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

// https://github.com/jrburke/requirejs/wiki/Differences-between-the-simplified-CommonJS-wrapper-and-standard-AMD-define#cjs
// ;(async function(){
// 	var deps = mininpm.extract_deps(middle);
// 	for(let dep of deps){
// 		await mininpm.recursiveResolve(dep)
// 	}
// 	//@ sourceURL=foo.js
// })();
