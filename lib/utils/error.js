// Embedza error class based on http://stackoverflow.com/questions/8458984
//
'use strict';


var inherits = require('util').inherits;


function EmbedzaError(message, code, statusCode) {
  // Super constructor
  Error.call(this);

  // Super helper method to include stack trace in error object
  Error.captureStackTrace(this, this.constructor);

  // Set our function’s name as error name
  this.name = this.constructor.name;

  // Set the error message
  this.message = message;

  if (code) this.code = code;

  if (statusCode) this.statusCode = statusCode;
}

// Inherit from Error
inherits(EmbedzaError, Error);


module.exports = EmbedzaError;
