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
