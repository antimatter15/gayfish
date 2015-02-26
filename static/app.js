'use strict';

var React = require('react');

var CodeMirror = require("./CodeMirror/lib/codemirror.js")
require("./CodeMirror/mode/javascript/javascript")

var Editor = React.createClass({
    componentDidMount() {
        this.editor = CodeMirror.fromTextArea(this.refs.editor.getDOMNode(), this.props)
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
                <h1>Whats up, world doge.</h1>
                <Editor mode="javascript" lineNumbers={true}></Editor>
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