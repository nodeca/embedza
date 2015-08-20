/////////////////////////////////////////////////////////////////////////////
// Vimeo
//
'use strict';


var _ = require('lodash');


module.exports = {
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
