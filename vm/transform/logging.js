import * as acorn from "babel-core/lib/acorn";
import BabelTransformer from "babel-core/lib/babel/transformation/transformer";
import * as t from "babel-core/lib/babel/types";
import BabelGenerator from 'babel-core/lib/babel/generation';

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



var megatron = new BabelTransformer("log-statements", {
    VariableDeclaration(node, parent, scope){
        if(node.logStatement){
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
            node.expression =  t.callExpression(t.identifier('explog'), [
                node.expression, 
                t.literal(BabelGenerator(node.expression).code)
            ])
        }
    }
})
