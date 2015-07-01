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
import * as _ from 'lodash'

var CodeMirror = require('codemirror')


require('./bootstrap/carbide.less');

class Interactor extends Component {
    constructor(props){
        super(props)
        var {doc, cell} = this.props;
        var i = this.props.interactor;
        this.state = {
            value: i.def
        }
    }

    replaceValue = (id, value) => {
        // Yeah I know this is like the cardinal sin of parsing,
        // that is, the lack thereof. But using a full parser
        // would probably make this needlessly language-specific
        // so instead it's doing a regexp to match instances of
        // the pattern Interact(\.[A-Za-z]+)? and it's asking
        // CodeMirror's syntax highlighting engine to make sure
        // that that part of it isn't a comment or string

        var {doc, cell} = this.props;
        var cm = cell.cm;
        var query = new RegExp("Interact(\\.[A-Za-z]+)?", "g")
        var paren = new RegExp("\\(", "g");
        var end = new RegExp(",|\\)", "g");
        var interacts = []
        for(var i = 0, lc = cm.lineCount(); i < lc; i++){
            query.lastIndex = 0
            var line = cm.getLine(i);
            while(query.exec(line)){
                var ch = query.lastIndex;
                var tt = cm.getTokenTypeAt({line: i, ch: ch});
                paren.lastIndex = ch;
                paren.exec(line)
                end.lastIndex = paren.lastIndex
                end.exec(line)
                if((tt == 'variable' || tt == 'property') && paren.lastIndex > 0 && end.lastIndex > 0){
                    interacts.push([
                        { line: i, ch: paren.lastIndex }, 
                        { line: i, ch: end.lastIndex - 1 }
                    ])
                }
            }
        }
        var target = interacts[id]
        if(target){
            var [from, to] = target;    
            cm.replaceRange(value, from, to)
        }
    }

    updateValue = (value) => {
        this.setState({value: value})
        var id = this.props.interactor.id
        this.replaceValue(id, JSON.stringify(value));
        var {doc, cell} = this.props;
        cell.interacts[id] = value;
        doc.vm.repeat(cell)
    }

    updateSlider = () => {
        var value = React.findDOMNode(this.refs.slider).value;
        this.updateValue(+value)
        
    }
    choiceUpdater = (value) => {
        return e => {
            this.updateValue(+value)
        }
    }
    updateText = () => {
        var value = React.findDOMNode(this.refs.text).value;
        this.updateValue(value)
    }
    render(){
        // <td className="name">
        //     <div className="platform-mac source-code"><ObjectTree node={+this.state.value} /></div>
        // </td>
        var {doc, cell} = this.props;
        var i = this.props.interactor;

        var widget = null;
        if(i.type == 'slider'){
            widget = <input 
                ref="slider" 
                className="slider" 
                type="range" 
                onChange={this.updateSlider} 
                defaultValue={this.state.value} 
                min={i.min || 0}
                max={i.max || 100} />
        }else if(i.type == 'choice'){
            // TODO: if opts.length > 5 then present this as a dropdown
            widget = <div className="btn-group">
                        {
                            i.opts.map((x, index) => <button 
                                type="button" 
                                className={classNames({
                                    "btn": true,
                                    "btn-default": true,
                                    "active": index == this.state.value
                                })}
                                onClick={this.choiceUpdater(index)}>{x}</button>)
                        }
                    </div>
        }else if(i.type == 'text'){
            widget = <input ref="text" type="text" onChange={this.updateText} defaultValue={this.state.value} />
        }

        return <tr>
            <td className="name platform-mac source-code">
                {i.name ? i.name : null }
            </td>
            <td className="widget">
                {widget}
            </td>
        </tr>
    }
}


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
        var output = <div></div>;
        // <td>{x.type}</td>
        if(typeof cell.logs !== 'undefined' && cell.logs.length > 0){
            // console.log('merp logs', cell.logs)
            output = <table className="platform-mac source-code log-table">
            <tbody>
            {
                cell.logs.map(x => {
                    return <tr>
                        <td>{x.name}</td>
                        <td>= <ObjectTree node={x.latest} /></td>
                    </tr>
                })
            }
            </tbody>
            </table>
            // var output = <div className="platform-mac source-code">
            //     <ObjectTree node={cell.output} />
            // </div>
        }
        var interactors = [];
        if(typeof cell.interactors !== 'undefined'){
            interactors = _.sortBy(cell.interactors, 'id').map(i => <Interactor cell={cell} doc={doc} interactor={i} />)
        }
        var globals = [];
        if(typeof cell.globals !== 'undefined'){
            // console.log(cell.globals)
            for(var g in cell.globals){
                globals.push(
                    <tr key={g}>
                        <td>
                            <div className="platform-mac source-code">{g}</div>
                        </td>
                        <td>=</td>
                        <td>
                            <div className="platform-mac source-code"><ObjectTree node={cell.globals[g]} /></div>
                        </td>
                    </tr>
                )
            }
        }
        var duration = null;
        if(cell.duration){
            if(cell.duration > 500){
                duration = (cell.duration / 1000).toFixed(2) + 's'
            }else{
                duration = (cell.duration).toFixed(2) + 'ms'
            }
        }
        var style = {};
        if(this.props.preview){
            style.maxHeight = Math.max(40, cell.height - 15) + 'px';
        }
        return (
            <div className={cell_classes} style={style}>
                
                {(cell.status == 'running' && cell.progress > 0 && cell.progress <= 1) ? <progress value={cell.progress} max={1}></progress> : null}
                {(cell.status == 'running' && cell.activity ? <div className="activity">{cell.activity}</div> : null)}
                { interactors.length > 0 ? <table className="interactors">
                    <tbody>{interactors}</tbody>
                </table> : null }
                    
                <div className="output">

                    <span className="timing">{duration}</span>
                    {cell.error ? <div className="error">{cell.error}</div> : null }
                    {output}
                    <table className="global-table"><tbody>{globals}</tbody></table>
                    {cell.status == 'error' ? <DropdownCodeViewer code={cell.compiled} /> : null }
                </div>
            </div>
        )
    }
}


