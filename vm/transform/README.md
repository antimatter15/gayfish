Experiments
===========

## Logging Syntax

> The most effective debugging tool is still careful thought, coupled with judiciously placed print statements. 
> — Brian Kernighan "Unix for Beginners" (1979)

Having some syntactic means of logging variables is especially useful in an interactive programming environment because it allows you to inspect the state of your application with minimal friction. 

There were two approaches that were implemented, which might be thought of as "opt-in" and "opt-out". The opt-out approach is the same as Matlab's approach— basically, statements which are not terminated by semicolons are automatically logged. This means the semicolons essentially act by suppressing the output. This is a particularly neat approach because Javascript (by automatic semicolon insertion) is a semicolon-optional language— which means that the code remains entirely compatible with ordinary javascript. 

The opt-in appr


## Interact

A lot of interactive programming is just playing around with values, so it makes sense to reduce friction as much as possible. Lisp (among others) have demonstrated the power of treating code and data as plain text (chiefly, portability and consistency). 

This limits input to whatever can be expressed with a keyboard. For numeric data, it's convenient to be able to increment and decrement numbers with arrow keys— but this is difficult to implement in a text editor because it may conflict with cursor navigation. For inexact and bounded numeric data, it's much more intuitive to be able to drag values around, which has been explored by Bret Victor with [Tangle](http://worrydream.com/Tangle/). 

Even for text (strings), the absolute freedom of plain text might be inconvienient— it takes multiple keystrokes to select text in a string, and you have to be cognizant of escaping rules. 

Notebook based programming environments are often used educationally to illustrate some piece of code. The ability to interact with code is great for education. 



For example, imagine you're faced with some code like this:

    CallAFunction("The First Argument",
                  "Some Second Argument");

Imagine trying to modify the first string argument. If it didn't have any spaces, you could double-click to select the text between the quotes and start typing. Worst case with plain text, you might move your cursor to the beginning of the quote and hold shift and the right arrow key 18 types to select the range. Maybe you know about the `Home` and `End` keys and have shortened the key dance to an elegant "Shift-Cmd-Right Shift-Left Shift-Left". You might be able to simplify this even more with [Syntax Directed Editors](https://en.wikipedia.org/wiki/Structure_editor) similar to Emacs paredit, and have specific keyboard macros for selecting the current text string. 




let x = 32;
/*Interact(0, x)*/ 32


Principles
==========




TODO
====


## Code Coverage

Inspired by Theseus (Brackets & CSAIL UID)



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