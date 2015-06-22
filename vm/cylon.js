// asynchronous worker bundle v2

import * as mininpm from './mininpm'

import transformCode from './transform/babel'
import LoggingSyntaxTransformer from './transform/logging'
import LooperTransformer from './transform/looper'
import GlobalTransformer from './transform/globals'
import ResultTransformer from './transform/result'



global.mininpm = mininpm;

var __latestCellID;
// function __track$loop__(i, total){
//     postMessage({ type: 'progress', frac: i / total, cell: __latestCellID })
// }

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
    postMessage({ type: 'activity', activity: '', cell: packet.cell})
    

    var wrappedCode = __prepareExecution(transpiledCode.code, execonf)
    
    
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
    var logTimes = {},
        logValues = {};


    var varys = {
        require(name, version){
            // if(name in cachedModules && !version) return cachedModules[name];
            return mininpm.requireModule(name, version)
        },
        __log(value, name, type, line, instance) {
            // TODO: send the last value of logs out when $$done is called
            if(!(instance in logTimes)) logTimes[instance] = 0;
            if(Date.now() - logTimes[instance] > 50){
                if(['number', 'string', 'undefined'].indexOf(typeof value) != -1 || Array.isArray(value) || value === null){
                    send('log', {logtype: type, line, value})
                }else{
                    // console.log(`${type} ${name} @ line ${line}`, value)
                    send('log', {logtype: type, line, value: value.toString ? value.toString() : (value + '')})
                }
                logTimes[instance] = Date.now()
            }
            logValues[instance] = value;
            finalLog = value;
            return value
        },
        __declareGlobals(){
            for (var i = 0; i < arguments.length; i++) {
                global[arguments[i]] = null;
                declaredGlobals[i] = 1;
            }
        },
        // __result(value) {
        //     console.log("RESULT", value)
        //     return value
        // },
        __trackLoop(i, total, loop, loopTotal){
            if(Date.now() - lastProgress > 10){
                var frac = (i / total) / loopTotal + (loop - 1) / loopTotal;
                send('progress', {frac})
                lastProgress = Date.now();    
            }
        },
        $$done(){
            send('result', {result: finalLog, newGlobals: Object.keys(declaredGlobals)})
        },
        console: {
            log(){
                console.log.apply(console, arguments)
            },
        }
    }
    if(typeof code == 'string'){
        return `(function ExecutionClosure(${Object.keys(varys).join(', ')}){
            \n${code}\n
        \n}).apply(null, __prepareExecution(0, ${JSON.stringify(config)}));`
    }
    return Object.keys(varys).map(x => varys[x])
}
