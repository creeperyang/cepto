'use strict';

var util = require('./util.js');
var cepto = require('./core-core.js');
var reId = /^#([\w-]+)$/;

var init = function(selector, context) {

    var match;
    var dom;

    // HANDLE: $(""), $(null), $(undefined), $(false)
    if (!selector) {
        return this;

    // Handle strings
    } else if (typeof selector === 'string') {
        selector = selector.trim();

        // html HTML string
        if (selector[0] === '<') {
            dom = cepto.buildFragment(selector);
            selector = '';

        // id selector
        } else if ((match = reId.exec(selector))) {

            this[0] = document.getElementById(match[1]);
            this.length = 1;
            this.context = document;
            this.selector = selector;
            return this;

        // other selector
        } else if(context !== undefined) {
            return cepto(context).find(selector);
        } else {
            dom = cepto.qsa(selector, document);
        }

    // HANDLE: $($(...))
    } else if (selector instanceof init) {
        return selector;

    // HANDLE: $(function)
    } else if (typeof selector === 'function') {
        return cepto(document).ready(selector);

    // Other conditions
    } else {
        // HANDLE: $([])
        if (util.isArray(selector)) {
            dom = util.filter.call(selector, function(item) {
                return item != null;
            });
            selector = '';

        // HANDLE: $(DOMElement)
        } else if (selector instanceof Node || selector instanceof HTMLElement) {
            this.context = this[0] = selector;
            this.length = 1;
            return this;

        // HANDLE: $(DOMElement)
        } else if (selector instanceof Node || selector instanceof HTMLElement) {
            this.context = this[0] = selector;
            this.length = 1;
            return this;

        // Use find to handle other conditions
        } else if (context !== undefined) {
            return cepto(context).find(selector);
        } else {
            dom = cepto.qsa(selector, document);
        }
    }

    this.selector = selector || '';

    return util.toArray(dom, this);
};

init.prototype = cepto.prototype;
cepto.prototype.init = init;

module.exports = init;