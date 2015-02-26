'use strict';

var React = require('react');

// var CodeMirror = require("./CodeMirror/lib/codemirror.js")
// require("./CodeMirror/mode/javascript/javascript")
// require("./CodeMirror/keymap/sublime")

// require("./CodeMirror/addon/edit/closebrackets")
// require("./CodeMirror/addon/edit/matchbrackets")
// require("./CodeMirror/addon/comment/comment")
// require("./CodeMirror/addon/fold/foldcode")
// require("./CodeMirror/addon/fold/foldgutter")

// require("./CodeMirror/addon/fold/foldgutter.css")
// require("./CodeMirror/addon/search/match-highlighter")

var CodeMirror = require('codemirror')

require("codemirror/mode/javascript/javascript")
require("codemirror/keymap/sublime")

require("codemirror/addon/edit/closebrackets")
require("codemirror/addon/edit/matchbrackets")
require("codemirror/addon/comment/comment")
require("codemirror/addon/fold/foldcode")
require("codemirror/addon/fold/foldgutter")

require("codemirror/addon/fold/foldgutter.css")
require("codemirror/addon/search/match-highlighter")

require("codemirror/addon/hint/show-hint")
require("codemirror/addon/hint/show-hint.css")

require("codemirror/addon/dialog/dialog")
require("codemirror/addon/dialog/dialog.css")

global.tern = require('tern')

require("codemirror/addon/tern/tern.css")
require("codemirror/addon/tern/tern")

// Tern Server Eliot
var eliot = new CodeMirror.TernServer({defs: [
    require('json!tern/defs/ecma5.json')
]});


var Editor = React.createClass({
    componentDidMount() {
        this.editor = CodeMirror.fromTextArea(this.refs.editor.getDOMNode(), this.props)

        this.editor.setOption("extraKeys", {
          "Ctrl-Space": function(cm) { eliot.complete(cm); },
          "Ctrl-I": function(cm) { eliot.showType(cm); },
          "Ctrl-O": function(cm) { eliot.showDocs(cm); },
          "Alt-.": function(cm) { eliot.jumpToDef(cm); },
          "Alt-,": function(cm) { eliot.jumpBack(cm); },
          "Ctrl-Q": function(cm) { eliot.rename(cm); },
          "Ctrl-.": function(cm) { eliot.selectName(cm); }
        })
        this.editor.on("cursorActivity", function(cm) { 
            eliot.updateArgHints(cm); 
            // eliot.complete(cm)
        });

        this.editor.on('keyup', function(cm, evt){
            // console.log(cm.type, cm, evt.keyCode)
            if(evt.keyCode == 190){ // i don't know why this is "."
                eliot.complete(cm)
            }
        })
    },
    render() {
        return <div>
            <textarea ref="editor"></textarea>
        </div>
    }
})


var EditPane = React.createClass({
    render() {
        return (
            <div>
                <Editor 
                    mode="javascript" 
                    lineNumbers={true} 
                    indentUnit={4} 
                    keyMap="sublime" 
                    autoCloseBrackets={true}
                    matchBrackets={true}
                    foldGutter={true}
                    lineWrapping={true}
                    highlightSelectionMatches={true}
                    gutters={["CodeMirror-linenumbers", "CodeMirror-foldgutter"]}
                ></Editor>
            </div>
        )
    }
})

var OutPane = React.createClass({
    render() {
        return (
            <div>
                <h1>Whats up, world doge.</h1>
            </div>
        )
    }
})



var App = React.createClass({
  render() {
    return (
        <div>
            <EditPane></EditPane>
            <OutPane></OutPane>
        </div>
    );
  }
});

module.exports = App;