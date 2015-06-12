# gayfish
this name is probably going to change



Okay so what am I actually gonna do and how is this thing going to work? It'll probably make sense to do something without react because I'm not actually very good at grasping this whole react thing on the first attempt, and I think that's actually severely hindering my ability to make useful progress.

At the most basic level, it's a list of executable cells— each cell is visually represented on the edit panel as a CodeMirror instance. From the codemirror instance, we have to be able to look at the adjacent cell, and manipulate the list model.

What's the nice react way to handle changes in focus and stuff? Or how to order a list?


    
    "babel-core": "^4.5.5",
    "babel-loader": "^4.0.0",
    "codemirror": "^5.0.0",
    "css-loader": "^0.9.1",
    "json-loader": "^0.5.1",
    "jsx-loader": "^0.12.2",
    "less": "^2.4.0",
    "less-loader": "^2.0.0",
    "react": "^0.12.2",
    "react-hot-loader": "^1.1.5",
    "style-loader": "^0.8.3",
    "tern": "^0.8.0",
    "webpack": "^1.6.0",
    "webpack-dev-server": "^1.7.0"

class Document { // a document is a collection of cells
  constructor() {
    this.cells = []
  }
  append(cell) {
    this.cells.push(cell)
  }
  item(index) {
    return this.cells[index]
  }
  get length() {
    return this.length
  }
}

class Cell {
  insertBefore(cell) {
    
  }
  insertAfter(cell) {
    
  }
  get prev(){
    
  }
  get next(){
    
  }
}