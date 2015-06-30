// asynchronous worker bundle v2

// This stuff is pretty hacky and doesn't make much sense
// a big part of that is that I don't currently have a solid
// model for what kind of stuff this actually needs to do
// so I'm building each additional feature in whatever manner
// incurs the least resistance (barring conscience), with
// the hope that one day it'll all be rewritten in a wiser
// way.


import * as mininpm from './mininpm'
import transformCode from './transform/babel'
import LoggingSyntaxTransformer from './transform/logging'
import LooperTransformer from './transform/looper'
import GlobalTransformer from './transform/globals'
import ResultTransformer from './transform/result'
import InteractTransformer from './transform/interact'
import * as _ from 'lodash'

global.mininpm = mininpm;
var __latestCellID;
var inspectables = []
var cachedTranspiledCells = {};

function summarizeObject(obj, noRecurse){
    var type = typeof obj;
    if(type == 'function'){
        return {type: 'function', name: obj.name}
    }else if(type == 'number'){
        return obj;
        // return {type: 'number', value: obj, isNaN: isNaN(obj), isFinite: isFinite(obj)}
    }else if(obj === null){
        return {type: 'null'}
    }else if(type == 'undefined'){
        return {type: 'undefined'}
    }else if(type == 'string'){
        // return {type: 'string', value: obj}
        return obj
    }else if(type == 'boolean'){
        // return {type: 'boolean', value: obj}
        return obj
    }else if(Array.isArray(obj)){
        var res = {type: 'array', length: obj.length}
        if(!noRecurse) res.values = obj.map(x => summarizeObject(x, true));
        return res;
    }else{ // object
        var res = {type: 'object'}
        if(!noRecurse) res.pairs = Object.keys(obj).map(x => [x, summarizeObject(obj[x], true)]);
        return res;
    }
}


addEventListener('message', function(e){
    var packet = e.data;
    // console.log(packet)
    if(packet.type == 'exec'){
        __latestCellID = packet.cell;
        transpileAndRun(packet)
            .then(function(){
                runCachedCell(packet.cell)
            })
            .catch(function(err){
                postMessage({ type: 'error', error: err.toString(), cell: packet.cell })
            })
    }else if(packet.type == 'repeat'){
        console.log('interacts', packet.interacts)
        runCachedCell(packet.cell, { interacts: packet.interacts })
    }else if(packet.type == 'inspect'){

    }else if(packet.type == 'queryModule'){
        var resolve;
        try {
            resolve = mininpm.resolveSync(packet.name)    
        } catch (err) {}
        if(resolve){
            postMessage({ type: 'queryModule', name: packet.name, code: resolve.contents })    
        }
    }
})



async function transpileAndRun(packet){
    var transpiledCode;
    
    // postMessage({ type: 'activity', activity: 'transpiling code', cell: packet.cell})
    try{
        transpiledCode = transformCode(packet.code, {
            optional: ["runtime"],
            stage: 0,
            acornPlugins: { semilog: true },
            plugins: [
                { transformer: LoggingSyntaxTransformer, position: 'before' }, 
                { transformer: GlobalTransformer, position: 'before' }, 
                { transformer: LooperTransformer, position: 'before' },
                { transformer: InteractTransformer, position: 'after' },
                // { transformer: ResultTransformer, position: 'after' },
            ]
        })
    } catch (err) {
        console.error(err)
        postMessage({ type: 'error', error: err.toString(), cell: packet.cell })
        return
    }
    console.log( transpiledCode.code)
    postMessage({ type: 'compiled', code: transpiledCode.code, cell: packet.cell})

    var deps = mininpm.extract_deps(transpiledCode.code)
    console.log(transpiledCode, deps)
    
    var seen_deps = {}
    for(let dep of deps){
        await mininpm.recursiveResolve(dep, 'latest', {
            callback(subdep, version){
                var id = subdep.replace(/\/.*$/, '') + '@' + version
                if(id in seen_deps) return;
                postMessage({ type: 'activity', activity: 'downloading ' + id, cell: packet.cell})
                seen_deps[id] = 1;
            },
            error(err){
                // postMessage({ type: 'activity', activity: 'error ' + err, cell: packet.cell})
            }
        })
        
    }
    cachedTranspiledCells[packet.cell] = transpiledCode.code
}



