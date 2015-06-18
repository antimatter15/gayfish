import BabelTransformer from "babel-core/lib/babel/transformation/transformer";
import * as t from "babel-core/lib/babel/types";

// I don't really know how to babble proper babel
// so this is something that kinda works but it's
// not necessarily performant or robust, so I'd
// really appreciate it if someone could tell me
// the right to do this stuff

var ResultTransformer = new BabelTransformer("ResultTransformer", {
    Program: {
        exit(node, parent, scope, file) {
            var lastNode;
            this.traverse({ 
                ExpressionStatement(node, parent, scope){ lastNode = node }
            }, {});
            this.traverse({
                ExpressionStatement(node, parent, scope){
                    if(node != lastNode) return;
                    return t.expressionStatement(
                        t.callExpression(t.identifier('__result'), [
                            node.expression
                        ])
                    )
                }
            }, {});
        }
    }
})

export default ResultTransformer