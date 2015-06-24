'use strict';

var cepto = require('./core-core.js');
// array methods
var emptyArray = [];
var push = emptyArray.push;

var hasOwn = Object.prototype.hasOwnProperty;
var rmsPrefix = /^-ms-/; // Matches dashed string for camelizing
var rdashAlpha = /-([\da-z])/gi;
var class2type = {};
var toString = Object.prototype.toString;

// Used by cepto.camelCase as callback to replace()
var fcamelCase = function(all, letter) {
    return letter.toUpperCase();
};

// Convert dashed to camelCase; used by the css and data modules
// Support: IE9-11+
// Microsoft forgot to hump their vendor prefix (#9572)
var camelCase = function(string) {
    return string.replace(rmsPrefix, 'ms-').replace(rdashAlpha, fcamelCase);
};

var dasherize = function(str) {
    return str.replace(/::/g, '/')
           .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
           .replace(/([a-z\d])([A-Z])/g, '$1_$2')
           .replace(/_/g, '-')
           .toLowerCase();
};

// Populate the class2type map
'Boolean Number String Function Array Date RegExp Object Error'.split(' ').forEach(function(name) {
    class2type['[object ' + name + ']'] = name.toLowerCase();
});

var merge = function(first, second) {
    var len = +second.length;
    var j = 0;
    var i = first.length;

    for (; j < len; j++) {
        first[i++] = second[j];
    }

    first.length = i;

    return first;
};

var type = function(obj) {
    var typeName;
    // null || undefined
    if (obj == null) {
        return obj + '';
    }
    typeName = typeof obj;
    // Support: Android<4.0, iOS<6 (functionish RegExp)
    return typeName === 'object' || typeName === 'function' ?
        class2type[toString.call(obj)] || 'object' :
        typeName;
};

var isWindow = function(obj) {
    return obj ? obj === obj.window : false;
};

var isDocument = function(obj) {
    return !!obj && obj.nodeType === obj.DOCUMENT_NODE;
};

var isElement = function(obj) {
    return !!obj && (obj.nodeType === obj.ELEMENT_NODE || obj.nodeType === obj.DOCUMENT_NODE);
};

var isFunction = function(obj) {
    return type(obj) === 'function';
};

// test if undefined or null
var isEmpty = function(obj) {
    return obj === undefined || obj === null;
};

var isEmptyObject = function(obj) {
    var name;
    for (name in obj) {
        return false;
    }
    return true;
};

var isPlainObject = function(obj) {
    // Not plain objects:
    // - Any object or value whose internal [[Class]] property is not '[object Object]'
    // - DOM nodes
    // - window
    if (type(obj) !== 'object' || obj.nodeType || isWindow(obj)) {
        return false;
    }

    if (obj.constructor &&
        !hasOwn.call(obj.constructor.prototype, 'isPrototypeOf')) {
        return false;
    }

    // If the function hasn't returned already, we're confident that
    // |obj| is a plain object, created by {} or constructed with new Object
    return true;
};

var isArray = Array.isArray;

var isArraylike = function(obj) {
    var length = obj.length;
    var typeName = type(obj);

    if (typeName === 'function' || isWindow(obj)) {
        return false;
    }

    // https://github.com/jquery/jquery/commit/3c7f2af81d877b24a5e5b6488e78621fcf96b265
    // to support form elements
    if (obj.nodeType === 1 && length) {
        return true;
    }

    return typeName === 'array' || length === 0 ||
        typeof length === 'number' && length > 0 && (length - 1) in obj;
};

// ret is for internal usage only
var toArray = function(arr, ret) {
    ret = ret || [];

    if (arr !== null || arr !== undefined) {
        if (isArraylike(Object(arr))) {
            merge(ret, typeof arr === 'string' ? [arr] : arr);
        } else {
            push.call(ret, arr);
        }
    }

    return ret;
};

// flatten array
// if array's element is $(), retrive its dom
var flatten = function(array) {
    var length = array.length;
    if (!length) {
        return array;
    }
    var i = 0;
    var args = [];
    var value;
    for (; i < length; i++) {
        value = array[i];
        args.push(value instanceof cepto ? value.get() : value);
    }
    return emptyArray.concat.apply([], args);
};

