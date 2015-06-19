import Machine from './machine'
import CellModel from './cell'

export default class DocumentModel { // a document is a collection of cells
    constructor() {
        this.cells = []
        this._ids = 0
        this.vm = new Machine(this)
    }
    find(id) { return this.cells.filter(x => x.id === id)[0] }
    item(index) { return this.cells[index] }
    get length() { return this.length }
    update(){}
    serialize() {
        return {
            cells: this.cells.map( x => x.serialize() )
        }
    }
    restore(state){
        for(let c of state.cells){
            if(typeof c.index != 'number') throw 'Cell index must be number';
            var cell = new CellModel(this, c.index)
            if(typeof c.value != 'string') throw 'Cell value must be string';
            cell.value = c.value
            cell._collapsed = !!c.collapsed;
        }
    }
    get focused() { return this.cells.filter(x => x.has_focus)[0] }
}
