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
        // console.log(data)
        var cell = this.doc.find(data.cell);
        if(!cell){
            console.error('cell not found', data)
            return;
        }
        if(data.type == 'result'){

            cell.status = 'done'
            if(data.result == 'use strict'){
                cell.output = 'nothing';
            }else{
                cell.output = data.result;
            }
            
            cell.update()
            this.busy = false;
            this._dequeue()
        }else if(data.type == 'error'){
            cell.status = 'error'
            cell.output = data.error;
            cell.update()
            this.busy = false;
            this._dequeue()
        }else if(data.type == 'progress'){
            cell.progress = data.frac;
            cell.update()
        }else if(data.type == 'log'){
            var cm = cell.cm;
            let line = data.line - 1;
            
            var inlineLog = cm.findMarks({ line, ch: 0 }, { line, ch: 1e3 })
                .filter(x => x._inlineResult);
            inlineLog.slice(1).forEach(x => x.clear());
            // console.log(inlineLog, '__INLINELOG')
            var text = JSON.stringify(data.value) + '';
            if(text.length > 25) text = text.slice(0, 15) + "..." + text.slice(-5);
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
                    insertLeft: true
                })
            }

            marker._inlineResult = true;
            marker._originalLine = line;
            // cell.update()
        }else if(data.type == 'activity'){
            cell.activity = data.activity;
            cell.update()
        }else if(data.type == 'compiled'){
            cell.compiled = data.code
        }else{
            console.error('no handler for data packet', data)
        }
    }
    _dequeue() {
        if(this.busy || this._queue.length == 0) return;
        var cell = this._queue.shift()
        this.busy = true;
        cell.status = 'running';
        cell.oldValue = cell.value;
        cell.compiled = ''
        cell.activity = ''
        cell.update()
        var cm = cell.cm;
        cm.getAllMarks()
            .filter(x => x._inlineResult)
            .forEach(x => x.clear());

        var error, code = cell.value;
        if(error){
            cell.status = 'error'
            cell.output = error.toString()
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
        this.latestQueuedCell = cell
        if(!this.busy) this._dequeue();
    }
}

