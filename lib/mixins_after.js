// Data handlers (mixins after)
//
// TODO: probably need define priority
//
'use strict';


var _            = require('lodash');
var async        = require('async');
var url          = require('url');
var path         = require('path');
var size         = require('request-image-size');
var EmbedzaError = require('./utils/error');
var debug        = require('debug')('embedza:mixins_after');


var mixinsAfter = [];


// Resolve snippet's href ('/img/icon.png' -> 'http://example.com/img/icon.png')
//
mixinsAfter.push({
  id: 'resolve-href',
  fn: function resolve_href_after_mixin(env, callback) {
    debug('resolve-href');

    var fullHrefRe = /^(https?:)?\/\//;

    env.result.snippets.forEach(function (snippet) {
      if (!snippet.href) {
        return; // continue
      }

      if (!fullHrefRe.test(snippet.href)) {
        snippet.href = url.resolve(env.src, snippet.href);
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

    async.each(env.result.snippets, function (snippet, next) {

      // If type already defined - skip
      if (snippet.type) {
        next();
        return;
      }

      // Get path without get params
      var pathname = url.parse(snippet.href).pathname;

      if (pathname) {
        // Get extension
        var ext = path.extname(pathname);

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
      env.request(snippet.href, { method: 'HEAD' }, function (err, response) {
        debug('mime-detect: request finish');

        if (err) {
          callback(err);
          return;
        }

        if (response.statusCode !== 200) {
          callback(new EmbedzaError('Mime-detect mixin after handler: Bad response code: ' + response.statusCode));
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
    }, function (err) {
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

    env.result.snippets.forEach(function (snippet) {
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

    var snippets = {};

    env.result.snippets.forEach(function (snippet) {
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


// Load images size
//
mixinsAfter.push({
  id: 'image-size',
  fn: function image_size_after_mixin(env, callback) {
    debug('image-size');

    var supportedExt = [ '.bmp', '.gif', '.jpg', '.jpeg', '.png', '.psd', '.tif', '.tiff', '.webp', '.svg' ];

    async.each(env.result.snippets, function (snippet, next) {
      if (snippet.type !== 'image') {
        next();
        return;
      }

      if (snippet.media && snippet.media.width && snippet.media.height) {
        next();
        return;
      }

      if (supportedExt.indexOf(path.extname(snippet.href).toLowerCase()) === -1) {
        next();
        return;
      }

      debug('image-size: load ' + snippet.href);

      size(snippet.href, function (err, dimensions) {
        debug('image-size: load done');

        if (err) {
          // If image invalid - remove snippet and skip
          env.result.snippets = _.without(env.result.snippets, snippet);
          next();
          return;
        }

        snippet.media = snippet.media || {};

        snippet.media.width = dimensions.width;
        snippet.media.height = dimensions.height;

        next();
      });
    }, function (err) {
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

    env.result.snippets.forEach(function (snippet) {
      if (snippet.type !== 'text/html' || snippet.tags.indexOf('player') === -1) {
        return; // continue
      }

      if (env.config.autoplay) {
        snippet.media.autoplay = env.config.autoplay;
      }
    });

    debug('set-autoplay: done');
    callback();
  }
});


module.exports = mixinsAfter;
