/////////////////////////////////////////////////////////////////////////////
// Vimeo
//
'use strict';


var _            = require('lodash');
var url          = require('url');
var EmbedzaError = require('../utils/error');


var tpl = url.parse('https://vimeo.com/api/oembed.json?url=foobar', true, true);
delete tpl.search;


module.exports = {
  match: [
    /^https?:\/\/(?:www\.)?vimeo\.com\/./i,
    /^https?:\/\/player\.vimeo\.com\/\d+/i,
    /^https?:\/\/player\.vimeo\.com\/video\/\d+/i
  ],

  fetchers: [
    // Add a custom fetcher that retrieves only oembed data using a hardcoded
    // endpoint.
    //
    // The reason being that we have quite a lot of vimeo videos, and fetching
    // html page for each of them triggers a temporary 1-day ip+user-agent ban
    // with 429 status code.
    //
    // This way fetcher misses out on favicon and flashplayer urls, but this
    // data is not necessary to generate embedded videos with the templates
    // we have now.
    //
    function vimeo_fetcher(env, callback) {
      tpl.query.url = env.src;

      env.self.request(url.format(tpl), function (err, response, body) {
        if (err) {
          callback(err);
          return;
        }

        if (response.statusCode !== 200) {
          err = new EmbedzaError('Vimeo fetcher: Bad response code: ' + response.statusCode);
          err.code = 'EHTTP';
          err.status = response.statusCode;
          callback(err);
          return;
        }

        try {
          env.data.oembed = JSON.parse(body);
        } catch (__) {
          err = new EmbedzaError(new EmbedzaError('Vimeo fetcher: Can\'t parse oembed JSON response'));
          err.code = 'ECONTENT';
          callback(err);
          return;
        }

        callback();
      });
    }
  ],

  mixinsAfter: [
    '*',
    function (env, callback) {
      var re = /^(.*?\/video\/\d+_)\d+(\.jpg)$/;

      var thumbnail = _.find(env.result.snippets, function (snippet) {
        return snippet.type === 'image' && snippet.tags.indexOf('thumbnail') !== -1 && re.test(snippet.href);
      });

      if (!thumbnail) {
        callback();
        return;
      }

      var desiredWidth = 480;
      var resizedThumbnail = _.cloneDeep(thumbnail);

      resizedThumbnail.href = resizedThumbnail.href.replace(re, '$1' + desiredWidth + '$2');
      resizedThumbnail.media.height = resizedThumbnail.media.height / resizedThumbnail.media.width * desiredWidth;
      resizedThumbnail.media.width = desiredWidth;

      env.result.snippets.push(resizedThumbnail);
      callback();
    }
  ],

  config: {
    autoplay: 'autoplay=1'
  }
};
