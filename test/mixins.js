'use strict';


const assert  = require('assert');
const mixins  = require('../lib/mixins');


describe('mixins', function () {
  it('meta', function (done) {
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

    mixin.fn(env, (err) => {
      assert.deepStrictEqual(env.result.meta, { title: 'foo', site: 'bar', description: 'baz' });

      done(err);
    });
  });


  it('twitter-thumbnail', function (done) {
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

    mixin.fn(env, (err) => {
      assert.deepStrictEqual(env.result.snippets, [
        { type: 'image', href: '/b', tags: [ 'thumbnail', 'twitter' ], media: {} },
        { type: 'image', href: '/c', tags: [ 'thumbnail', 'twitter' ], media: {} },
        { type: 'image', href: '/a', tags: [ 'thumbnail', 'twitter' ], media: { width: 10 } }
      ]);

      done(err);
    });
  });


  it('twitter-thumbnail skip type photo', function (done) {
    let mixin = mixins.find(m => m.id === 'twitter-thumbnail');
    let env = {
      data: {
        meta: [
          { name: 'twitter:card', value: 'photo' }
        ]
      },
      result: { snippets: [] }
    };

    mixin.fn(env, (err) => {
      assert.strictEqual(env.result.snippets.length, 0);
      done(err);
    });
  });


  it('twitter-player', function (done) {
    let mixin = mixins.find(m => m.id === 'twitter-player');
    let env = {
      wl: { twitter: { player: [ 'allow', 'html5' ] } },
      data: { meta: [ { name: 'twitter:player:src', value: '/foo' } ] },
      result: { snippets: [] }
    };

    mixin.fn(env, (err) => {
      assert.deepStrictEqual(env.result.snippets, [
        { href: '/foo', tags: [ 'player', 'twitter', 'responsive', 'html5' ], type: 'text/html', media: {} }
      ]);

      done(err);
    });
  });


  it('og-player', function (done) {
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

    mixin.fn(env, (err) => {
      assert.deepStrictEqual(env.result.snippets, [
        { href: '/foo', tags: [ 'player', 'og', 'responsive' ], media: {}, type: 'foo' },
        { href: '/bar', tags: [ 'player', 'og', 'responsive' ], media: {}, type: 'bar' }
      ]);
      done(err);
    });
  });


  it('og-thumbnail', function (done) {
    let mixin = mixins.find(m => m.id === 'og-thumbnail');
    let env = {
      data: { meta: [
        { name: 'og:image:src', value: '/foo' },
        { name: 'og:image:src', value: '/bar' }
      ] },
      result: { snippets: [] }
    };

    mixin.fn(env, (err) => {
      assert.deepStrictEqual(env.result.snippets, [
        { href: '/foo', tags: [ 'thumbnail', 'og' ], media: {}, type: 'image' },
        { href: '/bar', tags: [ 'thumbnail', 'og' ], media: {}, type: 'image' }
      ]);
      done(err);
    });
  });


  it('oembed-player', function (done) {
    let mixin = mixins.find(m => m.id === 'oembed-player');
    let env = {
      wl: { oembed: { video: 'allow' } },
      data: { oembed: {
        type: 'video',
        html5: '<iframe src="/foo"></iframe>'
      } },
      result: { snippets: [] }
    };

    mixin.fn(env, (err) => {
      assert.deepStrictEqual(env.result.snippets, [
        { href: '/foo', tags: [ 'player', 'oembed', 'responsive', 'html5' ], media: {}, type: 'text/html' }
      ]);
      done(err);
    });
  });


  it('oembed-photo', function (done) {
    let mixin = mixins.find(m => m.id === 'oembed-photo');
    let env = {
      wl: { oembed: { photo: 'allow' } },
      data: { oembed: {
        type: 'photo',
        url: '/foo'
      } },
      result: { snippets: [] }
    };

    mixin.fn(env, (err) => {
      assert.deepStrictEqual(env.result.snippets, [
        { type: 'image', href: '/foo', tags: [ 'image', 'oembed' ], media: {} }
      ]);
      done(err);
    });
  });


  it('oembed-icon', function (done) {
    let mixin = mixins.find(m => m.id === 'oembed-icon');
    let env = {
      data: { oembed: {
        icon_url: '/foo'
      } },
      result: { snippets: [] }
    };

    mixin.fn(env, (err) => {
      assert.deepStrictEqual(env.result.snippets, [
        { type: 'image', href: '/foo', tags: [ 'image', 'oembed' ], media: {} }
      ]);
      done(err);
    });
  });


  it('oembed-thumbnail', function (done) {
    let mixin = mixins.find(m => m.id === 'oembed-thumbnail');
    let env = {
      data: { oembed: {
        thumbnail_url: '/foo'
      } },
      result: { snippets: [] }
    };

    mixin.fn(env, (err) => {
      assert.deepStrictEqual(env.result.snippets, [
        { type: 'image', href: '/foo', tags: [ 'thumbnail', 'oembed' ], media: {} }
      ]);
      done(err);
    });
  });


  it('oembed-rich', function (done) {
    let mixin = mixins.find(m => m.id === 'oembed-rich');
    let env = {
      wl: { oembed: { rich: [ 'allow', 'reader', 'player', 'html5' ] } },
      data: { oembed: {
        type: 'rich',
        html: '<iframe src="/foo" width="100" height="200"></iframe>'
      } },
      result: { snippets: [] }
    };

    mixin.fn(env, (err) => {
      assert.deepStrictEqual(env.result.snippets, [
        {
          href: '/foo',
          tags: [ 'oembed', 'rich', 'reader', 'player', 'html5' ],
          media: { width: '100', height: '200' },
          type: 'text/html',
          html: ''
        }
      ]);
      done(err);
    });
  });


  it('oembed-rich inline', function (done) {
    let mixin = mixins.find(m => m.id === 'oembed-rich');
    let env = {
      wl: { oembed: { rich: [ 'allow', 'reader', 'player', 'html5', 'inline' ] } },
      data: { oembed: {
        type: 'rich',
        html: '<iframe src="/foo" width="100" height="200"></iframe>'
      } },
      result: { snippets: [] }
    };

    mixin.fn(env, (err) => {
      assert.deepStrictEqual(env.result.snippets, [
        {
          href: null,
          html: '<iframe src="/foo" width="100" height="200"></iframe>',
          tags: [ 'oembed', 'rich', 'reader', 'player', 'html5' ],
          media: {},
          type: 'text/html'
        }
      ]);
      done(err);
    });
  });


  it('favicon', function (done) {
    let mixin = mixins.find(m => m.id === 'favicon');
    let env = {
      data: { links: { icon: [
        { type: 'foo', href: 'bar', sizes: '10x15' }
      ] } },
      result: { snippets: [] }
    };

    mixin.fn(env, (err) => {
      assert.deepStrictEqual(env.result.snippets, [
        { type: 'foo', href: 'bar', tags: [ 'icon' ], media: { width: 10, height: 15 } }
      ]);
      done(err);
    });
  });


  it('logo', function (done) {
    let mixin = mixins.find(m => m.id === 'logo');
    let env = {
      data: { meta: [
        { name: 'logo', value: '/foo' }
      ] },
      result: { snippets: [] }
    };

    mixin.fn(env, (err) => {
      assert.deepStrictEqual(env.result.snippets, [
        { type: 'image', href: '/foo', tags: [ 'icon' ], media: {} }
      ]);
      done(err);
    });
  });
});
