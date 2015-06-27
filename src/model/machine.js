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
        var cell = this._queue.shift()
        this.busy = true;
        this.latestRunCell = cell;
        cell.status = 'running';
        cell.oldValue = cell.value;
        cell.compiled = ''
        cell.activity = ''
        cell.error = null
        cell.update()
        var cm = cell.cm;
        cm.getAllMarks()
            .filter(x => x._inlineResult)
            .forEach(x => x.clear());

        var error, code = cell.value;
        if(error){
            cell.status = 'error'
            cell.error = error.toString()
            cell.update()
            this.busy = false;
            this._dequeue()
        }else{
            cell.progress = 0;
            this.worker.postMessage({ type: 'exec', code, cell: cell.id })
        }

    }
    queue(cell) {
        if(this._queue.indexOf(cell) != -1) return;
        this._queue.push(cell)
        cell.status = 'queued'
        // this.latestQueuedCell = cell
        if(!this.busy) this._dequeue();
    }
}

