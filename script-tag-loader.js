void function () {
    var modules = {};
    var downloading = [];
    var cache = {};

    function initializeModule (id) {
        if ( id in cache ) { return; }

        var module = { exports: {} };

        function require (request) {
            var m = cache[modules[id][0][request]];

            if ( !m ) {
                m = initializeModule(modules[id][0][request]);
            }

            if ( !m ) { throw new Error("Module not found: `" + request + "` from `" + id + "`"); }

            return m.exports;
        }

        modules[id][1].call(window, require, module, module.exports, { env: {} });
        cache[id] = module;

        return module;
    }

    function initializeLoadedModules () {
        var loadable = Object.filter(modules).some(function (id) {
            if ( id in cache ) { return false; }

            var dependenciesInitialized = !Object.keys(modules[id][0]).some(function (request) {
                return !(modules[id][0][request] in cache);
            });

            return dependenciesInitialized;
        });

        loadable.forEach(initializeModule);

        if ( loadable.length ) { initializeLoadedModules(); }
    }

    function initialize () {
        var ready = !Object.keys(modules).some(function (id) {
            var dependenciesDownloaded = !Object.keys(modules[id][0]).some(function (request) {
                return !(modules[id][0][request] in modules);
            });

            return !dependenciesDownloaded;
        });

        if ( ready ) { initializeModule(0); }
    }

    function registerModule (id, deps, wrapper) {
        modules[id] = [deps, wrapper];


        initialize();
    }

    window.r = registerModule;
}();
