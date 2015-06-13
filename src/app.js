'use strict';

import React, { Component, PropTypes } from 'react/addons';
import update from 'react/lib/update';
import classNames from 'classnames'
// import SplitPane from 'react-split-pane'
import babel from 'babel-core/lib/babel/api/browser.js'
import falafel from 'falafel';
// import _ from 'lodash';

global.babel = babel
var CodeMirror = require('codemirror')
require("codemirror/lib/codemirror.css");
require("./codemirror.less");
require("codemirror/mode/javascript/javascript")
require("codemirror/mode/xml/xml")
require("./jsx.js")

require("codemirror/keymap/sublime")
require("codemirror/addon/edit/closebrackets")
// require("./closebrackets");

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

global.tern = require('tern')
require("codemirror/addon/tern/tern.css")
require("codemirror/addon/tern/tern")

// Tern Server Eliot
var eliot = new CodeMirror.TernServer({defs: [
    require('tern/defs/ecma5.json')
]});

// import npm from 'npm'

// var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;
// import ReactCSSTransitionGroup from 'react/lib/ReactCSSTransitionGroup'

import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd/modules/backends/HTML5';
import { DragSource, DropTarget } from 'react-dnd';

class Machine {
    // src/vm.js
    constructor() {
        this.worker = new Worker('/src/vm.js')
        this.status = 'idle'
    }
    run(code) {
        this.worker.postMessage({ type: 'exec', code })
    }
}



class DocumentModel { // a document is a collection of cells
    constructor() {
        this.cells = []
        this._ids = 0
        this.vm = new Machine()
    }
    find(id) { return this.cells.filter(x => x.id === id)[0] }
    item(index) { return this.cells[index] }
    get length() { return this.length }
    update(){}
    serialize() {
        return {
            cells: this.cells.map( x => x.serialize() )
        }
    }
    restore(state){
        for(let c of state.cells){
            if(typeof c.index != 'number') throw 'Cell index must be number';
            var cell = new CellModel(this, c.index)
            if(typeof c.value != 'string') throw 'Cell value must be string';
            cell.value = c.value
        }
    }
    get focused() { return this.cells.filter(x => x.has_focus)[0] }
}

function transformCode(code){
    try {
        var middle = babel.transform(code).code;

        var progressTracker = '__track$loop__'
        function removeMerp(src){
            return falafel(src, function(node){
                if(node.type == 'CallExpression' &&
                    node.callee.type == 'Identifier' &&
                    node.callee.name == progressTracker){
                    node.update('0')
                }
            }).toString()
        }
        var result = falafel(middle, function (node) {
            if(node.type === 'ForStatement'){
                if(node.test.type == 'BinaryExpression' && 
                    node.test.right.type == 'Literal' && 
                    node.test.left.type == 'Identifier' &&
                    node.test.operator == '<'){
                    node.update.update(node.update.source() + ','+progressTracker+'(' + node.test.left.name + ', ' + node.test.right.value + ')')
                    node.body.update(removeMerp(node.body.source()))
                }
            }else if(node.type === 'CallExpression'){
                if(node.callee.type == 'MemberExpression' && 
                    ['forEach', 'map'].indexOf(node.callee.property.name) != -1 &&
                    node.arguments[0].type == 'FunctionExpression') {
                    var thing = node.arguments[0].body;
                    thing.update('{'+progressTracker+'(arguments[1], arguments[2].length);' + removeMerp(thing.source()).slice(1))
                }
            }else if(node.type == 'WhileStatement'){
                if(node.test.type == 'BinaryExpression' &&
                    node.test.right.type == 'Literal' && 
                    node.test.left.type == 'Identifier' &&
                    node.test.operator == '<' &&
                    node.body.type == 'BlockStatement'){
                    node.body.update('{'+progressTracker+'(' + node.test.left.name + ', ' + node.test.right.value + ');' + removeMerp(node.body.source()).slice(1))
                }
            }
        }).toString();

    } catch (err) {
        var result = err.toString()
        console.error(err)
    }
    return result;
}

