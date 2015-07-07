import React, { Component, PropTypes } from 'react/addons';
import classNames from 'classnames'

export class DropdownCodeViewer extends Component {
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

export class CodeViewer extends Component {
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
