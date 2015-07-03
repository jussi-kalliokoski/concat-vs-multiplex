# concat-vs-multiplex

A benchmark of HTTP2 push multiplexing vs concatenation/bundling. Just loads React to show a simple element, not representative of real world applications that often have much more complicated dependency graphs.

Results on my machine (one time loads, if someone can make proper samplings with a median, would be awesome):

* Single bundle (concat with Webpack): 156ms.
* Multiplex (dynamically injected script tags /w module loader and manager): 437ms.
* Multiplex (script tags in HTML, minimal module manager): 544ms.

To run it yourself

```
npm install
node test.js
```

and open the links printed in the console in a browser.
