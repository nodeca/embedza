'use strict';


const _           = require('lodash');
const yaml        = require('js-yaml');
const path        = require('path');
const requireAll  = require('require-all');
const Cache       = require('./cache');
const fetchers    = require('./fetchers');
const mixins      = require('./mixins');
const mixinsAfter = require('./mixins_after');
const urlLib      = require('url');
const domainsConf = require('../config/domains_conf.json');
const templates   = require('./templates');
const fs          = require('fs');
const debug       = require('debug')('embedza:common');
const Promise     = require('bluebird');
const got         = require('got');


// Load custom domains
let domains = _.reduce(requireAll(path.join(__dirname, 'domains')), (acc, config, id) => {
  // If config is in folder - load it. Now we have no custom domains with folders
  /* istanbul ignore next */
  if (config.index) config = config.index;

  // Fill `id` by file name
  config.id = id;
  acc.push(config);
  return acc;
}, []);

// Load generic domains
domains = domains.concat(yaml.safeLoad(fs.readFileSync(path.join(__dirname, '..', 'config', 'generic.yml'))) || []);


// Create Embedza
//
// options:
//
// - enabledProviders ([String]|Boolean) - optional, array of enabled providers
//   or `true` for all providers, default `true`
// - cache (Cache) - optional, custom cache class, default `new Cache()`
//
function Embedza(options) {
  debug('init');

  this.__options__ = _.defaults({}, options, {
    enabledProviders: true,
    cache: new Cache()
  });

  this.templates = _.clone(templates);
  this.aliases = {
    block: [ 'player', 'rich' ]
  };

  this.__fetchers__ = {};
  this.__mixins__ = {};
  this.__mixinsAfter__ = {};
  this.__domains__ = [];

  // Domains config cache
  this.__rulesCache__ = null;

  // Init plugins

  fetchers.forEach(fetcher => this.addFetcher(fetcher));
  mixins.forEach(mixin => this.addMixin(mixin));
  mixinsAfter.forEach(mixinAfter => this.addMixinAfter(mixinAfter));
  domains.forEach(domain => this.addDomain(domain));

  // Deactivate some providers if needed
  if (_.isArray(this.__options__.enabledProviders)) {

    // Disable all first
    this.forEach(domain => { domain.enabled = false; });

    // Enable required and add missing providers
    this.__options__.enabledProviders.forEach(domain => {
      if (!this.__domains__[domain]) {
        this.addDomain(domain);
      } else {
        this.__domains__[domain].enabled = true;
      }
    });
  }

  debug('init: done');
}


/* eslint-disable consistent-return */

// Render url
//
// - url (String|Object) - content url or result of `.info()`
// - type ([String]|String) - format name or list of suitable formats by priority ('block', 'inline')
//
// returns:
//
//   - `result.html`
//   - `result.type`
//
Embedza.prototype.render = function (url, type, callback) {
  if (!callback) return this.__render__(url, type);

  this.__render__(url, type).asCallback(callback);
};


Embedza.prototype.__render__ = Promise.coroutine(function* (url, type) {
  debug('render');

  if (!_.isArray(type)) type = [ type ];

  // Replace aliases
  type = type.reduce((acc, t) => {
    if (this.aliases[t]) {
      this.aliases[t].forEach(type => acc.push({ type, alias: t }));
    } else {
      acc.push({ type: t });
    }

    return acc;
  }, []);


  // If url is NOT string - no need to fetch, that's real data
  let data = !_.isString(url) ? url : yield this.info(url);

  debug('render: load done');

  if (!data) return null;

  let tpl, html;
  let tplData = _.assign({}, data, {
    utils: {
      url: urlLib
    }
  });

  // Find and render suitable template

  for (let i = 0; i < type.length; i++) {
    tpl = this.templates[data.domain + '_' + type[i].type] || this.templates['default_' + type[i].type];

    if (tpl) {
      try {
        html = tpl(tplData);
        // If we can't render template (maybe not enough data) - use next
      } catch (__) {
        continue;
      }

      debug('render: done');

      return {
        html: _.trim(html),
        type: type[i].alias || type[i].type
      };
    }
  }

  return null;
});


