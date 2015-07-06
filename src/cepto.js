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