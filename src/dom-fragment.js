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