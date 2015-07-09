import Machine from './machine'
import CellModel from './cell'

// I'm really sorry for how this code has inevitably turned out
// It's probably since devolved into some inscrutable mess of 
// non-idiomatic esoteric and retro-futuristic ES7 with a
// generous smearing of non-standard facebook slime (nee JSX). 

// My philosophy for stuff has always been that rewrites are good
// and my hope is that this code never gets so ridiculously
// large that a full rewrite isn't an option.

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
            cell.restore(c)
        }
    }
    restart(){
        this.vm.stop()
        this.vm = new Machine(this)
        this.update()
    }
    get focused() { return this.cells.filter(x => x.has_focus)[0] }
}
