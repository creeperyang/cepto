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
