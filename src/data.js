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