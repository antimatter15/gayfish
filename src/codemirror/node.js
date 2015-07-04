// (function(mod) {
// if (typeof exports == "object" && typeof module == "object") // CommonJS
//   return mod(require("../lib/infer"), require("../lib/tern"), require);
// if (typeof define == "function" && define.amd) // AMD
//   return define(["../lib/infer", "../lib/tern"], mod);
// mod(tern, tern);
// })(function(infer, tern, require) {

var infer = require('tern/lib/infer'),
    tern = require('tern/lib/tern');

"use strict";

function resolvePath(base, path) {
  if (path[0] == "/") return path;
  var slash = base.lastIndexOf("/"), m;
  if (slash >= 0) path = base.slice(0, slash + 1) + path;
  while (m = /[^\/]*[^\/\.][^\/]*\/\.\.\//.exec(path))
    path = path.slice(0, m.index) + path.slice(m.index + m[0].length);
  return path.replace(/(^|[^\.])\.\//g, "$1");
}

function relativePath(from, to) {
  if (from[from.length - 1] != "/") from += "/";
  if (to.indexOf(from) == 0) return to.slice(from.length);
  else return to;
}

function getModule(data, name) {
  return data.modules[name] || (data.modules[name] = new infer.AVal);
}

var WG_DEFAULT_EXPORT = 95;

function buildWrappingScope(parent, origin, node) {
  var scope = new infer.Scope(parent);
  scope.originNode = node;
  infer.cx().definitions.node.require.propagate(scope.defProp("require"));
  var module = new infer.Obj(infer.cx().definitions.node.Module.getProp("prototype").getType());
  module.propagate(scope.defProp("module"));
  var exports = new infer.Obj(true, "exports");
  module.origin = exports.origin = origin;
  module.originNode = exports.originNode = scope.originNode;
  exports.propagate(scope.defProp("exports"));
  var moduleExports = scope.exports = module.defProp("exports");
  exports.propagate(moduleExports, WG_DEFAULT_EXPORT);
  return scope;
}

function resolveModule(server, name, _parent) {
  // console.log('resolving module', server, name)
  var data = server._node;
  if (data.modules[name]) return data.modules[name];

  if(data.options.resolver){
    // console.log('resolve module', data, name, _parent, data.currentOrigin);
    var result = data.options.resolver(name)
    if(result){
      var file = '/' + name + '/' + result.filename;

      var norm = normPath(file);
      // console.log(norm, data.currentOrigin)
      if (data.modules[norm]) return data.modules[norm];

      
      server.addFile(norm, result.data, data.currentOrigin);
      return data.modules[norm] = new infer.AVal;
    }
    
  }
  
  // server.addFile(name, null, server._node.currentOrigin);
  // return getModule(server._node, name);
  return infer.ANull
}

// Assume node.js & access to local file system
// if (require) (function() {
//   var fs = require("fs"), module_ = require("module"), path = require("path");

//   relativePath = path.relative;

//   resolveModule = function(server, name, parent) {
//     var data = server._node;
//     if (data.options.dontLoad == true ||
//         data.options.dontLoad && new RegExp(data.options.dontLoad).test(name) ||
//         data.options.load && !new RegExp(data.options.load).test(name))
//       return infer.ANull;

//     if (data.modules[name]) return data.modules[name];

//     var currentModule = {
//       id: parent,
//       paths: module_._nodeModulePaths(path.dirname(parent))
//     };
//     try {
//       var file = module_._resolveFilename(name, currentModule);
//     } catch(e) { return infer.ANull; }

//     var norm = normPath(file);
//     if (data.modules[norm]) return data.modules[norm];

//     if (fs.existsSync(file) && /^(\.js)?$/.test(path.extname(file)))
//       server.addFile(relativePath(server.options.projectDir, file), null, data.currentOrigin);
//     return data.modules[norm] = new infer.AVal;
//   };
// })();

function normPath(name) { return name.replace(/\\/g, "/"); }

function resolveProjectPath(server, pth) {
  return resolvePath(normPath(server.options.projectDir || "") + "/", normPath(pth));
}

infer.registerFunction("nodeRequire", function(_self, _args, argNodes) {
  if (!argNodes || !argNodes.length || argNodes[0].type != "Literal" || typeof argNodes[0].value != "string")
    return infer.ANull;
  var cx = infer.cx(), server = cx.parent, data = server._node, name = argNodes[0].value;
  var locals = cx.definitions.node;
  var result;

  if (locals[name] && /^[a-z_]*$/.test(name)) {
    result = locals[name];
  } else if (name in data.modules) {
    result = data.modules[name];
  } else if (data.options.modules && data.options.modules.hasOwnProperty(name)) {
    var scope = buildWrappingScope(cx.topScope, name);
    infer.def.load(data.options.modules[name], scope);
    result = data.modules[name] = scope.exports;
  } else {
    // data.currentFile is only available while analyzing a file; at query
    // time, determine the calling file from the caller's AST.
    var currentFile = data.currentFile || resolveProjectPath(server, argNodes[0].sourceFile.name);

    var relative = /^\.{0,2}\//.test(name);
    if (relative) {
      if (!currentFile) return argNodes[0].required || infer.ANull;
      name = resolvePath(currentFile, name);
    }
    result = resolveModule(server, name, currentFile);
  }
  return argNodes[0].required = result;
});

function preCondenseReach(state) {
  var mods = infer.cx().parent._node.modules;
  var node = state.roots["!node"] = new infer.Obj(null);
  for (var name in mods) {
    var mod = mods[name];
    var id = mod.origin || name;
    var prop = node.defProp(id.replace(/\./g, "`"));
    mod.propagate(prop);
    prop.origin = mod.origin;
  }
}

function postLoadDef(data) {
  var cx = infer.cx(), mods = cx.definitions[data["!name"]]["!node"];
  var data = cx.parent._node;
  if (mods) for (var name in mods.props) {
    var origin = name.replace(/`/g, ".");
    var mod = getModule(data, origin);
    mod.origin = origin;
    mods.props[name].propagate(mod);
  }
}

function findTypeAt(_file, _pos, expr, type) {
  if (!expr) return type;
  var isStringLiteral = expr.node.type === "Literal" &&
     typeof expr.node.value === "string";
  var isRequireArg = !!expr.node.required;

  if (isStringLiteral && isRequireArg) {
    // The `type` is a value shared for all string literals.
    // We must create a copy before modifying `origin` and `originNode`.
    // Otherwise all string literals would point to the last jump location
    type = Object.create(type);

    // Provide a custom origin location pointing to the require()d file
    var exportedType;
    if (expr.node.required && (exportedType = expr.node.required.getType())) {
      type.origin = exportedType.origin;
      type.originNode = exportedType.originNode;
    }
  }

  return type;
}

tern.registerPlugin("node", function(server, options) {
  server._node = {
    modules: Object.create(null),
    options: options || {},
    currentFile: null,
    currentRequires: [],
    currentOrigin: null,
    server: server
  };

  server.on("beforeLoad", function(file) {
    if(!file.name.startsWith("cell-")){
      this._node.currentFile = resolveProjectPath(server, file.name);
      this._node.currentOrigin = file.name;
      this._node.currentRequires = [];
      file.scope = buildWrappingScope(file.scope, this._node.currentOrigin, file.ast);
        
    }
    
  });

  server.on("afterLoad", function(file) {
    if(!file.name.startsWith("cell-")){
      var mod = getModule(this._node, this._node.currentFile);
      mod.origin = this._node.currentOrigin;
      file.scope.exports.propagate(mod);
      this._node.currentFile = null;
      this._node.currentOrigin = null;
    }
    // console.log('afterload', file)
  });

  server.on("reset", function() {
    this._node.modules = Object.create(null);
  });

  return {defs: defs,
          passes: {preCondenseReach: preCondenseReach,
                   postLoadDef: postLoadDef,
                   completion: findCompletions,
                   typeAt: findTypeAt}};
});

// Completes CommonJS module names in strings passed to require
function findCompletions(file, query) {
  var wordEnd = tern.resolvePos(file, query.end);
  var callExpr = infer.findExpressionAround(file.ast, null, wordEnd, file.scope, "CallExpression");
  if (!callExpr) return;
  var callNode = callExpr.node;
  if (callNode.callee.type != "Identifier" || callNode.callee.name != "require" ||
      callNode.arguments.length < 1) return;
  var argNode = callNode.arguments[0];
  if (argNode.type != "Literal" || typeof argNode.value != "string" ||
      argNode.start > wordEnd || argNode.end < wordEnd) return;

  var word = argNode.raw.slice(1, wordEnd - argNode.start), quote = argNode.raw.charAt(0);
  if (word && word.charAt(word.length - 1) == quote)
    word = word.slice(0, word.length - 1);
  var completions = completeModuleName(query, file, word);
  if (argNode.end == wordEnd + 1 && file.text.charAt(wordEnd) == quote)
    ++wordEnd;
  return {
    start: tern.outputPos(query, file, argNode.start),
    end: tern.outputPos(query, file, wordEnd),
    isProperty: false,
    completions: completions.map(function(rec) {
      var name = typeof rec == "string" ? rec : rec.name;
      var string = JSON.stringify(name);
      if (quote == "'") string = quote + string.slice(1, string.length -1).replace(/'/g, "\\'") + quote;
      if (typeof rec == "string") return string;
      rec.displayName = name;
      rec.name = string;
      return rec;
    })
  };
}

function completeModuleName(query, file, word) {
  var completions = [];
  var cx = infer.cx(), server = cx.parent, data = server._node;
  var currentFile = data.currentFile || resolveProjectPath(server, file.name);
  var wrapAsObjs = query.types || query.depths || query.docs || query.urls || query.origins;

  function gather(modules) {
    for (var name in modules) {
      if (name == currentFile) continue;

      var moduleName = resolveModulePath(name, currentFile);
      if (moduleName &&
          !(query.filter !== false && word &&
            (query.caseInsensitive ? moduleName.toLowerCase() : moduleName).indexOf(word) !== 0)) {
        var rec = wrapAsObjs ? {name: moduleName} : moduleName;
        completions.push(rec);

        if (query.types || query.docs || query.urls || query.origins) {
          var val = modules[name];
          infer.resetGuessing();
          var type = val.getType();
          rec.guess = infer.didGuess();
          if (query.types)
            rec.type = infer.toString(val);
          if (query.docs)
            maybeSet(rec, "doc", val.doc || type && type.doc);
          if (query.urls)
            maybeSet(rec, "url", val.url || type && type.url);
          if (query.origins)
            maybeSet(rec, "origin", val.origin || type && type.origin);
        }
      }
    }
  }

  if (query.caseInsensitive) word = word.toLowerCase();
  gather(cx.definitions.node);
  gather(data.modules);
  return completions;
}

/**
 * Resolve the module path of the given module name by using the current file.
 */
function resolveModulePath(name, currentFile) {

  function startsWith(str, prefix) {
    return str.slice(0, prefix.length) == prefix;
  }

  function endsWith(str, suffix) {
    return str.slice(-suffix.length) == suffix;
  }

  if (name.indexOf('/') == -1) return name;
  // module name has '/', compute the module path
  var modulePath = normPath(relativePath(currentFile + '/..', name));
  if (startsWith(modulePath, 'node_modules')) {
    // module name starts with node_modules, remove it
    modulePath = modulePath.substring('node_modules'.length + 1, modulePath.length);
    if (endsWith(modulePath, 'index.js')) {
      // module name ends with index.js, remove it.
     modulePath = modulePath.substring(0, modulePath.length - 'index.js'.length - 1);
    }
  } else if (!startsWith(modulePath, '../')) {
    // module name is not inside node_modules and there is not ../, add ./
    modulePath = './' + modulePath;
  }
  if (endsWith(modulePath, '.js')) {
    // remove js extension
    modulePath = modulePath.substring(0, modulePath.length - '.js'.length);
  }
  return modulePath;
}

function maybeSet(obj, prop, val) {
  if (val != null) obj[prop] = val;
}

tern.defineQueryType("node_exports", {
  takesFile: true,
  run: function(server, query, file) {
    function describe(aval) {
      var target = {}, type = aval.getType(false);
      target.type = infer.toString(aval, 3);
      var doc = aval.doc || (type && type.doc), url = aval.url || (type && type.url);
      if (doc) target.doc = doc;
      if (url) target.url = url;
      var span = tern.getSpan(aval) || (type && tern.getSpan(type));
      if (span) tern.storeSpan(server, query, span, target);
      return target;
    }

    var known = server._node.modules[resolveProjectPath(server, file.name)];
    if (!known) return {};
    var type = known.getObjType(false);
    var resp = describe(known);
    if (type instanceof infer.Obj) {
      var props = resp.props = {};
      for (var prop in type.props)
        props[prop] = describe(type.props[prop]);
    }
    return resp;
  }
});

var defs = require('./nodeapi.json')
