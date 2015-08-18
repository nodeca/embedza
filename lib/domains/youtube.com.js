/////////////////////////////////////////////////////////////////////////////
// YouTube
//
'use strict';


var encode       = require('mdurl/encode');
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
      var url = 'http://www.youtube.com/oembed?format=json&url=' + encode(env.src, encode.componentChars);

      env.request(url, function (err, response, body) {
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
