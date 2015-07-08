import React, { Component, PropTypes } from 'react/addons';
import classNames from 'classnames'
import CellModel from './model/cell'

var CodeMirror = require('codemirror')
global.CodeMirror = CodeMirror;

require("codemirror/lib/codemirror.css");
require("codemirror/mode/xml/xml")
require("codemirror/mode/python/python")

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
require("codemirror/addon/fold/indent-fold")
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
    componentDidUpdate() {
        var {doc, cell} = this.props;
        var cm = cell.cm;
        if(cell.markdown){
            cm.setOption("mode", "markdown")
        }else{
            cm.setOption("mode", "javascript")
        }
        cell.height = cm.getWrapperElement().offsetHeight;
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
            scrollbarStyle: null
        });

        // http://codemirror.net/demo/indentwrap.html
        // indented wrapped lines
        // var charWidth = editor.defaultCharWidth(), basePadding = 4;
        // editor.on("renderLine", function(cm, line, elt) {
        // var off = CodeMirror.countColumn(line.text, null, cm.getOption("tabSize")) * charWidth;
        // elt.style.textIndent = "-" + off + "px";
        // elt.style.paddingLeft = (basePadding + off) + "px";
        // });
        // editor.refresh();

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
            "Cmd-Left": (cm) => {
                cm.execCommand("goLineStartSmart")
            },
            "Cmd-Enter": (cm) => {
                cell.run()
                cell.checkNext();
            },
            "Cmd-.": (cm) => {
                doc.restart()
            },
            "Cmd-I": (cm) => {
                var pos = cm.getCursor("from")
                var tok = cm.getTokenAt(pos),
                    next_tok = cm.getTokenAt({ line: pos.line, ch: pos.ch + 1});

                function is_interact(tok){
                    return tok.type == "comment" && 
                        tok.string.slice(2).split("::").slice(-1)[0].trim().startsWith('Interact')
                }

                if(tok.type != "comment" && is_interact(next_tok)) tok = next_tok;

                var line = cm.getLine(pos.line);

                if(is_interact(tok)){
                    cm.replaceRange('',
                                    { line: pos.line, ch: tok.start},
                                    { line: pos.line, ch: tok.end})
                }else{

                    var def = ''
                    if(tok.type == 'string'){
                        pos.ch = tok.start;
                        def = '.Text'
                    }else if(tok.type == 'number'){
                        pos.ch = tok.start;
                        def = '.Slider'
                    }

                    var inserted = "/* Interact$ */";
                    if(!/\s/.test(line[pos.ch])) inserted += " ";
                    if(pos.ch > 0 && !/\s|\(/.test(line[pos.ch-1])) inserted = " " + inserted;

                    cm.replaceRange(inserted.replace('$', def), pos)
                    cm.setSelection({ line: pos.line, ch: pos.ch + inserted.indexOf("$") }, 
                                    {line: pos.line, ch: pos.ch + inserted.indexOf("$") + def.length })
                    // cm.setCursor({ line: pos.line, ch: pos.ch + inserted.indexOf(" *") })    
                }
                
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
                newCell.mount(x => newCell.cm.focus())
                
            },
            "Cmd-K": (cm) => {
                var newCell = new CellModel(doc, cell.index)
                newCell.mount(x => newCell.cm.focus())
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

        cm.on('changes', (cm, changes) => {
            cell.value = cm.getValue()    
            
            cell.checkNext();

            cm.showPrediction({ ts: eliot })

            let {line, ch} = cm.getCursor();

            if(!changes.some(x => x.origin == '*interact')){
                cm.findMarks({line, ch: 0}, {line, ch: 1e8})
                    .filter(x => x._inlineResult)
                    .forEach(x => x.clear())
            }

            // This is kinda not super ideal
            cell.height = cm.getWrapperElement().offsetHeight;

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