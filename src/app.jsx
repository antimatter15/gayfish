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
    constructor(doc) {
        this.doc = doc;
        this.worker = new Worker('/vm/worker.js')
        this.worker.onmessage = this._onmessage.bind(this)
        this._queue = []
        this.busy = false
    }
    _onmessage(e) {
        var data = e.data;
        // console.log(data)
        var cell = this.doc.find(data.cell);
        if(!cell){
            console.error('cell not found', data)
            return;
        }
        if(data.type == 'result'){
            cell.status = 'done'
            if(data.result == 'use strict'){
                cell.output = 'nothing';
            }else{
                cell.output = data.result;
            }
            
            cell.update()
            this.busy = false;
            this._dequeue()
        }else if(data.type == 'error'){
            cell.status = 'error'
            cell.output = data.error;
            cell.update()
            this.busy = false;
            this._dequeue()
        }else if(data.type == 'progress'){
            cell.progress = data.frac;
            cell.update()
        }else if(data.type == 'activity'){
            cell.activity = data.activity;
            cell.update()
        }else{
            console.error('no handler for data packet', data)
        }
    }
    _dequeue() {
        if(this.busy || this._queue.length == 0) return;
        var cell = this._queue.shift()
        this.busy = true;
        cell.status = 'running';
        cell.oldValue = cell.value;
        cell.compiled = ''
        cell.activity = ''
        cell.update()
        var error, code;
        try {
            code = transformCode(cell.value)
        } catch (err) {
            error = err
            console.error(error)
        }
        if(error){
            cell.status = 'error'
            cell.output = error.toString()
            cell.update()
            this.busy = false;
            this._dequeue()
        }else{
            cell.compiled = code
            cell.progress = 0;
            this.worker.postMessage({ type: 'exec', code, cell: cell.id })

            // setTimeout(x => {
            //     cell.status = 'done';
            //     cell.output = code;
            //     cell.update()

            //     this.busy = false;
            //     this._dequeue();
            // }, 500)
        }

    }
    queue(cell) {
        if(this._queue.indexOf(cell) != -1) return;
        this._queue.push(cell)
        cell.status = 'queued'
        if(!this.busy) this._dequeue();
    }
}

