'use strict';


const assert  = require('assert');
const mixins  = require('../lib/mixins');


describe('mixins', function () {

  it('meta', function () {
    let mixin = mixins.find(m => m.id === 'meta');
    let env = {
      data: {
        meta: [
          { name: 'title', value: 'wordpress.com - foo' },
          { name: 'html-title', value: 'foo' },
          { name: 'twitter:site', value: 'bar' }
        ],
        oembed: { description: 'baz' }
      },
      result: { meta: {} }
    };

    return mixin.fn(env).then(() => assert.deepStrictEqual(
      env.result.meta,
      { title: 'foo', site: 'bar', description: 'baz' }
    ));
  });


  it('twitter-thumbnail', function () {
    let mixin = mixins.find(m => m.id === 'twitter-thumbnail');
    let env = {
      data: {
        meta: [
          { name: 'twitter:card', value: 'gallery' },
          { name: 'twitter:image', value: '/a' },
          { name: 'twitter:image1', value: '/b' },
          { name: 'twitter:image2', value: '/c' },
          { name: 'twitter:image:width', value: 10 }
        ]
      },
      result: { snippets: [] }
    };

    return mixin.fn(env).then(() => assert.deepStrictEqual(
      env.result.snippets,
      [
        { type: 'image', href: '/b', tags: [ 'thumbnail', 'twitter' ], media: {} },
        { type: 'image', href: '/c', tags: [ 'thumbnail', 'twitter' ], media: {} },
        { type: 'image', href: '/a', tags: [ 'thumbnail', 'twitter' ], media: { width: 10 } }
      ]
    ));
  });


  it('twitter-thumbnail skip type photo', function () {
    let mixin = mixins.find(m => m.id === 'twitter-thumbnail');
    let env = {
      data: {
        meta: [
          { name: 'twitter:card', value: 'photo' }
        ]
      },
      result: { snippets: [] }
    };

    return mixin.fn(env)
      .then(() => assert.strictEqual(env.result.snippets.length, 0));
  });


  it('twitter-player html5', function () {
    let mixin = mixins.find(m => m.id === 'twitter-player');
    let env = {
      wl: { twitter: { player: [ 'allow', 'html5' ] } },
      data: { meta: [ { name: 'twitter:player:src', value: '/foo' } ] },
      result: { snippets: [] }
    };

    return mixin.fn(env).then(() => assert.deepStrictEqual(
      env.result.snippets,
      [
        { href: '/foo', tags: [ 'player', 'twitter', 'responsive', 'html5' ], type: 'text/html', media: {} }
      ]
    ));
  });


  it('twitter-player', function () {
    let mixin = mixins.find(m => m.id === 'twitter-player');
    let env = {
      wl: { twitter: { player: 'allow' } },
      data: { meta: [ { name: 'twitter:player:src', value: '/foo' } ] },
      result: { snippets: [] }
    };

    return mixin.fn(env).then(() => assert.deepStrictEqual(
      env.result.snippets,
      [
        { href: '/foo', tags: [ 'player', 'twitter', 'responsive' ], media: {} }
      ]
    ));
  });


  it('og-player', function () {
    let mixin = mixins.find(m => m.id === 'og-player');
    let env = {
      wl: { og: { video: 'allow' } },
      data: { meta: [
        { name: 'og:video:src', value: '/foo' },
        { name: 'og:video:type', value: 'foo' },
        { name: 'og:video:src', value: '/bar' },
        { name: 'og:video:type', value: 'bar' },
        { name: 'og:video:src', value: '' },
        { name: 'og:video:type', value: 'bar' }
      ] },
      result: { snippets: [] }
    };

    return mixin.fn(env).then(() => assert.deepStrictEqual(
      env.result.snippets,
      [
        { href: '/foo', tags: [ 'player', 'og', 'responsive' ], media: {}, type: 'foo' },
        { href: '/bar', tags: [ 'player', 'og', 'responsive' ], media: {}, type: 'bar' }
      ]
    ));
  });


  it('og-thumbnail', function () {
    let mixin = mixins.find(m => m.id === 'og-thumbnail');
    let env = {
      data: { meta: [
        { name: 'og:image:src', value: '/foo' },
        { name: 'og:image:src', value: '/bar' }
      ] },
      result: { snippets: [] }
    };

    return mixin.fn(env).then(() => assert.deepStrictEqual(
      env.result.snippets,
      [
        { href: '/foo', tags: [ 'thumbnail', 'og' ], media: {}, type: 'image' },
        { href: '/bar', tags: [ 'thumbnail', 'og' ], media: {}, type: 'image' }
      ]
    ));
  });


  it('oembed-player html5', function () {
    let mixin = mixins.find(m => m.id === 'oembed-player');
    let env = {
      wl: { oembed: { video: 'allow' } },
      data: { oembed: {
        type: 'video',
        html5: '<iframe src="/foo"></iframe>'
      } },
      result: { snippets: [] }
    };

    return mixin.fn(env).then(() => assert.deepStrictEqual(
      env.result.snippets,
      [
        { href: '/foo', tags: [ 'player', 'oembed', 'responsive', 'html5' ], media: {}, type: 'text/html' }
      ]
    ));
  });


  it('oembed-player html', function () {
    let mixin = mixins.find(m => m.id === 'oembed-player');
    let env = {
      wl: { oembed: { video: 'allow' } },
      data: { oembed: {
        type: 'video',
        html: '<iframe src="/foo"></iframe>'
      } },
      result: { snippets: [] }
    };

    return mixin.fn(env).then(() => assert.deepStrictEqual(
      env.result.snippets,
      [
        { href: '/foo', tags: [ 'player', 'oembed', 'responsive', 'html5' ], media: {}, type: 'text/html' }
      ]
    ));
  });


  it('oembed-player no href', function () {
    let mixin = mixins.find(m => m.id === 'oembed-player');
    let env = {
      wl: { oembed: { video: 'allow' } },
      data: { oembed: {
        type: 'video'
      } },
      result: { snippets: [] }
    };

    return mixin.fn(env).then(() => assert.deepStrictEqual(
      env.result.snippets,
      []
    ));
  });


  it('oembed-photo', function () {
    let mixin = mixins.find(m => m.id === 'oembed-photo');
    let env = {
      wl: { oembed: { photo: 'allow' } },
      data: { oembed: {
        type: 'photo',
        url: '/foo'
      } },
      result: { snippets: [] }
    };

    return mixin.fn(env).then(() => assert.deepStrictEqual(
      env.result.snippets,
      [
        { type: 'image', href: '/foo', tags: [ 'image', 'oembed' ], media: {} }
      ]
    ));
  });


  it('oembed-icon', function () {
    let mixin = mixins.find(m => m.id === 'oembed-icon');
    let env = {
      data: { oembed: {
        icon_url: '/foo'
      } },
      result: { snippets: [] }
    };

    return mixin.fn(env).then(() => assert.deepStrictEqual(
      env.result.snippets,
      [
        { type: 'image', href: '/foo', tags: [ 'image', 'oembed' ], media: {} }
      ]
    ));
  });


  it('oembed-thumbnail', function () {
    let mixin = mixins.find(m => m.id === 'oembed-thumbnail');
    let env = {
      data: { oembed: {
        thumbnail_url: '/foo'
      } },
      result: { snippets: [] }
    };

    return mixin.fn(env).then(() => assert.deepStrictEqual(
      env.result.snippets,
      [
        { type: 'image', href: '/foo', tags: [ 'thumbnail', 'oembed' ], media: {} }
      ]
    ));
  });


  it('oembed-rich', function () {
    let mixin = mixins.find(m => m.id === 'oembed-rich');
    let env = {
      wl: { oembed: { rich: [ 'allow', 'reader', 'player', 'html5' ] } },
      data: { oembed: {
        type: 'rich',
        html: '<iframe src="/foo" width="100" height="200"></iframe>'
      } },
      result: { snippets: [] }
    };

    return mixin.fn(env).then(() => assert.deepStrictEqual(
      env.result.snippets,
      [
        {
          href: '/foo',
          tags: [ 'oembed', 'rich', 'reader', 'player', 'html5' ],
          media: { width: '100', height: '200' },
          type: 'text/html',
          html: ''
        }
      ]
    ));
  });


  it('oembed-rich with size', function () {
    let mixin = mixins.find(m => m.id === 'oembed-rich');
    let env = {
      wl: { oembed: { rich: 'allow' } },
      data: { oembed: {
        type: 'rich',
        html: '<iframe src="/foo" width="100" height="200"></iframe>',
        width: 150,
        height: 250
      } },
      result: { snippets: [] }
    };

    return mixin.fn(env).then(() => assert.deepStrictEqual(
      env.result.snippets,
      [
        {
          href: '/foo',
          tags: [ 'oembed', 'rich' ],
          media: { width: 150, height: 250 },
          type: 'text/html',
          html: ''
        }
      ]
    ));
  });


  it('oembed-rich no iframe', function () {
    let mixin = mixins.find(m => m.id === 'oembed-rich');
    let env = {
      wl: { oembed: { rich: 'allow' } },
      data: { oembed: {
        type: 'rich'
      } },
      result: { snippets: [] }
    };

    return mixin.fn(env).then(() => assert.deepStrictEqual(
      env.result.snippets,
      [
        {
          href: null,
          tags: [ 'oembed', 'rich' ],
          media: {},
          type: 'text/html',
          /* eslint-disable no-undefined */
          html: undefined
        }
      ]
    ));
  });


  it('oembed-rich inline', function () {
    let mixin = mixins.find(m => m.id === 'oembed-rich');
    let env = {
      wl: { oembed: { rich: [ 'allow', 'reader', 'player', 'html5', 'inline' ] } },
      data: { oembed: {
        type: 'rich',
        html: '<iframe src="/foo" width="100" height="200"></iframe>'
      } },
      result: { snippets: [] }
    };

    return mixin.fn(env).then(() => assert.deepStrictEqual(
      env.result.snippets,
      [
        {
          href: null,
          html: '<iframe src="/foo" width="100" height="200"></iframe>',
          tags: [ 'oembed', 'rich', 'reader', 'player', 'html5' ],
          media: {},
          type: 'text/html'
        }
      ]
    ));
  });


  it('favicon', function () {
    let mixin = mixins.find(m => m.id === 'favicon');
    let env = {
      data: { links: { icon: [
        { type: 'foo', href: 'bar', sizes: '10x15' },
        { href: 'baz' }
      ] } },
      result: { snippets: [] }
    };

    return mixin.fn(env).then(() => assert.deepStrictEqual(
      env.result.snippets,
      [
        { type: 'foo', href: 'bar', tags: [ 'icon' ], media: { width: 10, height: 15 } },
        { type: 'image', href: 'baz', tags: [ 'icon' ], media: {} }
      ]
    ));
  });


  it('favicon no links', function () {
    let mixin = mixins.find(m => m.id === 'favicon');
    let env = {
      data: { links: { test: [] } },
      result: { snippets: [] }
    };

    return mixin.fn(env)
      .then(() => assert.deepStrictEqual(env.result.snippets, []));
  });


  it('logo', function () {
    let mixin = mixins.find(m => m.id === 'logo');
    let env = {
      data: { meta: [
        { name: 'logo', value: '/foo' }
      ] },
      result: { snippets: [] }
    };

    return mixin.fn(env).then(() => assert.deepStrictEqual(
      env.result.snippets,
      [
        { type: 'image', href: '/foo', tags: [ 'icon' ], media: {} }
      ]
    ));
  });
});
