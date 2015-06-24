'use strict';

var cepto = require('./core-core.js');
var util = require('./util.js');

var rnotwhite = /\S+/g;

// Copied from jQuery 2.x
function Data() {

    this.expando = cepto.expando + Data.uid++;

    Object.defineProperty(this.cache = {}, 0, {
        get: function() {
            return {};
        }
    });

}

Data.uid = 1;
Data.accepts = function(owner) {
    // Accepts only:
    //  - Node
    //    - Node.ELEMENT_NODE
    //    - Node.DOCUMENT_NODE
    //  - Object
    //    - Any
    /* jshint -W018 */
    return owner.nodeType === 1 || owner.nodeType === 9 || (!(+owner.nodeType));
    /* jshint +W018 */
};

Data.prototype = {
    key: function(owner) {
        if (!Data.accepts(owner)) {
            return 0;
        }

        var descriptor = {};
        // Check if the owner object already has a cache key
        var exist = owner[this.expando];

        // If not, create one
        if (!exist) {
            exist = Data.uid++;
            descriptor[this.expando] = {
                value: exist
            };
            // add unconfigurable, unenumerable, unwritable property, name is this.expando, value is exist
            Object.defineProperties(owner, descriptor);
        }

        // Ensure the cache object
        if (!this.cache[exist]) {
            this.cache[exist] = {};
        }

        return exist;
    },
    set: function(owner, data, value) {
        var exist = this.key(owner);
        var cache = this.cache[exist];
        var prop;

        // Handle: [ owner, key, value ] args
        if (typeof data === 'string') {
            cache[data] = value;

            // Handle: [ owner, { properties } ] args
        } else {
            if (util.isEmptyObject(cache)) {
                this.cache[exist] = data;
            } else {
                for (prop in data) {
                    cache[prop] = data[prop];
                }
            }
        }
    },
    get: function(owner, key) {
        var cache = this.cache[this.key(owner)];
        return key === undefined ?
            cache : cache[key];
    },
    access: function(owner, key, value) {
        var stored;
        // In cases where either:
        //
        //   1. No key was specified
        //   2. A string key was specified, but no value provided
        //
        // Take the "read" path and allow the get method to determine
        // which value to return, respectively either:
        //
        //   1. The entire cache object
        //   2. The data stored at the key
        //
        if (key === undefined ||
            ((key && typeof key === 'string') && value === undefined)) {
            stored = this.get(owner, key);
            return stored !== undefined ?
                stored : this.get(owner, util.camelCase(key));
        }

        // set value
        this.set(owner, key, value);

        return value !== undefined ? value : key;
    },
    remove: function(owner, key) {
        var i, name, camel,
            exist = this.key(owner),
            cache = this.cache[exist];

        if (key === undefined) {
            this.cache[exist] = {};

        } else {
            // Support array or space separated string of keys
            if (util.isArray(key)) {
                // If "name" is an array of keys...
                // When data is initially created, via ("key", "val") signature,
                // keys will be converted to camelCase.
                // Since there is no way to tell _how_ a key was added, remove
                // both plain key and camelCase key. #12786
                // This will only penalize the array argument path.
                name = key.concat(key.map(util.camelCase));
            } else {
                camel = util.camelCase(key);
                // Try the string as a key before any manipulation
                if (key in cache) {
                    name = [key, camel];
                } else {
                    // If a key with the spaces exists, use it.
                    // Otherwise, create an array by matching non-whitespace
                    name = camel;
                    name = name in cache ? [name] : (name.match(rnotwhite) || []);
                }
            }

            i = name.length;
            while (i--) {
                delete cache[name[i]];
            }
        }
    },
    hasData: function(owner) {
        return !util.isEmptyObject(
            this.cache[owner[this.expando]] || {}
        );
    },
    discard: function(owner) {
        if (owner[this.expando]) {
            delete this.cache[owner[this.expando]];
        }
    }
};

module.exports = Data;
