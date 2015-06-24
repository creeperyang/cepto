'use strict';

var util = require('./util.js');
var cepto = require('./core.js');
var domCreator = require('./dom-fragment.js');

var adjacencyOperators = ['after', 'prepend', 'before', 'append'];

// traverse node and its children to execute fun
var traverseNode = function(node, fun) {
    fun(node);
    for (var i = 0, len = node.childNodes.length; i < len; i++) {
        traverseNode(node.childNodes[i], fun);
    }
};

adjacencyOperators.forEach(function(operator, operatorIndex) {
    var inside = operatorIndex % 2; //=> prepend, append

    cepto.fn[operator] = function() {
        // arguments can be 
        // 1. nodes, 2. arrays of nodes, 3. cepto objects, 4. HTML strings
        var argType;
        var parent;
        var copyByClone = this.length > 1;
        var nodes = cepto.map(arguments, function(i, arg) {
            argType = util.type(arg);
            return argType === 'object' || argType === 'array' || arg == null ?
                arg : domCreator.buildFragment(arg);
        });

        if (nodes.length < 1) {
            return this;
        }

        return this.each(function(_, target) {
            // if after/before, let parent = target.parentNode
            parent = inside ? target : target.parentNode;

            // convert all methods to a "before" operation
            // after: insertBefore target.nextSibling
            // prepend: insertBefore target.firstChild
            // before: insertBefore target
            // append: insertBefore null
            target = operatorIndex === 0 ? target.nextSibling :
                operatorIndex === 1 ? target.firstChild :
                operatorIndex === 2 ? target :
                null;

            var parentInDocument = cepto.contains(document.documentElement, parent);

            nodes.forEach(function(node) {
                if (copyByClone) {
                    node = node.cloneNode(true);
                } else if (!parent) {
                    return cepto(node).remove();
                }
                parent.insertBefore(node, target);
                if (parentInDocument) {
                    // traverse node to find script and execute it
                    traverseNode(node, function(el) {
                        if (el.nodeName && el.nodeName.toUpperCase() === 'SCRIPT' &&
                            (!el.type || el.type === 'text/javascript') && !el.src) {
                            /*jshint -W061 */
                            window.eval.call(window, el.innerHTML);
                            /*jshint +W061 */
                        }
                    });
                }
            });
        });
    };

    // after    => insertAfter
    // prepend  => prependTo
    // before   => insertBefore
    // append   => appendTo
    cepto.fn[inside ? operator + 'To' : 'insert' + (operatorIndex ? 'Before' : 'After')] = function(html) {
        cepto(html)[operator](this);
        return this;
    };
});
