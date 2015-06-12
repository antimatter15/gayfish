'use strict';

var React = require('react');

var CodeMirror = require('codemirror')

require("codemirror/lib/codemirror.css");

require("codemirror/mode/javascript/javascript")
require("codemirror/keymap/sublime")

require("codemirror/addon/edit/closebrackets")
require("codemirror/addon/edit/matchbrackets")
require("codemirror/addon/comment/comment")
require("codemirror/addon/comment/continuecomment")
// require("codemirror/addon/fold/foldcode")
// require("codemirror/addon/fold/foldgutter")

require("codemirror/addon/fold/foldgutter.css")
require("codemirror/addon/search/match-highlighter")

require("codemirror/addon/hint/show-hint")
require("codemirror/addon/hint/show-hint.css")

require("codemirror/addon/dialog/dialog")
require("codemirror/addon/dialog/dialog.css")


require("codemirror/addon/search/searchcursor")
require("codemirror/addon/search/search")

require("./codemirror.less");

global.acorn = require('acorn')
global.tern = require('tern')


require("codemirror/addon/tern/tern.css")
require("codemirror/addon/tern/tern")

// Tern Server Eliot
var eliot = new CodeMirror.TernServer({defs: [
    require('json!tern/defs/ecma5.json')
]});


var Editor = React.createClass({
    componentDidMount() {
        var com = this;

        this.editor = CodeMirror(this.getDOMNode(), {
            value: this.props.value,
            mode: "javascript",
            lineNumbers: false,
            indentUnit: 4,
            continueComments: true,
            keyMap: 'sublime',
            autoCloseBrackets: true,
            matchBrackets: true,
            lineWrapping: true,
            // highlightSelectionMatches: true,
            viewportMargin: Infinity
        })

        this.editor.setOption("extraKeys", {
            "Ctrl-Space": function(cm) { eliot.complete(cm); },
            "Ctrl-I": function(cm) { eliot.showType(cm); },
            "Ctrl-O": function(cm) { eliot.showDocs(cm); },
            "Alt-.": function(cm) { eliot.jumpToDef(cm); },
            "Alt-,": function(cm) { eliot.jumpBack(cm); },
            "Ctrl-Q": function(cm) { eliot.rename(cm); },
            "Ctrl-.": function(cm) { eliot.selectName(cm); },
            "Shift-Enter": (cm) => {
                console.log('i ran')

                var state = this.props.state;
                this.props.update({
                    count: state.count + 1,
                    cells: state.cells.slice(0).concat([{
                        value: `zombocom dos (actually ${state.count})`,
                        key: state.count + 1
                    }])
                })
            },
            "Ctrl-N": (cm) => {
                console.log('new')
                var state = this.props.state;
                this.props.update({
                    count: state.count + 1,
                    cells: state.cells.slice(0).concat([{
                        value: `zombocom dos (actually ${state.count})`,
                        key: state.count + 1
                    }])
                })
            }
        })

        // this.editor.on('changes', (cm) => {
        //     this.props.update({
        //         cells: state.cells
        //     })
        // })
        this.editor.on("cursorActivity", function(cm) { 
            eliot.updateArgHints(cm); 
            // eliot.complete(cm)
        });
        this.editor.on('focus', (cm, evt) => {
            // console.log(cm, evt)
            this.props.update({
                focus: this.props.key
            })
        })
        this.editor.on('keyup', function(cm, evt){
            // console.log(cm.type, cm, evt.keyCode)
            if(evt.keyCode == 190){ // i don't know why this is "."
                eliot.complete(cm)
            }
        })
        this.editor.on('keydown', (cm, evt) => {
            // console.log(evt, cm, evt.keyCode)
            if(evt.keyCode == 40){ // down
                var cursor = cm.getCursor()
                if (cursor.line === (cm.lineCount()-1) && 
                    cursor.ch === cm.getLine(cursor.line).length) {
                    // select the next thing
                }
            }
            this.props.update({
                value: cm.getValue()
            })
            
        })
    },
    componentWillReceiveProps(nextProps) {
        // console.log(nextProps)
    },
    shouldComponentUpdate() { return false },
    render() { return <div></div> }
})


var EditPane = React.createClass({
    handleClick(e) {
        console.log('clicked', e.target == this.getDOMNode())
    },
    render() {
        return (
            <div className="editpane" onClick={this.handleClick}>{
                this.props.cells.map(
                    (cell) => 
                        <Editor 
                            update={this.props.update} 
                            state={this.props.state}
                            key={cell.key} 
                            value={cell.value}>
                        </Editor>
                )
            }</div>
        )
    }
})

var OutPane = React.createClass({
    handleClick() {
        this.props.update({
            count: this.props.state.count + 1
        })
    },
    render() {
        return (
            <div className="outpane">
                <h1>Whats up, world doge.</h1>
                <button onClick={this.handleClick}>Zombocom {this.props.state.count}</button>
                {this.props.cells.map(
                    (cell) => <div>{cell.value}</div>
                )}
            </div>
        )
    }
})



var App = React.createClass({
    getInitialState() {
        return {
            count: 4,
            cells: [{
                key: 1,
                value: `function zombocom(z){
    return z + 1
}`
            }]
        }
    },
    render() {
    return (
        <div className="wrapper">
            <EditPane 
                update={this.setState.bind(this)}
                state={this.state}
                cells={this.state.cells}>
            </EditPane>
            <OutPane 
                update={this.setState.bind(this)}
                state={this.state}
                cells={this.state.cells}>
            </OutPane>
        </div>
    );
    }
});

module.exports = App;