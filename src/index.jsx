'use strict';

require("./style.less")
require("babel-core/polyfill")

var React = require('react'),
    App = require('./app');

React.render(<App />, document.body);

// console.log(CodeMirror)