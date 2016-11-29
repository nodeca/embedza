'use strict';

const _    = require('lodash');

module.exports = {
  default_inline: _.template(require('./default_inline'), { variable: 'self' }),
  default_player: _.template(require('./default_player'), { variable: 'self' }),
  default_rich:   _.template(require('./default_rich'),   { variable: 'self' })
};
