/////////////////////////////////////////////////////////////////////////////
// YouTube
//
'use strict';


var encode       = require('mdurl/encode');
var urlLib       = require('url');
var EmbedzaError = require('../utils/error');


module.exports = {
  match: [
    /^https?:\/\/(?:www\.)?youtube\.com\/?watch\?(?:[^&]+&)*v=([a-zA-Z0-9_-]+)/i,
    /^https?:\/\/www\.youtube\.com\/embed\/([a-zA-Z0-9_-]+)/i,
    /^https?:\/\/www\.youtube\.com\/v\/([a-zA-Z0-9_-]+)/i,
    /^https?:\/\/www\.youtube\.com\/user\/[a-zA-Z0-9_-]+\?v=([a-zA-Z0-9_-]+)/i,
    /^https?:\/\/youtu.be\/([a-zA-Z0-9_-]+)/i,
    /^https?:\/\/m\.youtube\.com\/#\/watch\?(?:[^&]+&)*v=([a-zA-Z0-9_-]+)/i,
    /^https?:\/\/www\.youtube-nocookie\.com\/v\/([a-zA-Z0-9_-]+)/i
  ],

  fetchers: [
    function youtube_fetcher(env, callback) {
      var urlObj = urlLib.parse(env.src, true);

      // Drop playlist info because youtube returns wrong player url - playlist with missed video index
      if (urlObj.query.list) {
        delete urlObj.query.list;
      }
      delete urlObj.search;

      var url = 'http://www.youtube.com/oembed?format=json&url=' + encode(urlLib.format(urlObj), encode.componentChars);

      env.self.request(url, function (err, response, body) {
        if (err) {
          callback(err);
          return;
        }

        if (response.statusCode !== 200) {
          callback(new EmbedzaError('YouTube fetcher: Bad response code: ' + response.statusCode));
          return;
        }

        try {
          env.data.oembed = JSON.parse(body);
        } catch (__) {
          callback(new EmbedzaError('YouTube fetcher: Can\'t parse oembed JSON response'));
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
  ],

  config: {
    autoplay: 'autoplay=1'
  }
};
