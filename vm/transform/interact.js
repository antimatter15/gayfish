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
                        // try to give a name to this instance
                        var name = '';
                        if(parent.type == 'AssignmentExpression' && parent.left.type == 'Identifier')
                            name = parent.left.name;
                        if(parent.type == 'VariableDeclarator' && parent.id.type == 'Identifier')
                            name = parent.id.name;

                        // transforms var x = Interact(42) into var x = __interact(0, "x")(42)

                        return t.callExpression(t.callExpression(
                            t.memberExpression(t.identifier('__interact'), t.identifier(
                                node.callee.type == 'MemberExpression' ? node.callee.property.name : 'def'
                            )),
                            [
                                t.literal(interactId++),
                                t.literal(name)
                            ]
                        ), node.arguments);

                        // return t.callExpression(node.callee, node.arguments.concat([
                        //     // t.literal(interactId++),
                        //     t.arrayExpression([
                        //         t.literal(interactId++),
                        //         t.literal(name)
                        //     ])
                        //     // t.arrayExpression([
                        //     //     t.literal(interactId++),
                        //     //     t.arrayExpression([t.literal(arg0.loc.start.line),
                        //     //                        t.literal(arg0.loc.start.column)]),
                        //     //     t.arrayExpression([t.literal(arg0.loc.end.line),
                        //     //                        t.literal(arg0.loc.end.column)])
                        //     // ])
                        // ]))
                    }
                }
            }, {});
        }
    }
})
export default Interact;