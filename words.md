Problems

* Alignment for the left and right panes isn't totally clear, and it's often pretty confusing because you're not mentally totally sure which input corresponds to which output. 
	* I've played around with highlighting the cell pair for the most recent output, but it's confusing in its own right (you might be editing some other cell but your attention would be constantly pulled toward the previous one)
	* Maybe revive some of the weird shapes or color indicators, I can't think of something that makes sense though

* Sticking the focused output card in the right spot. This really shouldn't be too hard but I haven't done it yet.

* It's really weird when the output card is blank. Hide it or fill it with something.



What's cool?
* 2Panez
	* A two-pane layout doesn't waste screen space and helps alleviate excessive scrolling
	* It cleanly separates input and output

* Command Palette
	* Quickly access any action without needing to memorize lots of keybindings or cluttering the interface with persistent toolbars and menus

* Automatic Instrumentation
	* Fire off any batch task using an ordinary for loop and it'll visually report on progress

* Semicolon Logging Semantics
	* Just like in Matlab, statements which aren't terminated in semicolons are logged
	* Logs are placed in context right where they're created

* The Future Now: ES6 and ES7 with Babel
	* Code is automatically transpiled to support the latest proposed features
	* Interactive `await`, call it from a function and we'll automatically wrap the entire cell.

* NPM In the Browser
	* Try out javascript libraries simply by calling `require`, Carbide comes with a tiny clone of NPM that will recursively resolve dependencies and unpack tarballs from the NPM API. 

* Code Completion with Tern.JS
	* Autocomplete methods and function names with the tern static type inference engine
	* Also supports stuff within NPM modules.

* Graphical Manipulation
	* Make any variable adjustable with a graphical slider by wrapping calling Manipulate.Slider()

* Interactive Graphics with D3
	* Woooo



TODO:

* Slider

This should be analogous to Mathematica's `Manipulate[]` IJulia's `@manipulate` (in Interact.jl)

In this case, you'll call a function like `Interact()` and it'll return some numeric value which can be adjusted interactively. The cell will automatically execute again whenever this input is manipulated and change the corresponding output value. 

Interact's first argument would be the default value, followed by a min and max. For example, `var x = Interact(42, 0, 100)`

Perhaps it should accept string arguments as well, and give the user a choice with a nice pill button `var option = Interact("Freedom", "Slavery")`. Maybe it should be more extensible (an interact namespace, e.g. Interact.Slider(5))




* The actual capacity to run commands
	* NodeJS
	* In a WebWorker (run browserify inside browserify?)
	* Through Jupyter

* Interactive Output
	* Standard Text Output
	* console.*
		* Object inspection
	* Images (multiple images per cell)
	* SVG
	* HTML
	* D3 Interactive Graphs
		* Investigate 
	* ReactJS
		* Maybe we could do something to make this a bit more self-hosting (i.e. developing carbide within itself)

* Different Cell Types
	* Markdown
	* LaTeX/KaTeX integration

* Adding Files
	* it should be as easy as dragging and dropping a file from the desktop to import it as a buffer (kind of similar to Matlab)

* Sublime/Atom-style Command Palette
	* Currently it's just a sort of filler

Completed:

* Collapse cells
	* There's still a lot of room for improvement, frankly the current interface for collapsing cells leaves a lot to be desired
* Experiment with cell/output alignment
	* Drawing two-way merge style connector curves
	* Padding on either side for perpetual alignment
	* The current idea for how the cell inputs and outputs will be aligned is a relatively simple one (I pretty quickly moved away from the two-way merge style because it seemed like a lot of unnecessary complexity for a small payout, but I think there's definitely value in revisiting that concept later). Basically the output is sized according to the height of its input, so they're always perfectly aligned. The most recently run cell has its output in a floating overlay which allows contents to spill beyond the typical confines of the cell boundary. But when that cell loses focus, all that's left is a preview which is sized to be however large the input box was.
* CodeMirror integration
	* Experiment with annotating CodeMirror inline with named function arguments and other documentation
	* There's some autocomplete style predictive text stuff and a somewhat working TernJS integration
		* It's only somewhat working because it seems that NodeJS function declarations seem to be scoped to a single cell
* Drag to reorder input cells
* Resizable two pane layout
	* Double click on median to restore default size (40%-60% split)
* Insert cells before and after other cells
	* Click on a bar which is in between the cells or use the keybindings (Cmd-J/Cmd-K)


* Inject profiling code to automatically (a la Adobe's Theseus) to automatically display progress bar for code execution



Inspiration (in no particular order):

* IPython Notebooks
	* I love IPython Notebooks, and it's almost certainly the single largest influence on Carbide
* Stephen Wolfram / Mathematica
* Bret Victor (http://worrydream.com/)
* Elm Debugger (http://debug.elm-lang.org/)
* Steve Wittens 
	* TermKit (https://github.com/unconed/TermKit)
	* MathBox (https://github.com/unconed/MathBox.js/)
* Mike Bostocks
	* D3.js (http://d3js.org/)
	* bl.ocks.org
* Tom Lieber: Adobe Research / MIT CSAIL UID / Theseus (https://github.com/adobe-research/theseus)
* Scott McDirmid / Microsoft Research (http://research.microsoft.com/en-us/people/smcdirm/liveprogramming.aspx)
* Matlab
	* The obvious thing plagiarized from Matlab is the use of semicolons to suppress log output. 
* Hydrogen for Atom by Will Whitney (https://github.com/willwhitney/hydrogen)
* XCode/Swift Playground (https://developer.apple.com/swift/)
* Webkit Web Inspector
	* I'm a fan of Webkit/XCode's use of autocomplete (not sure if that's the correct term, I'm referring to the slightly grayed out text injected right of the cursor) over the traditional drop-down menus which tend to occlude the code immediately above or below it (which I'm often trying to look at for reference). 
* Blink Web Inspector
* Chris Granger / Light Table & eve
* JSBin/JSFiddle/CodePen/RequireBin
* Sublime Text / Github Atom
* Facebook Nuclide


On the shoulders of giants

* The object inspector borrows CSS heavily from the Blink Web Inspector (https://chromium.googlesource.com/chromium/blink/+/master/Source/devtools/)
* ES6 transformation is powered by Sebastian McKenzie's Babel (http://babeljs.io)
	* ES6 parsing is done by Marijn Haverbeke's Acorn parser
	* Automatic loop instrumentation and Matlab-style semicolon logging semantics were made possible because Acorn and Babel are awesome and extensible
* Marijn Haverbeke's Codemirror for syntax highlighting and code editing (https://github.com/codemirror/CodeMirror)
	* Also Marijn Haverbeke's Tern.JS for static analysis and code completion
* Facebook's React
* Webpack, and in particular, react-hot-reload
* Less CSS
* Jameson Little's gzip-js (https://github.com/beatgammit/gzip-js)
* Jeff Schiller's bitjs (http://codedread.com/)
* NPM and node-semver (https://github.com/npm/node-semver) by Isaac Schlueter