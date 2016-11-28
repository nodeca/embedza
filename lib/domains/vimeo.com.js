/////////////////////////////////////////////////////////////////////////////
// Vimeo
//
'use strict';


const _            = require('lodash');
const url          = require('url');
const EmbedzaError = require('../utils/error');
const Promise      = require('bluebird');


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
    Promise.coroutine(function* vimeo_fetcher(env) {
      tpl.query.url = env.src;

      let response;

      try {
        response = yield env.self.request(url.format(tpl));
      } catch (err) {
        if (err.statusCode) {
          throw new EmbedzaError(
            `Vimeo fetcher: Bad response code: ${err.statusCode}`,
            'EHTTP',
            err.statusCode);
        }
        throw err;
      }

      if (response.statusCode !== 200) {
        throw new EmbedzaError(
          `Vimeo fetcher: Bad response code: ${response.statusCode}`,
          'EHTTP',
          response.statusCode);
      }

      try {
        env.data.oembed = JSON.parse(response.body);
      } catch (__) {
        throw new EmbedzaError(
          "Vimeo fetcher: Can't parse oembed JSON response",
          'ECONTENT');
      }
    })
  ],

  mixinsAfter: [
    '*',
    function (env) {
      let re = /^(.*?\/video\/\d+_)\d+(\.jpg|\.webp)$/;

      let thumbnail = _.find(env.result.snippets, snippet => {
        return snippet.type === 'image' && snippet.tags.indexOf('thumbnail') !== -1 && re.test(snippet.href);
      });

      if (!thumbnail) return Promise.resolve();

      let desiredWidth = 480;
      let resizedThumbnail = _.cloneDeep(thumbnail);

      resizedThumbnail.href = resizedThumbnail.href.replace(re, '$1' + desiredWidth + '$2');
      resizedThumbnail.media.height = resizedThumbnail.media.height / resizedThumbnail.media.width * desiredWidth;
      resizedThumbnail.media.width = desiredWidth;

      env.result.snippets.push(resizedThumbnail);

      return Promise.resolve();
    },
    function (env) {
      env.result.snippets.forEach(snippet => {
        if (snippet.type !== 'text/html' ||
          snippet.tags.indexOf('player') === -1) {
          return; // continue
        }

        snippet.media.autoplay = 'autoplay=1';
      });

      return Promise.resolve();
    }
  ]
};
