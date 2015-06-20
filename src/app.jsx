'use strict';

import React, { Component, PropTypes } from 'react/addons';
import classNames from 'classnames'
// import update from 'react/lib/update';
import ObjectTree from './objtree'

import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd/modules/backends/HTML5';
import { DragSource, DropTarget } from 'react-dnd';

import Machine from './model/machine'
import CellModel from './model/cell'
import DocumentModel from './model/document'
import Editor from './editor'

var CodeMirror = require('codemirror')

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

        if(typeof cell.output === 'undefined'){
            var output = null;
        }else{
            var output = <div className="platform-mac source-code">
                <ObjectTree node={cell.output} />
            </div>
        }
        
        return (
            <div className={cell_classes}>
                {(cell.status == 'running' && cell.progress > 0 && cell.progress < 1) ? <progress value={cell.progress} max={1}></progress> : null}
                {(cell.status == 'running' && cell.activity ? <span className="activity">{cell.activity}</span> : null)}
                <div className="output">
                    {output}
                    {cell.status == 'error' ? <DropdownCodeViewer code={cell.compiled} /> : null }
                </div>
            </div>
        )
    }
}

class DropdownCodeViewer extends Component {
    constructor() {
        super()
        this.state = {
            expanded: false
        }
    }
    toggleExpand = () => {
        this.setState({ expanded: !this.state.expanded })
    }
    render() {
        // var {node} = this.props;
        var {expanded} = this.state;
        return <div className="dropdown-code-viewer">
            <ol className="tree-outline">
                <li className={classNames({"parent": 1, expanded})} onClick={this.toggleExpand}>
                    Show Transpiled Code
                </li>
            </ol>
            {expanded? <CodeViewer code={this.props.code} /> : null}
        </div>
    }
}

class CodeViewer extends Component {
    componentDidMount(){
        CodeMirror.runMode(this.props.code, "javascript", React.findDOMNode(this))
    }
    componentDidUpdate(){
        CodeMirror.runMode(this.props.code, "javascript", React.findDOMNode(this))
    }
    render() {
        return <pre className="mini-me cm-s-default" />
    }
}



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
            <div className={classNames({"cell-cluster": 1, "focused": doc.vm.latestQueuedCell == cell})}>
                {connectDropTarget(<div style={{width: pct}} className={cell_classes} onClick={this.handleClick}>
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
        var last_state;
        try {
            if(localStorage[location.pathname]){
                last_state = JSON.parse(localStorage[location.pathname]);
            }
        } catch (err) {
            console.error(err)
        }
        var doc = new DocumentModel()
        if(last_state){
            doc.restore(last_state)
        }else{
            new CellModel(doc)
        }
        global.Doc = doc;
        this.defaultSize = 0.60

        this.state = { doc, size: this.defaultSize }
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
        this.setState({ size: this.defaultSize })
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
                    <h1>Tungsten Carbide <span className="note">last saved 4 minutes ago</span></h1>
                </div>
                <UnifiedPane doc={doc} size={this.state.size}></UnifiedPane>
            </div>
        );
    }
}