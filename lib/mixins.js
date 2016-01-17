// Data handlers (mixin)
//
'use strict';


var utils = require('./utils');
var $     = require('cheerio');
var _     = require('lodash');
var debug = require('debug')('embedza:mixins');


var mixins = [];


// Fill result meta
//
mixins.push({
  id: 'meta',
  fn: function meta_mixin(env, callback) {
    debug('meta');
    // TODO: implement other

    var metaTitle = utils.findMeta(env.data.meta, 'title');

    // WordPress.com using title meta-tag incorrectly
    if (metaTitle && metaTitle.toLowerCase().indexOf('wordpress.com') !== -1) {
      metaTitle = null;
    }

    env.result.meta.title =
      (env.data.oembed ? env.data.oembed.title : null) ||
      utils.findMeta(env.data.meta, [ 'twitter:title', 'og:title', 'dc.title', 'html-title' ]) ||
      metaTitle ||
      '';

    env.result.meta.site =
      (env.data.oembed ? (env.data.oembed.site_name || env.data.oembed.provider_name) : null) ||
      utils.findMeta(env.data.meta, [ 'og:site_name', 'twitter:site:value', 'twitter:site', 'application-name' ]) ||
      '';

    env.result.meta.description =
      (env.data.oembed ? env.data.oembed.description : null) ||
      utils.findMeta(env.data.meta, [ 'twitter:description', 'og:description', 'description' ]) ||
      '';

    debug('meta: done');
    callback();
  }
});


// Extract data from twitter:image tag
//
mixins.push({
  id: 'twitter-thumbnail',
  fn: function twitter_thumbnail_mixin(env, callback) {
    debug('twitter-thumbnail');

    var card = utils.findMeta(env.data.meta, 'twitter:card');
    var imageHref;

    // If 'twitter:card' is 'photo' - check whitelist
    if (card === 'photo' && !utils.wlCheck(env.wl, 'twitter.photo')) {
      debug('twitter-thumbnail: skip');
      callback();
      return;
    }

    if (card === 'gallery') {
      for (var i = 0; i < 4; i++) {
        imageHref = utils.findMeta(env.data.meta, [ 'twitter:image' + i + ':src', 'twitter:image' + i ]);

        if (imageHref) {
          env.result.snippets.push({
            type: 'image',
            href: imageHref,
            tags: [ 'thumbnail', 'twitter' ],
            media: {}
          });
        }
      }
    }

    imageHref = utils.findMeta(env.data.meta, [ 'twitter:image:src', 'twitter:image' ]);

    if (imageHref) {
      env.result.snippets.push({
        type: 'image',
        href: imageHref,
        tags: [ 'thumbnail', 'twitter' ],
        media: _.omitBy({
          width: utils.findMeta(env.data.meta, 'twitter:image:width'),
          height: utils.findMeta(env.data.meta, 'twitter:image:height')
        }, _.isUndefined)
      });
    }

    debug('twitter-thumbnail: done');
    callback();
  }
});


// Extract data from twitter:player tag
//
mixins.push({
  id: 'twitter-player',
  fn: function twitter_player_mixin(env, callback) {
    debug('twitter-player');

    if (!utils.wlCheck(env.wl, 'twitter.player')) {
      debug('twitter-player: done');
      callback();
      return;
    }

    var playerHref = utils.findMeta(env.data.meta, [ 'twitter:player:url', 'twitter:player:src', 'twitter:player' ]);

    if (!playerHref) {
      debug('twitter-player: skip');
      callback();
      return;
    }

    var snippet = {
      href: playerHref,
      tags: [ 'player', 'twitter', 'responsive' ],
      media: _.omitBy({
        width: utils.findMeta(env.data.meta, 'twitter:player:width'),
        height: utils.findMeta(env.data.meta, 'twitter:player:height')
      }, _.isUndefined)
    };

    // If html5 defined in whitelist - set type to `text/html`
    if (utils.wlCheck(env.wl, 'twitter.player', 'html5')) {
      snippet.tags.push('html5');
      snippet.type = 'text/html';
    }

    env.result.snippets.push(snippet);

    debug('twitter-player: done');
    callback();
  }
});


