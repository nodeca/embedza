// Data handlers (mixin)
//
'use strict';


var utils = require('./utils');
var $     = require('cheerio');
var _     = require('lodash');


var mixins = [];


// Fill result meta
//
mixins.push({
  id: 'meta',
  fn: function meta_mixin(env, callback) {
    // TODO: implement other

    var metaTitle = utils.findMeta(env.data.meta, [ 'title' ]);

    // WordPress.com using title meta-tag incorrectly
    if (metaTitle && metaTitle.toLowerCase().indexOf('wordpress.com') !== -1) {
      metaTitle = null;
    }

    env.result.meta.title =
      (env.data.oembed ? env.data.oembed.title : null) ||
      utils.findMeta(env.data.meta, [ 'twitter.title', 'og.title', 'dc.title', 'html-title' ]) ||
      metaTitle;

    env.result.meta.site =
      (env.data.oembed ? (env.data.oembed.site_name || env.data.oembed.provider_name) : null) ||
      utils.findMeta(env.data.meta, [ 'og.site_name', 'twitter.site', 'twitter.site.value', 'application-name' ]);

    env.result.meta.description =
      (env.data.oembed ? env.data.oembed.description : null) ||
      utils.findMeta(env.data.meta, [
        'twitter.description',
        'og.description',
        'description'
      ]);

    callback();
  }
});


// Extract data from twitter:image tag
//
mixins.push({
  id: 'twitter-thumbnail',
  fn: function twitter_thumbnail_mixin(env, callback) {
    var card = utils.findMeta(env.data.meta, [ 'twitter.card' ]);
    var image;

    // If 'twitter:card' is 'photo' - check whitelist
    if (card === 'photo' && !utils.wlCheck(env.wl, 'twitter.photo')) {
      callback();
      return;
    }

    if (card === 'gallery') {
      for (var i = 0; i < 4; i++) {
        image = utils.findMeta(env.data.meta, [ 'twitter.image' + i ]);

        if (image) {
          env.result.snippets.push({
            type: 'image',
            href: image,
            tags: [ 'thumbnail', 'twitter' ],
            media: {}
          });
        }
      }
    }

    image = utils.findMeta(env.data.meta, [ 'twitter.image' ]);

    if (image) {
      env.result.snippets.push({
        type: 'image',
        href: image.url,
        tags: [ 'thumbnail', 'twitter' ],
        media: {
          width: image.width,
          height: image.height
        }
      });
    }

    callback();
  }
});


// Extract data from twitter:player tag
//
mixins.push({
  id: 'twitter-player',
  fn: function twitter_player_mixin(env, callback) {
    if (!utils.wlCheck(env.wl, 'twitter.player')) {
      callback();
      return;
    }

    var players = utils.findMeta(env.data.meta, [ 'twitter.player' ]);

    if (!players) {
      callback();
      return;
    }

    if (!_.isArray(players)) {
      players = [ players ];
    }

    players.forEach(function (player) {
      if (!player.url) {
        return; // continue
      }

      var snippet = {
        href: player.url,
        tags: [ 'player', 'twitter', 'responsive' ],
        media: {
          width: player.width,
          height: player.height
        }
      };

      // If html5 defined in whitelist - set type to `text/html`
      if (utils.wlCheck(env.wl, 'twitter.player', 'html5')) {
        snippet.tags.push('html5');
        snippet.type = 'text/html';
      }

      env.result.snippets.push(snippet);
    });

    callback();
  }
});


// Extract data from og:video tag
//
mixins.push({
  id: 'og-player',
  fn: function og_player_mixin(env, callback) {
    if (!utils.wlCheck(env.wl, 'og.video')) {
      callback();
      return;
    }

    var players = utils.findMeta(env.data.meta, [ 'og.video' ]);

    if (!players) {
      callback();
      return;
    }

    if (!_.isArray(players)) {
      players = [ players ];
    }

    players.forEach(function (player) {
      if (!player.url) {
        return; // continue
      }

      var snippet = {
        href: player.url,
        tags: [ 'player', 'og', 'responsive' ],
        media: {
          width: player.width,
          height: player.height,
          duration: player.duration
        }
      };

      env.result.snippets.push(snippet);
    });

    callback();
  }
});


// Extract data from og:image tag
//
mixins.push({
  id: 'og-thumbnail',
  fn: function og_thumbnail_mixin(env, callback) {
    var images = utils.findMeta(env.data.meta, [ 'og.image' ]);

    if (!images) {
      callback();
      return;
    }

    if (!_.isArray(images)) {
      images = [ images ];
    }

    images.forEach(function (image) {
      if (!image.url) {
        return; // continue
      }

      var snippet = {
        type: 'image',
        href: image.url,
        tags: [ 'thumbnail', 'og' ],
        media: {
          width: image.width,
          height: image.height
        }
      };

      env.result.snippets.push(snippet);
    });

    callback();
  }
});


