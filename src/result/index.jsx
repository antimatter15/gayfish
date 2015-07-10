import React, { Component, PropTypes } from 'react/addons';
import {InteractorTable} from './interact'
import {DropdownCodeViewer, CodeViewer} from '../codemirror/viewer'
import ObjectTree from './objtree'
import classNames from 'classnames'
import * as _ from 'lodash'
import {array_join} from '../util.js'

// TODO: figure out a way to define the table row height by the right column
// and have the name cells overflow with ellipsis rather than constraining the
// name cells to have a height of one line

class LogTable extends Component {
    render(){
        var {doc, cell} = this.props;

        var output = null;
        if(typeof cell.logs !== 'undefined' && cell.logs.length > 0){
            output = <table className="platform-mac source-code">
            <tbody>{
                cell.logs.map(x => <LogLine doc={doc} cell={cell} log={x} />)
            }</tbody>
            </table>
        }
        return <div className="log-table">{output}</div>;
    }
}


// TODO: highlight the line in the code which does the thing when it's the thing
class LogLine extends Component {
    hoverStop = (e) => {
        var {doc, cell} = this.props;
        let cm = cell.cm;
        let x = this.props.log;

        cm.removeLineClass(x.line - 1, "background", "CodeMirror-log-background")
    }
    hoverStart = (e) => {
        var {doc, cell} = this.props;
        let cm = cell.cm;
        let x = this.props.log;

        cm.addLineClass(x.line - 1, "background", "CodeMirror-log-background")
    }
    render(){
        // cm.addLineClass(
        var {doc, cell} = this.props;
        let x = this.props.log;
        return <tr key={x.instance} onMouseEnter={this.hoverStart} onMouseLeave={this.hoverStop}>
            <td className="name line" title={x.name}>{x.name}</td>
            <td className="equal">=</td>
            <td className="object"><ObjectTree node={x.latest} /></td>
        </tr>
    }
}


class GlobalTable extends Component {
    render(){
        var {doc, cell} = this.props;
        var globals = [];
        if(typeof cell.globals !== 'undefined'){
            for(var g in cell.globals){
                globals.push(
                    <tr key={g}>
                        <td className="name line" title={g}><div className="platform-mac source-code">{g}</div></td>
                        <td className="equal">=</td>
                        <td className="object">
                            <div className="platform-mac source-code"><ObjectTree node={cell.globals[g]} /></div>
                        </td>
                    </tr>
                )
            }
        }
        if(globals.length > 0){
            return <div className="global-table">
                <table><tbody>{globals}</tbody></table>
            </div>
        }else{
            return null;
        }
        
    }
}

export class CellResult extends Component {
    clickStop = () => {
        var {doc, cell} = this.props;
        doc.vm.stop()
    }
    render() {
        var {doc, cell} = this.props;

        const cell_classes = classNames({
            "cell-result": true,
            "focused": cell.has_focus
        }) + ' ' + cell.status;
        
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
        // <span className="timing">{duration}</span>
        return (
            <div className={cell_classes} style={style}>
                {(cell.status == 'running' && cell.progress > 0 && cell.progress <= 1) ? <div className="progress-container">
                    <button onClick={this.clickStop}>&times;</button>
                    <progress value={cell.progress} max={1} />
                </div> : null}
                {(cell.status == 'running' && cell.activity ? <div className="activity">{cell.activity}</div> : null)}
                
                <InteractorTable cell={cell} doc={doc} />
                <div className="output">
                    <LogTable cell={cell} doc={doc} />
                    <GlobalTable cell={cell} doc={doc} />
                    {cell.status == 'error' ? <DropdownCodeViewer code={cell.compiled} /> : null }

                    <ConsoleWidget cell={cell} doc={doc} />
                </div>
            </div>
        )
    }
}

class ConsoleWidget extends Component {
    render(){
        var {doc, cell} = this.props;

        var messages = cell.console.map(c => {
            // <div className="console-message-wrapper console-error-level">
            //     <div className="console-message">
            //         <span className="console-message-text source-code">
            //             <a href="http://static.adzerk.net/Extensions/adFeedback.js" 
            //                 className="console-message-url webkit-html-resource-link" 
            //                 title="http://static.adzerk.net/Extensions/adFeedback.js">
            //                 {"http://static.adzerk.net/Extensions/adFeedback.js"}
            //             </a>
            //             <span>Failed to load resource: net::ERR_BLOCKED_BY_CLIENT</span>
            //         </span>
            //     </div>
            // </div>
            if(c.type == 'log'){
                // <a className="console-message-url webkit-html-resource-link" title=":2">VM240:2 </a>
                return (
                    <div className="console-message-wrapper console-log-level">
                        <div className="console-message">
                            <span className="console-message-text source-code">
                                
                                <span>
                                    {array_join(c.arguments.map(k => <ObjectTree node={k} />), ' ')}
                                </span>
                            </span>
                        </div>
                    </div>
                );
            }
        });
        if(messages.length > 0){
            return (
                <div className="monospace console-widget">
                    <div className="console-group console-group-messages">
                        {messages}
                    </div>
                </div>
            )
        }else{
            return null;
        }
        
    }
}


export class FocusedCellResult extends Component {
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