function runCachedCell(id, execonf){
    if(!execonf) execonf = {};
    execonf.cell = id;
    var code = cachedTranspiledCells[id]
    var wrappedCode = __prepareExecution(code, execonf)
    postMessage({ type: 'activity', activity: '', cell: id})
    
    try{
        var result = eval.call(self, wrappedCode)
    } catch (err) {
        console.error(err)
        postMessage({ type: 'error', error: err.toString(), cell: id })
        return
    }
}



global.__prepareExecution = function __prepareExecution(code, config){
    function send(type, obj){
        obj.cell = config.cell;
        obj.type = type;
        postMessage(obj)
    }
    var finalLog;
    var lastProgress = 0;
    var declaredGlobals = {};
    var logInstances = {}
    var lastLogSnapshot = 0;
    var startTime = 0;

    function sendLogSnapshot(){
        var packet = []
        for(var i in logInstances){
            var inst = logInstances[i];
            packet.push({
                instance: i,
                line: inst.line,
                name: inst.name,
                type: inst.type,
                count: inst.values.length,
                latest: summarizeObject(inst.values[inst.values.length - 1].value)
            })
        }
        send('logs', { instances: packet })
    }
    function sendGlobalSnapshot(){
        send('globals', { 
            globals: _.zipObject(Object.keys(declaredGlobals).map(x => [x, summarizeObject(global[x])]))
        })
    }
    var interactors = {}

    var interact = {
        Slider(id, name){
            return function(def, min, max){
                interactors[id] = {
                    type: 'slider',
                    name: name,
                    def: def,
                    id: id,
                    min: min,
                    max: max
                }
                if(config.interacts && id in config.interacts) return config.interacts[id];
                return def;
            }
        },
        Choice(id, name){
            return function(def, opts) {
                interactors[id] = {
                    type: 'choice',
                    name: name,
                    opts: opts,
                    def: def,
                    id: id
                }
                if(config.interacts && id in config.interacts) return config.interacts[id];
                return def
            }
        }
    }
    interact.def = interact.Slider;

    function sendInteractSnapshot(){
        send('interact', {
            interactors: _.values(interactors)
        })
    }
    var varys = {
        require(name, version){
            // if(name in cachedModules && !version) return cachedModules[name];
            return mininpm.requireModule(name, version)
        },
        __interact: interact,
        __log(value, name, type, line, instance) {
            if(!(instance in logInstances)){
                logInstances[instance] = {
                    line,
                    name,
                    type,
                    values: [{
                        time: Date.now(),
                        value
                    }]
                }
            }else{
                logInstances[instance].values.push({
                    time: Date.now(),
                    value
                });    
            }
            if(Date.now() - lastLogSnapshot > 20){
                lastLogSnapshot = Date.now();
                sendLogSnapshot()
            }
            return value
        },
        __declareGlobals(){
            for (var i = 0; i < arguments.length; i++) {
                global[arguments[i]] = null;
                declaredGlobals[arguments[i]] = 1;
            }
            // sendGlobalSnapshot()
        },
        __trackLoop(i, total, line, loop, loopTotal){
            if(Date.now() - lastProgress > 10){
                var frac = (i / total) / loopTotal + (loop - 1) / loopTotal;
                send('progress', {frac, line, i, total})
                lastProgress = Date.now();    
            }
        },
        $$done(){
            sendLogSnapshot()
            sendGlobalSnapshot()
            sendInteractSnapshot()
            send('done', {
                duration: performance.now() - startTime
            })
        },
        console: {
            log(){
                console.log.apply(console, arguments)
            },
        }
    }
    if(typeof code == 'string'){
        // don't stick anything before the code because "use strict" needs to be at top
        return `(function ExecutionClosure(${Object.keys(varys).join(', ')}){
            \n${code}\n
        \n}).apply(null, __prepareExecution(0, ${JSON.stringify(config)}));`
    }else{
        startTime = performance.now()
        return Object.keys(varys).map(x => varys[x])
    }
}