// Extract data from oembed.html tag
//
mixins.push({
  id: 'oembed-player',
  fn: function oembed_player_mixin(env, callback) {
    if (!env.data.oembed || !utils.wlCheck(env.wl, 'oembed.video') || env.data.oembed.type !== 'video') {
      callback();
      return;
    }

    var snippet = { type: 'text/html', href: '', tags: [ 'player', 'oembed', 'responsive', 'html5' ], media: {} };
    var $iframe = $('<div>' + (env.data.oembed.html5 || env.data.oembed.html || '') + '</div>').find('iframe');

    if ($iframe.length !== 0) {
      snippet.href = $iframe.attr('src');
    }

    if (snippet.href) {
      snippet.media.width = env.data.oembed.width;
      snippet.media.height = env.data.oembed.height;
      snippet.media.duration = env.data.oembed.duration;

      env.result.snippets.push(snippet);
    }

    callback();
  }
});


// Extract data from oembed.url tag
//
mixins.push({
  id: 'oembed-photo',
  fn: function oembed_photo_mixin(env, callback) {
    if (!env.data.oembed || !utils.wlCheck(env.wl, 'oembed.photo') || env.data.oembed.type !== 'photo') {
      callback();
      return;
    }

    env.result.snippets.push({
      type: 'image',
      href: env.data.oembed.url,
      tags: [ 'image', 'oembed' ],
      media: {
        width: env.data.oembed.width,
        height: env.data.oembed.height
      }
    });

    callback();
  }
});


// Extract data from oembed.icon_url tag
//
mixins.push({
  id: 'oembed-icon',
  fn: function oembed_icon_mixin(env, callback) {
    if (!env.data.oembed || !env.data.icon_url) {
      callback();
      return;
    }

    env.result.snippets.push({
      type: 'image',
      href: env.data.oembed.icon_url,
      tags: [ 'image', 'oembed' ],
      media: {
        width: env.data.oembed.icon_width,
        height: env.data.oembed.icon_height
      }
    });

    callback();
  }
});


// Extract data from oembed.thumbnail_url tag
//
mixins.push({
  id: 'oembed-thumbnail',
  fn: function oembed_thumbnail_mixin(env, callback) {
    if (!env.data.oembed) {
      callback();
      return;
    }

    env.result.snippets.push({
      type: 'image',
      href: env.data.oembed.thumbnail_url,
      tags: [ 'thumbnail', 'oembed' ],
      media: {
        width: env.data.oembed.thumbnail_width,
        height: env.data.oembed.thumbnail_height
      }
    });

    callback();
  }
});


// Extract data from oembed rich
//
mixins.push({
  id: 'oembed-rich',
  fn: function oembed_rich_mixin(env, callback) {
    if (!env.data.oembed || env.data.oembed.type !== 'rich' || !utils.wlCheck(env.wl, 'oembed.rich')) {
      callback();
      return;
    }

    var snippet = {
      type: 'text/html',
      href: null,
      tags: [ 'oembed' ],
      html: '',
      media: {
        width: env.data.oembed.width,
        height: env.data.oembed.height
      }
    };

    if (utils.wlCheck(env.wl, 'oembed.rich', 'reader')) {
      snippet.tags.push('reader');
    }

    if (utils.wlCheck(env.wl, 'oembed.rich', 'player')) {
      snippet.tags.push('player');
    }

    if (utils.wlCheck(env.wl, 'oembed.rich', 'html5')) {
      snippet.tags.push('html5');
    }

    var $iframe = $('<div>' + (env.data.oembed.html5 || env.data.oembed.html || '') + '</div>').find('iframe');

    if (!utils.wlCheck(env.wl, 'oembed.rich', 'inline') && $iframe.length !== 0) {
      snippet.href = $iframe.attr('src');

      if (!snippet.media.width) {
        snippet.media.width = $iframe.attr('width');
      }

      if (!snippet.media.height) {
        snippet.media.height = $iframe.attr('height');
      }

    } else {
      snippet.html = env.data.oembed.html5 || env.data.oembed.html;
    }

    env.result.snippets.push(snippet);

    callback();
  }
});


// Extract favicons
//
mixins.push({
  id: 'favicon',
  fn: function favicon_mixin(env, callback) {
    if (!env.data.link) {
      callback();
      return;
    }

    var sizeRe = /^\d+x\d+$/i;

    _.forEach(env.data.link, function (links, rel) {
      if (rel.indexOf('icon') === -1) {
        return; // continue
      }

      if (!_.isArray(links)) {
        links = [ links ];
      }

      links.forEach(function (link) {
        var snippet = {
          type: link.type || 'image',
          href: link.href,
          tags: [ 'icon' ],
          media: {}
        };

        if (sizeRe.test(link.sizes || '')) {
          var sz = link.sizes.toLowerCase().split('x');

          snippet.media.width = parseInt(sz[0], 10);
          snippet.media.height = parseInt(sz[1], 10);
        }

        env.result.snippets.push(snippet);
      });
    });

    callback();
  }
});


// Extract logo from meta
//
mixins.push({
  id: 'logo',
  fn: function logo_mixin(env, callback) {
    var logo = utils.findMeta(env.data.meta, [ 'logo' ]);

    if (!logo) {
      callback();
      return;
    }

    env.result.snippets.push({
      type: logo.type || 'image',
      href: logo.href || logo,
      tags: [ 'icon' ],
      media: {}
    });

    callback();
  }
});


module.exports = mixins;
