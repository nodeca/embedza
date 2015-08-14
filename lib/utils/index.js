// Utils
//
'use strict';


var _ = require('lodash');


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


exports.findMeta = findMeta;
exports.wlCheck = wlCheck;
