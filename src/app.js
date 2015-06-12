'use strict';

import React, { Component, PropTypes } from 'react';
import update from 'react/lib/update';
import SplitPane from 'react-split-pane'

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


import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd/modules/backends/HTML5';
import { DragSource, DropTarget } from 'react-dnd';

class DocumentModel { // a document is a collection of cells
    constructor() {
        this.cells = []
    }
    append(cell) {
        this.cells.push(cell)
        cell.doc = this;
        cell.id = -this.cells.length;

    }
    find(id) {
        return this.cells.filter(x => x.id === id)[0]
    }
    item(index) {
        return this.cells[index]
    }
    get length() {
        return this.length
    }
    update(){}
}


// moveCard(id, afterId) {
//     const cells = this.props.cells;

//     const card = cells.filter(c => c.key === id)[0];
//     const afterCard = cells.filter(c => c.key === afterId)[0];
//     const cardIndex = cells.indexOf(card);
//     const afterIndex = cells.indexOf(afterCard);

//     this.props.update(update(this.props, {
//         cells: {
//             $splice: [
//                 [cardIndex, 1],
//                 [afterIndex, 0, card]
//             ]
//         }
//     }));
// }

class CellModel {
    constructor(text) {
        this.value = text
        this.doc = null
        this.id = null
        this.cm = null
    }
    insertBefore(cell) {

    }
    insertAfter(cell) {

    }
    moveTo(after) {
        var cardIndex = this.index,
            afterIndex = after.index;
        this.doc.cells.splice(cardIndex, 1)
        this.doc.cells.splice(afterIndex, 0, this);
        this.update()
    }
    update(){
        if(this.doc) this.doc.update()
    }
    get value(){
        return this._value;
    }
    set value(val){
        this._value = val;
        this.update()
    }
    get index(){
        return this.doc.cells.indexOf(this)
    }
    get prev(){
        return this.doc.item(this.index - 1)
    }
    get next(){
        return this.doc.item(this.index + 1)
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

        cell.cm = cm;

        cm.setOption("extraKeys", {
            "Ctrl-Space": function(cm) { eliot.complete(cm); },
            "Ctrl-I": function(cm) { eliot.showType(cm); },
            "Ctrl-O": function(cm) { eliot.showDocs(cm); },
            "Alt-.": function(cm) { eliot.jumpToDef(cm); },
            "Alt-,": function(cm) { eliot.jumpBack(cm); },
            "Ctrl-Q": function(cm) { eliot.rename(cm); },
            "Ctrl-.": function(cm) { eliot.selectName(cm); },
            "Shift-Enter": (cm) => {
                // console.log('i ran')
                if(cell.next) cell.next.cm.focus()


                // var state = this.props.state;
                // this.props.update({
                //     count: state.count + 1,
                //     cells: state.cells.slice(0).concat([{
                //         value: `zombocom dos (actually ${state.count})`,
                //         key: state.count + 1
                //     }])
                // })
            },
            "Ctrl-N": (cm) => {
                // console.log('new')
                // var state = this.props.state;
                // this.props.update({
                //     count: state.count + 1,
                //     cells: state.cells.slice(0).concat([{
                //         value: `zombocom dos (actually ${state.count})`,
                //         key: state.count + 1
                //     }])
                // })
            }
        })

        cm.on('changes', (cm) => {
            cell.value = cm.getValue()    
            
            if(!cell.next && cell.value){
                var newCell = new CellModel("")
                doc.append(newCell)
                doc.update()
            }
        })
        cm.on("cursorActivity", function(cm) { 
            eliot.updateArgHints(cm); 
            // eliot.complete(cm)
        });
        cm.on('focus', (cm, evt) => {
            // console.log(cm, evt)
            // this.props.update({
            //     focus: this.props.key
            // })
            if(!cell.next && cell.value){
                var newCell = new CellModel("")
                doc.append(newCell)
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
            console.log(evt, cm, evt.keyCode)
            if(evt.keyCode == 40){ // down
                var cursor = cm.getCursor()
                if (cursor.line === (cm.lineCount()-1)) {
                    // cursor.ch === cm.getLine(cursor.line).length
                    // select the next thing
                    cell.next.cm.focus()
                }
            }else if(evt.keyCode == 38){ // up
                var cursor = cm.getCursor()
                if (cursor.line === 0) {
                    cell.prev.cm.focus()
                }
            }
            
            // this.props.update({
            //     value: cm.getValue()
            // })
            // console.log(this.props, cm.getValue())
            // this.props.update(update(this.props, {
            //     $set: {
            //         value: cm.getValue()
            //     }
            // }))
            // this.props.update({
            //     value: cm.getValue()
            // })
            
        })
    }
    render() {
        return <div></div>
    }
}


const cardSource = {
    beginDrag(props) {
        return { id: props.cell.id };
    }
};

const cardTarget = {
  hover(props, monitor) {
    const draggedId = monitor.getItem().id;
    if (draggedId !== props.cell.id) {
      // props.moveCard(draggedId, props.cell.key);
      props.doc.find(draggedId).moveTo(props.cell)
    }
  }
};

@DropTarget('Cell', cardTarget, connect => ({
  connectDropTarget: connect.dropTarget(),
}))
@DragSource('Cell', cardSource, (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging()
}))
class Cell extends Component {
    // static propTypes = {
    //     connectDragSource: PropTypes.func.isRequired,
    //     connectDropTarget: PropTypes.func.isRequired,
    //     isDragging: PropTypes.bool.isRequired,
    //     id: PropTypes.any.isRequired,
    //     text: PropTypes.string.isRequired,
    //     moveCard: PropTypes.func.isRequired
    // };
    render() {
        const { doc, cell } = this.props;

        const { isDragging, connectDragSource, connectDropTarget } = this.props;
        const opacity = isDragging ? 0 : 1;

        // const style = {
        //     border: '5px solid gray',
        //     padding: '0.5rem 1rem',
        //     marginBottom: '.5rem',
        //     backgroundColor: 'white',
        //     float: 'left',
        //     cursor: 'move'
        // };

        return connectDragSource(
            <div className="cell">
                {connectDropTarget(
                    <div className="cell-handle" style={{ opacity }}></div>
                )}
                <div className="cell-editor" style={{ opacity }}>
                    <Editor {...this.props}></Editor>
                </div>
            </div>);
    } 
}

