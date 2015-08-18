// Data fetchers
//
// - meta
// - oembed
//
'use strict';


var _            = require('lodash');
var EmbedzaError = require('./utils/error');
var cheerio      = require('cheerio');
var debug        = require('debug')('embedza:fetchers');


var fetchers = [];


// Meta-data fetcher
//
// TODO: rewrite to streaming process head only
//
fetchers.push({
  id: 'meta',
  priority: -100,
  fn: function meta_fetcher(env, callback) {
    debug('meta');

    debug('meta: request ' + env.src);

    env.request(env.src, function (err, response, body) {
      debug('meta: request done');

      if (err) {
        callback(err);
        return;
      }

      if (response.statusCode !== 200) {
        callback(new EmbedzaError('Meta fetcher: Bad response code: ' + response.statusCode));
        return;
      }

      // Keys that could be multiple, like 'og:image'
      var rootKeys = [ 'player', 'audio', 'image', 'video', 'stream', 'site' ];
      var meta = {};
      var link = {};
      var intCheck = /^\d+$/;
      var floatCheck = /^\d+\.\d+$/;
      var $ = cheerio.load(body);

      $('meta').each(function () {
        var $this = $(this);
        var name = ($this.attr('property') || $this.attr('name'));

        if (!name) {
          return; // continue
        }

        name = name.toLowerCase();

        var value = $this.attr('content') || $this.attr('value') || $this.attr('src');

        if (!value) {
          return; // continue
        }

        // TODO: encoding

        if (intCheck.test(value)) {
          value = parseInt(value, 10);
        } else if (floatCheck.test(value)) {
          value = parseFloat(value);
        }

        var path = name.split(':');

        if (path.length === 1) {
          path = name.split('.');
        }

        // If last path part is root item - append 'url' as last
        if (rootKeys.indexOf(_.last(path)) !== -1) {
          path.push('url');
        }

        var currentNode = meta;

        // Build 'meta' object:
        //
        // If multiple images:
        //
        // ```
        // <meta name="og:image" value="http://...">
        // <meta name="og:image:width" value="100">
        // <meta name="og:image" value="http://...">
        // <meta name="og:image:width" value="100">
        // ```
        //
        // ```
        // {
        //   og: {
        //     image: [ { url: 'http://...', width: 100 }, { url: 'http://...', width: 100 } ]
        //   }
        // }
        // ```
        //
        // If single image:
        //
        // ```
        // <meta name="og:image" value="http://...">
        // ```
        //
        // ```
        // {
        //   og: {
        //     image: { url: 'http://...' }
        //   }
        // }
        // ```
        //
        for (var i = 0; i < path.length - 1; i++) {
          // If node not exists - create as object
          if (!currentNode[path[i]]) {
            currentNode[path[i]] = {};
            currentNode = currentNode[path[i]];
            continue;
          }

          // If node could contain array of objects:
          //
          // - If node already array and last item contains next key - push new empty object
          // - If node is not array, but already contains next key - make array
          //
          if (rootKeys.indexOf(path[i]) !== -1) {
            if (currentNode[path[i]].hasOwnProperty(path[i + 1])) {
              currentNode[path[i]] = [ currentNode[path[i]], {} ];
            } else if (_.isArray(currentNode[path[i]]) && _.last(currentNode[path[i]]).hasOwnProperty(path[i + 1])) {
              currentNode[path[i]].push({});
            }
          }

          // Next node is last item in array or object by key
          currentNode = _.isArray(currentNode[path[i]]) ? _.last(currentNode[path[i]]) : currentNode[path[i]];
        }

        // Save value in current node
        currentNode[_.last(path)] = value;
      });

      $('title').each(function () {
        meta['html-title'] = $(this).text();
      });

      $('link').each(function () {
        var $this = $(this);
        var rel = $this.attr('rel') || $this.attr('name');
        var linkAttrs = {
          href: $this.attr('href'),
          type: $this.attr('type'),
          sizes: $this.attr('sizes'),
          media: $this.attr('media'),
          title: $this.attr('title')
        };

        if (link[rel]) {
          if (!_.isArray(link[rel])) {
            link[rel] = [ link[rel] ];
          }

          link[rel].push(linkAttrs);
        } else {
          link[rel] = linkAttrs;
        }
      });

      env.data.meta = meta;
      env.data.link = link;

      debug('meta: done');
      callback();
    });
  }
});


// Oembed fetcher
//
fetchers.push({
  id: 'oembed',
  fn: function oembed_fetcher(env, callback) {
    debug('oembed');

    var alternate = [];

    // Usually sites use link 'rel="alternate"' for oembed link
    if (env.data.link.alternate) {
      alternate = alternate.concat(
        _.isArray(env.data.link.alternate) ? env.data.link.alternate : [ env.data.link.alternate ]
      );
    }

    // flickr.com (maybe not only) use link 'rel="alternative"'
    if (env.data.link.alternative) {
      alternate = alternate.concat(
        _.isArray(env.data.link.alternative) ? env.data.link.alternative : [ env.data.link.alternative ]
      );
    }

    if (alternate.length === 0) {
      callback();
      return;
    }

    var oembed = [];
    var typeCheckRE = /^(application|text)\/(xml|json)\+oembed$/i;

    // Find oembed links on page
    alternate.forEach(function (alternate) {
      if (typeCheckRE.test(alternate.type)) {
        oembed.push(alternate.href);
      }
    });

    if (oembed.length === 0) {
      callback();
      return;
    }

    debug('oembed: request ' + oembed[0]);

    env.request(oembed[0], function (err, response, body) {
      debug('oembed: request done');

      if (err) {
        callback(err);
        return;
      }

      if (response.statusCode !== 200) {
        callback(new EmbedzaError('Oembed fetcher: Bad response code: ' + response.statusCode));
        return;
      }

      if (response.headers['content-type'].indexOf('application/json') === 0) {
        try {
          env.data.oembed = JSON.parse(body);
        } catch (__) {
          callback(new EmbedzaError('Oembed fetcher: Can\'t parse oembed JSON response'));
          return;
        }

        debug('oembed: done');
        callback();
        return;
      }

      if (response.headers['content-type'].indexOf('text/xml') === 0) {
        env.data.oembed = {};

        var xml = cheerio.load(body, { xmlMode: true });

        xml.each(function () {
          var $item = cheerio(this);

          env.data.oembed[this.name] = $item.html();
        });

        debug('oembed: done');
        callback();
        return;
      }

      callback(
        new EmbedzaError('Oembed fetcher: Unknown oembed response content-type:' + response.headers['content-type'])
      );
    });
  }
});


module.exports = fetchers;
