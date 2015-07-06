(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var $ = require('./core-core.js');

//     Zepto.js
//     (c) 2010-2015 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

var jsonpID = 0,
    docElement = window.document,
    key,
    name,
    rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    scriptTypeRE = /^(?:text|application)\/javascript/i,
    xmlTypeRE = /^(?:text|application)\/xml/i,
    jsonType = 'application/json',
    htmlType = 'text/html',
    blankRE = /^\s*$/,
    originAnchor = docElement.createElement('a'),
    empty = $.noop; // Empty function, used as default callback

originAnchor.href = window.location.href;

// trigger a custom event and return false if it was cancelled
function triggerAndReturn(context, eventName, data) {
    var event = $.Event(eventName);
    $(context).trigger(event, data);
    return !event.isDefaultPrevented();
}

// trigger an Ajax "global" event
function triggerGlobal(settings, context, eventName, data) {
    if (settings.global) {
        return triggerAndReturn(context || docElement, eventName, data);
    }
}

// Number of active Ajax requests
$.active = 0;

function ajaxStart(settings) {
    if (settings.global && $.active++ === 0) {
        triggerGlobal(settings, null, 'ajaxStart');
    }
}

function ajaxStop(settings) {
    if (settings.global && !(--$.active)) {
        triggerGlobal(settings, null, 'ajaxStop');
    }
}

// triggers an extra global event "ajaxBeforeSend" that's like "ajaxSend" but cancelable
function ajaxBeforeSend(xhr, settings) {
    var context = settings.context;
    if (settings.beforeSend.call(context, xhr, settings) === false ||
        triggerGlobal(settings, context, 'ajaxBeforeSend', [xhr, settings]) === false) {
        return false;
    }

    triggerGlobal(settings, context, 'ajaxSend', [xhr, settings]);
}

function ajaxSuccess(data, xhr, settings, deferred) {
    var context = settings.context,
        status = 'success';
    settings.success.call(context, data, status, xhr);
    if (deferred) {
        deferred.resolveWith(context, [data, status, xhr]);
    }
    triggerGlobal(settings, context, 'ajaxSuccess', [xhr, settings, data]);
    ajaxComplete(status, xhr, settings);
}

// type: "timeout", "error", "abort", "parsererror"
function ajaxError(error, type, xhr, settings, deferred) {
    var context = settings.context;
    settings.error.call(context, xhr, type, error);
    if (deferred) {
        deferred.rejectWith(context, [xhr, type, error]);
    }
    triggerGlobal(settings, context, 'ajaxError', [xhr, settings, error || type]);
    ajaxComplete(type, xhr, settings);
}

// status: "success", "notmodified", "error", "timeout", "abort", "parsererror"
function ajaxComplete(status, xhr, settings) {
    var context = settings.context;
    settings.complete.call(context, xhr, status);
    triggerGlobal(settings, context, 'ajaxComplete', [xhr, settings]);
    ajaxStop(settings);
}

$.ajaxJSONP = function(options, deferred) {
    if (!('type' in options)) {
        return $.ajax(options);
    }

    var _callbackName = options.jsonpCallback,
        callbackName = ($.isFunction(_callbackName) ?
            _callbackName() : _callbackName) || ('jsonp' + (++jsonpID)),
        script = docElement.createElement('script'),
        originalCallback = window[callbackName],
        responseData,
        abort = function(errorType) {
            $(script).triggerHandler('error', errorType || 'abort');
        },
        xhr = {
            abort: abort
        },
        abortTimeout;

    if (deferred) {
        deferred.promise(xhr);
    }

    $(script).on('load error', function(e, errorType) {
        clearTimeout(abortTimeout);
        $(script).off().remove();

        if (e.type === 'error' || !responseData) {
            ajaxError(null, errorType || 'error', xhr, options, deferred);
        } else {
            ajaxSuccess(responseData[0], xhr, options, deferred);
        }

        window[callbackName] = originalCallback;
        if (responseData && $.isFunction(originalCallback)) {
            originalCallback(responseData[0]);
        }

        originalCallback = responseData = undefined;
    });

    if (ajaxBeforeSend(xhr, options) === false) {
        abort('abort');
        return xhr;
    }

    // always make callback exist, and change it to set data, 
    // so the promise can get this data
    // and then the 'load' event will execute original callback
    window[callbackName] = function() {
        responseData = arguments;
    };

    script.src = options.url.replace(/\?(.+)=\?/, '?$1=' + callbackName);
    docElement.head.appendChild(script);

    if (options.timeout > 0) {
        abortTimeout = setTimeout(function() {
            abort('timeout');
        }, options.timeout);
    }

    return xhr;
};

$.ajaxSettings = {
    // Default type of request
    type: 'GET',
    // Callback that is executed before request
    beforeSend: empty,
    // Callback that is executed if the request succeeds
    success: empty,
    // Callback that is executed the the server drops error
    error: empty,
    // Callback that is executed on request complete (both: error and success)
    complete: empty,
    // The context for the callbacks
    context: null,
    // Whether to trigger "global" Ajax events
    global: true,
    // Transport
    xhr: function() {
        return new window.XMLHttpRequest();
    },
    // MIME types mapping
    // IIS returns Javascript as "application/x-javascript"
    accepts: {
        script: 'text/javascript, application/javascript, application/x-javascript',
        json: jsonType,
        xml: 'application/xml, text/xml',
        html: htmlType,
        text: 'text/plain'
    },
    // Whether the request is to another domain
    crossDomain: false,
    // Default timeout
    timeout: 0,
    // Whether data should be serialized to string
    processData: true,
    // Whether the browser should be allowed to cache GET responses
    cache: true
};

function mimeToDataType(mime) {
    if (mime) {
        mime = mime.split(';', 2)[0];
    }
    return mime && (mime === htmlType ? 'html' :
        mime === jsonType ? 'json' :
        scriptTypeRE.test(mime) ? 'script' :
        xmlTypeRE.test(mime) && 'xml') || 'text';
}

function appendQuery(url, query) {
    if (query === '') {
        return url;
    }
    // always replace the first '&'|'&&'|'??'|'?&'... to '?'
    return (url + '&' + query).replace(/[&?]{1,2}/, '?');
}

// serialize payload and append it to the URL for GET requests
function serializeData(options) {
    if (options.processData && options.data && $.type(options.data) !== "string") {
        options.data = $.param(options.data, options.traditional);
    }
    if (options.data && (!options.type || options.type.toUpperCase() === 'GET')) {
        options.url = appendQuery(options.url, options.data);
        options.data = undefined;
    }
}

$.ajax = function(options) {
    var settings = $.extend({}, options || {}),
        deferred = $.Deferred && $.Deferred(),
        urlAnchor, hashIndex;
    for (key in $.ajaxSettings) {
        if (settings[key] === undefined) {
            settings[key] = $.ajaxSettings[key];
        }
    }

    ajaxStart(settings);

    if (!settings.crossDomain) {
        urlAnchor = docElement.createElement('a');
        urlAnchor.href = settings.url;
        // cleans up URL for .href (IE only), see https://github.com/madrobby/zepto/pull/1049
        urlAnchor.href = urlAnchor.href;
        settings.crossDomain = (originAnchor.protocol + '//' + originAnchor.host) !== (urlAnchor.protocol + '//' + urlAnchor.host);
    }

    if (!settings.url) {
        settings.url = window.location.toString();
    }
    if ((hashIndex = settings.url.indexOf('#')) > -1) {
        settings.url = settings.url.slice(0, hashIndex);
    }
    serializeData(settings);

    var dataType = settings.dataType,
    // test if url has placeholder? ?jsonpCallback=? --> jsonpCallback wont change
        hasPlaceholder = /\?.+=\?/.test(settings.url);
    if (hasPlaceholder) {
        dataType = 'jsonp';
    }

    if (settings.cache === false || (
            (!options || options.cache !== true) &&
            ('script' === dataType || 'jsonp' === dataType)
        )) {
        settings.url = appendQuery(settings.url, '_=' + Date.now());
    }

    if ('jsonp' === dataType) {
        if (!hasPlaceholder) {
            settings.url = appendQuery(settings.url,
                settings.jsonp ? (settings.jsonp + '=?') : settings.jsonp === false ? '' : 'callback=?');
        }
        return $.ajaxJSONP(settings, deferred);
    }

    var mime = settings.accepts[dataType],
        headers = {},
        setHeader = function(name, value) {
            headers[name.toLowerCase()] = [name, value];
        },
        protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,
        xhr = settings.xhr(),
        nativeSetHeader = xhr.setRequestHeader,
        abortTimeout;

    if (deferred) {
        deferred.promise(xhr); // extend promise methods to xhr
    }

    if (!settings.crossDomain) {
        setHeader('X-Requested-With', 'XMLHttpRequest');
    }
    setHeader('Accept', mime || '*/*');
    if (mime = settings.mimeType || mime) {
        if (mime.indexOf(',') > -1) {
            mime = mime.split(',', 2)[0];
        }
        xhr.overrideMimeType && xhr.overrideMimeType(mime);
    }
    if (settings.contentType || (settings.contentType !== false && 
        settings.data && settings.type.toUpperCase() !== 'GET')) {
        setHeader('Content-Type', settings.contentType || 'application/x-www-form-urlencoded');
    }

    if (settings.headers) {
        for (name in settings.headers) {
            setHeader(name, settings.headers[name]);
        }
    }
    xhr.setRequestHeader = setHeader;

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            xhr.onreadystatechange = empty;
            clearTimeout(abortTimeout);
            var result, error = false;
            if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
                dataType = dataType || mimeToDataType(settings.mimeType || xhr.getResponseHeader('content-type'));
                result = xhr.responseText;

                try {
                    // http://perfectionkills.com/global-eval-what-are-the-options/
                    if (dataType === 'script') {
                        (1, eval)(result); // ensure eval at global scope
                    } else if (dataType === 'xml') {
                        result = xhr.responseXML;
                    } else if (dataType === 'json') {
                        result = blankRE.test(result) ? null : JSON.parse(result);
                    }
                } catch (e) {
                    error = e;
                }

                if (error) {
                    ajaxError(error, 'parsererror', xhr, settings, deferred);
                }
                else {
                    ajaxSuccess(result, xhr, settings, deferred);
                } 
            } else {
                ajaxError(xhr.statusText || null, xhr.status ? 'error' : 'abort', xhr, settings, deferred);
            }
        }
    };

    if (ajaxBeforeSend(xhr, settings) === false) {
        xhr.abort();
        ajaxError(null, 'abort', xhr, settings, deferred);
        return xhr;
    }

    if (settings.xhrFields) {
        for (name in settings.xhrFields) {
            xhr[name] = settings.xhrFields[name];
        }
    }

    var async = 'async' in settings ? settings.async : true;
    xhr.open(settings.type, settings.url, async, settings.username, settings.password);
    // really set xhr header
    for (name in headers) {
        nativeSetHeader.apply(xhr, headers[name]);
    }

    if (settings.timeout > 0) {
        abortTimeout = setTimeout(function() {
            xhr.onreadystatechange = empty;
            xhr.abort();
            ajaxError(null, 'timeout', xhr, settings, deferred);
        }, settings.timeout);
    }

    // avoid sending empty string (#319)
    xhr.send(settings.data ? settings.data : null);
    return xhr;
}