@DragDropContext(HTML5Backend)
class EditPane extends Component {
    constructor(props) {
        super(props);

    }
    render() {
        var {doc} = this.props;

        return (
            <div className="editpane">{
                doc.cells.map(
                    (cell) => <Cell {...this.props} key={cell.id} cell={cell}></Cell>
                )
            }</div>
        )
    }
}

class OutPane extends Component {
    // handleClick() {
    //     this.props.update({
    //         count: this.props.state.count + 1
    //     })
    // }
    render() {
        var {doc} = this.props;

        return (
            <div className="outpane">
                {doc.cells.map(
                    (cell) => <div key={cell.key}>{cell.value}</div>
                )}
            </div>
        )
    }
}




export default class App extends Component {
  constructor(props) {
    super(props);
    var doc = new DocumentModel()
    doc.append(new CellModel("function zombocom(z){\n\treturn z + 1\n}"))
    doc.append(new CellModel("function derpsacola(z){\n\treturn z + 1\n}"))
    doc.append(new CellModel("function walp(z){\n\treturn z + 1\n}"))
    this.state = { doc }

    doc.update = this.forceUpdate.bind(this)
  }
  render() {
    return  (
        <SplitPane orientation="horizontal" minSize={250}>
           <EditPane doc={this.state.doc}></EditPane>
           <OutPane  doc={this.state.doc}></OutPane>
       </SplitPane>
   );
  }
}