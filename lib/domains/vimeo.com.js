/////////////////////////////////////////////////////////////////////////////
// Vimeo
//
'use strict';


const _            = require('lodash');
const url          = require('url');
const EmbedzaError = require('../utils/error');


let tpl = url.parse('https://vimeo.com/api/oembed.json?url=foobar', true, true);
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
          callback(new EmbedzaError(`Vimeo fetcher: Bad response code: ${response.statusCode}`, 'EHTTP', response.statusCode));
          return;
        }

        try {
          env.data.oembed = JSON.parse(body);
        } catch (__) {
          callback(new EmbedzaError("Vimeo fetcher: Can't parse oembed JSON response", 'ECONTENT'));
          return;
        }

        callback();
      });
    }
  ],

  mixinsAfter: [
    '*',
    function (env, callback) {
      let re = /^(.*?\/video\/\d+_)\d+(\.jpg|\.webp)$/;

      let thumbnail = _.find(env.result.snippets, snippet => {
        return snippet.type === 'image' && snippet.tags.indexOf('thumbnail') !== -1 && re.test(snippet.href);
      });

      if (!thumbnail) {
        callback();
        return;
      }

      let desiredWidth = 480;
      let resizedThumbnail = _.cloneDeep(thumbnail);

      resizedThumbnail.href = resizedThumbnail.href.replace(re, '$1' + desiredWidth + '$2');
      resizedThumbnail.media.height = resizedThumbnail.media.height / resizedThumbnail.media.width * desiredWidth;
      resizedThumbnail.media.width = desiredWidth;

      env.result.snippets.push(resizedThumbnail);
      callback();
    }
  ]
};