// handle optional data/success arguments
function parseArguments(url, data, success, dataType) {
    if ($.isFunction(data)) {
        dataType = success, success = data, data = undefined;
    }
    if (!$.isFunction(success)) {
        dataType = success, success = undefined;
    }
    return {
        url: url,
        data: data,
        success: success,
        dataType: dataType
    };
}

$.get = function( /* url, data, success, dataType */ ) {
    return $.ajax(parseArguments.apply(null, arguments));
};

$.post = function( /* url, data, success, dataType */ ) {
    var options = parseArguments.apply(null, arguments);
    options.type = 'POST';
    return $.ajax(options);
};

$.getJSON = function( /* url, data, success */ ) {
    var options = parseArguments.apply(null, arguments);
    options.dataType = 'json';
    return $.ajax(options);
};

$.fn.load = function(url, data, success) {
    if (!this.length) {
        return this;
    }
    var self = this,
        parts = url.split(/\s/),
        selector,
        options = parseArguments(url, data, success),
        callback = options.success;
    if (parts.length > 1) {
        options.url = parts[0], selector = parts[1];
    }
    options.success = function(response) {
        self.html(selector ?
            $('<div>').html(response.replace(rscript, "")).find(selector) : response);
        callback && callback.apply(self, arguments);
    };
    $.ajax(options);
    return this;
};

var escape = encodeURIComponent;

