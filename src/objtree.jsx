import React, { Component, PropTypes } from 'react/addons';
import classNames from 'classnames'

require('./blink/consoleView.css')
require('./blink/objectValue.css')
require('./blink/objectPropertiesSection.css')
require('./blink/treeoutline.css')
require('./blink/inspectorCommon.css')
require('./blink/inspectorSyntaxHighlight.css')

// TODO: rewrite this so it's not a gnarly mess

class ObjectPreview extends Component {
    render(){
        var {node} = this.props;
        if(typeof node == "undefined" || node === null){
            return <span className="object-value-null">{node + ''}</span>
        }else if(typeof node == "string"){
            return <span className="cm-js-string">{'"' + node + '"'}</span>
        }else if(typeof node == "number"){
            return <span className="object-value-number">{node}</span>
        }else if(typeof node == "object"){
            if(Array.isArray(node)){
                return <span className="value object-value-array">Array[{node.length}]</span>;
            }else{
                return <span className="object-value-object">Object</span>;
            }
        }else{
            return <span>wat? {typeof node}</span>
        }
    }
}

export default class ObjectTree extends Component {
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
        var {node} = this.props;
        var {expanded} = this.state;
        if(typeof node != "object" || node === null){
            if(typeof node == "string" && node.length > 50){
                return <ol className="tree-outline component-root platform-mac source-code object-properties-section">
                    <li className={classNames({"parent": 1, expanded})} onClick={this.toggleExpand}>
                        <div className="selection"></div>
                        <content>
                            <ObjectPreview node={JSON.stringify(node).slice(1, 50) + '...'} />
                        </content>
                    </li>
                    {!expanded ? <ol className="children" /> : <ol className="children expanded">
                        <ObjectPreview node={node} />
                    </ol>}
                </ol>
            }else{
                return <ObjectPreview node={node} />;   
            }
        }else{
            if(Array.isArray(node)){
                if(node.length < 100){
                    return (
                        <span className="object-value-array">
                            [{node.map((x, k) => [
                                <ObjectTree node={x} />, 
                                k == node.length - 1 ?  "" : ", "
                            ])}]
                        </span>
                    )
                }else{
                    return <span onClick={this.toggleExpand}>
                        <ObjectPreview node={node} />
                    </span>;
                }
            }else{
                return <ol className="tree-outline component-root platform-mac source-code object-properties-section">
                    <li className={classNames({"parent": 1, expanded})} onClick={this.toggleExpand}>
                        <div className="selection"></div>
                        <content>
                            <span className="console-object-preview">
                                Object {"{"}
                                {
                                    Object.keys(node).map((key, i, a) => {
                                        return [
                                            <span className="name">{key}</span>,
                                            ": ",
                                            <ObjectPreview node={node[key]} />,
                                            i == a.length - 1 ? "" : ", "
                                        ]
                                    })
                                }
                                {"}"}
                            </span>
                        </content>
                    </li>
                    {!expanded ? <ol className="children" /> : <ol className="children expanded">
                        {
                            Object.getOwnPropertyNames(node).map((key, i, a) => {
                                return <ObjectSubtree key={key} name={key} parent={node} />
                            })
                        }
                    </ol>}
                </ol>
            }
        }
        return <div>hi</div>
    }
}

class ObjectSubtree extends Component {
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
        var {expanded} = this.state;
        var {parent, name} = this.props;
        var desc = Object.getOwnPropertyDescriptor(parent, name)
        // console.log(name, desc, desc.get)
        if(desc.get){
            return <li>
                <div className="selection"></div>
                <span className={classNames({name: 1, "object-properties-section-dimmed": !desc.enumerable})}>{name}</span>
                <span className="object-properties-section-separator">: </span>
                ...
            </li>;
        }
        var node = parent[name];
        if(typeof node != "object" || node === null) {
            return <li>
                <div className="selection"></div>
                <span className={classNames({name: 1, "object-properties-section-dimmed": !desc.enumerable})}>{name}</span>
                <span className="object-properties-section-separator">: </span>
                <ObjectPreview node={node} />
            </li>;
        }
        return <div>
            <li className={classNames({"parent": 1, expanded})}  onClick={this.toggleExpand}>
            <div className="selection"></div>
            <span className={classNames({name: 1, "object-properties-section-dimmed": !desc.enumerable})}>{name}</span>
            <span className="object-properties-section-separator">: </span>
            <ObjectPreview node={node} />
            
        </li>
        {!expanded ? <ol className="children" /> : <ol className="children expanded">
                {
                    Object.getOwnPropertyNames(node).map((key, i, a) => {
                        return <ObjectSubtree key={key} name={key} parent={node} />
                    })
                }
            </ol>}
        </div>
    }    
}