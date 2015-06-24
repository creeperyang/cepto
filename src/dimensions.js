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
