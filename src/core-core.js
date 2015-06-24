'use strict';

var cepto = function(selector, context) {
    return new cepto.fn.init(selector, context);
};

module.exports = cepto;