import BabelTransform from "babel-core/lib/babel/transformation";
import BabelParseHelper from 'babel-core/lib/babel/helpers/parse.js'
import BabelFile from "babel-core/lib/babel/transformation/file";

// babel/transformation/file/index.js
export default function transformCode(code, opts){
    var parseOpts = {
        highlightCode: opts.highlightCode,
        nonStandard:   opts.nonStandard,
        filename:      opts.filename,
        plugins:       opts.acornPlugins || {}
    };

    // var features = parseOpts.features = {};
    // for (var key in this.transformers) {
    //   var transformer = this.transformers[key];
    //   console.log(transformer)
    //   features[key] = transformer.canTransform();
    // }

    // isLoose(key: string) { return includes(this.opts.loose, key); }
    // parseOpts.looseModules = this.isLoose("es6.modules");
    // parseOpts.strictMode = features.strict;
    parseOpts.sourceType = "module";

    var tree = BabelParseHelper(code, parseOpts);
    var file = new BabelFile(opts, BabelTransform.pipeline);

    return file.wrap(code, function(){
        file.addCode(code)
        file.addAst(tree)
        return file.transform()
    })
}
