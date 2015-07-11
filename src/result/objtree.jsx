import React, { Component, PropTypes } from 'react/addons';
import classNames from 'classnames'
import * as _ from 'lodash'
import {array_join} from '../util'
import moment from 'moment'

require('./blink/consoleView.css')
require('./blink/objectValue.css')
require('./blink/objectPropertiesSection.css')
require('./blink/treeoutline.css')
require('./blink/inspectorCommon.css')
require('./blink/inspectorSyntaxHighlight.css')

// TODO: rewrite this so it's not a gnarly mess

export default class ObjectTree3 extends Component {
    constructor() {
        super()
        this.state = { expanded: false }
    }
    toggleExpand = () => { this.setState({ expanded: !this.state.expanded }) }

    // returns a function if the thing is expandable
    renderCore(){
        var {node, preview, label} = this.props;
        var {expanded} = this.state;

        if(node.type == 'undefined'){
            return <span className="object-value-undefined">undefined</span>
        }else if(node.type == 'number'){
            return <span className="object-value-number">{node.value}</span>
        }else if(node.type == 'boolean'){
            return <span className="object-value-boolean">{node.value ? 'true' : 'false'}</span>
        }else if(node.type == 'function'){
            return <span>
                <span className="object-value-function">{node.name || 'anonymous'}</span>()
            </span>
        }else if(node.type == 'null'){
            return <span className="object-value-null">null</span>
        }else if(node.type == "regexp"){
            return <span className="object-value-regexp">{node.code}</span>
        }else if(node.type == "date"){
            return <span>
                <span className="object-value-regexp">
                    {moment(node.unix).format('MMMM Do YYYY, h:mm:ss a')}
                </span>
                {" "}({moment(node.unix).fromNow()})
            </span>
        }else if(node.type == 'string'){
            if(preview){
                return <span className="cm-js-string">{JSON.stringify(node.value)}</span>
            }else if(node.value.split("\n").length == 1 && node.value.length < 50){
                return <span className="cm-js-string">{'"' + node.value + '"'}</span>
            }else{
                return () => {
                    return <span className="cm-js-string">{node.value}</span>
                }
            }
        }else if(node.type == 'array'){
            if(preview){
                if(node.values){
                    if(node.length < 100){
                        return (
                            <span className="object-value-array">[{
                                array_join(node.values.map(x => <ObjectTree3 preview={true} node={x} />), ', ')
                            }]</span>
                        )    
                    }else{
                        return <span className="value object-value-array">Array[{node.length}]</span>;
                    }
                    
                }else{
                    return <span className="value object-value-array">Array[{node.length}]</span>;   
                }
            }else if(node.length < 100 && node.values){
                return (
                    <span className="object-value-array">[{
                        array_join(node.values.map(x => <ObjectTree3 preview={true} node={x} />), ', ')
                    }]</span>
                )
            }else if(node.values){
                return () => {
                    return node.values.map((v, i) => <ObjectTree3 label={i} node={v} />)
                }
            }
        }else if(node.type == 'object'){
            if(preview){
                if(node.pairs){
                    var keys = _.pluck(node.pairs, 0),
                        obj  = _.object(node.pairs);
                    return (
                        <span className="console-object-preview console-line">
                            Object {"{"}
                            {array_join(keys.map(key => [
                                <span className="name">{key}</span>,
                                ": ",
                                <ObjectTree3 preview={true} node={obj[key]} />
                            ]), ', ')}
                            {"}"}
                        </span>
                    );
                }else{
                    return <span className="object-value-object">Object</span>;   
                }
            }else if(node.pairs){
                return () => {
                    var keys = _.pluck(node.pairs, 0),
                        obj  = _.object(node.pairs);
                    var desc = { enumerable: true }
                    return keys.map(k => <ObjectTree3 node={obj[k]} label={k} />)
                }
            }else{
                return <span className="object-value-object">Object</span>;
            }
        }
        return <span>wumbo {JSON.stringify(node)}</span>
    }
    render(){
        var {node, preview, label} = this.props;
        var {expanded} = this.state;
        if(typeof node != "object" || !node.type) return <span>Walp</span>;
        var desc = {enumerable: true}
        var result = this.renderCore();
        if(typeof label != 'undefined'){
            if(typeof result == 'function'){
                return (
                    <div>
                        <li className={classNames({"parent": 1, expanded})} onClick={this.toggleExpand}>
                            <div className="selection"></div>
                            <span className={classNames({name: 1, "object-properties-section-dimmed": !desc.enumerable})}>{label}</span>
                            <span className="object-properties-section-separator">: </span>
                            <ObjectTree3 preview={true} node={node} />
                        </li>
                        {!expanded ? <ol className="children" /> : <ol className="children expanded">{result()}</ol>}
                    </div>
                );
            }else{
                return (
                    <li>
                        <div className="selection"></div>
                        <span className={classNames({name: 1, "object-properties-section-dimmed": !desc.enumerable})}>{label}</span>
                        <span className="object-properties-section-separator">: </span>
                        <ObjectTree3 preview={true} node={node} />
                    </li>
                )
            }
            
        }else{
            if(typeof result == 'function'){
                return (
                    <ol className="tree-outline component-root platform-mac object-properties-section">
                        <li className={classNames({"parent": 1, expanded})} onClick={this.toggleExpand}>
                            <div className="selection"></div>
                            <content><ObjectTree3 preview={true} node={node} /></content>
                        </li>
                        {!expanded ? <ol className="children" /> : <ol className="children expanded">{ result() }</ol>}
                    </ol>
                )
            }else{
                return result;
            }
        }
        
    }
}