function serialize(params, obj, traditional, scope) {
    var type, array = $.isArray(obj),
        hash = $.isPlainObject(obj);
    $.each(obj, function(key, value) {
        type = $.type(value);
        if (scope) {
            key = traditional ? scope : scope + '[' + 
                (hash || type == 'object' || type == 'array' ? key : '') + ']';
        }
        // handle data in serializeArray() format
        if (!scope && array) params.add(value.name, value.value)
        // recurse into nested objects
        else if (type == "array" || (!traditional && type == "object"))
            serialize(params, value, traditional, key)
        else params.add(key, value)
    });
}

$.param = function(obj, traditional) {
    var params = [];
    params.add = function(key, value) {
        if ($.isFunction(value)) {
            value = value();
        }
        if (value == null) {
            value = "";
        }
        this.push(escape(key) + '=' + escape(value));
    };
    serialize(params, obj, traditional);
    return params.join('&').replace(/%20/g, '+');
};

},{"./core-core.js":5}],2:[function(require,module,exports){
'use strict';

var util = require('./util.js');
var cepto = require('./core.js');
var funcArg = util.funcArg;

var propMap = {
    'tabindex': 'tabIndex',
    'readonly': 'readOnly',
    'for': 'htmlFor',
    'class': 'className',
    'maxlength': 'maxLength',
    'cellspacing': 'cellSpacing',
    'cellpadding': 'cellPadding',
    'rowspan': 'rowSpan',
    'colspan': 'colSpan',
    'usemap': 'useMap',
    'frameborder': 'frameBorder',
    'contenteditable': 'contentEditable'
};
var classCache = {};
var classList;

// set/remove attribute
function setAttribute(node, name, value) {
    value === undefined ? node.removeAttribute(name) : node.setAttribute(name, value);
}

// cache and get correponding regexp of the classname
function classRE(name) {
    return name in classCache ?
        classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'));
}

// access className property while respecting SVGAnimatedString
function className(node, value) {
    var klass = node.className || '',
        svg = klass && klass.baseVal !== undefined;

    if (value === undefined) {
        return svg ? klass.baseVal : klass;
    }
    svg ? (klass.baseVal = value) : (node.className = value);
}


cepto.fn.extend({
    attr: function(name, value) {
        var result;
        var key;
        // retrieve attr
        if (typeof name === 'string' && !(1 in arguments)) {
            result = !this.length || this[0].nodeType !== 1 ? undefined : this[0].getAttribute(name);
            if (!result && name in this[0]) {
                result = this[0][name];
            }
            return result;
            // set attirbute
        } else {
            this.each(function(i) {
                if (this.nodeType !== 1) {
                    return;
                }
                if (util.isPlainObject(name)) {
                    for (key in name) {
                        setAttribute(this, key, name[key]);
                    }
                } else {
                    setAttribute(this, name, funcArg(this, value, i, this.getAttribute(name)));
                }
            });
        }

        return this;
    },
    removeAttr: function(name) {
        return this.each(function() {
            this.nodeType === 1 && name.split(' ').forEach(function(attribute) {
                setAttribute(this, attribute);
            }, this);
        });
    },
    prop: function(name, value) {
        name = propMap[name] || name;
        return (1 in arguments) ?
            this.each(function(i) {
                this[name] = funcArg(this, value, i, this[name]);
            }) :
            (this[0] && this[0][name]);
    },
    val: function(value) {
        return value !== undefined ?
            this.each(function(i) {
                this.value = funcArg(this, value, i, this.value);
            }) :
            (this[0] && (this[0].multiple ?
                cepto(this[0]).find('option').filter(function() {
                    return this.selected;
                }).pluck('value') :
                this[0].value));
    },
    hasClass: function(name) {
        if (!name) {
            return false;
        }
        return util.some.call(this, function(el) {
            return this.test(className(el));
        }, classRE(name));
    },
    addClass: function(name) {
        if (!name) {
            return this;
        }
        return this.each(function(idx) {
            if (!('className' in this)) {
                return;
            }
            classList = [];
            var cls = className(this),
                newName = funcArg(this, name, idx, cls);
            newName.split(/\s+/g).forEach(function(klass) {
                if (!cepto(this).hasClass(klass)) {
                    classList.push(klass);
                }
            }, this);
            classList.length && className(this, cls + (cls ? ' ' : '') + classList.join(' '));
        });
    },
    removeClass: function(name) {
        return this.each(function(idx) {
            if (!('className' in this)) {
                return;
            }
            if (name === undefined) {
                return className(this, '');
            }
            classList = className(this);
            funcArg(this, name, idx, classList).split(/\s+/g).forEach(function(klass) {
                classList = classList.replace(classRE(klass), ' ');
            });
            className(this, classList.trim());
        });
    },
    toggleClass: function(name, when) {
        if (!name) {
            return this;
        }
        return this.each(function(idx) {
            var $this = cepto(this),
                names = funcArg(this, name, idx, className(this));
            names.split(/\s+/g).forEach(function(klass) {
                (when === undefined ? !$this.hasClass(klass) : when) ?
                $this.addClass(klass): $this.removeClass(klass);
            });
        });
    }
});

},{"./core.js":7,"./util.js":18}],3:[function(require,module,exports){
'use strict';
// ---
// Callbacks module is from jQuery 2.1.3
// ---

var cepto = require('./core-core.js');
var util = require('./util.js');

// String to Object options format cache
var optionsCache = {};
var rnotwhite = /\S+/g;

// Convert String-formatted options into Object-formatted ones and store in cache
function createOptions( options ) {
    var object = optionsCache[ options ] = {};
    cepto.each( options.match( rnotwhite ) || [], function( _, flag ) {
        object[ flag ] = true;
    });
    return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *  options: an optional list of space-separated options that will change how
 *          the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *  once:           will ensure the callback list can only be fired once (like a Deferred)
 *
 *  memory:         will keep track of previous values and will call any callback added
 *                  after the list has been fired right away with the latest "memorized"
 *                  values (like a Deferred)
 *
 *  unique:         will ensure a callback can only be added once (no duplicate in the list)
 *
 *  stopOnFalse:    interrupt callings when a callback returns false
 *
 */
cepto.Callbacks = function(options) {

    // Convert options from String-formatted to Object-formatted if needed
    // (we check in cache first)
    options = typeof options === "string" ?
        (optionsCache[options] || createOptions(options)) :
        cepto.extend({}, options);

    var // Last fire value (for non-forgettable lists)
        memory,
        // Flag to know if list was already fired
        fired,
        // Flag to know if list is currently firing
        firing,
        // First callback to fire (used internally by add and fireWith)
        firingStart,
        // End of the loop when firing
        firingLength,
        // Index of currently firing callback (modified by remove if needed)
        firingIndex,
        // Actual callback list
        list = [],
        // Stack of fire calls for repeatable lists
        stack = !options.once && [],
        // Fire callbacks
        fire = function(data) {
            memory = options.memory && data;
            fired = true;
            firingIndex = firingStart || 0;
            firingStart = 0;
            firingLength = list.length;
            firing = true;
            for (; list && firingIndex < firingLength; firingIndex++) {
                if (list[firingIndex].apply(data[0], data[1]) === false && options.stopOnFalse) {
                    memory = false; // To prevent further calls using add
                    break;
                }
            }
            firing = false;
            if (list) {
                if (stack) {
                    if (stack.length) {
                        fire(stack.shift());
                    }
                } else if (memory) {
                    list = [];
                } else {
                    self.disable();
                }
            }
        },
        // Actual Callbacks object
        self = {
            // Add a callback or a collection of callbacks to the list
            add: function() {
                if (list) {
                    // First, we save the current length
                    var start = list.length;
                    (function add(args) {
                        cepto.each(args, function(_, arg) {
                            var type = cepto.type(arg);
                            if (type === "function") {
                                // two situations: 1. not unique; 2. unique but not duplicate
                                if (!options.unique || !self.has(arg)) {
                                    list.push(arg);
                                }
                            } else if (arg && arg.length && type !== "string") {
                                // Array-like, Inspect recursively
                                add(arg);
                            }
                        });
                    })(arguments);
                    // Do we need to add the callbacks to the
                    // current firing batch?
                    if (firing) {
                        firingLength = list.length;
                    // With memory, if we're not firing then
                    // we should call right away
                    } else if (memory) {
                        firingStart = start;
                        fire(memory);
                    }
                }
                return this;
            },
            // Remove a callback from the list
            remove: function() {
                if (list) {
                    cepto.each(arguments, function(_, arg) {
                        var index;
                        while ((index = cepto.inArray(arg, list, index)) > -1) {
                            list.splice(index, 1);
                            // Handle firing indexes
                            if (firing) {
                                if (index <= firingLength) {
                                    firingLength--;
                                }
                                if (index <= firingIndex) {
                                    firingIndex--;
                                }
                            }
                        }
                    });
                }
                return this;
            },
            // Check if a given callback is in the list.
            // If no argument is given, return whether or not list has callbacks attached.
            has: function(fn) {
                return fn ? cepto.inArray(fn, list) > -1 : !!(list && list.length);
            },
            // Remove all callbacks from the list
            empty: function() {
                list = [];
                firingLength = 0;
                return this;
            },
            // Have the list do nothing anymore
            disable: function() {
                list = stack = memory = undefined;
                return this;
            },
            // Is it disabled?
            disabled: function() {
                return !list;
            },
            // Lock the list in its current state
            lock: function() {
                stack = undefined;
                if (!memory) {
                    self.disable();
                }
                return this;
            },
            // Is it locked?
            locked: function() {
                return !stack;
            },
            // Call all callbacks with the given context and arguments
            fireWith: function(context, args) {
                if (list && (!fired || stack)) {
                    args = args || [];
                    args = [context, args.slice ? args.slice() : args];
                    if (firing) {
                        stack.push(args);
                    } else {
                        fire(args);
                    }
                }
                return this;
            },
            // Call all the callbacks with the given arguments
            fire: function() {
                self.fireWith(this, arguments);
                return this;
            },
            // To know if the callbacks have already been called at least once
            fired: function() {
                return !!fired;
            }
        };

    return self;

};

},{"./core-core.js":5,"./util.js":18}],4:[function(require,module,exports){
'use strict';

var cepto = require('./core.js');
require('./selector.js');
require('./core-init.js');
// data
require('./data.js');
// callbacks
require('./callbacks.js');
// deferred
require('./deferred.js');
// attribute
require('./attribute.js');
// add dom manipulation: append prepend after before ...
require('./dom-manipulation.js');
// add .html .text method
require('./dom.js');
// css
require('./css.js');
// dimensions
require('./dimensions.js');
// event
require('./event.js');
// ajax
require('./ajax.js');

window.cepto = window.$ = cepto;
},{"./ajax.js":1,"./attribute.js":2,"./callbacks.js":3,"./core-init.js":6,"./core.js":7,"./css.js":8,"./data.js":10,"./deferred.js":11,"./dimensions.js":12,"./dom-manipulation.js":14,"./dom.js":15,"./event.js":16,"./selector.js":17}],5:[function(require,module,exports){
'use strict';

var cepto = function(selector, context) {
    return new cepto.fn.init(selector, context);
};

module.exports = cepto;
},{}],6:[function(require,module,exports){
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
},{"./core-core.js":5,"./util.js":18}],7:[function(require,module,exports){
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

},{"./core-core.js":5,"./dom-fragment.js":13,"./util.js":18}],8:[function(require,module,exports){
'use strict';

var cepto = require('./core-core.js');
var util = require('./util.js');
var dasherize = util.dasherize;

var cssNumber = {
    'column-count': 1,
    'columns': 1,
    'font-weight': 1,
    'line-height': 1,
    'opacity': 1,
    'z-index': 1,
    'zoom': 1
};

var elementDisplay = {};

var maybeAddPx = function(name, value) {
    return (typeof value === 'number' && !cssNumber[dasherize(name)]) ? value + 'px' : value;
};

var defaultDisplay = function(nodeName) {
    var element, display;
    if (!elementDisplay[nodeName]) {
        element = document.createElement(nodeName);
        document.body.appendChild(element);
        display = getComputedStyle(element, '').getPropertyValue('display');
        element.parentNode.removeChild(element);
        display === 'none' && (display = 'block');
        elementDisplay[nodeName] = display;
    }
    return elementDisplay[nodeName];
};

cepto.fn.extend({
    css: function(property, value) {
        if (value === undefined) {
            var computedStyle, element = this[0];
            if (!element) {
                return;
            }
            computedStyle = getComputedStyle(element, '');
            if (typeof property === 'string') {
                return element.style[util.camelCase(property)] || computedStyle.getPropertyValue(property);
            } else if (util.isArray(property)) {
                var props = {};
                cepto.each(property, function(_, prop) {
                    props[prop] = (element.style[util.camelCase(prop)] || computedStyle.getPropertyValue(prop));
                });
                return props;
            }
        }

        var css = '';
        var key;
        if (util.type(property) === 'string') {
            if (!value && value !== 0) {
                this.each(function() {
                    this.style.removeProperty(dasherize(property));
                });
            } else {
                css = dasherize(property) + ':' + maybeAddPx(property, value);
            }
        } else {
            for (key in property) {
                if (!property[key] && property[key] !== 0) {
                    this.each(function() {
                        this.style.removeProperty(dasherize(key));
                    });
                } else {
                    css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';';
                }
            }
        }

        return this.each(function() {
            this.style.cssText += ';' + css;
        });
    },
    show: function() {
        return this.each(function() {
            this.style.display === 'none' && (this.style.display = '');
            if (getComputedStyle(this, '').getPropertyValue('display') === 'none') {
                this.style.display = defaultDisplay(this.nodeName);
            }
        });
    },
    hide: function() {
        return this.css('display', 'none');
    },
    toggle: function(setting) {
        return this.each(function() {
            var el = cepto(this);
            (setting === undefined ? el.css('display') === 'none' : setting) ? el.show(): el.hide();
        });
    }
});

},{"./core-core.js":5,"./util.js":18}],9:[function(require,module,exports){
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

},{"./core-core.js":5,"./util.js":18}],10:[function(require,module,exports){
'use strict';


var cepto = require('./core-core.js');
var util = require('./util.js');
var Data = require('./data-core.js');
var vars = require('./vars/data.js');

var rmultiDash = /([A-Z])/g;
var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/;
var userData = vars.userData;
var privData = vars.privData;

// ---------------
// remove empty html('xxx') replaceWith 必须删除对应数据防止内存泄漏
// ---------------

var parseData = function(data) {
    if (typeof data !== 'string') {
        return data;
    }
    try {
        data = data === 'true' ? true :
            data === 'false' ? false :
            data === 'null' ? null :
            // Only convert to a number if it doesn't change the string
            +data + '' === data ? +data :
            rbrace.test(data) ? JSON.parse(data) : data;
    } catch (e) {}
    return data;
};

// retrive data from node 'data-*' attributes
var getAttributeData = function(elem, key, data) {
    var name;

    if (elem.nodeType === 1) {
        // retrieve all attribute data
        if (key === undefined) {
            data = data || {};
            util.each(elem.attributes, function(i, attr) {
                // Support: IE11+
                // The attrs elements can be null (#14894)
                if (attr && attr.name.indexOf('data-') === 0) {
                    data[util.camelCase(attr.name.slice(5))] = parseData(attr.value);
                }
            });

        // retrieve the specific attribute data
        } else {
            name = 'data-' + key.replace(rmultiDash, '-$1').toLowerCase();
            data = elem.getAttribute(name);
            data = parseData(data);
        }
    }
    return data;
};

cepto.fn.extend({
    data: function(key, value) {
        var data;
        var elem = this[0];
        var camelKey;

        if (value === undefined) {
            // Sets multiple values
            if (util.isPlainObject(key)) {
                return this.each(function() {
                    userData.set(this, key);
                });

            // get value from first element
            } else {
                if (!elem) {
                    return undefined;
                }
                // get all values
                if (key === undefined) {
                    data = userData.get(elem); // always plain object
                    // if not retrieve attribute data, retrieve it and add to cached data
                    if (!privData.get(elem, 'hasDataAttrs')) {
                        getAttributeData(elem, undefined, data);
                    }
                    privData.set(elem, 'hasDataAttrs', true);
                    return data;

                // get value
                } else {
                    data = userData.get(elem, key);
                    if (data !== undefined) {
                        return data;
                    }

                    camelKey = util.camelCase(key);
                    data = userData.get(elem, camelKey);
                    if (data !== undefined) {
                        return data;
                    }

                    data = getAttributeData(elem, camelKey);
                    if (data !== undefined) {
                        return data;
                    }

                    // We tried really hard, but the data doesn't exist.
                    return;
                }
            }

        // set key-value
        } else {
            return this.each(function() {
                userData.set(this, key, value);
            });
        }
    },
    removeData: function(key) {
        return this.each(function() {
            userData.remove(this, key);
        });
    }
});

cepto.extend({
    acceptData: Data.accepts,
    hasData: function(elem) {
        return userData.hasData(elem) || privData.hasData(elem);
    },

    data: function(elem, name, data) {
        return userData.access(elem, name, data);
    },

    removeData: function(elem, name) {
        userData.remove(elem, name);
    },

    cleanData: function( elems ) {
        var data, elem, key,
            i = 0;

        for ( ; (elem = elems[ i ]) !== undefined; i++ ) {
            if ( cepto.acceptData( elem ) ) {
                key = elem[ privData.expando ];

                if ( key && (data = privData.cache[ key ]) ) {
                    if ( data.handlers ) {
                        cepto.event.remove(elem);
                    }
                    if ( privData.cache[ key ] ) {
                        // Discard any remaining `private` data
                        delete privData.cache[ key ];
                    }
                }
            }
            // Discard any remaining `user` data
            delete userData.cache[ elem[ userData.expando ] ];
        }
    }

});
},{"./core-core.js":5,"./data-core.js":9,"./util.js":18,"./vars/data.js":19}],11:[function(require,module,exports){
'use strict';

var cepto = require('./core-core.js');

//     Copied from zepto
//     Zepto.js
//     (c) 2010-2015 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.
//
//     Some code (c) 2005, 2013 jQuery Foundation, Inc. and other contributors

var slice = Array.prototype.slice

function Deferred(func) {
    var tuples = [
            // action, add listener, listener list, final state
            ["resolve", "done", cepto.Callbacks({
                once: 1,
                memory: 1
            }), "resolved"],
            ["reject", "fail", cepto.Callbacks({
                once: 1,
                memory: 1
            }), "rejected"],
            ["notify", "progress", cepto.Callbacks({
                memory: 1
            })]
        ],
        state = "pending",
        promise = {
            state: function() {
                return state;
            },
            always: function() {
                deferred.done(arguments).fail(arguments);
                return this;
            },
            then: function( /* fnDone [, fnFailed [, fnProgress]] */ ) {
                var fns = arguments;
                return Deferred(function(defer) {
                    cepto.each(tuples, function(i, tuple) {
                        var fn = cepto.isFunction(fns[i]) && fns[i];
                        deferred[tuple[1]](function() {
                            var returned = fn && fn.apply(this, arguments);
                            if (returned && cepto.isFunction(returned.promise)) {
                                returned.promise()
                                    .done(defer.resolve)
                                    .fail(defer.reject)
                                    .progress(defer.notify);
                            } else {
                                var context = this === promise ? defer.promise() : this,
                                    values = fn ? [returned] : arguments;
                                defer[tuple[0] + "With"](context, values);
                            }
                        });
                    });
                    fns = null;
                }).promise();
            },
            promise: function(obj) {
                return obj != null ? cepto.extend(obj, promise) : promise;
            }
        },
        deferred = {};

    cepto.each(tuples, function(i, tuple) {
        var list = tuple[2],
            stateString = tuple[3];

        promise[tuple[1]] = list.add;

        // if stateString exists(means callbacks is resolve/reject callbacks)
        if (stateString) {
            // when fire callbacks, firstly update state and lock/disable other callbacks
            list.add(function() {
                state = stateString;
            }, tuples[i ^ 1][2].disable, tuples[2][2].lock);
        }

        deferred[tuple[0]] = function() {
            deferred[tuple[0] + "With"](this === deferred ? promise : this, arguments);
            return this;
        };
        deferred[tuple[0] + "With"] = list.fireWith;
    });

    // extend promise to deferred
    promise.promise(deferred);
    if (func) {
        func.call(deferred, deferred);
    }
    return deferred;
}

cepto.when = function(sub) {
    var resolveValues = slice.call(arguments),
        len = resolveValues.length,
        i = 0,
        remain = len !== 1 || (sub && cepto.isFunction(sub.promise)) ? len : 0,
        deferred = remain === 1 ? sub : Deferred(),
        progressValues, progressContexts, resolveContexts,
        updateFn = function(i, ctx, val) {
            return function(value) {
                ctx[i] = this;
                val[i] = arguments.length > 1 ? slice.call(arguments) : value;
                if (val === progressValues) {
                    deferred.notifyWith(ctx, val);
                } else if (!(--remain)) {
                    deferred.resolveWith(ctx, val);
                }
            };
        };

    if (len > 1) {
        progressValues = new Array(len);
        progressContexts = new Array(len);
        resolveContexts = new Array(len);
        for (; i < len; ++i) {
            if (resolveValues[i] && cepto.isFunction(resolveValues[i].promise)) {
                resolveValues[i].promise()
                    .done(updateFn(i, resolveContexts, resolveValues))
                    .fail(deferred.reject)
                    .progress(updateFn(i, progressContexts, progressValues));
            } else {
                --remain;
            }
        }
    }
    if (!remain) {
        deferred.resolveWith(resolveContexts, resolveValues);
    }
    return deferred.promise();
};

cepto.Deferred = Deferred;

},{"./core-core.js":5}],12:[function(require,module,exports){
'use strict';

var cepto = require('./core-core.js');
var util = require('./util.js');

var rootNodeRE = /^(?:body|html)$/i;
var funcArg = util.funcArg;

cepto.fn.extend({
    offset: function(coordinates) {
        var el;
        if (coordinates) {
            return this.each(function(index) {
                var $this = cepto(this),
                    coords = funcArg(this, coordinates, index, $this.offset()),
                    parentOffset = $this.offsetParent().offset(),
                    props = {
                        top: coords.top - parentOffset.top,
                        left: coords.left - parentOffset.left
                    };

                if ($this.css('position') === 'static') {
                    props.position = 'relative';
                }
                $this.css(props);
            });
        }
        el = this[0];
        if (!el) {
            return null;
        }
        var obj = el.getBoundingClientRect();
        return {
            left: obj.left + window.pageXOffset,
            top: obj.top + window.pageYOffset,
            width: Math.round(obj.width),
            height: Math.round(obj.height)
        };
    },
    offsetParent: function() {
        return this.map(function() {
            var parent = this.offsetParent || document.body;
            while (parent && !rootNodeRE.test(parent.nodeName) && cepto(parent).css('position') === 'static') {
                parent = parent.offsetParent;
            }
            return parent;
        });
    },
    position: function() {
        if (!this.length) {
            return;
        }

        var el = this[0],
            // Get *real* offsetParent
            offsetParent = this.offsetParent(),
            // Get correct offsets
            offset = this.offset(),
            parentOffset = rootNodeRE.test(offsetParent[0].nodeName) ? {
                top: 0,
                left: 0
            } : offsetParent.offset();

        // Subtract element margins
        // note: when an element has margin: auto the offsetLeft and marginLeft
        // are the same in Safari causing offset.left to incorrectly be 0
        offset.top -= parseFloat(cepto(el).css('margin-top')) || 0;
        offset.left -= parseFloat(cepto(el).css('margin-left')) || 0;

        // Add offsetParent borders
        parentOffset.top += parseFloat(cepto(offsetParent[0]).css('border-top-width')) || 0;
        parentOffset.left += parseFloat(cepto(offsetParent[0]).css('border-left-width')) || 0;

        // Subtract the two offsets
        return {
            top: offset.top - parentOffset.top,
            left: offset.left - parentOffset.left
        };
    }
});

// Generate the `width` and `height` functions
['width', 'height'].forEach(function(dimension) {
    var dimensionProperty = dimension.replace(/./, function(m) {
        return m[0].toUpperCase();
    });

    cepto.fn[dimension] = function(value) {
        var offset, el = this[0];
        if (value === undefined) {
            // As of 5/8/2012 this will yield incorrect results for Mobile Safari, but there
            // isn't a whole lot we can do. See pull request at this URL for discussion:
            // https://github.com/jquery/jquery/pull/764
            return util.isWindow(el) ? el.document.documentElement['client' + dimensionProperty] :
                el.nodeType === 9 ? el.documentElement['scroll' + dimensionProperty] :
                (offset = this.offset()) && offset[dimension];
        } else {
            return this.each(function(i) {
                el = cepto(this);
                el.css(dimension, funcArg(this, value, i, el[dimension]()));
            });
        }
    };
});

},{"./core-core.js":5,"./util.js":18}],13:[function(require,module,exports){
'use strict';

var util = require('./util.js');
// single tag: no attribute, no text
var singleTagRE = /^<(\w+)\s*\/?>(?:<\/\1>|)$/;
// test if it is '<tag xxxx>' or '<!xxx>', and retrieve the tag name
var fragmentRE = /^\s*<(\w+|!)[^>]*>/;

var container = document.createElement('div');
var wrapMap = {
    // Support: IE9
    option: [1, '<select multiple="multiple">', '</select>'],

    thead: [1, '<table>', '</table>'],
    col: [2, '<table><colgroup>', '</colgroup></table>'],
    tr: [2, '<table><tbody>', '</tbody></table>'],
    td: [3, '<table><tbody><tr>', '</tr></tbody></table>']
};
// expand <p/> --> <p></p>
var tagExpanderRE = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig;

// Support: IE9
wrapMap.optgroup = wrapMap.option;

wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;

var buildFragment = function(html, name, properties) {
    var nodes, inMap, level;

    html = ('' + html).trim();

    // A special case optimization for a single tag
    if(singleTagRE.test(html)) {
        nodes = [document.createElement(RegExp.$1)];
    }

    if(!nodes) {
        html = html.replace(tagExpanderRE, '<$1></$2>');
        // if tagname not specified, retrieve it
        if(name === undefined) {
            name = fragmentRE.test(html) && RegExp.$1; 
        }
        inMap = wrapMap[name];
        if(inMap) {
            html = inMap[1] + html + inMap[2];
        }
        container.insertAdjacentHTML('afterbegin', html);

        if (inMap) {
            nodes = container.lastChild;
            level = inMap[0];
            while (--level) {
                nodes = nodes.lastChild;
            }
            nodes = nodes.childNodes;
        } else {
            nodes = container.childNodes;
        }

        // to array
        nodes = util.toArray(nodes);

        // prevent dom to be nodes' parentNode
        container.textContent = '';
    }
    
    // set attributes
    if(util.isPlainObject(properties)) {
        util.each(properties, function(key, value) {
            /// TODO: set attributes
            /// ----
            console.log(key, value);
        });
    }

    return nodes;
};

module.exports = {
    buildFragment: buildFragment
};
},{"./util.js":18}],14:[function(require,module,exports){
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

},{"./core.js":7,"./dom-fragment.js":13,"./util.js":18}],15:[function(require,module,exports){
'use strict';


var funcArg = require('./util.js').funcArg;
var cepto = require('./core-core.js');

function getAll( context, tag ) {
    var ret = context.getElementsByTagName ? context.getElementsByTagName( tag || '*' ) :
            context.querySelectorAll ? context.querySelectorAll( tag || '*' ) :
            [];

    return tag === undefined || tag && tag.nodeName === context.nodeName ?
        cepto.merge( [ context ], ret ) :
        ret;
}

cepto.fn.extend({
    remove: function() {
        return this.each(function() {
            // clean data
            cepto.cleanData(getAll(this));
            if (this.parentNode != null) {
                this.parentNode.removeChild(this);
            }
        });
    },
    empty: function() {
        return this.each(function() {
            cepto.cleanData(getAll(this));

            this.textContent = '';
        });
    },
    html: function(html) {
        return html !== undefined ?
            this.each(function(el, i) {
                var originHtml = this.innerHTML;
                cepto.cleanData(getAll(this));
                cepto(this).empty().append(funcArg(this, html, i, originHtml));
            }) :
            (0 in this ? this[0].innerHTML : null);
    },
    text: function(text) {
        return 0 in arguments ?
            this.each(function(el, i) {
                var newText = funcArg(this, text, this.textContent, i);
                cepto.cleanData(getAll(this));
                this.textContent = newText == null ? '' : '' + newText;
            }) :
            (0 in this ? this[0].textContent : null);
    },
    replaceWith: function(newContent) {
        this.each(function() {
            cepto.cleanData(getAll(this));
        });
        return this.before(newContent).remove();
    },
    clone: function() {
        return this.map(function() {
            return this.cloneNode(true);
        });
    }
});

},{"./core-core.js":5,"./util.js":18}],16:[function(require,module,exports){
'use strict';

var cepto = require('./core-core.js');
var util = require('./util.js');
var privData = require('./vars/data.js').privData;

var hover = {
    mouseenter: 'mouseover',
    mouseleave: 'mouseout'
};
var focusType = {
    focus: 'focusin',
    blur: 'focusout'
};
var specialEvents = {};
var focusinSupported = 'onfocusin' in window;
var isString = function(obj){ 
    return typeof obj === 'string';
};
var isFunction = util.isFunction;
var ignoreProperties = /^([A-Z]|returnValue$|layer[XY]$)/;
var eventMethods = {
    preventDefault: 'isDefaultPrevented',
    stopImmediatePropagation: 'isImmediatePropagationStopped',
    stopPropagation: 'isPropagationStopped'
};

specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents';

function returnTrue() {
    return true;
}

function returnFalse() {
    return false;
}

function parse(event) {
    var parts = ('' + event).split('.');
    return {
        e: parts[0],
        ns: parts.slice(1).sort().join(' ')
    };
}

function realEvent(type) {
    return hover[type] || (focusinSupported && focusType[type]) || type;
}

function eventCapture(handler, captureSetting) {
    return handler.del &&
        (!focusinSupported && (handler.e in focusType)) ||
        !!captureSetting;
}

function matcherFor(ns) {
    return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)');
}

function findHandlers(element, event, fn, selector, handlers) {
    event = parse(event);
    if (event.ns) {
        var matcher = matcherFor(event.ns);
    }
    handlers = handlers || privData.get(element, 'handlers');
    return (handlers || []).filter(function(handler) {
        return handler && (!event.e || handler.e === event.e) && 
            (!event.ns || matcher.test(handler.ns)) && 
            // compare fn directly instead of comparing fn.guid----if fn be binded twice or more, guid will change
            (!fn || handler.fn === fn) && 
            (!selector || handler.sel === selector);
    });
}


// source: original event
// event: the new created obj(compatible source)
function compatible(event, source) {
    if (source || !event.isDefaultPrevented) {
        source || (source = event);

        cepto.each(eventMethods, function(name, predicate) {
            var sourceMethod = source[name];
            event[name] = function() {
                this[predicate] = returnTrue;
                return sourceMethod && sourceMethod.apply(source, arguments);
            };
            event[predicate] = returnFalse;
        });

        if (source.defaultPrevented !== undefined ? 
            source.defaultPrevented :
            'returnValue' in source ? 
            source.returnValue === false :
            source.getPreventDefault && source.getPreventDefault()) {
            event.isDefaultPrevented = returnTrue;
        }
    }
    return event;
}

function createProxy(event) {
    var key, proxy = {
        originalEvent: event
    };
    for (key in event) {
        if (!ignoreProperties.test(key) && event[key] !== undefined) {
            proxy[key] = event[key];
        }
    }

    return compatible(proxy, event);
}

function add(element, events, fn, data, selector, delegator, capture) {
    var elemData = privData.get(element);
    if(!elemData) {
        return;
    }
    var set = elemData.handlers || (elemData.handlers = []);

    events.split(/\s+/).forEach(function(event) {
        if (event === 'ready') {
            return cepto(document).ready(fn);
        }
        var handler = parse(event);
        handler.fn = fn;
        handler.sel = selector;
        // emulate mouseenter, mouseleave
        if (handler.e in hover) {
            fn = function(e) {
                var related = e.relatedTarget;
                if (!related || (related !== this && !cepto.contains(this, related))) {
                    return handler.fn.apply(this, arguments);
                }
            };
        }
        handler.del = delegator;
        var callback = delegator || fn;
        handler.proxy = function(e) {
            e = compatible(e);
            if (e.isImmediatePropagationStopped()) {
                return;
            }
            e.data = data;
            var result = callback.apply(element, e._args === undefined ? [e] : [e].concat(e._args));
            if (result === false) {
                e.preventDefault(), e.stopPropagation();
            }
            return result;
        };
        handler.i = set.length;
        set.push(handler);
        if ('addEventListener' in element) {
            element.addEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture));
        }
    });
}