class FocusedCellResult extends Component {
    render() {
        var {doc, cell, size} = this.props;
        if(cell.index < 0) return null;
        // if(typeof cell.output == 'undefined'){
        //     return null;
        // }

        const ipct = ((1 - size) * 100) + '%'
        const cn = classNames({
            "focused-cell-result": true,
            "dragging": doc.isDragging
        })  + ' ' + cell.status;
        return (
            <div className={cn} style={{width: ipct, top: cell._pair.offsetTop + 'px'}} >
                <CellResult key={cell.id} cell={cell} doc={doc} />
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


const cardSource = {
    beginDrag(props, monitor, component) {
        var {cell} = props;
        cell.doc.isDragging = true;
        cell.has_focus = true;

        var el = React.findDOMNode(component);
        return {
            id: props.cell.id,
            height: el.getBoundingClientRect().height
        };
    },
    endDrag(props, monitor, component) {
        var {cell} = props;
        cell.doc.isDragging = false;
        cell.update()
    }
};

// it's really obnoxious to drag small objects because
// when it reorders things, the small object will still
// overlap the bigger one and it'll swap again 
const cardTarget = {
    hover(props, monitor, component) {
        const item = monitor.getItem();
        const draggedId = item.id;
        const {cell} = props;
        if (draggedId !== cell.id) {
            var dragged = props.doc.find(draggedId);

            var el = React.findDOMNode(component);
            var {top, bottom} = el.getBoundingClientRect()
            var {y} = monitor.getClientOffset()

            if(cell.index > dragged.index){
                if(y > bottom - item.height)
                    dragged.moveTo(cell);
            }else{
                if(y < top + item.height)
                    dragged.moveTo(cell);
            }
        }
    }
};



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
    componentDidUpdate(){
        var el = React.findDOMNode(this.refs.result)
        if(el.scrollHeight > el.offsetHeight){
            var output = React.findDOMNode(this.refs.output);
            if(output.className.indexOf('overflowing') == -1){
                output.className += " overflowing"   
            }
        }
    }
    handleClick = (e) => {
        const {cell} = this.props;
        cell.has_focus = true;
        var el = e.target,
            ed = React.findDOMNode(this.refs.editor);
        while(el) {
            if(el == ed) break;
            el = el.parentNode;
        }
        if(el != ed){
            cell.cm.focus()
            cell.cm.execCommand('goDocEnd')   
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
            "modified": cell.oldValue != cell.value,
            "collapsed": cell.collapsed
        }) + ' ' + cell.status;

        // React.findDOMNode(this.refs.editor)

        return connectDragPreview(
            <div className={classNames({"cell-cluster": 1, "focused": doc.vm.latestRunCell == cell})}>
                {connectDropTarget(<div style={{width: pct}} className={cell_classes} onClick={this.handleClick}>
                    {connectDragSource(<div className="cell-handle" style={{ opacity }} onDoubleClick={this.doubleClick}></div>)}
                    <div ref="editor" className="cell-editor" style={{ opacity }}>
                        <Editor {...this.props}></Editor>
                    </div>
                </div>)}
                <div ref="output" className="cell-output" style={{ opacity, width: ipct }}>
                    <CellResult ref="result" {...this.props} cell={cell} preview={true}></CellResult>
                </div>
            </div>);
    } 
}

class InsertCell extends Component {
    constructor(props) {
        super(props)
        this.state = {}
    }
    insertCell = () => {
        const { doc, cell, size } = this.props;
        var newCell = new CellModel(doc, cell.index)
        newCell.mount(x => newCell.cm.focus())
        this.setState({ hover: false })
    }
    onEnter = () => {
        this.setState({ hover: true })
    }
    onLeave = () => {
        this.setState({ hover: false })
    }
    render() {
        const { doc, cell, size } = this.props;
        const pct = (size * 100) + '%';
        const cn = classNames({
            "cell-insert": true,
            "hover": this.state.hover
        })
        return (
            <div onClick={this.insertCell} 
                 onMouseEnter={this.onEnter} 
                 onMouseLeave={this.onLeave} 
                 style={{width: pct}} 
                 className={cn}>
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
                    return <div key={cell.id}>
                        <InsertCell {...this.props}  cell={cell}></InsertCell>
                        <UnifiedPair {...this.props}  cell={cell}></UnifiedPair>
                    </div>
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

        var renderTick = () => {
            this.updateQueued = false;

            localStorage[location.pathname] = JSON.stringify(doc.serialize())
            this.forceUpdate()
        }

        doc.update = () => {
            if(!this.updateQueued){
                this.updateQueued = true;
                requestAnimationFrame(renderTick)
            }
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
                { doc.vm.latestRunCell ? <FocusedCellResult cell={doc.vm.latestRunCell} doc={doc}  size={this.state.size} /> : null }
            </div>
        );
    }
}