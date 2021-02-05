/////////////////////////////////////////////////////////////////////////////
// YouTube
//
'use strict';


const url          = require('url');
const EmbedzaError = require('../utils/error');


let tpl = url.parse('https://www.youtube.com/oembed?format=json&url=foobar', true, true);
delete tpl.search;


module.exports = {
  id: 'youtube.com',

  match: [
    /^https?:\/\/(?:www\.)?youtube\.com\/?watch\?(?:[^&]*&)*v=([a-zA-Z0-9_-]+)/i,
    /^https?:\/\/www\.youtube\.com\/embed\/([a-zA-Z0-9_-]+)/i,
    /^https?:\/\/www\.youtube\.com\/v\/([a-zA-Z0-9_-]+)/i,
    /^https?:\/\/www\.youtube\.com\/user\/[a-zA-Z0-9_-]+\?v=([a-zA-Z0-9_-]+)/i,
    /^https?:\/\/youtu.be\/([a-zA-Z0-9_-]+)/i,
    /^https?:\/\/m\.youtube\.com\/?watch\?(?:[^&]*&)*v=([a-zA-Z0-9_-]+)/i,
    /^https?:\/\/m\.youtube\.com\/#\/watch\?(?:[^&]*&)*v=([a-zA-Z0-9_-]+)/i,
    /^https?:\/\/www\.youtube-nocookie\.com\/v\/([a-zA-Z0-9_-]+)/i
  ],

  fetchers: [
    async function youtube_fetcher(env) {
      let urlObj = url.parse(env.src, true);

      // Remove hash 'cause oembed endpoint doesn't support those:
      // http://m.youtube.com/#/watch?v=ID -> http://m.youtube.com/watch?v=ID
      //
      if (urlObj.pathname === '/' && urlObj.hash) {
        urlObj = url.parse(env.src.replace(/\/#\//, '/'), true);
      }

      // Drop playlist info because youtube returns wrong player url - playlist
      // with missed video index
      if (urlObj.query.list) delete urlObj.query.list;

      delete urlObj.search;

      tpl.query.url = url.format(urlObj);

      let response;

      try {
        response = await env.self.request(url.format(tpl));
      } catch (err) {
        // err.response.statusCode - got v10+
        // err.statusCode - old stuff (got v9-, request) that may be passed as a request option
        let statusCode = err.statusCode || (err.response || {}).statusCode;

        if (statusCode) {
          throw new EmbedzaError(
            `YouTube fetcher: Bad response code: ${statusCode}`,
            'EHTTP',
            statusCode);
        }
        throw err;
      }

      // that should not happen
      /* istanbul ignore next */
      if (response.statusCode !== 200) {
        throw new EmbedzaError(
          `YouTube fetcher: Bad response code: ${response.statusCode}`,
          'EHTTP',
          response.statusCode);
      }

      try {
        // YouTube is encoding astral characters in a non-standard way like \U0001f44d,
        // so we replace them before body decoding.
        //
        // Example:
        // https://www.youtube.com/oembed?format=json&url=http://www.youtube.com/watch?v=1DSmex4IPxg
        //
        let body = response.body.replace(/(\\+)(U[0-9a-fA-F]{8})/g, function (match, slashes, escape) {
          if (slashes.length % 2 === 0) {
            // even amount of slashes, means it's escaped
            return match;
          }

          let code = parseInt(escape.slice(1), 16);

          if (code <= 0xFFFF) {
            return slashes.slice(1) + String.fromCharCode(code);
          }

          /* eslint-disable no-bitwise */
          code -= 0x10000;
          return slashes.slice(1) +
                   String.fromCharCode((code >> 10) + 0xD800) +
                   String.fromCharCode((code % 0x400) + 0xDC00);
        });

        env.data.oembed = JSON.parse(body);

      } catch (__) {
        throw new EmbedzaError(
          "YouTube fetcher: Can't parse oembed JSON response",
          'ECONTENT');
      }
    }
  ],

  mixins: [
    'meta',
    'oembed-player',
    'oembed-thumbnail'
  ],

  mixinsAfter: [
    '*',
    async function (env) {
      env.result.snippets.forEach(snippet => {
        if (snippet.type !== 'text/html' ||
          snippet.tags.indexOf('player') === -1) {
          return; // continue
        }

        snippet.media.autoplay = 'autoplay=1';
      });

      return;
    }
  ]
};
