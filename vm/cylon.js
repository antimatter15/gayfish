// asynchronous worker bundle v2

import * as mininpm from './mininpm'
import transformCode from './transform/babel'


var __latestCellID;
function __track$loop__(i, total){
    postMessage({ type: 'progress', frac: i / total, cell: __latestCellID })
}

addEventListener('message', function(e){
    var packet = e.data;
    console.log(packet)
    if(packet.type == 'exec'){
        __latestCellID = packet.cell;
        try{
            transformCode(packet.code, {
                optional: ["runtime"],
                stage: 0,
                acornPlugins: [{
                    transformer: megatron,
                    position: 'before'
                }, {
                    transformer: derpsacola,
                    position: 'before'
                }, {
                    transformer: BruceWillis,
                    position: 'before'
                }]
            })
        } catch (err) {
            console.error(err)
            // postMessage9
        }
        try{
            // var result = eval.call(self, packet.code)
            postMessage({ type: 'result', result: result, cell: packet.cell })
        } catch (err) {
            console.error(err)
            postMessage({ type: 'error', error: err.toString(), cell: packet.cell })
        }
        
    }
})


// https://github.com/jrburke/requirejs/wiki/Differences-between-the-simplified-CommonJS-wrapper-and-standard-AMD-define#cjs
// ;(async function(){
//  var deps = mininpm.extract_deps(middle);
//  for(let dep of deps){
//      await mininpm.recursiveResolve(dep)
//  }
//  //@ sourceURL=foo.js
// })();
