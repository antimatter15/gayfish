// asynchronous worker bundle v2

import * as mininpm from './mininpm'
import transformCode from './transform/babel'
import LoggingSyntaxTransformer from './transform/logging'
import LooperTransformer from './transform/looper'
import GlobalTransformer from './transform/globals'
import ResultTransformer from './transform/result'
import * as _ from 'lodash'

global.mininpm = mininpm;
var __latestCellID;
var inspectables = []

function summarizeObject(obj, noRecurse){
    var type = typeof obj;
    if(type == 'function'){
        return {type: 'function', name: obj.name}
    }else if(type == 'number'){
        return {type: 'number', value: obj, isNaN: isNaN(obj), isFinite: isFinite(obj)}
    }else if(obj === null){
        return {type: 'null'}
    }else if(type == 'undefined'){
        return {type: 'undefined'}
    }else if(type == 'string'){
        return {type: 'string', value: obj}
    }else if(type == 'boolean'){
        return {type: 'boolean', value: obj}
    }else if(Array.isArray(obj)){
        var res = {type: 'array', length: obj.length}
        if(!noRecurse) res.values = obj.map(x => summarizeObject(x, true));
        return res;
    }else{ // object
        var res = {type: 'object', keys: Object.keys(obj)}
        return res;
    }
}


addEventListener('message', function(e){
    var packet = e.data;
    // console.log(packet)
    if(packet.type == 'exec'){
        __latestCellID = packet.cell;
        transpileAndRun(packet)
            .catch(function(err){
                postMessage({ type: 'error', error: err.toString(), cell: packet.cell })
            })
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
    var execonf = {
        cell: packet.cell
    }
    // postMessage({ type: 'activity', activity: 'transpiling code', cell: packet.cell})
    try{
        transpiledCode = transformCode(packet.code, {
            optional: ["runtime"],
            stage: 0,
            acornPlugins: {
                semilog: true
            },
            plugins: [
                {
                    transformer: LoggingSyntaxTransformer,
                    position: 'before'
                }, 
                {
                    transformer: GlobalTransformer,
                    position: 'before'
                }, 
                {
                    transformer: LooperTransformer,
                    position: 'before'
                },
                // {
                //     transformer: ResultTransformer,
                //     position: 'after'
                // },
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
    
    var wrappedCode = __prepareExecution(transpiledCode.code, execonf)
    postMessage({ type: 'activity', activity: '', cell: packet.cell})
    
    try{
        var result = eval.call(self, wrappedCode)
    } catch (err) {
        console.error(err)
        postMessage({ type: 'error', error: err.toString(), cell: packet.cell })
        return
    }
    // if(result){
    // }
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
                latest: summarizeObject(inst.values[inst.values.length - 1])
            })
        }
        send('logs', { instances: packet })
    }
    function sendGlobalSnapshot(){
        send('globals', { names: Object.keys(declaredGlobals) })
    }
    var varys = {
        require(name, version){
            // if(name in cachedModules && !version) return cachedModules[name];
            return mininpm.requireModule(name, version)
        },
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
            if(Date.now() - lastLogSnapshot > 10){
                lastLogSnapshot = Date.now();
                sendLogSnapshot()
            }
            return value
        },
        __declareGlobals(){
            for (var i = 0; i < arguments.length; i++) {
                global[arguments[i]] = null;
                declaredGlobals[i] = 1;
            }
            sendGlobalSnapshot()
        },
        __trackLoop(i, total, loop, loopTotal){
            if(Date.now() - lastProgress > 10){
                var frac = (i / total) / loopTotal + (loop - 1) / loopTotal;
                send('progress', {frac})
                lastProgress = Date.now();    
            }
        },
        $$start(){
            startTime = performance.now()
        },
        $$done(){
            sendLogSnapshot()

            // Object.keys(logInstances)
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
        return `(function ExecutionClosure(${Object.keys(varys).join(', ')}){$$start();
            \n${code}\n
        \n}).apply(null, __prepareExecution(0, ${JSON.stringify(config)}));`
    }
    return Object.keys(varys).map(x => varys[x])
}
