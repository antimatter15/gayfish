import BabelTransformer from "babel-core/lib/babel/transformation/transformer";
import * as t from "babel-core/lib/babel/types";

var Looper = new BabelTransformer("Looper", {
    ForStatement(node, parent, scope){
        if(!scope.parent.parent.parent &&
            node.test.type == "BinaryExpression" &&
            ["<", "<="].indexOf(node.test.operator) != -1 &&
            node.test.left.type == 'Identifier' &&
            node.test.right.type == 'Literal'
        ){
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
export default Looper;