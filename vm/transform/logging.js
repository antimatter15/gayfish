import * as acorn from "babel-core/lib/acorn";
import BabelTransformer from "babel-core/lib/babel/transformation/transformer";
import * as t from "babel-core/lib/babel/types";
import BabelGenerator from 'babel-core/lib/babel/generation';

acorn.plugins.banglog = function(instance){
    acorn.tokTypes.Yalp = new acorn.TokenType("Yalp")
    instance.extend("readToken", function(inner){
        return function(code){
            var context = this.curContext();
            if(code == 33){ // !
                ++this.pos;
                return this.finishToken(acorn.tokTypes.Yalp)
            }
            return inner.call(this, code)
        }
    });
    instance.extend("parseExpressionStatement", function(inner){
        return function(node, expr){
            node.expression = expr
            if(this.eat(acorn.tokTypes.Yalp)){
                node.logStatement = true;
            }else this.semicolon();
            return this.finishNode(node, "ExpressionStatement")
        }
    })
    instance.extend("parseVarStatement", function(inner){
        return function(node, kind){
            this.next()
            this.parseVar(node, false, kind)
            if(this.eat(acorn.tokTypes.Yalp)){
                node.logStatement = true;
            }else this.semicolon();
            return this.finishNode(node, "VariableDeclaration")
        }
    })
}


acorn.plugins.semilog = function(instance){
    instance.extend("parseExpressionStatement", function(inner){
        return function(node, expr){
            node.expression = expr;
            if(this.canInsertSemicolon()){
                node.logStatement = true;
            }else if(!this.eat(acorn.tokTypes.semi)) this.unexpected();
            return this.finishNode(node, "ExpressionStatement")
        }
    })
    instance.extend("parseVarStatement", function(inner){
        return function(node, kind){
            this.next()
            this.parseVar(node, false, kind);
            if(this.canInsertSemicolon()){
                node.logStatement = true;
            }else if(!this.eat(acorn.tokTypes.semi)) this.unexpected();

            return this.finishNode(node, "VariableDeclaration")
        }
    })
    //  this.semicolon => if (!this.eat(tt.semi) && !this.insertSemicolon()) this.unexpected()
    instance.extend("parseReturnStatement", function(inner){
        return function(node){
            if (!this.inFunction && !this.options.allowReturnOutsideFunction)
                this.raise(this.start, "'return' outside of function")          
            this.next()

            // In `return` (and `break`/`continue`), the keywords with
            // optional arguments, we eagerly look for a semicolon or the
            // possibility to insert one.

            if (this.eat(acorn.tokTypes.semi) || this.insertSemicolon()) node.argument = null
            else { 
                node.argument = this.parseExpression(); 
                if(this.canInsertSemicolon()){
                    node.logStatement = true;
                }else if(!this.eat(acorn.tokTypes.semi)) this.unexpected();
            }
            return this.finishNode(node, "ReturnStatement")
        }
    })
}

// TODO: figure out return

// TODO: use source maps instead of passing the source line in the function call
var LoggingSyntax = new BabelTransformer("logging-syntax", {
    VariableDeclaration(node, parent, scope){
        if(node.logStatement){
            var vars = [];
            for(let decl of node.declarations){
                if(decl.id.type == 'Identifier'){
                    vars.push([decl.loc.end.line, decl.id.name])
                }else{
                    scope.traverse(decl.id, {
                        Identifier(node, parent, scope) { vars.push([node.loc.end.line, node.name]) }
                    }, {});
                }
            }
            return [
                node
            ].concat(
                vars.map(([line, x]) => 
                    t.expressionStatement(t.callExpression(t.identifier('__log'), [
                        t.identifier(x),
                        t.literal(x),
                        t.literal('var'),
                        t.literal(line)
                    ]))
                )
            )
        }
    },
    ReturnStatement(node, parent, scope){
        if(node.logStatement){
            node.argument = t.callExpression(t.identifier('__log'), [
                node.argument,
                t.literal(BabelGenerator(node.argument).code),
                t.literal('return'),
                t.literal(node.loc.end.line)
            ])
        }
    },
    ExpressionStatement(node, parent, scope){
        if(node.logStatement){
            node.expression =  t.callExpression(t.identifier('__log'), [
                node.expression, 
                t.literal(BabelGenerator(node.expression).code),
                t.literal('expr'),
                t.literal(node.loc.end.line)
            ])
        }
    },
     Program: {
        exit(node, parent, scope, file) {
            var countCountaculous = 0;
            this.traverse({
                CallExpression(node, parent, scope){
                    if(node.callee.name != "__log") return;
                    return t.callExpression(node.callee, node.arguments.concat([
                        t.literal(countCountaculous++)
                    ]))
                }
            }, {});
        }
    }
})

export default LoggingSyntax