function remove(element, events, fn, selector, capture) {
    var handlers = privData.get(element, 'handlers');
    if(!handlers) {
        return;
    }
    (events || '').split(/\s+/).forEach(function(event) {
        findHandlers(element, event, fn, selector, handlers).forEach(function(handler) {
            delete handlers[handler.i];
            if ('removeEventListener' in element) {
                element.removeEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture));
            }
        });
    });
}

cepto.fn.extend({
    on: function(event, selector, data, callback, one) {
        var autoRemove, 
            delegator, 
            $this = this;
        if (event && !isString(event)) {
            cepto.each(event, function(type, fn) {
                $this.on(type, selector, data, fn, one);
            });
            return $this;
        }

        // cepto().on(event, data, callback)
        if (!isString(selector) && !isFunction(callback) && callback !== false) {
            callback = data, data = selector, selector = undefined;
        }
        // cepto().on(type, selector, callback)
        if (callback === undefined || data === false){
            callback = data, data = undefined;
        }

        if (callback === false) {
            callback = returnFalse;
        }

        return $this.each(function(_, element) {
            if (one) {
                autoRemove = function(e) {
                    remove(element, e.type, callback);
                    return callback.apply(this, arguments);
                };
            }

            if (selector) {
                delegator = function(e) {
                    var evt, match = cepto(e.target).closest(selector, element)[0];
                    if (match && match !== element) {
                        evt = cepto.extend(createProxy(e), {
                            currentTarget: match,
                            liveFired: element
                        });
                        return (autoRemove || callback).apply(match, [evt].concat(util.slice.call(arguments, 1)));
                    }
                };
            }

            add(element, event, callback, data, selector, delegator || autoRemove);
        });
    },
    off: function(event, selector, callback) {
        var $this = this;
        if (event && !isString(event)) {
            cepto.each(event, function(type, fn) {
                $this.off(type, selector, fn);
            });
            return $this;
        }

        if (!isString(selector) && !isFunction(callback) && callback !== false) {
            callback = selector, selector = undefined;
        }

        if (callback === false) {
            callback = returnFalse;
        }

        return $this.each(function() {
            remove(this, event, callback, selector);
        });
    },
    trigger: function(event, args) {
        event = (isString(event) || util.isPlainObject(event)) ? cepto.Event(event) : compatible(event);
        event._args = args;
        return this.each(function() {
            // handle focus(), blur() by calling them directly
            if (event.type in focusType && typeof this[event.type] === 'function') {
                this[event.type]();

            // items in the collection might not be DOM elements
            } else if ('dispatchEvent' in this) {
                this.dispatchEvent(event);
            } else {
                cepto(this).triggerHandler(event, args);
            }
        });
    },
    // triggers event handlers on current element just as if an event occurred,
    // doesn't trigger an actual event, doesn't bubble
    triggerHandler: function(event, args){
        var e, result;
        this.each(function(i, element) {
            e = createProxy(isString(event) ? cepto.Event(event) : event);
            e._args = args;
            e.target = element;
            cepto.each(findHandlers(element, event.type || event), function(i, handler) {
                result = handler.proxy(e);
                if (e.isImmediatePropagationStopped()) {
                    return false;
                }
            });
        });
        return result;
    },
    bind: function(event, data, callback) {
        return this.on(event, data, callback);
    },
    unbind: function(event, callback) {
        return this.off(event, callback);
    },
    one: function(event, selector, data, callback) {
        return this.on(event, selector, data, callback, 1);
    }
});

