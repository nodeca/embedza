/////////////////////////////////////////////////////////////////////////////
// YouTube
//
'use strict';


const url          = require('url');
const EmbedzaError = require('../utils/error');


let tpl = url.parse('http://www.youtube.com/oembed?format=json&url=foobar', true, true);
delete tpl.search;


module.exports = {
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
    function youtube_fetcher(env, callback) {
      let urlObj = url.parse(env.src, true);

      // Remove hash 'cause oembed endpoint doesn't support those:
      // http://m.youtube.com/#/watch?v=ID -> http://m.youtube.com/watch?v=ID
      //
      if (urlObj.pathname === '/' && urlObj.hash) {
        urlObj = url.parse(env.src.replace(/\/#\//, '/'), true);
      }

      // Drop playlist info because youtube returns wrong player url - playlist with missed video index
      if (urlObj.query.list) {
        delete urlObj.query.list;
      }
      delete urlObj.search;

      tpl.query.url = url.format(urlObj);

      env.self.request(url.format(tpl), function (err, response, body) {
        if (err) {
          callback(err);
          return;
        }

        if (response.statusCode !== 200) {
          err = new EmbedzaError(`YouTube fetcher: Bad response code: ${response.statusCode}`);
          err.code = 'EHTTP';
          err.status = response.statusCode;
          callback(err);
          return;
        }

        try {
          // YouTube is encoding astral characters in a non-standard way like \U0001f44d,
          // so we replace them before body decoding.
          //
          // Example:
          // https://www.youtube.com/oembed?format=json&url=http://www.youtube.com/watch?v=1DSmex4IPxg
          //
          body = body.replace(/(\\+)(U[0-9a-fA-F]{8})/g, function (match, slashes, escape) {
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
          err = new EmbedzaError("YouTube fetcher: Can't parse oembed JSON response");
          err.code = 'ECONTENT';
          callback(err);
          return;
        }

        callback();
      });
    }
  ],

  mixins: [
    'meta',
    'oembed-player',
    'oembed-thumbnail'
  ]
};
