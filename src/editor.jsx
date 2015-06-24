import React, { Component, PropTypes } from 'react/addons';
import classNames from 'classnames'
import CellModel from './model/cell'

var CodeMirror = require('codemirror')
global.CodeMirror = CodeMirror;

require("codemirror/lib/codemirror.css");
require("codemirror/mode/xml/xml")

require("./codemirror/codemirror.less");
require("./codemirror/javascript")
require("./codemirror/jsx.js")
require("./codemirror/prediction")

require("codemirror/keymap/sublime")
require("codemirror/addon/runmode/runmode")

require("codemirror/addon/edit/closebrackets")

require("codemirror/addon/edit/matchbrackets")
require("codemirror/addon/comment/comment")
require("codemirror/addon/comment/continuecomment")
require("codemirror/addon/fold/foldcode")
// require("codemirror/addon/fold/foldgutter")
// require("codemirror/addon/fold/foldgutter.css")
require("codemirror/addon/fold/brace-fold")
// require("codemirror/addon/fold/xml-fold")
// require("codemirror/addon/fold/markdown-fold")
// require("codemirror/addon/fold/comment-fold")
// require("codemirror/addon/search/match-highlighter")
require("codemirror/addon/hint/show-hint")
require("codemirror/addon/hint/show-hint.css")
require("codemirror/addon/dialog/dialog")
require("codemirror/addon/dialog/dialog.css")
// require("codemirror/addon/search/searchcursor")
// require("codemirror/addon/search/search")

global.tern = require('tern')
require("codemirror/addon/tern/tern.css")
require("codemirror/addon/tern/tern")
require("./codemirror/node")

// Tern Server Eliot
var eliot = new CodeMirror.TernServer({
    defs: [
        require('tern/defs/ecma5.json'),
        require('tern/defs/browser.json'),
        require('./codemirror/carbide.json')
    ],
    plugins: {
        node: {
            // this bit is especially hacky
            resolver: function(name){
                return Doc.vm.queryModule(name)
            }
        }
    }
});

global.eliot = eliot

