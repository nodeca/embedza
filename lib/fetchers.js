// Data fetchers
//
// - meta
// - oembed
//
'use strict';


const EmbedzaError = require('./utils/error');
const cheerio      = require('cheerio');
const debug        = require('debug')('embedza:fetchers');


let fetchers = [];


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

    env.self.request(env.src, (err, response, body) => {
      debug('meta: request done');

      if (err) {
        callback(err);
        return;
      }

      if (response.statusCode !== 200) {
        callback(new EmbedzaError(`Meta fetcher: Bad response code: ${response.statusCode}`, 'EHTTP', response.statusCode));
        return;
      }

      let meta = [];
      let links = Object.create(null);
      let $ = cheerio.load(body || '');

      $('head meta').each(function () {
        let $this = $(this);
        let name = $this.attr('property') || $this.attr('name');
        let value = $this.attr('content') || $this.attr('value') || $this.attr('src');

        if (!name || !value) {
          return; // continue
        }

        meta.push({ name: name, value: value });
      });

      $('head title').each(function () {
        meta.push({ name: 'html-title', value: $(this).text() });
      });

      $('head link').each(function () {
        let $this = $(this);
        let rel = $this.attr('rel') || $this.attr('name');

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

    let alternate = [];

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

    let oembed = [];
    let typeCheckRE = /^(application|text)\/(xml|json)\+oembed$/i;

    // Find oembed links on page
    alternate.forEach(alternate => {
      if (typeCheckRE.test(alternate.type)) {
        oembed.push(alternate.href);
      }
    });

    if (oembed.length === 0) {
      callback();
      return;
    }

    debug('oembed: request ' + oembed[0]);

    env.self.request(oembed[0], (err, response, body) => {
      debug('oembed: request done');

      if (err) {
        callback(err);
        return;
      }

      if (response.statusCode !== 200) {
        callback(new EmbedzaError(`Oembed fetcher: Bad response code: ${response.statusCode}`, 'EHTTP', response.statusCode));
        return;
      }

      if (response.headers['content-type'].indexOf('application/json') === 0) {
        try {
          env.data.oembed = JSON.parse(body);
        } catch (__) {
          callback(new EmbedzaError("Oembed fetcher: Can't parse oembed JSON response", 'ECONTENT'));
          return;
        }

        debug('oembed: done');
        callback();
        return;
      }

      if (response.headers['content-type'].indexOf('text/xml') === 0) {
        env.data.oembed = {};

        let xml = cheerio.load(body || '', { xmlMode: true }).root();

        // `<oembed>` is always root element in oembed XML (http://oembed.com/#section2)
        cheerio(xml).find('oembed').children().each(function () {
          let $item = cheerio(this);

          env.data.oembed[this.name] = $item.html();
        });

        debug('oembed: done');
        callback();
        return;
      }

      callback(new EmbedzaError(`Oembed fetcher: Unknown oembed response content-type: ${response.headers['content-type']}`, 'EMIME'));
    });
  }
});


module.exports = fetchers;