function transformCode(code){
    var middle = babel.transform(code, {
        optional: ["runtime"],
        // modules: 'amd',
        stage: 0
    }).code;

    var progressTracker = '__track$loop__'
    function removeMerp(src){
        console.log('removing merp', src)
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
                thing.update('{'+progressTracker+'(arguments[1], arguments[2].length);' + thing.source().slice(1))
                // removeMerp(
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

    return result;
}



class DocumentModel { // a document is a collection of cells
    constructor() {
        this.cells = []
        this._ids = 0
        this.vm = new Machine(this)
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

class CellModel {
    constructor(doc, index) {
        this.doc = doc
        this.id = --doc._ids;
        this.value = ""
        this.oldValue = ""
        this.output = ""

        this.cm = null
        if(typeof index === 'undefined'){
            doc.cells.push(this)
        }else{
            doc.cells.splice(index, 0, this)
        }
        this._collapsed = false;
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
    set collapsed(val){
        this._collapsed = val;
        this.update()
    }
    get collapsed(){ return this._collapsed }
    get index(){ return this.doc.cells.indexOf(this) }
    get prev(){ 
        var prev = this.doc.item(this.index - 1)
        if(prev && prev.collapsed) return prev.prev;
        return prev;
    }
    get next(){
        var next = this.doc.item(this.index + 1)
        if(next && next.collapsed) return next.next;
        return next;
    }
    run() {
        this.doc.vm.queue(this)
        this.update()
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
                cell.run()
                if(!cell.next && cell.value) new CellModel(doc);
                if(cell.next){
                    cell.next.cm.setCursor(0, 0)
                    cell.next.cm.focus() 
                }
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
            
            if(!cell.next && cell.value) new CellModel(doc);
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
                        cell.prev.cm.setCursor(1e8, 1e8)
                    }else if(cell.next){
                        cell.next.cm.focus()
                        cell.next.cm.setCursor(0, 0)
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
    beginDrag(props, monitor, component) {
        props.cell.has_focus = true;
        var el = React.findDOMNode(component);
        return {
            id: props.cell.id,
            height: el.getBoundingClientRect().height
        };
    }
};

// it's really obnoxious to drag small objects because
// when it reorders things, the small object will still
// overlap the bigger one and it'll swap again 
const cardTarget = {
    hover(props, monitor, component) {
        const item = monitor.getItem();
        const draggedId = item.id;
        if (draggedId !== props.cell.id) {
            var dragged = props.doc.find(draggedId);

            var el = React.findDOMNode(component);
            var {top, bottom} = el.getBoundingClientRect()
            var {y} = monitor.getClientOffset()

            if(props.cell.index > dragged.index){
                if(y > bottom - item.height)
                    dragged.moveTo(props.cell);
            }else{
                if(y < top + item.height)
                    dragged.moveTo(props.cell);
            }
        }
    }
};

class CellResult extends Component {
    render() {
        var {doc, cell} = this.props;
        // if(cell.has_focus){
        //     return <div className="active-result">omg has focus</div>
        // }
        const cell_classes = classNames({
            "cell-result": true,
            "focused": cell.has_focus
        }) + ' ' + cell.status;

        if(typeof cell.output == 'string'){
            var output = <pre> {cell.output} </pre>
        }else{
            var output = <ObjectTree node={cell.output} />
        }
        
        return (
            <div className={cell_classes}>
                {(cell.status == 'running' && cell.progress > 0 && cell.progress < 1) ? <progress value={cell.progress} max={1}></progress> : null}
                {(cell.status == 'running' && cell.activity ? <span>{cell.activity}</span> : null)}
                {output}
                {(cell.status == 'error') ? <pre>{cell.compiled}</pre> : null}
            </div>
        )
    }
}

class ObjectTree extends Component {
    render() {
        var {node} = this.props;
        if(typeof node == "undefined"){
            return <span className="undefined">undefined</span>
        }else if(typeof node == "string"){
            return <span className="string">{'"' + node + '"'}</span>
        }else if(typeof node == "number"){
            return <span className="number">{node}</span>
        }else if(typeof node == "object"){
            if(Array.isArray(node)){
                return <ul>
                    { node.map(x => <li><ObjectTree node={x} /></li>) }
                </ul>
            }else{
                return <ul>
                    {Object.keys(node).map(function(blah){
                        return <li><ObjectTree node={blah} />: <ObjectTree node={node[blah]} /></li>
                    })}
                </ul>
            }
        }
        return <div>hi</div>
    }
}

// var TreeNode = React.createClass({
//   getInitialState: function() {
//     return {
//       visible: true
//     };
//   },
//   render: function() {
//     var childNodes;
//     var classObj;

//     if (this.props.node.childNodes != null) {
//       childNodes = this.props.node.childNodes.map(function(node, index) {
//         return <li key={index}><TreeNode node={node} /></li>
//       });

//       classObj = {
//         togglable: true,
//         "togglable-down": this.state.visible,
//         "togglable-up": !this.state.visible
//       };
//     }

//     var style;
//     if (!this.state.visible) {
//       style = {display: "none"};
//     }

//     return (
//       <div>
//         <h5 onClick={this.toggle} className={React.addons.classSet(classObj)}>
//           {this.props.node.title}
//         </h5>
//         <ul style={style}>
//           {childNodes}
//         </ul>
//       </div>
//     );
//   },
//   toggle: function() {
//     this.setState({visible: !this.state.visible});
//   }
// });


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
        }else if(prevState.show){
            const {doc} = this.props;
            doc.focused.cm.focus();
        }
    }
    render() {
        if(!this.state.show) return null;
        var source = []
        for(var i = 0; i < 500; i++){
            source.push(i)
        }
        var matches = source.filter(x => x % this.state.query.length == 0);

        if(matches.length == 0){
            var results = <div className="no-results">(no matches)</div>
        }else{
            var results = <div className="results">
                {matches.map(x => <div>{x}</div>)}
            </div>
        }
        var width = 0.35;
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
    constructor(props) {
        super(props)
        this.componentDidMount = this.componentDidMount.bind(this)
    }
    componentDidMount() {  
        const {cell} = this.props;
        cell._pair = React.findDOMNode(this)
    }
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
        const { doc, cell } = this.props;
        cell.collapsed = !cell.collapsed
    }
    render() {
        const { doc, cell, size } = this.props;

        const { isDragging, connectDragSource, connectDropTarget, connectDragPreview } = this.props;
        const opacity = isDragging ? 0 : 1;
        
        const pct = (size * 100) + '%',
              ipct = (100 - size * 100) + '%';
        
        const cell_classes = classNames({
            "cell-input": true, 
            "focused": cell.has_focus,
            "modified": cell.oldValue != cell.value
        }) + ' ' + cell.status
        return connectDragPreview(
            <div className="cell-cluster">
                {connectDropTarget(<div style={{width: pct}} className={cell_classes} onClick={this.handleClick}>
                    {connectDragSource(<div className="cell-handle" style={{ opacity }} onDoubleClick={this.doubleClick}></div>)}
                    <div ref="editor" className="cell-editor" style={{ opacity }}>
                        <Editor {...this.props}></Editor>
                    </div>
                </div>)}
                <div style={{ opacity, width: ipct }}>
                    <CellResult {...this.props} cell={cell}></CellResult>
                </div>
            </div>);
    } 
}

class CollapsedCell extends Component {
    restoreCell = () => {
        const { doc, cell, size } = this.props;
        cell.collapsed = false;
    }
    render() {
        const { doc, cell, size } = this.props;
        const pct = (size * 100) + '%';
        return (
            <div onClick={this.restoreCell} style={{width: pct}} className="cell-collapse">
                <hr />
            </div>
        );
    }
}

@DragDropContext(HTML5Backend)
class UnifiedPane extends Component {
    paddingClick = () => {
        var {doc} = this.props;
        var lastCell = doc.cells[doc.cells.length - 1];
        if(lastCell && lastCell.cm){
            lastCell.cm.focus();
            lastCell.cm.setCursor(1e8, 1e8)
        }
    }
    render() {
        const { doc, size } = this.props;
        
        var lastCell = doc.cells[doc.cells.length - 1];
        var cellHeight = lastCell && lastCell._pair ? lastCell._pair.offsetHeight : 0
        

        return (
            <div className="cell-culture">
            {
                doc.cells.map(cell => {
                    if(cell.collapsed){
                        return <CollapsedCell {...this.props} key={cell.id} cell={cell}></CollapsedCell>
                    }else{
                        return <UnifiedPair {...this.props} key={cell.id} cell={cell}></UnifiedPair>    
                    }
                })
            }
            <div className="cell-padding" style={{ height: (innerHeight - cellHeight - 10) }} onClick={this.paddingClick} />
            </div>
        )
    }
}

export default class App extends Component {
    constructor(props) {
        super(props);
        
        try {
            var doc = new DocumentModel()
            var last_state = JSON.parse(localStorage[location.pathname]);
            doc.restore(last_state)
        } catch (err) {
            console.error(err)
            var doc = new DocumentModel()
            new CellModel(doc)
        }
        global.Doc = doc;

        this.state = {
            doc,
            size: 0.55
        }
        doc.update = () => {
            localStorage[location.pathname] = JSON.stringify(doc.serialize())
            this.forceUpdate()
        }
    }
    handleKey = (e) => {
        if(e.keyCode == 80 && e.metaKey){ // Cmd-P
            e.preventDefault();
            this.refs.palette.setState({ show: !this.refs.palette.state.show })
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
    resetResize = (e) => {
        e.preventDefault()
        this.setState({ size: 0.55 })
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
                <div className={resize_classes} style={resizer} onMouseDown={this.beginResize} onDoubleClick={this.resetResize}></div>
                <div className="background" style={{ width: ipct }}></div>
                <div className="header">
                    <div className="right">
                        <div className="button new">New Notebook</div>
                    </div>
                    <h1>Jade <span className="note">last saved 4 minutes ago</span></h1>
                </div>
                <UnifiedPane doc={doc} size={this.state.size}></UnifiedPane>
            </div>
        );
    }
}