export default class Editor extends Component {
    constructor(props) {
        super(props)
        this.componentDidMount = this.componentDidMount.bind(this)
    }
    componentDidMount() {        
        var {doc, cell} = this.props;

        var cm = CodeMirror(React.findDOMNode(this), {
            value: cell.value,
            mode: "jsx",
            // mode: "javascript",
            lineNumbers: false,
            indentUnit: 4,
            // continueComments: true,
            keyMap: 'sublime',
            autoCloseBrackets: true,
            matchBrackets: true,
            lineWrapping: true,
            // highlightSelectionMatches: true,
            viewportMargin: Infinity,
            // foldGutter: true,
            // gutters: ["CodeMirror-foldgutter"]
        });


        // cm.foldCode(CodeMirror.Pos(0, 0));
        if(cell.collapsed){
            // cm.foldAll();
            cm.execCommand('foldAll')
        }

        cell.mount(cm);

        eliot.addDoc('cell' + cell.id, cm);

        function slideNext(){
            if(cell.next){
                // var iggy = cell.next.cm.getWrapperElement();
                var iggy = cell.next._pair;
                if(isElementInViewport(iggy)){
                    // do nothing
                    cell.next.cm.setCursor(0, 0)
                    cell.next.cm.focus()         
                }else{
                    // iggy.scrollIntoView(false)
                    var target = iggy.offsetTop + iggy.offsetHeight - innerHeight;
                    animatedScrollTo(target, Math.sqrt(Math.abs(target - document.body.scrollTop)) * 20, function(){
                        cell.next.cm.setCursor(0, 0)
                        cell.next.cm.focus()         
                    })
                }
            }
        }
        function slidePrev(){
            if(cell.prev){
                var iggy = cell.prev._pair;
                if(isElementInViewport(iggy)){
                    cell.prev.cm.setCursor(1e8, 1e8)
                    cell.prev.cm.focus()
                }else{
                    var target = iggy.offsetTop;
                    animatedScrollTo(target, Math.sqrt(Math.abs(target - document.body.scrollTop)) * 20, function(){
                        cell.prev.cm.setCursor(1e8, 1e8)
                        cell.prev.cm.focus()
                    })
                }
            }
        }

        cm.setOption("extraKeys", {
            "Ctrl-I": function(cm) { eliot.showType(cm); },
            "Ctrl-O": function(cm) { eliot.showDocs(cm); },
            "Ctrl-Space": function(cm) { eliot.complete(cm); },
            "Alt-.": function(cm) { eliot.jumpToDef(cm); },
            "Alt-,": function(cm) { eliot.jumpBack(cm); },
            "Ctrl-Q": function(cm) { eliot.rename(cm); },
            // "Ctrl-Space": function(cm) { eliot.complete(cm); },
            // "Ctrl-I": function(cm) { eliot.showType(cm); },
            // "Ctrl-O": function(cm) { eliot.showDocs(cm); },
            // "Alt-.": function(cm) { eliot.jumpToDef(cm); },
            // "Alt-,": function(cm) { eliot.jumpBack(cm); },
            // "Ctrl-Q": function(cm) { eliot.rename(cm); },
            // "Ctrl-.": function(cm) { eliot.selectName(cm); },
            "Cmd-Enter": (cm) => {
                cell.run()
                cell.checkNext();
            },
            "Shift-Enter": (cm) => {
                // var auto_advance = !(
                //     doc &&
                //     doc.vm &&
                //     doc.vm.latestQueuedCell && 
                //     doc.vm.latestQueuedCell == cell);
                var auto_advance = true;
                cell.run()
                cell.checkNext();
                // maybe it should only advance if the next cell
                // is totally visible?
                // or maybe it should be based on behavior
                // (if you've run this cell multiple times consecutiviely
                // perhaps it should not advance to the next cell)
                

                // var kendrick = cell._pair
                // kendrick.scrollIntoView(true)
                slideNext()
                
            },
            "Ctrl-N": (cm) => {
            },
            "Cmd-Up": (cm) => {
                // if(cell.prev) cell.prev.cm.focus();
                slidePrev()
            },
            "Cmd-Down": (cm) => {
                slideNext()
                
            },
            "Cmd-J": (cm) => {
                var newCell = new CellModel(doc, cell.index + 1)
                newCell.cm.focus()
            },
            "Cmd-K": (cm) => {
                var newCell = new CellModel(doc, cell.index)
                newCell.cm.focus()
            },
            "Down": (cm) => {
                var cursor = cm.getCursor()
                if (cursor.line === (cm.lineCount()-1)) {
                    // cursor.ch === cm.getLine(cursor.line).length
                    // select the next thing
                    // if(cell.next) cell.next.cm.focus()
                    slideNext()
                }
                return CodeMirror.Pass
            },
            "Up": (cm) => {
                var cursor = cm.getCursor()
                if (cursor.line === 0) {
                    // if(cell.prev) cell.prev.cm.focus()
                    slidePrev()
                }
                return CodeMirror.Pass
            },
            "Backspace": (cm) => {
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
                return CodeMirror.Pass

            }
        })

        cm.on('unfold', (cm) => {
            cell.collapsed = false
        })

        cm.on('changes', (cm) => {
            cell.value = cm.getValue()    
            
            cell.checkNext();

            cm.showPrediction({ ts: eliot })

            let {line, ch} = cm.getCursor();
            cm.findMarks({line, ch: 0}, {line, ch: 1e8})
                .filter(x => x._inlineResult)
                .forEach(x => x.clear())

        })
        cm.on("cursorActivity", function(cm) { 
            eliot.updateArgHints(cm); 
            // eliot.complete(cm)
            // let {line, ch} = cm.getCursor();
            // console.log(line, cm.findMarks({line, ch: 0}, {line, ch: 1e8}).map(x => x._originalLine))
            cm.getAllMarks()
                .filter(x => x._inlineResult && x._originalLine != x.find().line)
                .forEach(x => x.clear());
            // console.log('cursor activity', )
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
            // if(evt.keyCode == 190){ // i don't know why this is "."
            //     eliot.complete(cm)
            // }
        })
        // cm.on('keydown', (cm, evt) => {
        //     // console.log(evt, cm, evt.keyCode)
        //     if(evt.keyCode == 40 && !evt.metaKey){ // down
                
        //     }else if(evt.keyCode == 38 && !evt.metaKey){ // up
                
        //     }else if(evt.keyCode == 8) { // backspace
                
        //     }
            
        // })
    }
    render() {
        return <div></div>
    }
}


function isElementInViewport (el) {
    var rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
        rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
    );
}


function animatedScrollTo(target, time, callback){
    document.body.scrollTop = target;
    callback();
}

// function animatedScrollTo(target, time, callback){
//     var start = Date.now(),
//         startPos = document.body.scrollTop;
    
//     doFrame();

//     function doFrame(){
//         var now = Date.now(),
//             x = Math.min(1, Math.max(0, (now - start) / time)); // clamp
//         var coef = Math.cos(Math.PI * (1 - x)) / 2 + 0.5;
//         document.body.scrollTop = coef * (target - startPos) + startPos;
//         if(x < 1){
//             requestAnimationFrame(doFrame)
//         } else callback();
//     }
// }