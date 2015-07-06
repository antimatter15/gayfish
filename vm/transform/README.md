Experiments
===========

## Logging Syntax







TODO
===========




## Generator Wrapping

In the future, this thing should wrap everything in a generator function. That gives a relatively clean way to wrap asynchronous functions and also makes it possible to stop execution (at certain conveniently placed intervals) without terminating the worker. In order to do that, you would have to suspend the generator occasionally and allow the event loop to recieve some `terminate()` message, which then stops the execution of the generator. 

	var blah = function*(){
	    for(var i = 0; i < 100; i++){
			i
	        yield;
	        for(var j = 0; j < 10000000; j++){
	        }
	    }
	}

	var it = blah();
	var lastTime = 0;

	function step(){
	    let tp10 = Date.now() + 40
	    do {
		    var {value, done} = it.next() 
	    } while ( !done && Date.now() < tp10 );
	    if(!done) setTimeout(step, 0);
	}
	step()

This change would involve some change in all the code which is scope-dependent. 