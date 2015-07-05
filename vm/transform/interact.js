import BabelTransformer from "babel-core/lib/babel/transformation/transformer";
import * as t from "babel-core/lib/babel/types";
import * as _ from 'lodash'

// var label = Interact(42)
// let label = Interact.Slider(42)
// wumbo = Interact.Slider(42)

var InteractFunc = new BabelTransformer("Interact", {
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


var InteractComment = new BabelTransformer("Interact", {
    Program: {
        exit(node, parent, scope, file) {
            var interactId = 0;
            console.log('interact', node, parent, scope, file, file.ast.comments)

            for(let comment of file.ast.comments){
                // throw file.errorWithNode(node, "wumbology");
                // if(comment.value != 'Interact') continue;

            }
            
            // for(let i = 0, tokens = file.ast.tokens; i < tokens.length; i++){
            // }
            let tokens = file.ast.tokens;
            
            this.traverse({
                "ObjectExpression|ArrayExpression|Literal"(node, parent, scope){
                    // locate the token where this thing starts and check the one before it
                    // to see if it's a block comment
                    let tokStart = _.findIndex(tokens, x => x.start == node.start);
                    if(tokStart <= 0) return;
                    let prevTok = tokens[tokStart - 1]
                    if(!(
                        prevTok && prevTok.type == "CommentBlock"
                    )) return;

                    var code = prevTok.value.trim();
                    if(!code.startsWith('Interact')) return;
                    
                    // TODO: parse out the interact langauge

                    // try to give a name to this instance
                    var name = '';
                    if(parent.type == 'AssignmentExpression' && parent.left.type == 'Identifier')
                        name = parent.left.name;
                    if(parent.type == 'VariableDeclarator' && parent.id.type == 'Identifier')
                        name = parent.id.name;


                    // return t.callExpression(t.identifier('__interact'), [t.literal(interactId++)])
                    
                    return t.callExpression(t.callExpression(
                            t.memberExpression(t.identifier('__interact'), t.identifier(
                                'def'
                            )),
                            [
                                t.literal(interactId++),
                                t.literal(name)
                            ]
                        ), [t.literal('wumbo')]);


                    // console.log('obj wrap', node, node.leadingComments, parent)
                    // return t.callExpression(
                    //     t.memberExpression(t.identifier('__interact'), t.identifier(
                    //             // node.callee.type == 'MemberExpression' ? node.callee.property.name : 'def'
                    //             'def'
                    //     )), [
                    //         t.literal(interactId++),
                    //         'merp'
                    //     ])
                    // return t.literal(interactId++)
                }
            }, {});
        }
    }
})
export default InteractComment;