// shortcut methods for `.bind(event, fn)` for each event type
('focusin focusout focus blur load resize scroll unload click dblclick ' +
    'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave ' +
    'change select keydown keypress keyup error').split(' ').forEach(function(event) {
    cepto.fn[event] = function(callback) {
        return (0 in arguments) ?
            this.bind(event, callback) :
            this.trigger(event);
    };
});

cepto.proxy = function(fn, context) {
    var args = (2 in arguments) && util.slice.call(arguments, 2);
    if (isFunction(fn)) {
        var proxyFn = function() {
            return fn.apply(context, args ? args.concat(util.slice.call(arguments)) : arguments);
        };
        return proxyFn;
    } else if (isString(context)) {
        if (args) {
            args.unshift(fn[context], fn);
            return cepto.proxy.apply(null, args);
        } else {
            return cepto.proxy(fn[context], fn);
        }
    } else {
        throw new TypeError('expected function');
    }
};

cepto.event = {
    add: add,
    remove: remove
};

cepto.Event = function(type, props) {
    if (!isString(type)) {
        props = type, type = props.type;
    }
    var event = document.createEvent(specialEvents[type] || 'Events'),
        bubbles = true;
    if (props) {
        for (var name in props) {
            (name === 'bubbles') ? 
                (bubbles = !!props[name]) : 
                (event[name] = props[name]);
        }
    }
    event.initEvent(type, bubbles, true);
    return compatible(event);
};

},{"./core-core.js":5,"./util.js":18,"./vars/data.js":19}],17:[function(require,module,exports){
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

},{"./core.js":7,"./util.js":18}],18:[function(require,module,exports){
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

var inArray = function(elem, array, i){
    return emptyArray.indexOf.call(array, elem, i);
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
    inArray: inArray,
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

},{"./core-core.js":5}],19:[function(require,module,exports){
'use strict';

var Data = require('../data-core.js');

module.exports = {
    privData: new Data(), // innser usage
    userData: new Data()
};
},{"../data-core.js":9}]},{},[4]);
