import BabelTransformer from "babel-core/lib/babel/transformation/transformer";
import * as t from "babel-core/lib/babel/types";
import * as _ from 'lodash'
import BabelParseHelper from 'babel-core/lib/babel/helpers/parse.js'
import BabelCodeFrame from "babel-core/lib/babel/helpers/code-frame";

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


// /* Interact */ 42
// /* Interact.Slider */ 42
// /* Interact.Slider(0, 10) */ 42
// /* Interact.Text: Hello World */ 42

var InteractComment = new BabelTransformer("Interact", {
    Program: {
        exit(node, parent, scope, file) {
            var interactId = 0;
            let tokens = file.ast.tokens;
            this.traverse({
                "ObjectExpression|ArrayExpression|Literal"(node, parent, scope){
                    if(node.interactWrapped) return;

                    // locate the token where this thing starts and check the one before it
                    // to see if it's a block comment
                    let tokStart = _.findIndex(tokens, x => x.start == node.start);
                    if(tokStart <= 0) return;
                    let prevTok = tokens[tokStart - 1]
                    if(!(
                        prevTok && prevTok.type == "CommentBlock"
                    )) return;

                    // TODO: make the label syntax robust against weird input strings
                    // which happen to include two colons
                    var code = prevTok.value.split("::").slice(-1)[0].trim();


                    if(!code.startsWith('Interact')) return;

                    // TODO: parse out the interact langauge
                    // I think it'd be fun to write my own little recursive descent parser & tokenizer
                    // but I guess I kinda would prefer to be productive, so maybe later

                    // in more formal grammars this is called "accept", "consume", or "eat"
                    // var index = 0;
                    // function nom(regex){
                    //     regex.lastIndex = index;
                    //     if(regex.exec(code)){
                    //         index = regex.lastIndex;
                    //         return true;
                    //     }else{
                    //         return false;
                    //     }
                    // }

                    // nom()
                    try{
                        var sub = BabelParseHelper('(' + code + ')').program.body[0].expression;    
                    } catch (err) {
                        var loc = err.loc;
                        if (loc) {
                          err.message += " - make sure this is an expression.";
                          err.message += "\n" + BabelCodeFrame(code, loc.line, loc.column + 1);
                        }
                        throw err;
                    }
                    
                    // if it's not a call expression, then wrap it
                    if(sub.type != 'CallExpression') sub = t.callExpression(sub, []);

                    // try to give a name to this instance
                    var name = '';
                    if(parent.type == 'AssignmentExpression' && parent.left.type == 'Identifier')
                        name = parent.left.name;
                    if(parent.type == 'VariableDeclarator' && parent.id.type == 'Identifier')
                        name = parent.id.name;
                    if(prevTok.value.split("::").length > 1)
                        name = prevTok.value.split("::")[0].trim();
                    

                    node.interactWrapped = true

                    return t.callExpression(t.callExpression(
                            t.memberExpression(t.identifier('__interact'), t.identifier(
                                sub.callee.type == 'MemberExpression' ? sub.callee.property.name : 'Default'
                            )),
                            [ node, t.literal(interactId++), t.literal(name) ]
                        ), sub.arguments);
                }
            }, {});
        }
    }
})
export default InteractComment;