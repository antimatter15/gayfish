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
    }
    item(index) {
        return this.cells[index]
    }
    get length() {
        return this.length
    }
}

class CellModel {
    insertBefore(cell) {

    }
    insertAfter(cell) {

    }
    get prev(){

    }
    get next(){

    }
}


class Editor extends Component {
    constructor(props) {
        super(props)
        this.componentDidMount = this.componentDidMount.bind(this)
    }
    componentDidMount() {
        console.log(this, React.findDOMNode(this))
        var com = this;

        this.editor = CodeMirror(React.findDOMNode(this), {
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
            // this.props.update({
            //     value: cm.getValue()
            // })
            console.log(this.props, cm.getValue())
            // this.props.update(update(this.props, {
            //     $set: {
            //         value: cm.getValue()
            //     }
            // }))
            this.props.update({
                value: cm.getValue()
            })
            
        })
    }
    render() {
        return <div></div>
    }
}


const cardSource = {
  beginDrag(props) {
    return { id: props.id };
  }
};

const cardTarget = {
  hover(props, monitor) {
    // console.log('hover', props, monitor)
    const draggedId = monitor.getItem().id;

    if (draggedId !== props.id) {
      props.moveCard(draggedId, props.id);
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
        const { text, isDragging, connectDragSource, connectDropTarget } = this.props;
        const opacity = isDragging ? 0 : 1;

        const style = {
            border: '1px dashed gray',
            padding: '0.5rem 1rem',
            marginBottom: '.5rem',
            backgroundColor: 'white',
            cursor: 'move'
        };

        return connectDragSource(
            <div>
                {connectDropTarget(
                    <div style={{ ...style, opacity }}> DragHandle {text} </div>
                )}
                <div style={{ opacity }}>
                    <Editor {...this.props}></Editor>
                </div>
            </div>);
    }    
}

@DragDropContext(HTML5Backend)
class EditPane extends Component {
    constructor(props) {
        super(props);
        this.moveCard = this.moveCard.bind(this);

    }

    moveCard(id, afterId) {
        const cells = this.props.cells;

        const card = cells.filter(c => c.key === id)[0];
        const afterCard = cells.filter(c => c.key === afterId)[0];
        const cardIndex = cells.indexOf(card);
        const afterIndex = cells.indexOf(afterCard);

        this.props.update(update(this.props, {
            cells: {
                $splice: [
                    [cardIndex, 1],
                    [afterIndex, 0, card]
                ]
            }
        }));
    }
    handleClick(e) {
        console.log('clicked', e.target == this.getDOMNode())
    }
    render() {
        return (
            <div className="editpane" onClick={this.handleClick}>{
                this.props.cells.map(
                    (cell) => 
                        <Cell 
                            id={cell.key}
                            moveCard={this.moveCard}    
                            update={this.props.update} 
                            state={this.props.state}
                            key={cell.key} 
                            text={cell.value}
                            value={cell.value}>
                        </Cell>
                )
            }</div>
        )
    }
}

class OutPane extends Component {
    handleClick() {
        this.props.update({
            count: this.props.state.count + 1
        })
    }
    render() {
        return (
            <div className="outpane">
                {this.props.cells.map(
                    (cell) => <div>{cell.value}</div>
                )}
            </div>
        )
    }
}




export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
        count: 4,
        cells: [{
            key: 1,
            value: "function zombocom(z){\n\treturn z + 1\n}"
        },{
            key: 2,
            value: "function derpsacola(z){\n\treturn z + 1\n}"
        },{
            key: 3,
            value: "function walp(z){\n\treturn z + 1\n}"
        }]
    }
  }
  render() {
    return  (
        <SplitPane orientation="horizontal" minSize="50">
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
       </SplitPane>
   );
    return (
      <div className="wrapper">
            
            
        </div>
    );
  }
}