import BabelTransformer from "babel-core/lib/babel/transformation/transformer";
import * as t from "babel-core/lib/babel/types";

var Interact = new BabelTransformer("Interact", {
    Program: {
        exit(node, parent, scope, file) {
            var interactId = 0;
            this.traverse({
                CallExpression(node, parent, scope){
                    if((node.callee.type == 'Identifier' && node.callee.name == 'Interact') ||
                        (node.callee.type == 'MemberExpression' && node.callee.object.name == 'Interact')){
                        return t.callExpression(node.callee, node.arguments.concat([
                            t.literal(interactId++),
                            // t.arrayExpression([
                            //     t.literal(interactId++),
                            //     t.arrayExpression([t.literal(arg0.loc.start.line),
                            //                        t.literal(arg0.loc.start.column)]),
                            //     t.arrayExpression([t.literal(arg0.loc.end.line),
                            //                        t.literal(arg0.loc.end.column)])
                            // ])
                        ]))
                    }
                }
            }, {});
        }
    }
})
export default Interact;