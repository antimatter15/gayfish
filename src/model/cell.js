export default class CellModel {
    constructor(doc, index) {
        this.doc = doc
        this.id = --doc._ids;
        this.value = ""
        this.oldValue = ""
        this.output = undefined;

        this.cm = null
        if(typeof index === 'undefined'){
            doc.cells.push(this)
        }else{
            doc.cells.splice(index, 0, this)
        }
        this._collapsed = false;
        this._mounted =  []
        this.height = 0;
        this.update()
    }
    serialize() {
        return {
            value: this.value,
            index: this.index,
            collapsed: this.collapsed
        }
    }
    mount = (x) => {
        if(typeof x == 'function'){
            this.cm ? x() : this._mounted.push(x);
        }else{
            this.cm = x;
            while(this._mounted.length)
                this._mounted.shift()();
        }
    }
    remove() {
        this.doc.cells.splice(this.index, 1)
        this.update()
    }
    moveTo(after) {
        var cardIndex = this.index,
            afterIndex = after.index;
        this.doc.cells.splice(cardIndex, 1)
        this.doc.cells.splice(afterIndex, 0, this);
        this.update()
    }
    update(){ if(this.doc) this.doc.update() }
    logAnnotate(line, count, value){
        var cm = this.cm;
        // TODO: move this to cell, better yet, editor
        var inlineLog = cm.findMarks({ line, ch: 0 }, { line, ch: 1e3 })
            .filter(x => x._inlineResult);
        inlineLog.slice(1).forEach(x => x.clear());
        // var text = JSON.stringify(value) + '';
        // if(text.length > 25) text = text.slice(0, 15) + "..." + text.slice(-5);
        var text = '×' + count
        var textNode = document.createTextNode(text);
        var widget = document.createElement("span");
        widget.appendChild(textNode);
        widget.className = "CodeMirror-derp";

        if(inlineLog.length > 0){
            var marker = inlineLog[0];
            marker.widgetNode.replaceChild(widget, marker.widgetNode.firstChild)
        }else{
            var marker = cm.setBookmark({ line, ch: 1e3 }, {
                widget: widget,
                insertLeft: true,
                handleMouseEvents: true
            })
        }

        marker._inlineResult = true;
        marker._originalLine = line;
    }
    get value(){ return this._value; }
    set value(val){
        this._value = val;
        this.update()
    }
    get has_focus(){ return this._has_focus; }
    set has_focus(val){
        this._has_focus = val;
        if(val){
            for(var i = 0; i < this.doc.cells.length; i++){
                var other = this.doc.cells[i];
                if(other !== this) other.has_focus = false;
            }
            this.doc.update()
        }
    }
    set collapsed(val){
        this._collapsed = val;
        if(val){
            this.cm.execCommand('foldAll')
        }else{
            this.cm.execCommand('unfoldAll')
        }
        this.update()
    }
    get collapsed(){ return this._collapsed }
    get index(){ return this.doc.cells.indexOf(this) }
    get prev(){ 
        var prev = this.doc.item(this.index - 1)
        // if(prev && prev.collapsed) return prev.prev;
        return prev;
    }
    get next(){
        var next = this.doc.item(this.index + 1)
        // if(next && next.collapsed) return next.next;
        return next;
    }
    checkNext(){
        if(!this.next && this.value) new CellModel(this.doc);
    }
    run() {
        this.doc.vm.queue(this)
        this.update()
    }
}