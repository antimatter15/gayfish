import BabelTransformer from "babel-core/lib/babel/transformation/transformer";
import * as t from "babel-core/lib/babel/types";

var Globalize = new BabelTransformer("Globalize", {
    FunctionDeclaration(node, parent, scope) {
        if(scope.parent.parent) return;
        var id = node.id;
            node.type = "FunctionExpression";
            node.id   = null;
        return t.variableDeclaration("var", [
            t.variableDeclarator(id, node)
        ]);
    },
    VariableDeclaration(node, parent, scope){
        // don't apply to let or const
        if(node.kind != 'var') return;
        if(scope.parent) return; // only apply to outermost
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
    },
})

export default Globalize