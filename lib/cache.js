// Stub cache for Embedza
//
'use strict';


// Create Cache
//
function Cache() {
}


// Get value for key
//
// - key (String)
//
// Return `Promise(undefined|null|Any)
//
// - undefined|null if key not exist
//
Cache.prototype.get = function (/* key */) {
  return Promise.resolve();
};


// Set value for key
//
// - key (String)
// - value (Any)
//
Cache.prototype.set = function (/* key, value */) {
  return Promise.resolve();
};


module.exports = Cache;
