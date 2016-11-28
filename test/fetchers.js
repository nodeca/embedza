'use strict';


const assert   = require('assert');
const proclaim = require('proclaim');
const nock     = require('nock');
const fetchers = require('../lib/fetchers');
const got      = require('got');


describe('fetchers', function () {

  it('meta bad response', function () {
    let server = nock('http://example.com')
      .get('/test/foo.bar')
      .reply(500, '');

    let fetcher = fetchers.find(m => m.id === 'meta');
    let env = {
      src: 'http://example.com/test/foo.bar',
      self: {
        request: got
      },
      data: {}
    };

    return fetcher.fn(env)
      .then(() => { throw new Error('error should be thrown here'); })
      .catch(err => {
        server.done();
        assert.strictEqual(err.message, 'Meta fetcher: Bad response code: 500');
      });
  });


  it('meta empty body', function () {
    let server = nock('http://example.com')
      .get('/test/foo.bar')
      .reply(200, '');

    let fetcher = fetchers.find(m => m.id === 'meta');
    let env = {
      src: 'http://example.com/test/foo.bar',
      self: {
        request: got
      },
      data: {}
    };

    return fetcher.fn(env).then(() => {
      server.done();
      assert.deepEqual(env.data, { meta: [], links: {} });
    });
  });


  it('meta connection error', function () {
    let fetcher = fetchers.find(m => m.id === 'meta');
    let env = {
      src: 'badurlbadurlbadurlbadurl',
      self: {
        request: got
      }
    };

    return fetcher.fn(env)
      .then(() => { throw new Error('error should be thrown here'); })
      .catch(err =>
        proclaim.match(err.message, /ENOTFOUND badurlbadurlbadurlbadurl/)
      );
  });


  it('meta', function () {
    let server = nock('http://example.com')
      .get('/test/foo.bar')
      .reply(200, `
        <html>
          <head>
            <title>html title</title>
            <meta property="foo1" content="bar1">
            <meta name="foo2" value="bar2">
            <meta name="foo3" src="bar3">
            <meta name="foo4">
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
      self: {
        request: got
      },
      data: {}
    };

    return fetcher.fn(env).then(() => {
      server.done();
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
    });
  });


  it('oembed bad response', function () {
    let server = nock('http://example.com')
      .get('/test/foo.bar')
      .reply(504, '');

    let fetcher = fetchers.find(m => m.id === 'oembed');
    let env = {
      self: {
        request: got
      },
      data: { links: { alternate: [ { type: 'text/json+oembed', href: 'http://example.com/test/foo.bar' } ] } }
    };

    return fetcher.fn(env)
      .then(() => { throw new Error('error should be thrown here'); })
      .catch(err => {
        server.done();
        assert.strictEqual(err.message, 'Oembed fetcher: Bad response code: 504');
      });
  });


  it('oembed no links', function () {
    let fetcher = fetchers.find(m => m.id === 'oembed');
    let env = {
      self: {
        request: got
      },
      data: { links: {} }
    };

    return fetcher.fn(env)
      .then(() => assert(!env.data.oembed));
  });


  it('oembed connection error', function () {
    let fetcher = fetchers.find(m => m.id === 'oembed');
    let env = {
      self: {
        request: got
      },
      data: { links: { alternate: [ { type: 'text/json+oembed', href: 'badurlbadurlbadurlbadurl' } ] } }
    };

    return fetcher.fn(env)
      .then(() => { throw new Error('error should be thrown here'); })
      .catch(err =>
        proclaim.match(err.message, /ENOTFOUND badurlbadurlbadurlbadurl/)
      );
  });


  it('oembed JSON', function () {
    let server = nock('http://example.com')
      .get('/test/foo.bar')
      .reply(200, { foo: 'bar' }, { 'content-type': 'application/json' });

    let fetcher = fetchers.find(m => m.id === 'oembed');
    let env = {
      self: {
        request: got
      },
      data: { links: { alternate: [ { type: 'text/json+oembed', href: 'http://example.com/test/foo.bar' } ] } }
    };

    return fetcher.fn(env).then(() => {
      server.done();
      assert.deepStrictEqual(env.data.oembed, { foo: 'bar' });
    });
  });


  it('oembed bad JSON', function () {
    let server = nock('http://example.com')
      .get('/test/foo.bar')
      .reply(200, 'aaa', { 'content-type': 'application/json' });

    let fetcher = fetchers.find(m => m.id === 'oembed');
    let env = {
      self: {
        request: got
      },
      data: { links: { alternate: [ { type: 'text/json+oembed', href: 'http://example.com/test/foo.bar' } ] } }
    };

    return fetcher.fn(env)
      .then(() => { throw new Error('error should be thrown here'); })
      .catch(err => {
        server.done();
        assert.strictEqual(err.message, "Oembed fetcher: Can't parse oembed JSON response");
      });
  });


  it('oembed bad content type', function () {
    let server = nock('http://example.com')
      .get('/test/foo.bar')
      .reply(200, 'aaa', { 'content-type': 'plain/text' });

    let fetcher = fetchers.find(m => m.id === 'oembed');
    let env = {
      self: {
        request: got
      },
      data: { links: { alternate: [ { type: 'text/json+oembed', href: 'http://example.com/test/foo.bar' } ] } }
    };

    return fetcher.fn(env)
      .then(() => { throw new Error('error should be thrown here'); })
      .catch(err => {
        server.done();
        assert.strictEqual(err.message, 'Oembed fetcher: Unknown oembed response content-type: plain/text');
      });
  });


  it('oembed no links', function () {
    let fetcher = fetchers.find(m => m.id === 'oembed');
    let env = {
      self: {
        request: got
      },
      data: { links: { alternate: [ { href: '/foo.bar' } ] } }
    };

    return fetcher.fn(env);
  });


  it('oembed XML', function () {
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
      self: {
        request: got
      },
      data: { links: { alternative: [ { type: 'text/json+oembed', href: 'http://example.com/test/foo.bar' } ] } }
    };

    return fetcher.fn(env).then(() => {
      server.done();
      assert.deepStrictEqual(env.data.oembed, { foo: 'bar' });
    });
  });


  it('oembed XML empty body', function () {
    let server = nock('http://example.com')
      .get('/test/foo.bar')
      .reply(200, '', { 'content-type': 'text/xml' });

    let fetcher = fetchers.find(m => m.id === 'oembed');
    let env = {
      self: {
        request: got
      },
      data: { links: { alternative: [ { type: 'text/json+oembed', href: 'http://example.com/test/foo.bar' } ] } }
    };

    return fetcher.fn(env).then(() => {
      server.done();
      assert.deepStrictEqual(env.data.oembed, {});
    });
  });
});
