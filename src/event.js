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