class CellModel {
    constructor(doc, index) {
        this.doc = doc
        this.id = --doc._ids;
        this.value = ""
        this.cm = null
        if(typeof index === 'undefined'){
            doc.cells.push(this)
        }else{
            doc.cells.splice(index, 0, this)
        }
        this._mounted =  []
        this.update()
    }
    serialize() {
        return {
            value: this.value,
            index: this.index
        }
    }
    mount = (x) => {
        if(typeof x == 'function'){
            this.cm ? x() : this._mounted.push(x);
        }else if(x instanceof CodeMirror){
            this.cm = x;
            while(this._mounted.length)
                this._mounted.shift()();
        }
    }
    remove() {
        this.doc.cells.splice(this.index, 1)
        this.update()
    }
    moveTo(after) {
        var cardIndex = this.index,
            afterIndex = after.index;
        this.doc.cells.splice(cardIndex, 1)
        this.doc.cells.splice(afterIndex, 0, this);
        console.log('moveto', this.id, after.id, cardIndex, afterIndex)
        this.update()
    }
    update(){ if(this.doc) this.doc.update() }
    get value(){ return this._value; }
    set value(val){
        this._value = val;
        this.update()
    }
    get has_focus(){ return this._has_focus; }
    set has_focus(val){
        this._has_focus = val;
        if(val){
            for(var i = 0; i < this.doc.cells.length; i++){
                var other = this.doc.cells[i];
                if(other !== this) other.has_focus = false;
            }
            this.doc.update()
        }
    }
    get index(){ return this.doc.cells.indexOf(this) }
    get prev(){ return this.doc.item(this.index - 1) }
    get next(){ return this.doc.item(this.index + 1) }
    run() {
        this.status = 'running'
        this.output = transformCode(this.value)
    }
}

