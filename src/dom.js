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
