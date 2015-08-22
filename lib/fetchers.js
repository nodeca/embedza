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
// TODO:
//
// - rewrite to streaming process head only
// - encoding
//
fetchers.push({
  id: 'meta',
  priority: -100,
  fn: function meta_fetcher(env, callback) {
    debug('meta');

    debug('meta: request ' + env.src);

    env.self.request(env.src, function (err, response, body) {
      debug('meta: request done');

      if (err) {
        callback(err);
        return;
      }

      if (response.statusCode !== 200) {
        callback(new EmbedzaError('Meta fetcher: Bad response code: ' + response.statusCode));
        return;
      }

      var meta = [];
      var links = Object.create(null);
      var $ = cheerio.load(body || '');

      $('head meta').each(function () {
        var $this = $(this);
        var name = $this.attr('property') || $this.attr('name');
        var value = $this.attr('content') || $this.attr('value') || $this.attr('src');

        if (!name || !value) {
          return; // continue
        }

        meta.push({ name: name, value: value });
      });

      $('head title').each(function () {
        meta.push({ name: 'html-title', value: $(this).text() });
      });

      $('head link').each(function () {
        var $this = $(this);
        var rel = $this.attr('rel') || $this.attr('name');

        if (!links[rel]) {
          links[rel] = [];
        }

        links[rel].push($this[0].attribs);
      });

      env.data.meta = meta;
      env.data.links = links;

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
    if (env.data.links.alternate) {
      alternate = alternate.concat(env.data.links.alternate);
    }

    // flickr.com (maybe not only) use link 'rel="alternative"'
    if (env.data.links.alternative) {
      alternate = alternate.concat(env.data.links.alternative);
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

    env.self.request(oembed[0], function (err, response, body) {
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
