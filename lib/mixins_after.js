// Data handlers (mixins after)
//
// TODO: probably need define priority
//
'use strict';


const _            = require('lodash');
const async        = require('async');
const url          = require('url');
const path         = require('path');
const size         = require('probe-image-size');
const utils        = require('./utils');
const EmbedzaError = require('./utils/error');
const debug        = require('debug')('embedza:mixins_after');


let mixinsAfter = [];


// Resolve snippet's href
//
// - '/img/icon.png' -> 'http://example.com/img/icon.png'
// - '//example.com/img/icon.png' -> 'http(s)://example.com/img/icon.png'
//
mixinsAfter.push({
  id: 'resolve-href',
  fn: function resolve_href_after_mixin(env, callback) {
    debug('resolve-href');

    env.result.snippets.forEach(snippet => {
      if (!snippet.href) {
        return; // continue
      }

      let urlObj = url.parse(snippet.href, false, true);

      // If url is relative make it absolute from source
      if (!urlObj.host && !urlObj.protocol) {
        snippet.href = url.resolve(env.src, snippet.href);
        return; // continue
      }

      // If url has no protocol (starts with `//`) - use from source
      if (!urlObj.protocol) {
        urlObj.protocol = url.parse(env.src).protocol;
        snippet.href = url.format(urlObj);
      }
    });

    debug('resolve-href: done');
    callback();
  }
});


// Detect content-type of snippet (if not defined yet)
//
mixinsAfter.push({
  id: 'mime-detect',
  fn: function mime_detect_after_mixin(env, callback) {
    debug('mime-detect');

    async.each(env.result.snippets, (snippet, next) => {

      // If type already defined - skip
      if (snippet.type) {
        next();
        return;
      }

      // Get path without get params
      let pathname = url.parse(snippet.href).pathname;

      if (pathname) {
        // Get extension
        let ext = path.extname(pathname);

        // Detect type by extension
        snippet.type = ({
          '.mp4': 'video/mp4',
          '.ogg': 'video/ogg',
          '.webm': 'video/webm'
        })[ext];
      }

      if (snippet.type) {
        next();
        return;
      }

      debug('mime-detect: request ' + snippet.href);

      // Request content headers
      env.self.request(snippet.href, { method: 'HEAD' }, (err, response) => {
        debug('mime-detect: request finish');

        if (err) {
          next(err);
          return;
        }

        if (response.statusCode !== 200) {
          err = new EmbedzaError('Mime-detect mixin after handler: Bad response code: ' + response.statusCode);
          err.code = 'EHTTP';
          err.status = response.statusCode;
          next(err);
          return;
        }

        snippet.type = response.headers['content-type'].split(';')[0];

        // If can't detect type - remove snippet
        if (!snippet.type) {
          env.result.snippets = _.without(env.result.snippets, snippet);
        }

        // Add tag html5 for html content
        if (snippet.type === 'text/html' && snippet.tags.indexOf('html5') === -1) {
          snippet.tags.push('html5');
        }

        next();
      });
    }, err => {
      debug('mime-detect: done');
      callback(err);
    });
  }
});


// Add ssl tag for https snippets
//
mixinsAfter.push({
  id: 'ssl-force',
  fn: function ssl_force_after_mixin(env, callback) {
    debug('ssl-force');

    env.result.snippets.forEach(snippet => {
      if (snippet.href && url.parse(snippet.href).protocol === 'https:' && snippet.tags.indexOf('ssl') === -1) {
        snippet.tags.push('ssl');
      }
    });

    debug('ssl-force: done');
    callback();
  }
});


// Merge snippets by href
//
mixinsAfter.push({
  id: 'merge',
  fn: function merge_after_mixin(env, callback) {
    debug('merge');

    let snippets = {};

    env.result.snippets.forEach(snippet => {
      if (!snippets[snippet.href]) {
        snippets[snippet.href] = snippet;
        return; // continue
      }

      snippets[snippet.href].tags = _.union(snippets[snippet.href].tags, snippet.tags);
      snippets[snippet.href].media = _.merge(snippets[snippet.href].media, snippet.media);
    });

    env.result.snippets = _.values(snippets);

    debug('merge: done');
    callback();
  }
});