// Get data for URL
//
// - url (String) - resource URL
// - callback (Function) - `function (err, result)`
//
// Result fields:
//
// - domain (String) - domain plugin id ('youtube.com', 'vimeo.com', ...)
// - src (String) - source url
// - meta (Object)
//   - title
//   - description
//   - date
//   - canonical
//   - shortlink
//   - category
//   - keywords
//   - author
//   - author_url
//   - copyright
//   - license
//   - license_url
//   - site
//   - duration
//   - country-name
//   - postal-code
//   - street-address
//   - region
//   - locality
//   - latitude
//   - longitude
//   - price
//   - currency_code
//   - brand
//   - product_id
//   - availability
//   - quantity
// - snippets ([Object])
//   - type (String)
//   - tags ([String])
//   - href (String)
//   - media (Object)
//   - html (String)
//
// Env fields:
//
// - src (String) - resource url
// - wl (Object)
// - config (Object) - additional domain config: autoplay parameter name, API key
// - data (Object) - fetchers result
// - result (Object) - see above
// - self (Embedza)
//
Embedza.prototype.info = function (url, callback) {
  if (!callback) return this.__info__(url);

  this.__info__(url).asCallback(callback);
};

/* eslint-enable consistent-return */


Embedza.prototype.__info__ = Promise.coroutine(function* (url) {
  debug('info');

  let urlObj = urlLib.parse(url);

  if (!urlObj.host) {
    debug('info: skip - bad url');
    return null;
  }

  // Sanitize auth params
  delete urlObj.auth;

  // Fill plugins environment
  let env = {
    src: urlLib.format(urlObj),
    wl: null,
    config: null,
    data: {},
    result: {
      src: '',
      domain: '',
      meta: {},
      snippets: []
    },
    self: this
  };

  env.result.src = env.src;

  // Create domains config cache if not created yet
  if (!this.__rulesCache__) {
    this.__buildCache__();
  }

  // Find domain plugin
  if (this.__rulesCache__.match && this.__rulesCache__.match.test(env.src)) {
    env.result.domain = _.findKey(
      this.__rulesCache__.domains,
      domain => domain.match.test(env.src)
    );
  }

  // If no domain plugin - stop here
  if (!env.result.domain) {
    debug('info: skip - rule not found');
    return null;
  }

  env.config = this.__domains__[env.result.domain].config;

  // Get data from cache
  let data = yield this.__options__.cache.get(url);

  if (data && data.info) {
    debug('info: done - from cache');
    return data.info;
  }

  let domainPatterns = [ env.result.domain, 'www.' + env.result.domain, '*.' + env.result.domain ];

  // Try find domain in conf
  for (let i = 0; i < domainPatterns.length; i++) {
    if (domainsConf.domains[domainPatterns[i]]) {
      env.wl = domainsConf.domains[domainPatterns[i]];
      break;
    }
  }

  let domainRules = this.__rulesCache__.domains[env.result.domain];

  // Run fetchers
  yield Promise.resolve(domainRules.fetchers).each(fetcher => fetcher.fn(env));
  // Run mixins
  yield Promise.resolve(domainRules.mixins).each(mixin => mixin(env));
  // Run mixins after
  yield Promise.resolve(domainRules.mixinsAfter).each(mixinAfter => mixinAfter(env));

  // Save fetched data in cache
  yield this.__options__.cache.set(url, { info: env.result, ts: Date.now() });

  debug('info: done');
  return env.result;
});


// Make request
//
// - url (String) - request url
// - options (Object)
//   - method (String) - optional, 'GET', 'HEAD', 'POST', ..., default 'GET'
// - callback (Function) - `function (err, response, body)`
//   - err (Error) - possible socket error
//   - response (Response) - server response
//   - body (String) - response body
//
Embedza.prototype.request = function (url, options) {
  return got(url, options);
};


// Add data fetcher
//
// - options (Object)
//   - id (String) - fetcher id
//   - priority (Number) - optional, run priority, default `0`
//   - fn (Function) - fetcher handler - `function (env, callback)`
//
Embedza.prototype.addFetcher = function (options) {
  this.__fetchers__[options.id] = _.defaults({}, options, {
    priority: 0
  });

  // Clear domains match cache
  this.__rulesCache__ = null;
};


// Add mixin (data handler)
//
// - options (Object)
//   - id (String) - mixin id
//   - fn (Function) - mixin handler - `function (env, callback)`
//
Embedza.prototype.addMixin = function (options) {
  this.__mixins__[options.id] = options.fn;

  // Clear domains match cache
  this.__rulesCache__ = null;
};


// Add mixin after handler
//
// - options (Object)
//   - id (String) - post id
//   - fn (Function) - post handler - `function (env, callback)`
//
Embedza.prototype.addMixinAfter = function (options) {
  this.__mixinsAfter__[options.id] = options.fn;

  // Clear domains match cache
  this.__rulesCache__ = null;
};


