// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

var CodeMirror = require('codemirror')

var defaultOptions = {
    // hint: CodeMirror.hint.auto,
    completeSingle: true,
    alignWithWord: true,
    closeCharacters: /[\s()\[\]{};:>,]/,
    closeOnUnfocus: true,
    completeOnSingleClick: false,
    container: null,
    customKeys: null,
    extraKeys: null
};

CodeMirror.defineExtension("showPrediction", function(options) {

    // We want a single cursor position.
    if (this.listSelections().length > 1 || this.somethingSelected()) return;
    var cm = this;

    if(options.ts){
        options.hint = function(cm, c){ return hint(options.ts, cm, c); }
        options.hint.async = true;
    }

    let {line, ch} = cm.getCursor();
    var token = cm.getTokenAt({line, ch});
    if(token.type == 'comment' || token.type == 'string') return;

    if (this.state.predictionActive) this.state.predictionActive.close();
    var completion = this.state.predictionActive = new Completion(this, options);

    completion.update(true);
});


var requestAnimationFrame = window.requestAnimationFrame || function(fn) {
    return setTimeout(fn, 1000/60);
};
var cancelAnimationFrame = window.cancelAnimationFrame || clearTimeout;


var Pos = CodeMirror.Pos;
function hint(ts, cm, c) {
    ts.request(cm, {type: "completions", types: true, docs: true, urls: true, includeKeywords: true}, function(error, data) {
        if (error) return showError(ts, cm, error);
        var completions = [], after = "";
        var from = data.start, to = data.end;
        if (cm.getRange(Pos(from.line, from.ch - 2), from) == "[\"" &&
                cm.getRange(to, Pos(to.line, to.ch + 2)) != "\"]")
            after = "\"]";
        for (var i = 0; i < data.completions.length; ++i) {
            var completion = data.completions[i];
            if (data.guess) className += " " + cls + "guess";
            completions.push({text: completion.name + after,
                                                displayText: completion.name,
                                                data: completion});
        }
        var obj = {from: from, to: to, list: completions};
        c(obj);
    });
}

function Completion(cm, options) {
    this.cm = cm;
    this.options = this.buildOptions(options);
    // this.widget = null;
    // this.debounce = 0;
    this.tick = 0;
    this.startPos = this.cm.getCursor();
    this.startLen = this.cm.getLine(this.startPos.line).length;
    
    var self = this;

    cm.addKeyMap(this.keyMap = {
        Tab: this.pick.bind(this),
        End: this.pick.bind(this),
        "Cmd-Right": this.pick.bind(this),
        Right: this.pickOne.bind(this)
    })
    cm.on("cursorActivity", this.activityFunc = function() { self.cursorActivity(); });
}

Completion.prototype = {
    close: function() {
        if (!this.active()) return;
        this.cm.state.predictionActive = null;
        // this.tick = null;
        // this.cm.off("cursorActivity", this.activityFunc);
        this.cm.removeKeyMap(this.keyMap)

        this.cm.getAllMarks()
                .filter(x => x._completionWidget)
                .forEach(x => x.clear());
    },

    active: function() {
        return this.cm.state.predictionActive == this;
    },

    pick: function() {
        // console.log("pick", data, i)
        var data = this.data;
        
        let {from, to, list} = data;

        var com = data.list[0]
        var prefix = com.text;
        for(var completion of list){
            while(!completion.text.startsWith(prefix))
                prefix = prefix.slice(0, -1);
        }

        if(prefix.length == to.ch - from.ch){
            this.cm.replaceRange(com.text, from, to, "complete");
        }else{
            this.cm.replaceRange(prefix, from, to, "complete");
        }

        this.close();
    },
    pickOne: function(){
        var data = this.data;
        let {from, to, list} = data;

        var cm = this.cm;
        var completion = data.list[0]
        let {line, ch} = cm.getCursor();
        this.cm.replaceRange(completion.text.slice(0, ch - from.ch + 1), from, {line, ch})
    },

    cursorActivity: function(){
        var cm = this.cm;
        if (cm.listSelections().length > 1 || cm.somethingSelected()) return this.close();
    },


    finishUpdate: function(data, first) {
        this.data = data;

        var cm = this.cm;
        let {line, ch} = cm.getCursor();

        let {from, to, list} = data;
        if(list.length == 0 || to.ch - from.ch == 0) return this.close();

        var com = list[0]

        var prefix = com.text;
        for(var completion of list){
            while(!completion.text.startsWith(prefix))
                prefix = prefix.slice(0, -1);
        }

        if(com.text.length == to.ch - from.ch) return this.close();

        var prefixWidget = document.createElement("span")
        prefixWidget.appendChild(document.createTextNode(prefix.slice(to.ch - from.ch)))
        prefixWidget.className = "prefix"
        var suffixWidget = document.createElement("span")
        suffixWidget.appendChild(document.createTextNode(com.text.slice(prefix.length)))

        var widget = document.createElement("span");
        widget.appendChild(prefixWidget);
        widget.appendChild(suffixWidget);
        widget.className = "CodeMirror-completion";
        
        if(this.marker){
            this.marker.widgetNode.replaceChild(widget, this.marker.widgetNode.firstChild)
        }else{
            this.marker = cm.setBookmark(to, {
                    widget: widget,
                    insertLeft: true,
                    handleMouseEvents: true
            })
            this.marker._completionWidget = true;
        }
    },

    update: function(first) {
        if (!this.options.hint.async) {
            this.finishUpdate(this.options.hint(this.cm, this.options), first);
        } else {
            var myTick = ++this.tick, self = this;
            this.options.hint(this.cm, function(data) {
                if (self.tick == myTick) self.finishUpdate(data, first);
            }, this.options);
        }
    },

    buildOptions: function(options) {
        var editor = this.cm.options.hintOptions;
        var out = {};
        for (var prop in defaultOptions) out[prop] = defaultOptions[prop];
        if (editor) for (var prop in editor)
            if (editor[prop] !== undefined) out[prop] = editor[prop];
        if (options) for (var prop in options)
            if (options[prop] !== undefined) out[prop] = options[prop];
        return out;
    },
}
