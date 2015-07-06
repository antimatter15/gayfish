export default class Machine {
    // src/vm.js
    constructor(doc) {
        this.doc = doc;
        this.worker = new Worker('/static/cylon.bundle.js')
        this.worker.onmessage = this._onmessage.bind(this)
        this.worker.addEventListener('error', function(e){
            console.log(e)
        }, false)
        this._queue = []
        this.busy = false
    }
    _onmessage(e) {
        var data = e.data;
        if(data.type == 'queryModule'){
            this.queryModule[data.name] = data.code;
            return
        }

        if(data.type == 'echo'){
            console.log(data)
            return;
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
            // TODO: mark the line at the column where the error is
            // based off the Codemirror linter demo
            // from https://codemirror.net/addon/lint/lint.css
            // and https://codemirror.net/addon/lint/lint.js
            cell.status = 'error'
            cell.error = data.error;
            // console.log('oh look ites an error', data)
            if(typeof data.line !== 'undefined'){
                var msg = document.createElement("div");
                var icon = msg.appendChild(document.createElement("span"));
                icon.innerHTML = "!!";
                icon.className = "lint-error-icon";
                msg.appendChild(document.createTextNode(data.error));
                msg.className = "lint-error";
                cell.errorWidgets.push(
                    cell.cm.addLineWidget(
                        Math.min(cell.cm.lineCount(), data.line) - 1, 
                        msg, 
                        {coverGutter: false, noHScroll: true}));
            }
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

            for(let erw of cell.errorWidgets){
                cm.removeLineWidget(erw)
            }
            cell.errorWidgets = [];

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
    stop(){
        this.worker.terminate()
        if(this.latestRunCell){
            this.latestRunCell.status = ''
            // this.latestRunCell.error = 'Terminated'
        }
        for(let {cell} of this._queue){
            cell.status = ''
        }
    }
    repeat(cell) {
        if(!cell.compiled) throw "oh noes this cell isn't compiled yet";
        if(this._queue.some(x => x.cell == cell)) return;
        this._queue.push({ cell: cell, type: 'repeat' })

        cell.status = 'queued'
        if(!this.busy) this._dequeue();
    }
}

