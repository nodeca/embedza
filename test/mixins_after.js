'use strict';


const assert      = require('assert');
const nock        = require('nock');
const mixinsAfter = require('../lib/mixins_after');
const Cache       = require('../lib/cache');
const request     = require('request');


describe('mixins after', function () {
  it('resolve-href', function (done) {
    let mixin = mixinsAfter.find(m => m.id === 'resolve-href');
    let env = {
      src: 'http://example.com/test/',
      result: {
        snippets: [
          { href: '/img/foo.png' },
          { href: 'img/bar.png' },
          { href: '//example.com/baz.png' },
          { href: 'http://example.com/test.png' },
          { href: '' }
        ]
      }
    };

    mixin.fn(env, err => {
      assert.deepStrictEqual(env.result.snippets, [
        { href: 'http://example.com/img/foo.png' },
        { href: 'http://example.com/test/img/bar.png' },
        { href: 'http://example.com/baz.png' },
        { href: 'http://example.com/test.png' },
        { href: '' }
      ]);

      done(err);
    });
  });


  it('ssl-force', function (done) {
    let mixin = mixinsAfter.find(m => m.id === 'ssl-force');
    let env = {
      result: {
        snippets: [
          { href: 'https://example.com', tags: [] },
          { href: 'http://example.com', tags: [] }
        ]
      }
    };

    mixin.fn(env, err => {
      assert.deepStrictEqual(env.result.snippets[0].tags, [ 'ssl' ]);
      assert.deepStrictEqual(env.result.snippets[1].tags, []);
      done(err);
    });
  });


  it('merge', function (done) {
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

    mixin.fn(env, err => {
      assert.deepStrictEqual(env.result.snippets, [
        { href: 'http://example.com/1', tags: [ 'a', 'b', 'c', 'd' ], media: { width: 10, height: 20 } },
        { href: 'http://example.com/2', tags: [ 'd', 'e' ], media: { height: 30 } }
      ]);
      done(err);
    });
  });


  it('set-autoplay', function (done) {
    let mixin = mixinsAfter.find(m => m.id === 'set-autoplay');
    let env = {
      config: {},
      result: {
        snippets: [
          { href: 'http://example.com/1', tags: [ 'player', 'autoplay' ], media: {}, type: 'text/html' },
          { href: 'http://example.com/1', tags: [ 'player' ], media: {}, type: 'non/html' }
        ]
      }
    };

    mixin.fn(env, err => {
      assert.strictEqual(env.result.snippets[0].media.autoplay, 'autoplay=1');
      assert.deepStrictEqual(env.result.snippets[1].media, {});
      done(err);
    });
  });


  it('convert-str-int', function (done) {
    let mixin = mixinsAfter.find(m => m.id === 'convert-str-int');
    let env = {
      result: {
        snippets: [
          { media: { width: '10', height: '20', duration: '30', foo: '40' } },
          { media: { width: 11 } }
        ]
      }
    };

    mixin.fn(env, err => {
      assert.deepStrictEqual(env.result.snippets[0].media, { width: 10, height: 20, duration: 30, foo: '40' });
      assert.deepStrictEqual(env.result.snippets[1].media, {});
      done(err);
    });
  });


  it('image-size connection error', function (done) {
    let mixin = mixinsAfter.find(m => m.id === 'image-size');
    let env = {
      self: { __options__: { cache: new Cache() } },
      result: {
        snippets: [
          { type: 'image', media: {}, href: 'badurlbadurlbadurlbadurl.png' }
        ]
      }
    };

    mixin.fn(env, err => {
      assert.strictEqual(err.message, 'Invalid URI "badurlbadurlbadurlbadurl.png"');
      done();
    });
  });


  it('image-size cache', function (done) {
    let mixin = mixinsAfter.find(m => m.id === 'image-size');
    let env = {
      self: {
        __options__: {
          cache: {
            get: (k, cb) => {
              cb(null, { ts: Date.now(), ttl: 1000, dimensions: { width: 1, height: 1, wUnits: 'px', hUnits: 'px' } });
            }
          }
        }
      },
      result: {
        snippets: [
          { type: 'image', media: {}, href: 'badurlbadurlbadurlbadurl.png' }
        ]
      }
    };

    mixin.fn(env, err => {
      assert.deepStrictEqual(env.result.snippets[0].media, { width: 1, height: 1 });
      done(err);
    });
  });


  it('image-size own `__loadImageSize__`', function (done) {
    let mixin = mixinsAfter.find(m => m.id === 'image-size');
    let env = {
      self: { __loadImageSize__: (__, cb) => { cb('err'); } },
      result: { snippets: [ { type: 'image', href: 'http://example.com/1.jpg' } ] }
    };

    mixin.fn(env, err => {
      assert.strictEqual(err, 'err');
      done();
    });
  });


  it('image-size cache get error', function (done) {
    let mixin = mixinsAfter.find(m => m.id === 'image-size');
    let env = {
      self: { __options__: { cache: { get: (k, cb) => { cb('err'); } } } },
      result: {
        snippets: [
          { type: 'image', href: 'http://example.com/1.jpg' }
        ]
      }
    };

    mixin.fn(env, err => {
      assert.strictEqual(err, 'err');
      done();
    });
  });


  it('image-size cache set error', function (done) {
    // 1x1 transparent gif
    let demoImage = new Buffer('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64');
    let server = nock('http://example.com')
      .get('/1.jpg')
      .reply(200, demoImage);

    let mixin = mixinsAfter.find(m => m.id === 'image-size');
    let env = {
      self: { __options__: { cache: { get: (k, cb) => { cb(); }, set: (k, v, cb) => { cb('err'); } } } },
      result: {
        snippets: [
          { type: 'image', href: 'http://example.com/1.jpg' }
        ]
      }
    };

    mixin.fn(env, err => {
      assert.strictEqual(err, 'err');
      server.done();
      done();
    });
  });


  it('image-size', function (done) {
    // 1x1 transparent gif
    let demoImage = new Buffer('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64');
    let server = nock('http://example.com')
      .get('/1.jpg')
      .reply(200, demoImage)
      .get('/2.png')
      .reply(200, demoImage)
      .get('/3.svg')
      .reply(200, '<svg width="5in" height="4px"></svg>')
      .get('/4.svg')
      .reply(200, '<svg width="1px" viewbox="0 0 100 50">');

    let mixin = mixinsAfter.find(m => m.id === 'image-size');
    let env = {
      self: { __options__: { cache: new Cache() } },
      result: {
        snippets: [
          { type: 'image', media: {}, href: 'http://example.com/1.jpg' },
          { type: 'image', href: 'http://example.com/2.png' },
          { type: 'image', media: {}, href: 'http://example.com/2.zzz' },
          { type: 'test', media: {}, href: 'http://example.com/3.zzz' },
          { type: 'image', media: { width: 10, height: 20 }, href: 'http://example.com/4.zzz' },
          { type: 'image', href: 'http://example.com/3.svg' },
          { type: 'image', href: 'http://example.com/4.svg' }
        ]
      }
    };

    mixin.fn(env, err => {
      if (err) {
        done(err);
        return;
      }

      assert.deepStrictEqual(env.result.snippets[0].media, { width: 1, height: 1 });
      assert.deepStrictEqual(env.result.snippets[1].media, { width: 1, height: 1 });
      assert.deepStrictEqual(env.result.snippets[2].media, {});
      assert.deepStrictEqual(env.result.snippets[3].media, {});
      assert.deepStrictEqual(env.result.snippets[4].media, { width: 10, height: 20 });
      assert.ok(!env.result.snippets[5].media);
      assert.deepStrictEqual(env.result.snippets[6].media, { width: 1, height: 0.5 });

      // Check from
      server.done();
      done();
    });
  });


  it('mime-detect', function (done) {
    let server = nock('http://example.com')
      .head('/test/foo.bar')
      .reply(200, '', {
        'content-type': 'text/html'
      })
      .head('/test/bar.zzz')
      .reply(200, '', {
        'content-type': ''
      });


    let mixin = mixinsAfter.find(m => m.id === 'mime-detect');
    let env = {
      self: { request },
      result: {
        snippets: [
          { media: {}, href: 'http://example.com/test/foo.bar', tags: [] },
          { media: {}, href: 'http://example.com/test/bar.zzz' },
          { media: {}, href: 'http://example.com/test/baz.mp4' },
          { media: {}, href: 'http://example.com/test/baz.mp4', type: 'old/test-type' }
        ]
      }
    };

    mixin.fn(env, function (err) {
      if (err) {
        done(err);
        return;
      }

      assert.strictEqual(env.result.snippets.length, 3);
      assert.strictEqual(env.result.snippets[0].type, 'text/html');
      assert.deepStrictEqual(env.result.snippets[0].tags, [ 'html5' ]);
      assert.strictEqual(env.result.snippets[1].type, 'video/mp4');
      assert.strictEqual(env.result.snippets[2].type, 'old/test-type');
      server.done();
      done();
    });
  });


  it('mime-detect bad response', function (done) {
    let server = nock('http://example.com')
      .head('/test/foo.bar')
      .reply(500, '');

    let mixin = mixinsAfter.find(m => m.id === 'mime-detect');
    let env = {
      self: { request },
      result: {
        snippets: [
          { media: {}, href: 'http://example.com/test/foo.bar' }
        ]
      }
    };

    mixin.fn(env, function (err) {
      assert.strictEqual(err.message, 'Mime-detect mixin after handler: Bad response code: 500');
      server.done();
      done();
    });
  });


  it('mime-detect connection error', function (done) {
    let mixin = mixinsAfter.find(m => m.id === 'mime-detect');
    let env = {
      self: { request },
      result: {
        snippets: [
          { media: {}, href: 'http://' }
        ]
      }
    };

    mixin.fn(env, function (err) {
      assert.strictEqual(err.message, 'Invalid URI "http:///"');
      done();
    });
  });
});
