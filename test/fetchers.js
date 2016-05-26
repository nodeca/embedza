'use strict';


const assert   = require('assert');
const nock     = require('nock');
const fetchers = require('../lib/fetchers');
const request  = require('request');


describe('fetchers', function () {
  it('meta bad response', function (done) {
    let server = nock('http://example.com')
      .get('/test/foo.bar')
      .reply(500, '');

    let fetcher = fetchers.find(m => m.id === 'meta');
    let env = {
      src: 'http://example.com/test/foo.bar',
      self: { request },
      data: {}
    };

    fetcher.fn(env, err => {
      assert.strictEqual(err.message, 'Meta fetcher: Bad response code: 500');
      server.done();
      done();
    });
  });


  it('meta', function (done) {
    let server = nock('http://example.com')
      .get('/test/foo.bar')
      .reply(200, `
        <html>
          <head>
            <title>html title</title>
            <meta property="foo1" content="bar1">
            <meta name="foo2" value="bar2">
            <meta name="foo3" src="bar3">
            <link rel="baz1" type="baz1/type" title="baz1 title">
            <link rel="baz1" type="baz11/type" title="baz11 title">
            <link name="baz2" title="baz2 title">
          </head>
          <body></body>
        </html>
      `);

    let fetcher = fetchers.find(m => m.id === 'meta');
    let env = {
      src: 'http://example.com/test/foo.bar',
      self: { request },
      data: {}
    };

    fetcher.fn(env, err => {
      assert.deepEqual(env.data, {
        meta: [
          { name: 'foo1', value: 'bar1' },
          { name: 'foo2', value: 'bar2' },
          { name: 'foo3', value: 'bar3' },
          { name: 'html-title', value: 'html title' }
        ],
        links: {
          baz1: [
            { rel: 'baz1', type: 'baz1/type', title: 'baz1 title' },
            { rel: 'baz1', type: 'baz11/type', title: 'baz11 title' }
          ],
          baz2: [
            { name: 'baz2', title: 'baz2 title' }
          ]
        }
      });
      server.done();
      done(err);
    });
  });


  it('oembed bad response', function (done) {
    let server = nock('http://example.com')
      .get('/test/foo.bar')
      .reply(504, '');

    let fetcher = fetchers.find(m => m.id === 'oembed');
    let env = {
      self: { request },
      data: { links: { alternate: [ { type: 'text/json+oembed', href: 'http://example.com/test/foo.bar' } ] } }
    };

    fetcher.fn(env, err => {
      assert.strictEqual(err.message, 'Oembed fetcher: Bad response code: 504');
      server.done();
      done();
    });
  });


  it('oembed JSON', function (done) {
    let server = nock('http://example.com')
      .get('/test/foo.bar')
      .reply(200, { foo: 'bar' }, { 'content-type': 'application/json' });

    let fetcher = fetchers.find(m => m.id === 'oembed');
    let env = {
      self: { request },
      data: { links: { alternate: [ { type: 'text/json+oembed', href: 'http://example.com/test/foo.bar' } ] } }
    };

    fetcher.fn(env, err => {
      assert.deepStrictEqual(env.data.oembed, { foo: 'bar' });
      server.done();
      done(err);
    });
  });


  it('oembed XML', function (done) {
    let server = nock('http://example.com')
      .get('/test/foo.bar')
      .reply(200, `
        <?xml version="1.0"?>
        <oembed>
          <foo>bar</foo>
        </oembed>
      `, { 'content-type': 'text/xml' });

    let fetcher = fetchers.find(m => m.id === 'oembed');
    let env = {
      self: { request },
      data: { links: { alternate: [ { type: 'text/json+oembed', href: 'http://example.com/test/foo.bar' } ] } }
    };

    fetcher.fn(env, err => {
      assert.deepStrictEqual(env.data.oembed, { foo: 'bar' });
      server.done();
      done(err);
    });
  });
});