var unique = function(array) {
    return emptyArray.filter.call(array, function(item, i) {
        return array.indexOf(item) === i;
    });
};

// args is for internal usage only
var each = function(obj, callback, args) {
    var value;
    var i = 0;
    var length = obj.length;
    var isArray = isArraylike(obj);

    if (args) {
        if (isArray) {
            for (; i < length; i++) {
                value = callback.apply(obj[i], args);

                if (value === false) {
                    break;
                }
            }
        } else {
            for (i in obj) {
                value = callback.apply(obj[i], args);

                if (value === false) {
                    break;
                }
            }
        }

    // A special, fast, case for the most common use of each
    } else {
        if (isArray) {
            for (; i < length; i++) {
                value = callback.call(obj[i], i, obj[i]);

                if (value === false) {
                    break;
                }
            }
        } else {
            for (i in obj) {
                value = callback.call(obj[i], i, obj[i]);

                if (value === false) {
                    break;
                }
            }
        }
    }

    return obj;
};

var map = function(array, callback) {
    var values = [];
    var i = 0;
    var length;
    var value;
    if (isArraylike(array)) {
        length = array.length;
        for (; i < length; i++) {
            value = callback.call(array[i], i, array[i]);
            if (!isEmpty(value)) {
                values.push(value);
            }
        }
    } else {
        for (i in array) {
            value = callback.call(array[i], i, array[i]);
            if (!isEmpty(value)) {
                values.push(value);
            }
        }
    }
    return values;
};

var extend = function() {
    var options, name, src, copy, copyIsArray, clone;
    var target = arguments[0] || {};
    var i = 1;
    var length = arguments.length;
    var deep = false;

    // Handle a deep copy situation
    if (typeof target === 'boolean') {
        deep = target;

        // Skip the boolean and the target
        target = arguments[i] || {};
        i++;
    }


    // Handle case when target is a string or something (possible in deep copy)
    if (typeof target !== 'object' && !isFunction(target)) {
        target = {};
    }

    // Extend cepto itself if only one argument is passed
    if (i === length) {
        target = this;
        i--;
    }

    for (; i < length; i++) {
        // Only deal with non-null/undefined values
        if ((options = arguments[i]) != null) {
            // Extend the base object
            for (name in options) {
                src = target[name];
                copy = options[name];

                // Prevent never-ending loop
                if (target === copy) {
                    continue;
                }

                // Recurse if we're merging plain objects or arrays
                if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
                    if (copyIsArray) {
                        copyIsArray = false;
                        clone = src && isArray(src) ? src : [];

                    } else {
                        clone = src && isPlainObject(src) ? src : {};
                    }

                    // Never move original objects, clone them
                    target[name] = extend(deep, clone, copy);

                    // Don't bring in undefined values
                } else if (copy !== undefined) {
                    target[name] = copy;
                }
            }
        }
    }

    // Return the modified object
    return target;
};

// if arg is function, return the invoked result, 
// else return arg
// used by html, text ...
var funcArg = function(context, arg, payload, i) {
    return isFunction(arg) ? arg.call(context, payload, i) : arg;
};

// walk dom tree
var walkDom = function(node, callback) {
    if(!isElement(node)) {
        return;
    }
    callback && callback(node);
    node = node.firstElementChild || node.firstChild;
    while(node) {
        walkDom(node, callback);
        node = node.nextElementSibling || node.nextSibling;
    }
};

module.exports = {
    push: push,
    slice: emptyArray.slice,
    sort: emptyArray.sort,
    splice: emptyArray.splice,
    concat: emptyArray.concat,
    filter: emptyArray.filter,
    indexOf: emptyArray.indexOf,
    forEach: emptyArray.forEach,
    some: emptyArray.some,
    toArray: toArray,
    merge: merge,
    camelCase: camelCase,
    dasherize: dasherize,
    type: type,
    isArray: isArray,
    isArraylike: isArraylike,
    isWindow: isWindow,
    isDocument: isDocument,
    isFunction: isFunction,
    isEmpty: isEmpty,
    isEmptyObject: isEmptyObject,
    isPlainObject: isPlainObject,
    each: each,
    map: map,
    flatten: flatten,
    extend: extend,
    unique: unique,
    funcArg: funcArg,
    walkDom: walkDom
};
