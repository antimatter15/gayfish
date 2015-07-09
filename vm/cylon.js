// asynchronous worker bundle v2

// This stuff is pretty hacky and doesn't make much sense
// a big part of that is that I don't currently have a solid
// model for what kind of stuff this actually needs to do
// so I'm building each additional feature in whatever manner
// incurs the least resistance (barring conscience), with
// the hope that one day it'll all be rewritten in a wiser
// way.

require("babel-core/polyfill")
require('../src/workerception/worker')

import * as mininpm from './mininpm'
import transformCode from './transform/babel'
import LoggingSyntaxTransformer from './transform/logging'
import LooperTransformer from './transform/looper'
import GlobalTransformer from './transform/globals'
import ResultTransformer from './transform/result'
import InteractTransformer from './transform/interact'
import {parse as parseStacktrace} from 'stacktrace-parser'
import {SourceMapConsumer} from 'source-map'

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
        if(obj instanceof RegExp){
            return { type: 'regexp', code: obj.toString() }
        }
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
                // postMessage({ type: 'error', error: err.toString(), cell: packet.cell })
            })
    }else if(packet.type == 'repeat'){
        // console.log('interacts', packet.interacts)
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
            optional: ["runtime", "asyncToGenerator"],
            stage: 0,
            sourceMaps: true,
            acornPlugins: { semilog: true },
            plugins: [
                { transformer: InteractTransformer, position: 'before' },
                { transformer: LoggingSyntaxTransformer, position: 'before' }, 
                { transformer: GlobalTransformer, position: 'before' }, 
                { transformer: LooperTransformer, position: 'after' },
                // { transformer: ResultTransformer, position: 'after' },
            ]
        })
    } catch (err) {

        console.error(err)
        
        var loc = /\((\d+):(\d+)\)/g.exec(err.toString())
        // console.log(loc, parseInt(loc[1]))
        postMessage({ 
            type: 'error', 
            error: err.toString(), 
            line: parseInt(loc[1]), 
            column: parseInt(loc[2]), 
            cell: packet.cell
        })
        throw err;
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
    cachedTranspiledCells[packet.cell] = transpiledCode
}

function now(){
    if(typeof perforamnce != 'undefined'){
        return performance.now()
    }else{
        return Date.now()
    }
}




global.__execArgs = {};

function runCachedCell(cell_id, config){
    if(!config) config = {};

    config.cell = cell_id;

    var {code, map} = cachedTranspiledCells[cell_id];

    function send(type, obj){
        // console.log('sending', type, obj)
        obj.cell = cell_id;
        obj.type = type;
        postMessage(obj)
    }

    send('activity', { activity: '' })

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
        Slider(def, id, name){
            return function(min, max){
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
        // Label(id) {
        //     return function(name){
        //         return _.object(Object.keys(interact).map(x => [x, function(...args){
        //             interact[x](id, name)(...args)
        //         }]));
        //     }
        // },
        Choice(def, id, name){
            return function(...opts) {
                if(!opts.length){
                    throw new Error("Interact.Choice requires at least one option")
                }
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
        },
        Index(def, id, name){
            return function(...opts) {
                if(!opts.length){
                    throw new Error("Interact.Index requires at least one option")
                }
                interactors[id] = {
                    type: 'index',
                    name: name,
                    opts: opts,
                    def: def,
                    id: id
                }
                if(config.interacts && id in config.interacts) return config.interacts[id];
                return def
            }
        },
        Text(def, id, name){
            return function() {
                interactors[id] = {
                    type: 'text',
                    name: name,
                    def: def,
                    id: id
                }
                if(config.interacts && id in config.interacts) return config.interacts[id];
                return def
            }
        },
        Textarea(def, id, name){
            return function(language) {
                interactors[id] = {
                    type: 'textarea',
                    language: language,
                    name: name,
                    def: def,
                    id: id
                }
                if(config.interacts && id in config.interacts) return config.interacts[id];
                return def
            }
        }
    }
    interact.Default = interact.Slider;

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
                duration: now() - startTime
            })
        },
        console: {
            log(){
                // console.log.apply(console, arguments)
            },
        }
    }

    var argIndex = cell_id + ':' + Date.now();

    __execArgs[argIndex] = Object.keys(varys).map(x => varys[x]);

    var wrappedCode = `(function ExecutionClosure(${Object.keys(varys).join(', ')}){\n\n${code}\n
    \n}).apply(null, __execArgs[${JSON.stringify(argIndex)}]);
    \n//# sourceURL=carbide:///${argIndex}?`;

    
    // console.log(wrappedCode);

    try{
        startTime = now()
        eval.call(self, wrappedCode)

    } catch (err) {
        postMessage({ type: 'echo', text: "error", code: err.toString(), stack: err.stack, line: err.line, column: err.column });

        var smc = new SourceMapConsumer(map);
        
        var things = parseStacktrace(err.stack).filter(function(e){
            return e.file.startsWith('carbide://')
        })[0];

        var [line, col] = things ? [things.lineNumber, things.column] : [err.line, err.column];

        var loc = smc.originalPositionFor({line: line - 2, column: col})

        console.error(err)
        send('error', { error: err.toString(), line: loc.line, column: loc.column })
        sendLogSnapshot()
        return
    }
}

