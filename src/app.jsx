'use strict';

import React, { Component, PropTypes } from 'react/addons';
import classNames from 'classnames'
import * as _ from 'lodash'

import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd/modules/backends/HTML5';
import { DragSource, DropTarget } from 'react-dnd';

import Machine from './model/machine'
import CellModel from './model/cell'
import DocumentModel from './model/document'

import Editor from './editor'

import {Palette} from './palette'

import {FocusedCellResult, CellResult} from './result'

var CodeMirror = require('codemirror');



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
    stopEvent = (e) => {
        e.stopPropagation()
        e.preventDefault()
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
            <div className={classNames({"cell-cluster": 1, "focused": doc.vm.latestRunCell == cell, "markdown": cell.markdown})}>
                {connectDropTarget(<div style={{width: pct}} className={cell_classes} onClick={this.handleClick}>
                    {connectDragSource(<div className="cell-handle" style={{ opacity }} onClick={this.stopEvent} onDoubleClick={this.doubleClick}></div>)}
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
            this.refs.palette.toggleShow()
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

    render() {
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