// Extract data from og:video tag
//
mixins.push({
  id: 'og-player',
  fn: function og_player_mixin(env, callback) {
    debug('og-player');

    if (!utils.wlCheck(env.wl, 'og.video')) {
      debug('og-player: done');
      callback();
      return;
    }

    var playersMeta = utils.groupMeta(env.data.meta, 'og:video', [ 'og:video:url', 'og:video:src', 'og:video' ]);

    if (playersMeta.length === 0) {
      debug('og-player: skip');
      callback();
      return;
    }

    var href;

    playersMeta.forEach(function (playerMeta) {
      href = utils.findMeta(playerMeta, [ 'og:video:url', 'og:video:src', 'og:video' ]);

      if (!href) {
        return; // continue
      }

      env.result.snippets.push({
        href: href,
        tags: [ 'player', 'og', 'responsive' ],
        type: utils.findMeta(playerMeta, 'og:video:type'),
        media: _.omitBy({
          width: utils.findMeta(playerMeta, 'og:video:width'),
          height: utils.findMeta(playerMeta, 'og:video:height'),
          duration: utils.findMeta(playerMeta, 'og:video:duration')
        }, _.isUndefined)
      });
    });

    debug('og-player: done');
    callback();
  }
});


// Extract data from og:image tag
//
mixins.push({
  id: 'og-thumbnail',
  fn: function og_thumbnail_mixin(env, callback) {
    debug('og-thumbnail');

    var imagesMeta = utils.groupMeta(env.data.meta, 'og:image', [ 'og:image:url', 'og:image:src', 'og:image' ]);

    if (imagesMeta.length === 0) {
      debug('og-thumbnail: skip');
      callback();
      return;
    }

    var href;

    imagesMeta.forEach(function (imageMeta) {
      href = utils.findMeta(imageMeta, [ 'og:image:url', 'og:image:src', 'og:image' ]);

      if (!href) {
        return; // continue
      }

      env.result.snippets.push({
        type: 'image',
        href: href,
        tags: [ 'thumbnail', 'og' ],
        media: _.omitBy({
          width: utils.findMeta(imageMeta, 'og:image:width'),
          height: utils.findMeta(imageMeta, 'og:image:height')
        }, _.isUndefined)
      });
    });

    debug('og-thumbnail: done');
    callback();
  }
});


// Extract data from oembed.html tag
//
mixins.push({
  id: 'oembed-player',
  fn: function oembed_player_mixin(env, callback) {
    debug('oembed-player');

    if (!env.data.oembed || !utils.wlCheck(env.wl, 'oembed.video') || env.data.oembed.type !== 'video') {
      callback();
      debug('oembed-player: skip');
      return;
    }

    var $iframe = $('<div>' + (env.data.oembed.html5 || env.data.oembed.html || '') + '</div>').find('iframe');
    var href;

    if ($iframe.length !== 0) {
      href = $iframe.attr('src');
    }

    if (href) {
      env.result.snippets.push({
        type: 'text/html',
        href: href,
        tags: [ 'player', 'oembed', 'responsive', 'html5' ],
        media: _.omitBy({
          width: env.data.oembed.width,
          height: env.data.oembed.height,
          duration: env.data.oembed.duration
        }, _.isUndefined)
      });
    }

    debug('oembed-player: done');
    callback();
  }
});


// Extract data from oembed.url tag
//
mixins.push({
  id: 'oembed-photo',
  fn: function oembed_photo_mixin(env, callback) {
    debug('oembed-photo');

    if (!env.data.oembed ||
        !utils.wlCheck(env.wl, 'oembed.photo') ||
        env.data.oembed.type !== 'photo' ||
        !env.data.oembed.url) {

      debug('oembed-photo: skip');
      callback();
      return;
    }

    env.result.snippets.push({
      type: 'image',
      href: env.data.oembed.url,
      tags: [ 'image', 'oembed' ],
      media: _.omitBy({
        width: env.data.oembed.width,
        height: env.data.oembed.height
      }, _.isUndefined)
    });

    debug('oembed-photo: done');
    callback();
  }
});


