'use strict';

require("./style.less");

require("./CodeMirror/lib/codemirror.css");

var React = require('react'),
    App = require('./app');

React.render(<App />, document.body);

// console.log(CodeMirror)