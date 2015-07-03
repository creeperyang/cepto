'use strict';

var util = require('./util.js');
var cepto = require('./core-core.js');
var domCreator = require('./dom-fragment.js');
var slice = util.slice;

var version = '0.1.0';
var readyRE = /complete|loaded|interactive/;

cepto.fn = cepto.prototype = {
    constructor: cepto,

    version: version,

    length: 0,

    toArray: function() {
        return slice.call(this);
    },
    get: function(i) {
        return i === undefined ? slice.call(this) : this[i >= 0 ? i : i + this.length];
    },
    eq: function(i) {
        return i === -1 ? this.slice(i) : this.slice(i, +i + 1);
    },
    first: function() {
        return this.eq(0);
    },
    last: function() {
        return this.eq(-1);
    },
    each: function(callback) {
        return util.each(this, callback);
    },
    index: function(element){
        return element ? this.indexOf(cepto(element)[0]) : this.parent().children().indexOf(this[0]);
    },
    slice: function() {
        return cepto(slice.apply(this, arguments));
    },
    map: function(fn) {
        return cepto(util.flatten(util.map(this, fn)));
    },
    // `pluck` is borrowed from Prototype.js
    pluck: function(property) {
        return util.map(this, function(i, el) {
            return el[property];
        });
    },

    ready: function(callback) {
        // need to check if document.body exists for IE as that browser reports
        // document ready when it hasn't yet created the body element
        if (readyRE.test(document.readyState) && document.body) {
            callback(cepto);
        } else {
            document.addEventListener('DOMContentLoaded', function() {
                callback(cepto);
            }, false);
        }
        return this;
    },

    // Behaves like an Array's method, not like a jQuery method.
    push: util.push,
    sort: util.sort,
    splice: util.splice,
    indexOf: util.indexOf,
    forEach: util.forEach
};

cepto.extend = cepto.fn.extend = util.extend;

cepto.extend({
    expando: 'cepto' + (version + Math.random()).replace(/\D/g, ''),
    buildFragment: domCreator.buildFragment,
    toArray: util.toArray,
    merge: util.merge,
    camelCase: util.camelCase,
    type: util.type,
    inArray: util.inArray,
    isArray: util.isArray,
    isArraylike: util.isArraylike,
    isWindow: util.isWindow,
    isFunction: util.isFunction,
    isEmptyObject: util.isEmptyObject,
    isPlainObject: util.isPlainObject,
    each: util.each,
    map: function(elements, callback) {
        return util.flatten(util.map(elements, callback));
    },
    noop: function() {}
});

module.exports = cepto;
