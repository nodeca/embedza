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
// - callback (Function) - `function (err, value)`
//   - err (Error)
//   - value (undefined|null|Any) - undefined if key not exist (undefined|null if no data)
//
Cache.prototype.get = function (key, callback) {
  callback();
};


// Set value for key
//
// - key (String)
// - value (Any)
// - callback (Function) - `function (err)`
//   - err (Error)
//
Cache.prototype.set = function (key, value, callback) {
  callback();
};


module.exports = Cache;
