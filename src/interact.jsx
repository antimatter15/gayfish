import React, { Component, PropTypes } from 'react/addons';
import classNames from 'classnames'

export class Interactor extends Component {
    constructor(props){
        super(props)
        var {doc, cell} = this.props;
        var i = this.props.interactor;
        this.state = {
            value: i.def
        }
    }

    replaceValue = (id, value) => {
        // Yeah I know this is like the cardinal sin of parsing,
        // that is, the lack thereof. But using a full parser
        // would probably make this needlessly language-specific
        // so instead it's doing a regexp to match instances of
        // the pattern Interact(\.[A-Za-z]+)? and it's asking
        // CodeMirror's syntax highlighting engine to make sure
        // that that part of it isn't a comment or string

        var {doc, cell} = this.props;
        var cm = cell.cm;

        var allTokens = [];
        for(var i = 0, lc = cm.lineCount(); i < lc; i++){
            allTokens = allTokens.concat(cm.getLineTokens(i).map(token => ({token, line: i})));
        }

        function getDepth({token: tok}){
            if(tok.state && tok.state.jsState && tok.state.jsState.cc)
                return tok.state.jsState.cc.length;
            return 0
        }
        var interacts = []
        allTokens.forEach((block, i) => {
            var tok = block.token;
            if(tok.type == "comment" && 
                tok.string.startsWith("/*") &&
                tok.string.slice(2).split("::").slice(-1)[0].trim().startsWith('Interact')){
                var s = i + 1;
                while(allTokens[s].token.type == null) s++;
                var e = s;
                var startDepth = getDepth(allTokens[s]);
                if(getDepth(allTokens[e]) > startDepth){
                    while(getDepth(allTokens[e]) > startDepth) e++;
                }
                interacts.push([
                    { line: allTokens[s].line, ch: allTokens[s].token.start },
                    { line: allTokens[e].line, ch: allTokens[e].token.end } 
                ])
            }
        })
        var target = interacts[id]
        if(target){
            var [from, to] = target;    
            cm.replaceRange(value, from, to, "*interact")

        }
    }

    updateValue = (value) => {
        this.setState({value: value})
        var id = this.props.interactor.id
        this.replaceValue(id, JSON.stringify(value));
        var {doc, cell} = this.props;
        cell.interacts[id] = value;
        doc.vm.repeat(cell)
    }

    updateSlider = () => {
        var value = React.findDOMNode(this.refs.slider).value;
        this.updateValue(+value)
        
    }
    choiceUpdater = (value) => {
        return e => {
            this.updateValue(value)
        }
    }
    indexUpdater = (index) => {
        return e => {
            this.updateValue(+index)
        }
    }
    updateText = () => {
        var value = React.findDOMNode(this.refs.text).value;
        this.updateValue(value)
    }
    render(){
        // <td className="name">
        //     <div className="platform-mac source-code"><ObjectTree node={+this.state.value} /></div>
        // </td>
        var {doc, cell} = this.props;
        var i = this.props.interactor;

        var widget = null;
        if(i.type == 'slider'){
            widget = <input 
                ref="slider" 
                className="slider" 
                type="range" 
                onChange={this.updateSlider} 
                defaultValue={this.state.value} 
                min={i.min || 0}
                max={i.max || 100} />
        }else if(i.type == 'choice' || i.type == 'index'){
            // TODO: if opts.length > 5 then present this as a dropdown
            widget = <div className="btn-group">
                        {
                            i.opts.map((x, index) => <button 
                                type="button" 
                                className={classNames({
                                    "btn": true,
                                    "btn-default": true,
                                    "active": i.type == 'choice' ? 
                                                (x == this.state.value) :
                                                (index == this.state.value)
                                })}
                                onClick={i.type == 'choice' ? 
                                    this.choiceUpdater(x) :
                                    this.indexUpdater(index)
                                }>{x}</button>)
                        }
                    </div>
        }else if(i.type == 'text'){
            widget = <input ref="text" type="text" onChange={this.updateText} defaultValue={this.state.value} />
        }else if(i.type == 'textarea'){
            // TODO: https://github.com/andreypopp/react-textarea-autosize
            widget = <textarea ref="text" onChange={this.updateText} defaultValue={this.state.value} />
        }

        return <tr>
            <td className="name platform-mac source-code">
                {i.name ? i.name : null }
            </td>
            <td className="object">
                {widget}
            </td>
        </tr>
    }
}

export class InteractorTable extends Component {
    render(){
        var {doc, cell} = this.props;
        var interactors = [];
        if(typeof cell.interactors !== 'undefined'){
            interactors = _.sortBy(cell.interactors, 'id').map(i => 
                <Interactor key={i.id} cell={cell} doc={doc} interactor={i} />
            )
        }
        return (
            interactors.length > 0 ? 
                <table className="interactors">
                    <tbody>{interactors}</tbody>
                </table> : null
        )
    }
}
