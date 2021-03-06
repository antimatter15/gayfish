import BabelTransform from "babel-core/lib/babel/transformation";
import BabelParseHelper from 'babel-core/lib/babel/helpers/parse.js'
import BabelFile from "babel-core/lib/babel/transformation/file";

// babel/transformation/file/index.js
export default function transformCode(originalCode, opts){

    var parseOpts = {
        highlightCode: true, //opts.highlightCode,
        nonStandard:   true, //opts.nonStandard,
        filename:      opts.filename,
        plugins:       opts.acornPlugins || {}
    };

    var features = parseOpts.features = {};

    var transformers = BabelTransform.pipeline.transformers;
    for(var key in transformers){
        var transformer = transformers[key]
        // console.log(transformer, key)
        features[key] = true;
    }
    // for (var key in this.transformers) {
    //   var transformer = this.transformers[key];
    //   console.log(transformer)
    //   features[key] = transformer.canTransform();
    // }

    // isLoose(key: string) { return includes(this.opts.loose, key); }
    // parseOpts.looseModules = this.isLoose("es6.modules");
    parseOpts.strictMode = features.strict;
    parseOpts.sourceType = "module";
    
    var parseError;
    try {
        var code = originalCode + "\n\n;$$done();";
        var tree = BabelParseHelper(code, parseOpts);
    } catch (err) { parseError = err }
    if(!tree && /await/.test(originalCode)){
        var code = '(async function AsyncWrap(){' + originalCode +'\n\n})().then($$done);'
        var tree = BabelParseHelper(code, parseOpts);
    }
    if(!tree){ throw parseError; }
    
    
    delete opts['acornPlugins'];
    var file = new BabelFile(opts, BabelTransform.pipeline);

    return file.wrap(code, function(){
        file.addCode(code)
        file.addAst(tree)
        return file.transform()
    })
}
