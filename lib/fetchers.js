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
  fn: async function meta_fetcher(env) {
    debug('meta');

    debug('meta: request ' + env.src);

    let response;

    try {
      response = await env.self.request(env.src);
    } catch (err) {
      // err.response.statusCode - got v10+
      // err.statusCode - old stuff (got v9-, request) that may be passed as a request option
      let statusCode = err.statusCode || (err.response || {}).statusCode;

      if (statusCode) {
        throw new EmbedzaError(
          `Meta fetcher: Bad response code: ${statusCode}`,
          'EHTTP',
          statusCode);
      }
      throw err;
    }

    debug('meta: request done');

    // that should not happen
    /* istanbul ignore next */
    if (response.statusCode !== 200) {
      throw new EmbedzaError(
        `Meta fetcher: Bad response code: ${response.statusCode}`,
        'EHTTP',
        response.statusCode);
    }

    let meta = [];
    let links = Object.create(null);
    let $ = cheerio.load(response.body || '');

    $('head meta').each(function () {
      let $this = $(this);
      let name  = $this.attr('property') || $this.attr('name');
      let value = $this.attr('content') || $this.attr('value') || $this.attr('src');

      if (!name || !value) return; // continue

      meta.push({ name: name, value: value });
    });

    $('head title').each(function () {
      meta.push({ name: 'html-title', value: $(this).text() });
    });

    $('head link').each(function () {
      let $this = $(this);
      let rel = $this.attr('rel') || $this.attr('name');

      if (!links[rel]) links[rel] = [];

      links[rel].push($this[0].attribs);
    });

    env.data.meta = meta;
    env.data.links = links;

    debug('meta: done');
  }
});


// Oembed fetcher
//
fetchers.push({
  id: 'oembed',
  fn: async function oembed_fetcher(env) {
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

    if (alternate.length === 0) return;

    let oembed = [];
    let typeCheckRE = /^(application|text)\/(xml|json)\+oembed$/i;

    // Find oembed links on page
    alternate.forEach(alternate => {
      if (typeCheckRE.test(alternate.type)) {
        oembed.push(alternate.href);
      }
    });

    if (oembed.length === 0) return;

    debug('oembed: request ' + oembed[0]);

    let response;

    try {
      response = await env.self.request(oembed[0]);
    } catch (err) {
      // err.response.statusCode - got v10+
      // err.statusCode - old stuff (got v9-, request) that may be passed as a request option
      let statusCode = err.statusCode || (err.response || {}).statusCode;

      if (statusCode) {
        throw new EmbedzaError(
          `Oembed fetcher: Bad response code: ${statusCode}`,
          'EHTTP',
          statusCode);
      }
      throw err;
    }

    debug('oembed: request done');

    // that should not happen
    /* istanbul ignore next */
    if (response.statusCode !== 200) {
      throw new EmbedzaError(
        `Oembed fetcher: Bad response code: ${response.statusCode}`,
        'EHTTP',
        response.statusCode);
    }

    if (response.headers['content-type'].indexOf('application/json') === 0) {
      try {
        env.data.oembed = JSON.parse(response.body);
      } catch (__) {
        throw new EmbedzaError(
          "Oembed fetcher: Can't parse oembed JSON response",
          'ECONTENT');
      }

      debug('oembed: done');
      return;
    }

    if (response.headers['content-type'].indexOf('text/xml') === 0) {
      env.data.oembed = {};

      let xml = cheerio.load(response.body || '', { xmlMode: true }).root();

      // `<oembed>` is always root element in oembed XML (http://oembed.com/#section2)
      cheerio(xml).find('oembed').children().each(function () {
        let $item = cheerio(this);

        env.data.oembed[this.name] = $item.html();
      });

      debug('oembed: done');
      return;
    }

    throw new EmbedzaError(
      `Oembed fetcher: Unknown oembed response content-type: ${response.headers['content-type']}`,
      'EMIME');
  }
});


module.exports = fetchers;
