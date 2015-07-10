import React, { Component, PropTypes } from 'react/addons';
import classNames from 'classnames'
import * as _ from 'lodash'
import {array_join} from '../util'

require('./blink/consoleView.css')
require('./blink/objectValue.css')
require('./blink/objectPropertiesSection.css')
require('./blink/treeoutline.css')
require('./blink/inspectorCommon.css')
require('./blink/inspectorSyntaxHighlight.css')

// TODO: rewrite this so it's not a gnarly mess

// this shows shallow object descriptions
class ObjectPreview extends Component {
    render(){
        var {node} = this.props;
        if(typeof node == "object"){
            if(node.type == 'array'){
                return <span className="value object-value-array">Array[{node.length}]</span>;
            }else if(node.type == 'object'){
                return <span className="object-value-object">Object</span>;
            }else if(node.type == 'null'){
                return <span className="object-value-null">null</span>
            }else if(node.type == 'undefined'){
                return <span className="object-value-undefined">undefined</span>
            }else if(node.type == 'number'){
                return <span className="object-value-number">{node.value}</span>
            }else if(node.type == 'string'){
                return <span className="cm-js-string">{'"' + node.value + '"'}</span>
            }else if(node.type == 'boolean'){
                return <span className="object-value-boolean">{node.value ? 'true' : 'false'}</span>
            }else if(node.type == 'function'){
                return <span className="console-message-text source-code">
                    <span className="object-value-function">{node.name || 'anonymous'}</span>()
                </span>
            }else if(node.type == "regexp"){
                return <span className="object-value-regexp source-code">{node.code}</span>
            }else{
                return <span>Unhandled Type: {node.type}</span>
            }
        }else{
            return <span>Unwrapped {JSON.stringify(node)}</span>
        }
    }
}

// this shows a deeper description of some expandable objects (arrays, objects)
class ObjectFatPreview extends Component {
    render(){
        var {node} = this.props;
        if(typeof node == "object"){
            if(node.type == 'array'){
                if(node.length < 100 && node.values){
                    return <span className="object-value-array">[{
                        array_join(node.values.map(x => <ObjectPreview node={x} />), ', ')
                    }]</span>
                }
            }else if(node.type == 'object' && node.pairs){
                var keys = _.pluck(node.pairs, 0),
                    obj  = _.object(node.pairs);
                return <span className="console-object-preview console-line">
                    Object {"{"}
                    {array_join(keys.map(key => [
                        <span className="name">{key}</span>,
                        ": ",
                        <ObjectPreview node={obj[key]} />
                    ]), ', ')}
                    {"}"}
                </span>
            }
        }
        return <ObjectPreview node={node} / >
    }
}

export class ExpandableTree extends Component {
    constructor() {
        super()
        this.state = { expanded: false }
    }
    toggleExpand = () => { this.setState({ expanded: !this.state.expanded }) }
    render(){
        var {node} = this.props;
        var {expanded} = this.state;
        var keys = _.pluck(node.pairs, 0),
            obj  = _.object(node.pairs);
        return (
            <ol className="tree-outline component-root platform-mac source-code object-properties-section">
                <li className={classNames({"parent": 1, expanded})} onClick={this.toggleExpand}>
                    <div className="selection"></div>
                    <content>
                        <ObjectFatPreview node={node} />
                    </content>
                </li>
                {!expanded ? <ol className="children" /> : <ol className="children expanded">{
                    keys.map(key => <LabelPair key={key} name={key} parent={obj} />)
                }</ol>}
            </ol>
        )
    }
}

export class LabelPair extends Component {
    constructor() {
        super()
        this.state = { expanded: false }
    }
    toggleExpand = () => { this.setState({ expanded: !this.state.expanded }) }
    render(){
        var {parent, name} = this.props;
        var node = parent[name];
        var {expanded} = this.state;
        var desc = { enumerable: true };
        if(node.type == 'array' || node.type == 'object' || (node.type == 'string' && node.value.length > 50)){
            return (
                <div>
                    <li className={classNames({"parent": 1, expanded})} onClick={this.toggleExpand}>
                        <div className="selection"></div>
                        <span className={classNames({name: 1, "object-properties-section-dimmed": !desc.enumerable})}>{name}</span>
                        <span className="object-properties-section-separator">: </span>
                        <ObjectPreview node={node} />
                    </li>
                    {!expanded ? <ol className="children" /> : <ol className="children expanded">{
                        JSON.stringify(node)
                    }</ol>}
                </div>
            );
        }else{
            return (
                <li>
                    <div className="selection"></div>
                    <span className={classNames({name: 1, "object-properties-section-dimmed": !desc.enumerable})}>{name}</span>
                    <span className="object-properties-section-separator">: </span>
                    <ObjectPreview node={node} />
                </li>
            )
        }
        
    }
}


export default class ObjectTree extends Component {
    render() {
        var {node} = this.props;
        if(node.type == 'array' || node.type == 'object'){
            return <ExpandableTree node={node} />
        }else{
            return <ObjectPreview node={node} />
        }
    }
}