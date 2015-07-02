var React = require("react");
var javascriptsLoadedTime = performance.now();

var element = React.createElement("div", null, "JS loaded in " + javascriptsLoadedTime + "ms");
var container = document.getElementById("c");

React.render(element, container);
