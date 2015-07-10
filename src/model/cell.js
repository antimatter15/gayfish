export default class CellModel {
    constructor(doc, index) {
        this.doc = doc
        this.id = --doc._ids;
        this.value = ""
        this.oldValue = ""
        this.output = undefined;
        this.console = []
        this.cm = null
        if(typeof index === 'undefined'){
            doc.cells.push(this)
        }else{
            doc.cells.splice(index, 0, this)
        }
        this._collapsed = false;
        this._mounted =  []
        this._height = 0;
        this.interacts = {}
        this.errorWidgets = []
        this.update()
    }
    serialize() {
        return {
            value: this.value,
            index: this.index,
            collapsed: this.collapsed,
            markdown: this.markdown
        }
    }
    restore(c) {
        if(typeof c.value != 'string') throw 'Cell value must be string';
        this.value = c.value
        this._collapsed = !!c.collapsed;
        this._markdown = !!c.markdown;
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
    preflight(){
        this.status = 'running';
        this.oldValue = this.value;
        this.activity = ''
        this.error = null
        this.progress = 0;
        this.console = [];
        var cm = this.cm;
        for(let erw of this.errorWidgets){
            cm.removeLineWidget(erw)
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
    get markdown() { return !!this._markdown }
    set markdown(val){
        if(this._markdown != val){
            this._markdown = val;
            this.update()    
        }
    }
    get height(){ return this._height; }
    set height(val){
        if(this._height != val){
            this._height = val;
            this.update()
        }
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
        if(this.markdown){
            
        }else{
            this.doc.vm.queue(this)
        }
        
        this.update()
    }
}