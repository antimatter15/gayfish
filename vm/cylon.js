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

addEventListener('message', function(e){
    var packet = e.data;
    console.log(packet)
    if(packet.type == 'exec'){
        __latestCellID = packet.cell;
        transpileAndRun(packet)
    }
})

async function transpileAndRun(packet){
    var transpiledCode;
    var execonf = {
        cell: packet.cell
    }
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
                {
                    transformer: ResultTransformer,
                    position: 'after'
                },
            ]
        })
    } catch (err) {
        console.error(err)
        postMessage({ type: 'error', error: err.toString(), cell: packet.cell })
        return
    }
    
    var deps = mininpm.extract_deps(transpiledCode.code)
    console.log(transpiledCode, deps)

    for(let dep of deps){
        await mininpm.recursiveResolve(dep)
    }
    

    var wrappedCode = __prepareExecution(transpiledCode.code, execonf)
    
    
    try{
        var result = eval.call(self, wrappedCode)
    } catch (err) {
        console.error(err)
        postMessage({ type: 'error', error: err.toString(), cell: packet.cell })
        return
    }
    // if(result){
    postMessage({ type: 'result', result: wrappedCode, cell: packet.cell })
    // }
}





global.__prepareExecution = function __prepareExecution(code, config){
    var varys = {
        require: mininpm.requireModule,
        __log(value, name, type, line) {
            console.log(`${type} ${name}@${line}`, value)
            return value
        },
        __declareGlobals(){
            for (var i = 0; i < arguments.length; i++) {
                global[arguments[i]] = null;
            }
        },
        __result(value) {
            console.log("RESULT", value)
            return value
        },
        __trackLoop(i, total, loop, loopTotal){
            var frac = (i / total) / loopTotal + (loop - 1) / loopTotal;
            postMessage({ type: 'progress', frac: frac, cell: __latestCellID })
        }
    }
    if(typeof code == 'string'){
        return `(function ExecutionClosure(${Object.keys(varys).join(', ')}){
            \n${code}\n
        \n}).apply(null, __prepareExecution(0, ${JSON.stringify(config)}));`
    }
    return Object.keys(varys).map(x => varys[x])
}

// https://github.com/jrburke/requirejs/wiki/Differences-between-the-simplified-CommonJS-wrapper-and-standard-AMD-define#cjs
// ;(async function(){
//  var deps = mininpm.extract_deps(middle);
//  for(let dep of deps){
//      await mininpm.recursiveResolve(dep)
//  }
//  //@ sourceURL=foo.js
// })();
