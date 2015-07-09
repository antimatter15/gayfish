## Organization

How is Gayfish organized? 

* `index.jsx` This is the main entry point. It doesn't really have any legitimate logic.
	* `app.jsx` The real main part of the app, it's largely staging for components which haven't grown mature enough to be stuck in their own files
		* `model/document.js` This represents the idea of a document
		* `model/cell.js` This represents the idea of a cell (though there's some nasty codemirror code here too which beckons to be given rest)
		* `model/machine.js` This mediates communication with the execution environment
	* `interact.jsx` This handles 


	