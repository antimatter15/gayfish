export default class Machine {
    // src/vm.js
    constructor(doc) {
        this.doc = doc;
        this.worker = new Worker('/static/cylon.bundle.js')
        this.worker.onmessage = this._onmessage.bind(this)
        this._queue = []
        this.latestQueuedCell = null;
        this.busy = false
    }
    _onmessage(e) {
        var data = e.data;
        if(data.type == 'queryModule'){
            this.queryModule[data.name] = data.code;
            return
        }
        var cell = this.doc.find(data.cell);
        if(!cell){
            console.error('cell not found', data)
            return;
        }
        if(data.type == 'done'){
            cell.status = 'done'
            cell.duration = data.duration
            cell.update()
            this.busy = false;
            this._dequeue()
        }else if(data.type == 'error'){
            cell.status = 'error'
            cell.error = data.error;
            cell.update()
            this.busy = false;
            this._dequeue()
        }else if(data.type == 'progress'){
            cell.progress = data.frac;
            // cell.logAnnotate(data.line - 1, data.i, data.total)
            cell.update()
        }else if(data.type == 'logs'){
            cell.logs = data.instances
            for(let {instance, line, name, count, type, latest} of data.instances){
                cell.logAnnotate(line - 1, count, latest)
            }
            // cell.update()
        }else if(data.type == 'activity'){
            cell.activity = data.activity;
            cell.update()
        }else if(data.type == 'interact'){
            cell.interactors = data.interactors;
            cell.update()
        }else if(data.type == 'compiled'){
            cell.compiled = data.code
        }else if(data.type == 'globals'){
            cell.globals = data.globals
            cell.update()
        }else{
            console.error('no handler for data packet', data)
        }
    }
    queryModule(name){
        if(this.queryModule[name]){
            var code = this.queryModule[name]
            delete this.queryModule[name];
            return code;
        }
        this.worker.postMessage({ type: 'queryModule', name: name })
    }
    _dequeue() {
        if(this.busy || this._queue.length == 0) return;
        var {cell, type} = this._queue.shift()
        this.busy = true;
        this.latestRunCell = cell;
        cell.status = 'running';
        cell.oldValue = cell.value;
        cell.activity = ''
        cell.error = null
        cell.progress = 0;
        var cm = cell.cm;

        if(type == 'run'){
            cm.getAllMarks()
                .filter(x => x._inlineResult)
                .forEach(x => x.clear());

            cell.compiled = ''    
            cell.update()
            var error, code = cell.value;
            if(error){
                cell.status = 'error'
                cell.error = error.toString()
                cell.update()
                this.busy = false;
                this._dequeue()
            }else{
                this.worker.postMessage({ type: 'exec', code, cell: cell.id })
            }
        }else if(type == 'repeat'){
            cell.update()
            this.worker.postMessage({ type: 'repeat', code, cell: cell.id, interacts: cell.interacts })
        }
    }
    queue(cell) {
        if(this._queue.some(x => x.cell == cell)) return;
        // if(this._queue.indexOf(cell) != -1) return;
        this._queue.push({ cell: cell, type: 'run' })
        cell.status = 'queued'
        // this.latestQueuedCell = cell
        if(!this.busy) this._dequeue();
    }
    repeat(cell) {
        if(!cell.compiled) throw "oh noes this cell isn't compiled yet";
        if(this._queue.some(x => x.cell == cell)) return;
        this._queue.push({ cell: cell, type: 'repeat' })

        cell.status = 'queued'
        if(!this.busy) this._dequeue();
    }
}