// Extract data from oembed.icon_url tag
//
mixins.push({
  id: 'oembed-icon',
  fn: function oembed_icon_mixin(env, callback) {
    debug('oembed-icon');

    if (!env.data.oembed || !env.data.oembed.icon_url) {
      debug('oembed-icon: skip');
      callback();
      return;
    }

    env.result.snippets.push({
      type: 'image',
      href: env.data.oembed.icon_url,
      tags: [ 'image', 'oembed' ],
      media: _.omitBy({
        width: env.data.oembed.icon_width,
        height: env.data.oembed.icon_height
      }, _.isUndefined)
    });

    debug('oembed-icon: done');
    callback();
  }
});


// Extract data from oembed.thumbnail_url tag
//
mixins.push({
  id: 'oembed-thumbnail',
  fn: function oembed_thumbnail_mixin(env, callback) {
    debug('oembed-thumbnail');

    if (!env.data.oembed || !env.data.oembed.thumbnail_url) {
      debug('oembed-thumbnail: skip');
      callback();
      return;
    }

    env.result.snippets.push({
      type: 'image',
      href: env.data.oembed.thumbnail_url,
      tags: [ 'thumbnail', 'oembed' ],
      media: _.omitBy({
        width: env.data.oembed.thumbnail_width,
        height: env.data.oembed.thumbnail_height
      }, _.isUndefined)
    });

    debug('oembed-thumbnail: done');
    callback();
  }
});


// Extract data from oembed rich
//
mixins.push({
  id: 'oembed-rich',
  fn: function oembed_rich_mixin(env, callback) {
    debug('oembed-rich');

    if (!env.data.oembed || env.data.oembed.type !== 'rich' || !utils.wlCheck(env.wl, 'oembed.rich')) {
      debug('oembed-rich: skip');
      callback();
      return;
    }

    var snippet = {
      type: 'text/html',
      href: null,
      tags: [ 'oembed', 'rich' ],
      html: '',
      media: _.omitBy({
        width: env.data.oembed.width,
        height: env.data.oembed.height
      }, _.isUndefined)
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

      if (!snippet.media.width && $iframe.attr('width')) {
        snippet.media.width = $iframe.attr('width');
      }

      if (!snippet.media.height && $iframe.attr('height')) {
        snippet.media.height = $iframe.attr('height');
      }

    } else {
      snippet.html = env.data.oembed.html5 || env.data.oembed.html;
    }

    env.result.snippets.push(snippet);

    debug('oembed-rich: done');
    callback();
  }
});


// Extract favicons
//
mixins.push({
  id: 'favicon',
  fn: function favicon_mixin(env, callback) {
    debug('favicon');

    if (!env.data.links) {
      callback();
      debug('favicon: skip');
      return;
    }

    var sizeRe = /^\d+x\d+$/i;
    var snippet, sz;

    _.forEach(env.data.links, function (links, rel) {
      if (rel.indexOf('icon') === -1) {
        return; // continue
      }

      links.forEach(function (link) {
        snippet = {
          type: link.type || 'image',
          href: link.href,
          tags: [ 'icon' ],
          media: {}
        };

        if (sizeRe.test(link.sizes || '')) {
          sz = link.sizes.toLowerCase().split('x');

          snippet.media = {
            width: parseInt(sz[0], 10),
            height: parseInt(sz[1], 10)
          };
        }

        env.result.snippets.push(snippet);
      });
    });

    debug('favicon: done');
    callback();
  }
});


// Extract logo from meta
//
mixins.push({
  id: 'logo',
  fn: function logo_mixin(env, callback) {
    debug('logo');

    var logo = utils.findMeta(env.data.meta, 'logo');

    if (!logo) {
      debug('logo: skip');
      callback();
      return;
    }

    env.result.snippets.push({
      type: logo.type || 'image',
      href: logo.href || logo,
      tags: [ 'icon' ],
      media: {}
    });

    debug('logo: done');
    callback();
  }
});


module.exports = mixins;
