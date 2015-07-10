import React, { Component, PropTypes } from 'react/addons';
import classNames from 'classnames'

// TODO: break this up somehow
// TODO: rewrite

export class Palette extends Component {
    constructor(props) {
        super(props);
        this.state = {
            show: false,
            query: '',
            head: '',
            index: 0,
            rootIndex: 0
        }
        var {doc} = this.props;
        var source = [
            ['Cell', [
                {name: "Type: Code", action: () => {
                    doc.focused.markdown = false;
                }},
                {name: "Type: Markdown", action: () => {
                    doc.focused.markdown = true;
                }},
                {name: "Run", key: "Cmd-Enter"},
                {name: "Archive"},
                {name: "Run and Advance", key: "Shift-Enter"},
            ]],
            ['Document', [
                {name: "Save", key: "Cmd-S"},
                {name: "New"},
                {name: "Publish"}
            ]],
            ['Kernel', [
                {name: "Restart"},
                {name: "Interrupt"}
            ]],
            ['Settings', [
                {name: "Theme: Dark"},
                {name: "Theme: Light"}
            ]],
            ['Help', [
                {name: "About"},
                {name: "Github"},
                {name: "Documentation"}
            ]],
        ]
        this.source = []
        for(var [head, list] of source){
            this.source.push({
                name: head,
                head: head,
                level: 0
            })
        }
        for(var [head, list] of source){
            for(var action of list){
                this.source.push(_.assign({
                    head: head,
                    level: 1
                }, action))
            }
        }

    }
    toggleShow(){
        if(this.state.show){
            this.hide()
        }else{
            this.show()
        }
    }
    hide(){
        this.setState({ show: false })
    }
    show(){

        this.setState({
            show: true,
            query: '',
            head: '',
            index: 0
        })
    }
    handleInput = (e) => {
        var el = React.findDOMNode(this.refs.input);
        var query = el.value.trim();
        this.setState({ 
            query: query, 
            index: 0,
            // rootIndex: this.state.rootIndex
            // rootIndex: query && !this.state.head ? 0 : this.state.rootIndex
        })
    }
    handleKey = (e) => {
        const {doc} = this.props;
        // TODO: some complicated way to keep track of state
        // like in a hierarchical menu system such that it 
        // preserves all the expected invariants

        // eg. down -> right -> left should return to same position (not top)
        //     down -> type should send cursor to top

        
        var matches = this.runQuery()
        var el = React.findDOMNode(this.refs.input);
        var index = Math.min(matches.length - 1, Math.max(0, this.state.index));
        var heads = this.source.filter(x => x.level == 0).map(x => x.name);


        if(e.keyCode == 27){ // esc
            this.setState({ show: false })
        }else if(e.keyCode == 38) { // up
            this.setState({ index: Math.max(0, index - 1) })
            e.preventDefault()
        }else if(e.keyCode == 40) { // down
            this.setState({ index: Math.min(matches.length - 1, index + 1) })
            e.preventDefault()
        }else if(e.keyCode == 39){ // right?
            if(el.selectionEnd == el.value.length){
                var sel = matches[index];
                if(sel.level == 0){
                    this.setState({ head: sel.head, rootIndex: heads.indexOf(sel.head), index: 0 })
                    el.value = ''
                    this.handleInput()    
                }
                e.preventDefault()    
            }
        }else if(e.keyCode == 37){ // left
            if(el.selectionEnd == 0 && this.state.head){
                this.setState({ head: '', index: this.state.rootIndex })
                e.preventDefault()
            }
        }else if(e.keyCode == 9){ // tab
            // console.log(e.keyCode)
            var sel = matches[index];
            if(sel.level == 0){
                this.setState({ head: sel.head, rootIndex: heads.indexOf(sel.head), index: 0 })
                el.value = ''
                this.handleInput()    
            }
            e.preventDefault()
        }else if(e.keyCode == 13){ // enter
            var sel = matches[index];
            if(!sel){

            }else if(sel.level == 0){
                this.setState({ head: sel.head, rootIndex: heads.indexOf(sel.head), index: 0 })
                el.value = ''
                this.handleInput()    
            }else{
                this.setState({ lastRun: sel })
                if(sel.action) sel.action();
                this.hide()
            }
            e.preventDefault()
        }else if(e.keyCode == 8){ // backspace
            if(el.selectionEnd == 0){ // TODO: check instead that the cursor is at the beginning
                this.setState({ head: '', index: this.state.head ? this.state.rootIndex : this.state.index })
            }
        }
    }

    clickIndex(index) {
        var matches = this.runQuery()
        var sel = matches[index];
        var el = React.findDOMNode(this.refs.input);
        if(!sel){
        }else if(sel.level == 0){
            this.setState({ index: index, head: sel.head, query: '' })
            el.value = ''
        }else{
            this.setState({ index: index, lastRun: sel })
            if(sel.action) sel.action();
            this.hide()
        }
        
    }
    focus = () => {
        React.findDOMNode(this.refs.input).focus()
    }
    componentDidUpdate = (prevProps, prevState) => {
        if(this.state.show){
            this.focus()
        }else if(prevState.show){
            const {doc} = this.props;
            doc.focused.cm.focus();
        }
    }
    
    // TODO: some sort of smarter fuzzy search like sublime
    // so that Markdown still shows up if I accidentally type
    // it as Mkardown or Markdwon 


