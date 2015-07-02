"use strict";

var webpack = require("webpack");
var http2 = require("http2");
var fs = require("fs");
var path = require("path");
var mkdirp = require("mkdirp");

var ASSETS_PATH = "/assets";
var OPTIONS = {
    key: fs.readFileSync(path.join(__dirname, "/localhost.key")),
    cert: fs.readFileSync(path.join(__dirname, "/localhost.crt")),
};

function middleware (handlers) {
    return function (req, res) {
        console.log(req.method, req.url);
        var handler = 0;

        function next () {
            if ( handler < handlers.length ) {
                handlers[handler++].call(null, req, res, next);
            } else {
                throw new Error("unhandled request");
            }
        }

        next();
    };
}

webpack({
    entry: {
        critical: __dirname + "/src/entry.js",
    },

    output: {
        publicPath: "/assets/bundles/",
        path: __dirname + "/public/bundles/",
        filename: "[name]-[hash].js",
    },

    bail: true,
}, function (error, stats) {
    if ( error ) { throw error; }
    var compilation = stats.compilation;

    var modules = compilation.modules.map(function (m) {
        var deps = JSON.stringify(m.dependencies.filter(function (d) {
            return d.module;
        }).map(function (d) {
            return ASSETS_PATH + "/" + d.module.resource.substr(__dirname.length + 1);
        }));

        var depIds = JSON.stringify(m.dependencies.filter(function (d) {
            return d.module;
        }).reduce(function (deps, d) {
            deps[d.userRequest] = d.module.id;
            return deps;
        }, {}));

        var filename = m.resource.substr(__dirname.length + 1);

        var source = deps + ".map(l);r(" + m.id + "," + depIds + ",function(require,module,exports,process){" + m._source._value + "});";
        mkdirp.sync("public/" + path.dirname(filename));
        fs.writeFileSync("public/" + filename, source, "utf8");

        return ASSETS_PATH + "/" + filename;
    });

    var entryModule = ASSETS_PATH + "/" + compilation.entries[0].resource.substr(__dirname.length + 1);
    var bootstrapScript = ASSETS_PATH + "/bundles/" + Object.keys(compilation.assets)[0];
    var loaderScript = fs.readFileSync("loader.js", "utf8") + "l(" + JSON.stringify(entryModule) + ")";

    var handler = middleware([
        publicFiles,
        firstTimeLoadMultiplex,
        firstTimeLoadConcat,
        notFound,
    ]);

    function push (res, url) {
        if ( !res.push ) { return; }
        handler({ method: "PUSH", url: url  }, res.push(url));
    }

    function publicFiles (req, res, next) {
        if ( req.url.substr(0, ASSETS_PATH.length) !== ASSETS_PATH ) { return next(); }
        res.writeHead(200);
        fs.createReadStream("public" + req.url.substr(ASSETS_PATH.length)).pipe(res);
    }

    function firstTimeLoadConcat (req, res, next) {
        if ( req.url !== "/first-time-load-concat" ) { return next(); }
        push(res, bootstrapScript);
        res.writeHead(200);
        res.end("<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><head><body><div id=\"c\"></div><script async src=\"" + bootstrapScript + "\"></script></body></html>");
    }

    function firstTimeLoadMultiplex (req, res, next) {
        if ( req.url !== "/first-time-load-multiplex" ) { return next(); }
        modules.forEach(function (m) {
            push(res, m);
        });
        res.end("<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><head><body><div id=\"c\"></div><script>" + loaderScript + "</script></body></html>");
    }

    function notFound (req, res, next) {
        res.writeHead(404);
        res.end();
    }

    http2.createServer(OPTIONS, handler).listen(8080);
    console.log("Server started. Visit https://localhost:8080/first-time-load-multiplex and https://localhost:8080/first-time-load-concat to test.");
});