// Enable domain with default rules or add custom one
//
// - options (Object|String)
//   - id (String) - provider ID (`youtube.com`)
//   - match ([RegExp]|RegExp) - patterns to match
//   - fetchers ([String|Function|Object]) - optional, array of fetchers dependency
//   - mixins ([String|Function]) - optional, array of mixins dependency
//   - mixinsAfter ([String|Function]) - optional, array of mixins after dependency
//   - config (Object) - additional config: autoplay parameter name, API key
//
Embedza.prototype.addDomain = function (options) {
  // If options is string `embedza.addDomain('example.com')` - convert to object
  if (_.isString(options)) {
    options = {
      id: options
    };
  }

  let domainOptions = _.defaults({}, options, {
    fetchers: [ '*' ],
    mixins: [ '*' ],
    mixinsAfter: [ '*' ],
    match: [
      new RegExp(`^https?://(?:www\\.)?${_.escapeRegExp(options.id)}.*`)
    ],
    enabled: this.__options__.enabledProviders === true || this.__options__.enabledProviders.indexOf(options.id) !== -1,
    config: {}
  });

  domainOptions.match = _.isArray(domainOptions.match) ? domainOptions.match : [ domainOptions.match ];

  this.__domains__[domainOptions.id] = domainOptions;

  // Clear domains cache
  this.__rulesCache__ = null;
};


// Iterate through domains to modify it
//
// - fn (Function) - `function (domain)`
//
Embedza.prototype.forEach = function (fn) {
  _.values(this.__domains__).forEach(fn);
  // Clear domains match cache
  this.__rulesCache__ = null;
};


// Get domain rule by name
//
// - name (String) - rule name
//
Embedza.prototype.rule = function (name) {
  return this.__domains__[name];
};


// Create domains config cache
//
Embedza.prototype.__buildCache__ = function () {
  debug('__buildCache__');

  this.__rulesCache__ = {
    domains: {}, // domains with joined matchers and expanded fetchers, mixins and mixinsAfter
    match: null // RegEx to check if any domains match
  };

  _.values(this.__domains__).forEach(domain => {
    if (!domain.enabled) {
      return; // continue
    }

    let cache = {
      // Compile match pattern
      match: new RegExp(domain.match.reduce(function (acc, re) {
        acc.push(`(${re.source})`);
        return acc;
      }, []).join('|'), 'i'),

      fetchers: domain.fetchers.slice(0),
      mixins: domain.mixins.slice(0),
      mixinsAfter: domain.mixinsAfter.slice(0)
    };


    ///////////////////////////////////////////////////////////////////////////
    // Fetchers

    cache.fetchers = _.uniq(cache.fetchers.reduce((acc, fetcher) => {
      if (_.isFunction(fetcher)) {

        // If custom fetcher is function - transform to object with priority
        acc.push({ priority: 0, fn: fetcher });

      } else if (_.isString(fetcher)) {

        if (fetcher === '*') {

          // If fetcher is wildcard - use all common mixins
          acc = acc.concat(_.values(this.__fetchers__));
        } else {

          // If fetcher is string id - replace by common fetcher
          acc.push(this.__fetchers__[fetcher]);
        }
      } else {

        // If custom fetcher - use it
        acc.push(fetcher);
      }

      return acc;
    }, []));

    // Sort fetchers by priority
    cache.fetchers = _.sortBy(cache.fetchers, 'priority');


    ///////////////////////////////////////////////////////////////////////////
    // Mixins

    cache.mixins = _.uniq(cache.mixins.reduce((acc, mixin) => {
      if (_.isString(mixin)) {
        if (mixin === '*') {

          // If mixin is wildcard - use all common mixins
          acc = acc.concat(_.values(this.__mixins__));
        } else {

          // If mixin is string id - replace by common mixins
          acc.push(this.__mixins__[mixin]);
        }
      } else {

        // If custom mixin - use it
        acc.push(mixin);
      }

      return acc;
    }, []));


    ///////////////////////////////////////////////////////////////////////////
    // Mixins after

    cache.mixinsAfter = _.uniq(cache.mixinsAfter.reduce((acc, mixinAfter) => {
      if (_.isString(mixinAfter)) {
        if (mixinAfter === '*') {

          // If mixin after is wildcard - use all common mixins
          acc = acc.concat(_.values(this.__mixinsAfter__));
        } else {

          // If mixin after is string id - replace by common mixins after
          acc.push(this.__mixinsAfter__[mixinAfter]);
        }
      } else {

        // If custom mixin after - use it
        acc.push(mixinAfter);
      }

      return acc;
    }, []));


    // Add to cache
    this.__rulesCache__.domains[domain.id] = cache;
  });

  // Compile match pattern for all domains
  this.__rulesCache__.match = new RegExp(_.reduce(this.__rulesCache__.domains, (acc, domain) => {
    acc.push(`(${domain.match.source})`);
    return acc;
  }, []).join('|'), 'i');

  debug('__buildCache__: done');
};


module.exports = Embedza;