class Editor extends Component {
    constructor(props) {
        super(props)
        this.componentDidMount = this.componentDidMount.bind(this)
    }
    componentDidMount() {        
        var {doc, cell} = this.props;

        var cm = CodeMirror(React.findDOMNode(this), {
            value: cell.value,
            mode: "jsx",
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

        cell.mount(cm)

        cm.setOption("extraKeys", {
            "Ctrl-Space": function(cm) { eliot.complete(cm); },
            "Ctrl-I": function(cm) { eliot.showType(cm); },
            "Ctrl-O": function(cm) { eliot.showDocs(cm); },
            "Alt-.": function(cm) { eliot.jumpToDef(cm); },
            "Alt-,": function(cm) { eliot.jumpBack(cm); },
            "Ctrl-Q": function(cm) { eliot.rename(cm); },
            "Ctrl-.": function(cm) { eliot.selectName(cm); },
            "Shift-Enter": (cm) => {
                cell.run(x => {
                   if(cell.next) cell.next.cm.focus() 
                })
            },
            "Ctrl-N": (cm) => {
            },
            "Cmd-Up": (cm) => {
                if(cell.prev) cell.prev.cm.focus();
            },
            "Cmd-Down": (cm) => {
                if(cell.next) cell.next.cm.focus();
            },
            "Cmd-J": (cm) => {
                var newCell = new CellModel(doc, cell.index + 1)
                newCell.cm.focus()
            },
            "Cmd-K": (cm) => {
                var newCell = new CellModel(doc, cell.index)
                newCell.cm.focus()
            }
        })

        cm.on('changes', (cm) => {
            cell.value = cm.getValue()    
            
            if(!cell.next && cell.value){
                new CellModel(doc);
            }
        })
        cm.on("cursorActivity", function(cm) { 
            eliot.updateArgHints(cm); 
            // eliot.complete(cm)
        });
        cm.on('blur', (cm, evt) => {
            // cell.has_focus = false
            // doc.update()
        })
        cm.on('focus', (cm, evt) => {
            cell.has_focus = true

            if(!cell.next && cell.value){
                new CellModel(doc)
                doc.update()
            }
        })
        cm.on('keyup', function(cm, evt){
            // console.log(cm.type, cm, evt.keyCode)
            if(evt.keyCode == 190){ // i don't know why this is "."
                eliot.complete(cm)
            }
        })
        cm.on('keydown', (cm, evt) => {
            // console.log(evt, cm, evt.keyCode)
            if(evt.keyCode == 40){ // down
                var cursor = cm.getCursor()
                if (cursor.line === (cm.lineCount()-1)) {
                    // cursor.ch === cm.getLine(cursor.line).length
                    // select the next thing
                    if(cell.next) cell.next.cm.focus()
                }
            }else if(evt.keyCode == 38){ // up
                var cursor = cm.getCursor()
                if (cursor.line === 0) {
                    if(cell.prev) cell.prev.cm.focus()
                }
            }else if(evt.keyCode == 8) { // backspace
                if(cm.getValue() == ""){ // if the cell is empty
                    if(cell.prev){
                        cell.prev.cm.focus()    
                    }else if(cell.next){
                        cell.next.cm.focus()
                    }
                    if(doc.cells.length > 1){
                        cell.remove()   
                    }
                }
            }
            
        })
    }
    render() {
        return <div></div>
    }
}


const cardSource = {
    beginDrag(props) {
        props.cell.has_focus = true;
        return { id: props.cell.id };
    }
};

const cardTarget = {
    hover(props, monitor) {
        const draggedId = monitor.getItem().id;
        if (draggedId !== props.cell.id) {
            console.log(monitor, props)

            // console.log(draggedId, props.cell.id)
            props.doc.find(draggedId).moveTo(props.cell)
        }
    }
};

// @DropTarget('Cell', cardTarget, connect => ({
//     connectDropTarget: connect.dropTarget(),
// }))
// @DragSource('Cell', cardSource, (connect, monitor) => ({
//     connectDragSource: connect.dragSource(),
//     isDragging: monitor.isDragging()
// }))
// class Cell extends Component {
//     handleClick = (e) => {
//         this.props.cell.has_focus = true;
//     }
//     render() {
//         const { doc, cell } = this.props;

//         const { isDragging, connectDragSource, connectDropTarget } = this.props;
//         const opacity = isDragging ? 0 : 1;
        
//         return connectDropTarget(connectDragSource(
//             <div className={classNames({"cell": true, "focused": cell.has_focus})} onMouseDown={this.handleClick}>
//                 <div className="cell-handle" style={{ opacity }}></div>
//                 <div className="cell-editor" style={{ opacity }}>
//                     <Editor {...this.props}></Editor>
//                 </div>
//             </div>));
//     } 
// }

// @DragDropContext(HTML5Backend)
// class EditPane extends Component {
//     constructor(props) {
//         super(props);
//     }
//     handleClick = (e) => {
//         var {doc} = this.props;
//         if(e.target === React.findDOMNode(this)){
//             doc.cells[doc.cells.length - 1].cm.focus()
//         }
//     }
//     render() {
//         var {doc} = this.props;

//         return (
//             <div className="editpane" onClick={this.handleClick}>
//                 {doc.cells.map(
//                     (cell) => <Cell {...this.props} key={cell.id} cell={cell}></Cell>
//                 )}
//             </div>
//         )
//     }
// }


class CellResult extends Component {
    render() {
        var {doc, cell} = this.props;
        // if(cell.has_focus){
        //     return <div className="active-result">omg has focus</div>
        // }
        return (
            <pre>
                {cell.output}
            </pre>
        )
    }
}

// class OutPane extends Component {
//     render() {
//         var {doc} = this.props;
//         return (
//             <div className="outpane">
//                 {doc.cells.map(
//                     (cell) => <CellResult {...this.props} cell={cell} key={cell.id}></CellResult>
//                 )}
//             </div>
//         )
//     }
// }


class Palette extends Component {
    constructor(props) {
        super(props);
        this.state = {
            show: false,
            query: ''
        }
    }
    handleInput = (e) => {
        this.setState({ query: React.findDOMNode(this.refs.input).value })
    }
    handleKey = (e) => {
        const {doc} = this.props;

        if(e.keyCode == 27){ // esc
            doc.focused.cm.focus();
            this.setState({ show: false })
        }else if(e.keyCode == 38) { // up

        }else if(e.keyCode == 40) { // down

        }else if(e.keyCode == 13){ // enter
            // console.log(e.keyCode)
        }
    }
    focus = () => {
        React.findDOMNode(this.refs.input).focus()
    }
    componentDidUpdate = (prevProps, prevState) => {
        if(this.state.show){
            this.focus()
        }
    }
    render() {
        if(!this.state.show) return null;
        var matches = _.range(442).filter(x => x % this.state.query.length == 0);

        if(matches.length == 0){
            var results = <div className="no-results">(no matches)</div>
        }else{
            var results = <div className="results">
                {matches.map(x => <div>{x}</div>)}
            </div>
        }
        var width = 0.4;
        var style = {
            right: `${-(this.props.size + width - 1)*100/2}%`,
            width: `${width*100}%`
        }
        return (
            <div className="palette" style={style}>
                <input type="text" ref="input" onChange={this.handleInput} onKeyDown={this.handleKey}></input>
                {results}            
            </div>
        )
    }
}


@DropTarget('UnifiedPair', cardTarget, connect => ({
    connectDropTarget: connect.dropTarget(),
}))
@DragSource('UnifiedPair', cardSource, (connect, monitor) => ({
    connectDragSource: connect.dragSource(),
    connectDragPreview: connect.dragPreview(),
    isDragging: monitor.isDragging()
}))
class UnifiedPair extends Component {
    handleClick = (e) => {
        const {cell} = this.props;
        cell.has_focus = true;
        if(e.target == React.findDOMNode(this.refs.editor)){
            cell.cm.focus()
            cell.cm.execCommand('goDocEnd')   
        }else{
            // console.log(e.target)
        }
    }
    doubleClick = (e) => {
        // TODO: collapse the cell
    }
    render() {
        const { doc, cell, size } = this.props;

        const { isDragging, connectDragSource, connectDropTarget, connectDragPreview } = this.props;
        const opacity = isDragging ? 0 : 1;
        
        const pct = (size * 100) + '%',
              ipct = (100 - size * 100) + '%';

        return connectDragPreview(
            <div className="cell-cluster">
                {connectDropTarget(<div style={{width: pct}} className={classNames({"cell-input": true, "focused": cell.has_focus})} onClick={this.handleClick}>
                    {connectDragSource(<div className="cell-handle" style={{ opacity }} onDoubleClick={this.doubleClick}></div>)}
                    <div ref="editor" className="cell-editor" style={{ opacity }}>
                        <Editor {...this.props}></Editor>
                    </div>
                </div>)}
                <div className="cell-output" style={{ opacity, width: ipct }}>
                    <CellResult {...this.props} cell={cell}></CellResult>
                </div>
            </div>);
    } 
}


@DragDropContext(HTML5Backend)
class UnifiedPane extends Component {
    render() {
        var {doc} = this.props;
        return (
            <div className="cell-culture">
            {
                doc.cells.map(cell => {
                    return <UnifiedPair {...this.props} key={cell.id} cell={cell}></UnifiedPair>
                })
            }
            </div>
        )
    }
}

export default class App extends Component {
    constructor(props) {
        super(props);
        
        try {
            var doc = new DocumentModel()
            var last_state = JSON.parse(localStorage.last_state);
            doc.restore(last_state)
        } catch (err) {
            console.error(err)
            var doc = new DocumentModel()
            new CellModel(doc)
        }

        this.state = {
            doc,
            size: 0.55
        }
        doc.update = () => {
            localStorage.last_state = JSON.stringify(doc.serialize())
            this.forceUpdate()
        }
    }
    handleKey = (e) => {
        if(e.keyCode == 80 && e.metaKey){ // Cmd-P
            e.preventDefault();
            this.refs.palette.setState({ show: true })
        }else if(e.keyCode == 82 && e.metaKey){ // Cmd-R
            // e.preventDefault();
            // this.refs.palette.setState({ show: true })
        }else if(e.keyCode == 83 && e.metaKey){ // Cmd-S
            e.preventDefault();
            // this.refs.palette.setState({ show: true })
        }else if(e.keyCode == 71 && e.metaKey){ // Cmd-G
            e.preventDefault();
            this.refs.palette.setState({ show: true })
        }else{
            // console.log(e.keyCode)
        }
    }

    beginResize = (e) => {
        e.preventDefault()
        this.setState({ resizing: true })
    }
    up = (e) => {
        this.setState({ resizing: false })
    }
    move = (e) => {
        if(this.state.resizing){
            // console.log(e.clientX / innerWidth)
            this.setState({ size: (e.clientX + 6) / innerWidth})
            e.preventDefault()
        }
    }

    componentDidMount() {
        document.addEventListener('mouseup', this.up);
        document.addEventListener('mousemove', this.move);
        document.addEventListener('keydown', this.handleKey);

        this.state.doc.cells[0].cm.focus()
    }


    // componentWillUnmount() {
    //     document.removeEventListener('mouseup', this.up);
    //     document.removeEventListener('mousemove', this.move);
    // },

    render() {
        // <SplitPane orientation="horizontal" minSize={250}>
        //     <EditPane doc={this.state.doc}></EditPane>
        //     <OutPane  doc={this.state.doc}></OutPane>
        // </SplitPane>
        var {doc} = this.state;
        var pct = (this.state.size * 100) + '%',
            ipct = (100 - this.state.size * 100) + '%';
        var resizer = {
            position: 'absolute',
            top: 0,
            zIndex: 52,
            left: pct
        }
        var resize_classes = ['Resizer', 'horizontal', this.state.resizing ? 'active' : ''].join(' ')
        return  (
            <div className="container">
                <Palette ref="palette" doc={doc} size={this.state.size}></Palette>
                <div className={resize_classes} style={resizer} onMouseDown={this.beginResize}></div>
                <div className="background" style={{ width: ipct }}></div>
                <UnifiedPane doc={doc} size={this.state.size}></UnifiedPane>
            </div>
        );
    }
}