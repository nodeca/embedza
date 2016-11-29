// Data handlers (mixin)
//
'use strict';


const utils   = require('./utils');
const $       = require('cheerio');
const _       = require('lodash');
const debug   = require('debug')('embedza:mixins');
const Promise = require('bluebird');


let mixins = [];


// Fill result meta
//
mixins.push({
  id: 'meta',
  fn: function meta_mixin(env) {
    debug('meta');

    // TODO: not implemented
    //
    //   - date
    //   - canonical
    //   - shortlink
    //   - category
    //   - keywords
    //   - author
    //   - author_url
    //   - copyright
    //   - license
    //   - license_url
    //   - duration
    //   - country-name
    //   - postal-code
    //   - street-address
    //   - region
    //   - locality
    //   - latitude
    //   - longitude
    //   - price
    //   - currency_code
    //   - brand
    //   - product_id
    //   - availability
    //   - quantity
    //

    let metaTitle = utils.findMeta(env.data.meta, 'title');

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

    return Promise.resolve();
  }
});


// Extract data from twitter:image tag
//
mixins.push({
  id: 'twitter-thumbnail',
  fn: function twitter_thumbnail_mixin(env) {
    debug('twitter-thumbnail');

    let card = utils.findMeta(env.data.meta, 'twitter:card');
    let imageHref;

    // If 'twitter:card' is 'photo' - check whitelist
    if (card === 'photo' && !utils.wlCheck(env.wl, 'twitter.photo')) {
      debug('twitter-thumbnail: skip');
      return Promise.resolve();
    }

    if (card === 'gallery') {
      for (let i = 0; i < 4; i++) {
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

    return Promise.resolve();
  }
});


// Extract data from twitter:player tag
//
mixins.push({
  id: 'twitter-player',
  fn: function twitter_player_mixin(env) {
    debug('twitter-player');

    if (!utils.wlCheck(env.wl, 'twitter.player')) {
      debug('twitter-player: done');
      return Promise.resolve();
    }

    let playerHref = utils.findMeta(env.data.meta, [ 'twitter:player:url', 'twitter:player:src', 'twitter:player' ]);

    if (!playerHref) {
      debug('twitter-player: skip');
      return Promise.resolve();
    }

    let snippet = {
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

    if (utils.wlCheck(env.wl, 'twitter.player', 'autoplay')) {
      snippet.tags.push('autoplay');
    }

    env.result.snippets.push(snippet);

    debug('twitter-player: done');

    return Promise.resolve();
  }
});


// Extract data from og:video tag
//
mixins.push({
  id: 'og-player',
  fn: function og_player_mixin(env) {
    debug('og-player');

    if (!utils.wlCheck(env.wl, 'og.video')) {
      debug('og-player: done');
      return Promise.resolve();
    }

    let playersMeta = utils.groupMeta(env.data.meta, 'og:video', [ 'og:video:url', 'og:video:src', 'og:video' ]);

    if (playersMeta.length === 0) {
      debug('og-player: skip');
      return Promise.resolve();
    }

    let href;

    playersMeta.forEach(playerMeta => {
      href = utils.findMeta(playerMeta, [ 'og:video:url', 'og:video:src', 'og:video' ]);

      if (!href) return; // continue

      let snippet = {
        href: href,
        tags: [ 'player', 'og', 'responsive' ],
        type: utils.findMeta(playerMeta, 'og:video:type'),
        media: _.omitBy({
          width: utils.findMeta(playerMeta, 'og:video:width'),
          height: utils.findMeta(playerMeta, 'og:video:height'),
          duration: utils.findMeta(playerMeta, 'og:video:duration')
        }, _.isUndefined)
      };

      if (utils.wlCheck(env.wl, 'oembed.video', 'autoplay')) {
        snippet.tags.push('autoplay');
      }

      env.result.snippets.push(snippet);
    });

    debug('og-player: done');

    return Promise.resolve();
  }
});


// Extract data from og:image tag
//
mixins.push({
  id: 'og-thumbnail',
  fn: function og_thumbnail_mixin(env) {
    debug('og-thumbnail');

    let imagesMeta = utils.groupMeta(env.data.meta, 'og:image', [ 'og:image:url', 'og:image:src', 'og:image' ]);

    if (imagesMeta.length === 0) {
      debug('og-thumbnail: skip');
      return Promise.resolve();
    }

    let href;

    imagesMeta.forEach(imageMeta => {
      href = utils.findMeta(imageMeta, [ 'og:image:url', 'og:image:src', 'og:image' ]);

      if (!href) return; // continue

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

    return Promise.resolve();
  }
});


// Extract data from oembed.html tag
//
mixins.push({
  id: 'oembed-player',
  fn: function oembed_player_mixin(env) {
    debug('oembed-player');

    if (!env.data.oembed || !utils.wlCheck(env.wl, 'oembed.video') || env.data.oembed.type !== 'video') {
      debug('oembed-player: skip');
      return Promise.resolve();
    }

    let $iframe = $('<div>' + (env.data.oembed.html5 || env.data.oembed.html || '') + '</div>').find('iframe');
    let href;

    if ($iframe.length !== 0) href = $iframe.attr('src');

    if (href) {
      let snippet = {
        type: 'text/html',
        href: href,
        tags: [ 'player', 'oembed', 'responsive', 'html5' ],
        media: _.omitBy({
          width: env.data.oembed.width,
          height: env.data.oembed.height,
          duration: env.data.oembed.duration
        }, _.isUndefined)
      };

      if (utils.wlCheck(env.wl, 'oembed.video', 'autoplay')) {
        snippet.tags.push('autoplay');
      }

      env.result.snippets.push(snippet);
    }

    debug('oembed-player: done');

    return Promise.resolve();
  }
});


// Extract data from oembed.url tag
//
mixins.push({
  id: 'oembed-photo',
  fn: function oembed_photo_mixin(env) {
    debug('oembed-photo');

    if (!env.data.oembed ||
        !utils.wlCheck(env.wl, 'oembed.photo') ||
        env.data.oembed.type !== 'photo' ||
        !env.data.oembed.url) {

      debug('oembed-photo: skip');
      return Promise.resolve();
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

    return Promise.resolve();
  }
});


// Extract data from oembed.icon_url tag
//
mixins.push({
  id: 'oembed-icon',
  fn: function oembed_icon_mixin(env) {
    debug('oembed-icon');

    if (!env.data.oembed || !env.data.oembed.icon_url) {
      debug('oembed-icon: skip');
      return Promise.resolve();
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

    return Promise.resolve();
  }
});


// Extract data from oembed.thumbnail_url tag
//
mixins.push({
  id: 'oembed-thumbnail',
  fn: function oembed_thumbnail_mixin(env) {
    debug('oembed-thumbnail');

    if (!env.data.oembed || !env.data.oembed.thumbnail_url) {
      debug('oembed-thumbnail: skip');
      return Promise.resolve();
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

    return Promise.resolve();
  }
});


// Extract data from oembed rich
//
mixins.push({
  id: 'oembed-rich',
  fn: function oembed_rich_mixin(env) {
    debug('oembed-rich');

    if (!env.data.oembed || env.data.oembed.type !== 'rich' || !utils.wlCheck(env.wl, 'oembed.rich')) {
      debug('oembed-rich: skip');
      return Promise.resolve();
    }

    let snippet = {
      type: 'text/html',
      href: null,
      tags: [ 'oembed', 'rich' ],
      html: '',
      media: _.omitBy({
        width: env.data.oembed.width,
        height: env.data.oembed.height
      }, _.isUndefined)
    };

    if (utils.wlCheck(env.wl, 'oembed.rich', 'autoplay')) {
      snippet.tags.push('autoplay');
    }

    if (utils.wlCheck(env.wl, 'oembed.rich', 'reader')) {
      snippet.tags.push('reader');
    }

    if (utils.wlCheck(env.wl, 'oembed.rich', 'player')) {
      snippet.tags.push('player');
    }

    if (utils.wlCheck(env.wl, 'oembed.rich', 'html5')) {
      snippet.tags.push('html5');
    }

    let $iframe = $('<div>' + (env.data.oembed.html5 || env.data.oembed.html || '') + '</div>').find('iframe');

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

    return Promise.resolve();
  }
});


// Extract favicons
//
mixins.push({
  id: 'favicon',
  fn: function favicon_mixin(env) {
    debug('favicon');

    if (!env.data.links) {
      debug('favicon: skip');
      return Promise.resolve();
    }

    let sizeRe = /^\d+x\d+$/i;
    let snippet, sz;

    _.forEach(env.data.links, (links, rel) => {

      if (rel.indexOf('icon') === -1) return; // continue

      links.forEach(link => {
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

    return Promise.resolve();
  }
});


// Extract logo from meta
//
mixins.push({
  id: 'logo',
  fn: function logo_mixin(env) {
    debug('logo');

    let logo = utils.findMeta(env.data.meta, 'logo');

    if (!logo) {
      debug('logo: skip');
      return Promise.resolve();
    }

    env.result.snippets.push({
      type: logo.type || 'image',
      href: logo.href || logo,
      tags: [ 'icon' ],
      media: {}
    });

    debug('logo: done');

    return Promise.resolve();
  }
});


module.exports = mixins;
