'use strict';


const assert      = require('assert');
const nock        = require('nock');
const mixinsAfter = require('../lib/mixins_after');
const Cache       = require('../lib/cache');
const request     = require('request');


describe('mixins after', function () {
  it('resolve-href', function () {
    let mixin = mixinsAfter.find(m => m.id === 'resolve-href');
    let env = {
      src: 'http://example.com/test/',
      result: {
        snippets: [
          { href: '/img/foo.png' },
          { href: 'img/bar.png' },
          { href: '//example.com/baz.png' }
        ]
      }
    };

    mixin.fn(env, function () {
      assert.strictEqual(env.result.snippets[0].href, 'http://example.com/img/foo.png');
      assert.strictEqual(env.result.snippets[1].href, 'http://example.com/test/img/bar.png');
      assert.strictEqual(env.result.snippets[2].href, 'http://example.com/baz.png');
    });
  });


  it('ssl-force', function () {
    let mixin = mixinsAfter.find(m => m.id === 'ssl-force');
    let env = {
      result: {
        snippets: [
          { href: 'https://example.com', tags: [] },
          { href: 'http://example.com', tags: [] }
        ]
      }
    };

    mixin.fn(env, function () {
      assert.deepStrictEqual(env.result.snippets[0].tags, [ 'ssl' ]);
      assert.deepStrictEqual(env.result.snippets[1].tags, []);
    });
  });


  it('merge', function () {
    let mixin = mixinsAfter.find(m => m.id === 'merge');
    let env = {
      result: {
        snippets: [
          { href: 'http://example.com/1', tags: [ 'a', 'b' ], media: { width: 10 } },
          { href: 'http://example.com/1', tags: [ 'c', 'd' ], media: { height: 20 } },
          { href: 'http://example.com/2', tags: [ 'd', 'e' ], media: { height: 30 } }
        ]
      }
    };

    mixin.fn(env, function () {
      assert.deepStrictEqual(env.result.snippets, [
        { href: 'http://example.com/1', tags: [ 'a', 'b', 'c', 'd' ], media: { width: 10, height: 20 } },
        { href: 'http://example.com/2', tags: [ 'd', 'e' ], media: { height: 30 } }
      ]);
    });
  });


  it('set-autoplay', function () {
    let mixin = mixinsAfter.find(m => m.id === 'set-autoplay');
    let env = {
      config: { autoplay: true },
      result: {
        snippets: [
          { href: 'http://example.com/1', tags: [ 'player' ], media: {}, type: 'text/html' }
        ]
      }
    };

    mixin.fn(env, function () {
      assert.strictEqual(env.result.snippets[0].media.autoplay, true);
    });
  });


  it('convert-str-int', function () {
    let mixin = mixinsAfter.find(m => m.id === 'convert-str-int');
    let env = {
      result: {
        snippets: [
          { media: { width: '10', height: '20', duration: '30', foo: '40' } }
        ]
      }
    };

    mixin.fn(env, function () {
      assert.deepStrictEqual(env.result.snippets[0].media, { width: 10, height: 20, duration: 30, foo: '40' });
    });
  });


  it('image-size', function (done) {
    // 1x1 transparent gif
    let demoImage = new Buffer('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64');
    let server = nock('http://example.com')
      .get('/1.jpg')
      .reply(200, demoImage)
      .get('/2.png')
      .reply(200, demoImage);

    let mixin = mixinsAfter.find(m => m.id === 'image-size');
    let env = {
      self: { __options__: { cache: new Cache() } },
      result: {
        snippets: [
          { type: 'image', media: {}, href: 'http://example.com/1.jpg' },
          { type: 'image', media: {}, href: 'http://example.com/2.png' }
        ]
      }
    };

    mixin.fn(env, function (err) {
      if (err) {
        done(err);
        return;
      }

      assert.deepStrictEqual(env.result.snippets[0].media, { width: 1, height: 1 });
      assert.deepStrictEqual(env.result.snippets[1].media, { width: 1, height: 1 });
      server.done();
      done();
    });
  });


  it('mime-detect', function (done) {
    let server = nock('http://example.com')
      .head('/test/foo.bar')
      .reply(200, '', {
        'content-type': 'foo/bar'
      });

    let mixin = mixinsAfter.find(m => m.id === 'mime-detect');
    let env = {
      self: { request },
      result: {
        snippets: [
          { media: {}, href: 'http://example.com/test/foo.bar' },
          { media: {}, href: 'http://example.com/test/baz.mp4' }
        ]
      }
    };

    mixin.fn(env, function (err) {
      if (err) {
        done(err);
        return;
      }

      assert.strictEqual(env.result.snippets[0].type, 'foo/bar');
      assert.strictEqual(env.result.snippets[1].type, 'video/mp4');
      server.done();
      done();
    });
  });
});