// Load image dimensions by url
//
// - url (String)
// - cache (Object)
// - callback (Function)
//
function loadImageSize(url, cache, callback) {
  let cacheKey = 'image#' + url;
  let ttl = 24 * 60 * 60 * 1000; // 1 day

  // Try get image dimensions from cache
  cache.get(cacheKey, (err, data) => {
    if (err) {
      callback(err);
      return;
    }

    // If image dimensions in cache and not expired - return it
    if (data && data.ts > Date.now() - ttl) {
      callback(null, data.dimensions);
      return;
    }

    // If no data in cache - fetch
    size(url, (err, dimensions) => {
      if (err) {
        callback(err);
        return;
      }

      // Save data to cache
      cache.set(cacheKey, { dimensions: dimensions, ts: Date.now() }, err => {
        if (err) {
          callback(err);
          return;
        }

        // Return data
        callback(null, dimensions);
      });
    });
  });
}


// Load images size
//
mixinsAfter.push({
  id: 'image-size',
  fn: function image_size_after_mixin(env, callback) {
    debug('image-size');

    // Create debounced loadImageSize function if not exists
    if (!env.self.__loadImageSize__) {
      env.self.__loadImageSize__ = utils.uniqueAsync((url, callback) => {
        loadImageSize(url, env.self.__options__.cache, callback);
      });
    }

    let supportedExt = [ '.bmp', '.gif', '.jpg', '.jpeg', '.png', '.psd', '.tif', '.tiff', '.webp', '.svg' ];

    async.each(env.result.snippets, (snippet, next) => {
      if (snippet.type !== 'image') {
        next();
        return;
      }

      if (snippet.media && snippet.media.width && snippet.media.height) {
        next();
        return;
      }

      if (supportedExt.indexOf(path.extname(url.parse(snippet.href).pathname).toLowerCase()) === -1) {
        next();
        return;
      }

      debug('image-size: load ' + snippet.href);

      env.self.__loadImageSize__(snippet.href, (err, dimensions) => {
        debug('image-size: load done');

        if (err) {
          next(err);
          return;
        }

        if (dimensions.wUnits === 'px' && dimensions.hUnits === 'px') {
          snippet.media = snippet.media || {};

          snippet.media.width = dimensions.width;
          snippet.media.height = dimensions.height;
        }

        next();
      });
    }, err => {
      debug('image-size: done');
      callback(err);
    });
  }
});


// Set autoplay parameter to `snippet.media`
//
mixinsAfter.push({
  id: 'set-autoplay',
  fn: function set_autoplay_after_mixin(env, callback) {
    debug('set-autoplay');

    env.result.snippets.forEach(snippet => {
      if (snippet.type !== 'text/html' ||
          snippet.tags.indexOf('player') === -1 ||
          snippet.tags.indexOf('autoplay') === -1) {

        return; // continue
      }

      snippet.media.autoplay = 'autoplay=1';
    });

    debug('set-autoplay: done');
    callback();
  }
});


// Convert 'width', 'height' and 'duration' to float and remove bad values
//
mixinsAfter.push({
  id: 'convert-str-int',
  fn: function convert_str_int_after_mixin(env, callback) {
    debug('convert-str-int');

    let fields = [ 'width', 'height', 'duration' ];

    env.result.snippets.forEach(snippet => {
      fields.forEach(field => {
        if (snippet.media[field]) {
          snippet.media[field] = parseFloat(snippet.media[field]);

          if (!isFinite(snippet.media[field]) || snippet.media[field] < 0) {
            delete snippet.media[field];
          }
        }

        // Delete `width` if `height` doesn't exists and vise versa
        if (!snippet.media.width || !snippet.media.height) {
          if (snippet.media.width) delete snippet.media.width;
          if (snippet.media.height) delete snippet.media.height;
        }
      });
    });

    debug('convert-str-int: done');
    callback();
  }
});


module.exports = mixinsAfter;
