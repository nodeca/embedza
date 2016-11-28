// Data handlers (mixins after)
//
// TODO: probably need define priority
//
'use strict';


const _            = require('lodash');
const url          = require('url');
const path         = require('path');
const size         = require('probe-image-size');
const EmbedzaError = require('./utils/error');
const debug        = require('debug')('embedza:mixins_after');
const Promise      = require('bluebird');


let mixinsAfter = [];


// Resolve snippet's href
//
// - '/img/icon.png' -> 'http://example.com/img/icon.png'
// - '//example.com/img/icon.png' -> 'http(s)://example.com/img/icon.png'
//
mixinsAfter.push({
  id: 'resolve-href',
  fn: function resolve_href_after_mixin(env) {
    debug('resolve-href');

    env.result.snippets.forEach(snippet => {
      if (!snippet.href) return; // continue

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

    return Promise.resolve();
  }
});


// Detect content-type of snippet (if not defined yet)
//
mixinsAfter.push({
  id: 'mime-detect',
  fn: Promise.coroutine(function* mime_detect_after_mixin(env) {
    debug('mime-detect');

    for (let snippet of env.result.snippets) {

      // If type already defined - skip
      if (snippet.type) continue;

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

      if (snippet.type) continue;

      debug('mime-detect: request ' + snippet.href);

      // Request content headers

      let response;

      try {
        response = yield env.self.request(snippet.href, { method: 'HEAD' });
      } catch (err) {
        if (err.statusCode) {
          throw new EmbedzaError(
            `Mime-detect mixin after handler: Bad response code: ${err.statusCode}`,
            'EHTTP',
            err.statusCode);
        }
        throw err;
      }

      debug('mime-detect: request finish');

      // that should not happen
      /* istanbul ignore next */
      if (response.statusCode !== 200) {
        throw new EmbedzaError(
          `Mime-detect mixin after handler: Bad response code: ${response.statusCode}`,
          'EHTTP',
          response.statusCode);
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
    }

    debug('mime-detect: done');
  })
});


// Add ssl tag for https snippets
//
mixinsAfter.push({
  id: 'ssl-force',
  fn: function ssl_force_after_mixin(env) {
    debug('ssl-force');

    env.result.snippets.forEach(snippet => {
      if (snippet.href && url.parse(snippet.href).protocol === 'https:' && snippet.tags.indexOf('ssl') === -1) {
        snippet.tags.push('ssl');
      }
    });

    debug('ssl-force: done');

    return Promise.resolve();
  }
});


// Merge snippets by href
//
mixinsAfter.push({
  id: 'merge',
  fn: function merge_after_mixin(env) {
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

    return Promise.resolve();
  }
});


// Load image dimensions by url
//
// - url (String)
// - cache (Object)
// - callback (Function)
//
function loadImageSize(url, cache) {
  let cacheKey = 'image#' + url;
  let ttl = 24 * 60 * 60 * 1000; // 1 day

  // Try get image dimensions from cache
  return cache.get(cacheKey).then(data => {
    // If image dimensions in cache and not expired - return it
    if (data && data.ts > Date.now() - ttl) return data.dimensions;

    // If no data in cache - fetch
    return size(url)
      .catch(err => {
        // Suppress errors for broken data, return `null` instead
        if (err.code === 'ECONTENT') return null;
        throw err;
      })
      .then(dimensions => {
        // Save data to cache
        return cache.set(cacheKey, { dimensions: dimensions, ts: Date.now() })
          // .catch (() => {}) // ignore cache write errors
          // Return data
          .then(() => dimensions);
      });
  });
}


// Load images size
//
mixinsAfter.push({
  id: 'image-size',
  fn: Promise.coroutine(function* image_size_after_mixin(env) {
    debug('image-size');

    let supportedExt = [ '.bmp', '.gif', '.jpg', '.jpeg', '.png', '.psd', '.tif', '.tiff', '.webp', '.svg' ];

    let queue = [];

    // Filter snippets to fetch dimentions for

    for (let snippet of env.result.snippets) {
      if (snippet.type !== 'image') continue;

      if (snippet.media && snippet.media.width && snippet.media.height) continue;

      if (supportedExt.indexOf(path.extname(url.parse(snippet.href).pathname).toLowerCase()) === -1) {
        continue;
      }

      queue.push(snippet);
    }

    let uniqHrefs = _.uniq((queue.map(snippet => snippet.href)));

    let dimensions = {};

    yield Promise.all(uniqHrefs.map(href => {
      debug(`image-size: load ${href}`);

      return loadImageSize(href, env.self.__options__.cache)
        .then(size => {
          dimensions[href] = size;

          debug('image-size: load done');
        });
    }));

    // Pin dimentions to snippets
    for (let snippet of queue) {
      let sz = dimensions[snippet.href];

      if (!sz) continue;

      if (sz.wUnits !== 'px' || sz.hUnits !== 'px') continue;

      snippet.media = snippet.media || {};

      snippet.media.width  = sz.width;
      snippet.media.height = sz.height;
    }

    debug('image-size: done');
  })
});


// Set autoplay parameter to `snippet.media`
//
mixinsAfter.push({
  id: 'set-autoplay',
  fn: function set_autoplay_after_mixin(env) {
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

    return Promise.resolve();
  }
});


// Convert 'width', 'height' and 'duration' to float and remove bad values
//
mixinsAfter.push({
  id: 'convert-str-int',
  fn: function convert_str_int_after_mixin(env) {
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

    return Promise.resolve();
  }
});


module.exports = mixinsAfter;
