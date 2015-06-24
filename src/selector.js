'use strict';


var util = require('./util.js');
var cepto = require('./core.js');

var reId = /^\#(\S+)$/;
var reClass = /^\.(\S+)$/;
var reTagName = /^([A-Za-z*]+[1-6]?)$/; // include universal(*) selector

var tempParent = document.createElement('div');

var children = function(element) {
    return 'children' in element ?
        util.slice.call(element.children) :
        util.map(element.childNodes, function(i, node) {
            if (node.nodeType === 1) {
                return node;
            }
        });
};

// filter nodes with selector
var filtered = function(nodes, selector) {
    return !selector ? cepto(nodes) : cepto(nodes).filter(selector);
};

var qsa = function(selector, context) {
    var reExecResult;
    var dom;

    context = context || document;

    // id
    if ((reExecResult = reId.exec(selector))) {
        dom = document.getElementById(reExecResult[1]);

    // class name
    } else if ((reExecResult = reClass.exec(selector))) {
        dom = context.getElementsByClassName(reExecResult[1]);

    // special handle 'body'
    } else if (selector.toLowerCase() === 'body') {
        dom = document.body;

    // tag name
    } else if ((reExecResult = reTagName.exec(selector))) {
        dom = context.getElementsByTagName(reExecResult[1]);

    // others, complex selector
    } else {
        dom = context.querySelectorAll(selector);
    }

    // convert NodeList/Node to real array
    return util.toArray(dom);
};

var matches = function(element, selector) {
    if (!selector || !element || element.nodeType !== 1) {
        return false;
    }
    var matchesSelector = element.matches || element.webkitMatchesSelector || element.mozMatchesSelector ||
        element.oMatchesSelector || element.matchesSelector;
    if (matchesSelector) {
        return matchesSelector.call(element, selector);
    }

    // fall back to performing a selector:
    var parent = element.parentNode;
    var temp = !parent;
    var match;
    if (temp) {
        (parent = tempParent).appendChild(element);
    }
    match = ~qsa(selector, parent).indexOf(element);
    if (temp) {
        tempParent.removeChild(element);
    }
    return !!match;
};

var contains = document.documentElement.contains ?
    function(parent, node) {
        return parent !== node && parent.contains(node);
    } : 
    function(parent, node) {
        while (node && (node = node.parentNode)) {
            if (node === parent) {
                return true;
            }
        }
        return false;
    };


// add more selector methods to cepto.fn
cepto.fn.extend({
    filter: function(selector) {
        var nodes;
        if (util.isFunction(selector)) {
            nodes = [];
            this.each(function(i, element) {
                if (selector.call(element, element, i)) {
                    nodes.push(element);
                }
            });
        } else {
            nodes = util.filter.call(this, function(element) {
                return matches(element, selector);
            });
        }
        return cepto(nodes);
    },
    is: function(selector) {
        return this.length && matches(this[0], selector);
    },
    not: function(selector) {
        var nodes = [];
        var excludes;
        if (typeof selector === 'string' || util.isFunction(selector)) {
            excludes = this.filter(selector);
        } else if (util.isArraylike(selector) && util.isFunction(selector.item)) {
            excludes = util.slice.call(selector);
        } else {
            excludes = cepto(selector);
        }
        this.forEach(function(node) {
            if (excludes.indexOf(node) < 0) {
                nodes.push(node);
            }
        });
        return cepto(nodes);
    },
    children: function(selector) {
        return filtered(this.map(function(i, el) {
            return children(el);
        }), selector);
    },
    find: function(selector) {
        var result;
        var self = this;
        if (!selector) {
            result = cepto();

        // selector is node(s) or cepto()
        } else if (typeof selector === 'object') {
            result = cepto(selector).filter(function() {
                var node = this;
                return util.some.call(self, function(parent) {
                    return contains(parent, node);
                });
            });

        // selector is string
        } else if (this.length === 1) {
            result = cepto(qsa(selector, this[0]));
        } else {
            result = this.map(function() {
                return qsa(selector, this);
            });
        }
        return result;
    },
    closest: function(selector, context) {
        var node = this[0],
            collection = false;
        if (typeof selector === 'object') {
            collection = cepto(selector);
        }
        while (node && !(collection ? 
            collection.indexOf(node) >= 0 : 
            matches(node, selector))) {
            node = node !== context && !util.isDocument(node) && node.parentNode;
        }
        return cepto(node);
    },
    parents: function(selector) {
        var ancestors = [];
        var nodes = this;
        while (nodes.length > 0) {
            nodes = util.map(nodes, function(i, node) {
                if ((node = node.parentNode) && !util.isDocument(node) && ancestors.indexOf(node) < 0) {
                    ancestors.push(node);
                    return node;
                }
            });
        }
        return filtered(ancestors, selector);
    },
    parent: function(selector) {
        return filtered(util.unique(this.pluck('parentNode')), selector);
    },
    contents: function() {
        return this.map(function() {
            return this.contentDocument || util.slice.call(this.childNodes);
        });
    },
    siblings: function(selector) {
        return filtered(util.unique(this.map(function(i, el) {
            return util.filter.call(children(el.parentNode), function(child) {
                return child !== el;
            });
        })), selector);
    }
});

cepto.qsa = qsa;
cepto.matches = matches;
cepto.contains = contains;

module.exports = {
    qsa: qsa,
    matches: matches,
    contains: contains
};