    runQuery() {
        var {query, head} = this.state;
        var regex = new RegExp(query.split('').map(RegExp.escape).join('.*'), 'i');

        if(head){
            var regex = new RegExp(query.split('').map(RegExp.escape).join('.*'), 'i');
            var matches = this.source.filter(x => x.head == head && x.level > 0).filter(x => regex.test(x.name))
        }else{
            if(query.length == 0){
                var matches = this.source.filter(x => x.level == 0)
                if(this.state.lastRun){
                    matches.unshift(this.state.lastRun)
                }
            }else{
                var matches = this.source.filter(x => regex.test(x.level == 0 ? x.head : (x.head + ' ' + x.name)))
                if(this.state.lastRun){
                    if(matches.indexOf(this.state.lastRun) != -1){
                        matches.unshift(matches.splice(matches.indexOf(this.state.lastRun), 1)[0])
                    }
                }
            }    
        }
        // if(this.state.lastRun && regex.test(this.state.lastRun.head + ' ' + this.state.lastRun.name)){
        //     matches.unshift(this.state.lastRun)
        // }
        // TODO: if there's nothing then you should be able to see things anyway
        return matches
    }

    selectIndex(index) {
        this.setState({ index: index })
    }


    render() {
        if(!this.state.show) return null;

        var matches = this.runQuery();
        var {query, head} = this.state;

        var colors = ["#D7F9E0", "#E9E8F1", "#D7F5F9", "#F0F9D7", "#F9E5D7", "#F9DCD7", "#F9D7F1"];
        // var colors = ["#399852", "#DC2FAF", "#C57D3B", "#3B92C5", "#A63BC5", "#2CADA8"]

        var heads = this.source.filter(x => x.level == 0).map(x => x.name);
        if(head){
            var headColor = colors[heads.indexOf(head)]    
        }
        

        if(matches.length == 0){
            var results = <div className="no-results">(no matches)</div>
        }else{
            var index = Math.min(matches.length - 1, Math.max(0, this.state.index));
            if(head){
                // colors[i]
                
                var results = <div className="results">
                    {matches.map((x, i) => <div 
                        key={i}
                        className={classNames({ result: true, selected: i == index })}
                        onMouseEnter={e => this.selectIndex(i)}
                        onClick={e => this.clickIndex(i)}>
                        <div className="token" style={{background: headColor}}>{x.head}</div>
                        {x.level > 0 ? <div className="name">
                            <Emboldinator str={x.name} query={query} />
                        </div> : null }
                        {x.level > 0 && x.key ? <div className="key">
                            {x.key}
                        </div> : null }
                    </div>)}
                </div>
            }else{
                var results = <div className="results">
                    {matches.map((x, i) => {
                        if(x.level > 0){
                            return (
                                <div key={i}
                                     className={classNames({ result: true, selected: i == index })} 
                                     onMouseEnter={e => this.selectIndex(i)}
                                     onClick={e => this.clickIndex(i)}>
                                    <div className={classNames({token: true, root: x.level == 0})} style={{background: colors[heads.indexOf(x.head)]}}>
                                        <Emboldinator str={x.head + ' ' + x.name} query={query} range={[0, x.head.length]} />
                                    </div>
                                    <div className="name">
                                        <Emboldinator str={x.head + ' ' + x.name} query={query} range={[x.head.length]} />
                                    </div>
                                    {x.key ? <div className="key">{x.key}</div> : null }
                                </div>
                            );
                        }else{
                            return (
                                <div key={i}
                                     className={classNames({ result: true, selected: i == index })} 
                                     style={{background: colors[heads.indexOf(x.head)]}}
                                     onMouseEnter={e => this.selectIndex(i)}
                                     onClick={e => this.clickIndex(i)}>
                                    <Emboldinator str={x.head + ' ' + x.name} query={query} range={[0, x.head.length]} />
                                    <span style={{'float': 'right'}}>›</span>
                                </div>
                            );
                        }

                    })}
                </div>
            }
            
        }
        var width = 0.35;
        var style = {
            right: `${-(this.props.size + width - 1)*100/2}%`,
            width: `${width*100}%`
        }
        var headtoken = null;
        if(head){
            headtoken = <div className="token" style={{background: headColor}} defaultValue={query}>
                {head}
            </div>;
        }
        
        return (
            <div className="palette" style={style}>
                <div className="input">
                    { headtoken }
                    <input type="text" ref="input" onChange={this.handleInput} onKeyDown={this.handleKey}></input>
                </div>
                {results}
            </div>
        )
    }
}



// TODO: try to optimize the display such that it favors
// contiguous runs of text

class Emboldinator extends Component {
    render(){
        let {query, str, range} = this.props;
        var regex = new RegExp(query
                               .split('')
                               .map(RegExp.escape)
                               .map(x => `(${x})`)
                               .join('.*?'), 'i');

        let res = regex.exec(str) || [];
        let lastIndex = 0, chunks = [];

        var start = 0, end = undefined;
        if(range) var [start, end] = range;
        if(typeof end == 'undefined') end = str.length;

        for(let sub of res.slice(1)){
            let nextIndex = str.indexOf(sub, lastIndex)
            chunks.push(str.slice(Math.max(start, lastIndex), Math.min(end, nextIndex)))
            chunks.push(<u>{str.slice(Math.max(start, nextIndex), Math.min(end, nextIndex + sub.length))}</u>)
            lastIndex = nextIndex + sub.length
        }
        chunks.push(str.slice(Math.max(start, lastIndex), end))

        return <span>{chunks}</span>
    }
}

