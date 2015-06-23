# Carbide

Carbide is a new experimental notebook programming environment, inspired by Jupyter, Swift Playground, Light Table and Mathematica. 

TODO:

* Slider

This should be analogous to Mathematica's `Manipulate[]` IJulia's `@manipulate` (in Interact.jl)

In this case, you'll call a function like `Interact()` and it'll return some numeric value which can be adjusted interactively. The cell will automatically execute again whenever this input is manipulated and change the corresponding output value. 

Interact's first argument would be the default value, followed by a min and max. For example, `var x = Interact(42, 0, 100)`

Perhaps it should accept string arguments as well, and give the user a choice with a nice pill button `var option = Interact("Freedom", "Slavery")`. 




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
* Sublime/Atom-style Command Palette
* Inject profiling code to automatically (a la Adobe's Theseus) to automatically display progress bar for code execution