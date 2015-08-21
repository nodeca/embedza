// Utils
//
'use strict';


var _            = require('lodash');
var EmbedzaError = require('./error');


// Get meta value by list of names in priority order
//
function findMeta(meta, names) {
  if (!meta) {
    return null;
  }

  var val;

  for (var i = 0; i < names.length; i++) {
    val = _.get(meta, names[i]);

    if (val) {
      return val;
    }
  }
}


// Check record allowed in whitelist
//
function wlCheck(wl, record, value) {
  if (!value) {
    value = 'allow';
  }

  var wlItem = _.get(wl, record);

  if (_.isArray(wlItem)) {
    return wlItem.indexOf(value) !== -1;
  }

  return wlItem === value;
}


// Creates a wrapper to dedupe function calls with the same param. Simplified
// implementation, for single `String` param only.
//
// - fn (Function) - `function (param, callback)`
//
function uniqueAsync(fn) {
  if (fn.length !== 2) {
    throw new EmbedzaError("uniqueAsync: 'fn' should have two parameters");
  }

  var callbacks = {};

  return function () {
    var cb = arguments[1];
    var param = arguments[0];

    // If `fn` execution started - add callback to debounced array and stop here
    if (callbacks[param]) {
      callbacks[param].push(cb);
      return;
    }

    callbacks[param] = [ cb ];

    // Execute `fn`
    fn.apply(this, [ param, function () {
      var self = this;
      var args = Array.prototype.slice.call(arguments, 0);
      var cbs = callbacks[param];

      // Remove debounced callbacks array
      delete callbacks[param];

      // Call all callbacks
      cbs.forEach(function (cb) {
        cb.apply(self, args);
      });
    } ]);
  };
}


exports.findMeta = findMeta;
exports.wlCheck = wlCheck;
exports.uniqueAsync = uniqueAsync;
