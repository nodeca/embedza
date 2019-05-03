'use strict';


const assert   = require('assert');
const Embedza  = require('..');
const nock     = require('nock');


describe('API', function () {

  it('.addFetcher()', async function () {
    let embedza = new Embedza();

    embedza.addFetcher({
      id: 'test-fetcher',
      priority: -999,
      fn: () => Promise.reject('test fetcher error')
    });

    embedza.addDomain('example.org');

    await assert.rejects(
      embedza.render('http://example.org/12345', 'block'),
      /test fetcher error/
    );
  });


  it('.addMixin()', async function () {
    let embedza = new Embedza();

    embedza.addMixin({
      id: 'test-mixin',
      fn: () => Promise.reject('test mixin error')
    });

    // Mock `.request`
    embedza.request = () => Promise.resolve({
      statusCode: 200,
      body: '{}'
    });

    await assert.rejects(
      embedza.render('https://vimeo.com/channels/staffpicks/135373919', 'block'),
      /test mixin error/
    );
  });


  it('.addMixinAfter()', async function () {
    let embedza = new Embedza();

    embedza.addMixinAfter({
      id: 'test-mixin-after',
      fn: () => Promise.reject('test mixin after error')
    });

    // Mock `.request`
    embedza.request = () => Promise.resolve({
      statusCode: 200,
      body: '{}'
    });

    await assert.rejects(
      embedza.render('https://vimeo.com/channels/staffpicks/135373919', 'block'),
      /test mixin after error/
    );
  });


  it('.rule()', function () {
    let embedza = new Embedza();

    embedza.addDomain('test.com');

    let rule = embedza.rule('test.com');

    assert.ok(rule.enabled);
    assert.strictEqual(rule.id, 'test.com');
  });


  it('.forEach() - disable domain', async function () {
    let embedza = new Embedza();

    embedza.forEach(function (domain) {
      if (domain.id === 'youtube.com') {
        domain.enabled = false;
      }
    });

    // Mock `.request`
    embedza.request = () => Promise.resolve({
      statusCode: 200,
      body: '{}'
    });

    let res = await embedza.info('https://www.youtube.com/watch?v=jNQXAC9IVRw');
    assert.strictEqual(res, null);
    res = await embedza.info('https://vimeo.com/channels/staffpicks/135373919');
    assert.strictEqual(res.src, 'https://vimeo.com/channels/staffpicks/135373919');
  });


  it('Default user agent', async function () {
    let embedza = new Embedza();
    let server = nock('https://example.com')
      .get('/asd')
      .reply(function () {
        if (/^embedza/.test(this.req.headers['user-agent'])) return [ 200, '' ];
        return [ 503, '' ];
      });

    await embedza.request('https://example.com/asd');
    server.done();
  });


  it('Custom user agent', async function () {
    let embedza = new Embedza({
      request: {
        headers: {
          'user-agent': 'foobar'
        }
      }
    });
    let server = nock('https://example.com')
      .get('/asd')
      .reply(function () {
        if (/^foo/.test(this.req.headers['user-agent'])) return [ 200, '' ];
        return [ 503, '' ];
      });

    await embedza.request('https://example.com/asd');
    server.done();
  });


  describe('.addDomain()', function () {

    it('.addDomain() with domain name', async function () {
      let embedza = new Embedza();

      // Mock `.request`
      embedza.request = () => Promise.resolve({
        statusCode: 200,
        body: ''
      });

      let res = await embedza.info('https://example.com/');
      assert.strictEqual(res, null);

      embedza.addDomain('example.com');

      res = await embedza.info('https://example.com/');
      assert.strictEqual(res.src, 'https://example.com/');
    });


    it('.addDomain() disabled', async function () {
      let embedza = new Embedza({ enabledProviders: [ 'test.com', 'youtube.com' ] });

      embedza.addDomain('example.com');

      const res = await embedza.info('https://example.com/asd');
      assert.strictEqual(res, null);
    });


    it('.addDomain() with options', async function () {
      let embedza = new Embedza();
      let server = nock('https://example.com')
        .get('/asd')
        .reply(200, `
          <head>
            <meta name="twitter:image" content="https://example.com/123.jpg">
            <meta name="twitter:image:width" content="222">
            <meta name="twitter:image:height" content="333">
          </head>
        `);

      embedza.addDomain({
        id: 'example.com',
        match: /^https?:\/\/example.com\/.*/,
        fetchers: [
          'meta',
          env => {
            env.result.fetchersExtraTest1 = true;
            return Promise.resolve();
          },
          {
            fn: env => {
              env.result.fetchersExtraTest2 = true;
              return Promise.resolve();
            },
            priority: 0
          }
        ],
        mixins: [
          'twitter-thumbnail',
          env => {
            env.result.mixinsExtraTest = true;
            return Promise.resolve();
          }
        ],
        mixinsAfter: [
          'ssl-force',
          env => {
            env.result.mixinsAfterExtraTest = true;
            return Promise.resolve();
          },
          'convert-str-int'
        ]
      });

      const res = await embedza.info('https://example.com/asd');
      assert.deepStrictEqual(res.snippets, [ {
        type: 'image',
        href: 'https://example.com/123.jpg',
        tags: [ 'thumbnail', 'twitter', 'ssl' ],
        media: { width: 222, height: 333 }
      } ]);

      assert.ok(res.fetchersExtraTest1);
      assert.ok(res.fetchersExtraTest2);
      assert.ok(res.mixinsExtraTest);
      assert.ok(res.mixinsAfterExtraTest);

      server.done();
    });
  });


  describe('.info()', function () {
    it('from cache', async function () {
      let embedza = new Embedza({
        cache: {
          get: () => Promise.resolve({ info: { foo: 'bar' } })
        },
        enabledProviders: [ 'test.com' ]
      });

      const res = await embedza.info('http://test.com/bla');
      assert.deepStrictEqual(res, { foo: 'bar' });
    });


    it('from cache with error', async function () {
      let embedza = new Embedza({
        cache: {
          get: () => Promise.reject('err')
        },
        enabledProviders: [ 'test.com' ]
      });

      await assert.rejects(
        embedza.info('http://test.com/bla'),
        /err/
      );
    });


    it('bad url', async function () {
      let embedza = new Embedza();

      const res = await embedza.info('badurl');
      assert.ok(!res);
    });
  });


  describe('.render()', function () {
    it('inline', async function () {
      let embedza = new Embedza({ enabledProviders: [ 'example.com' ] });
      let server = nock('https://example.com')
        .get('/asd')
        .reply(200, '<head><meta name="title" value="test"></head>');

      const res = await embedza.render('https://example.com/asd', 'inline');

      server.done();

      assert.strictEqual(
        res.html,
        '<a class="ez-domain-example_com ez-inline" target="_blank" ' +
        'href="https://example.com/asd" rel="nofollow">test</a>'
      );
    });


    it('not enough data', async function () {
      let embedza = new Embedza({ enabledProviders: [ 'example.com' ] });
      let server = nock('https://example.com')
        .get('/asd')
        .reply(200, '');

      const res = await embedza.render('https://example.com/asd', [ 'player', 'rich', 'test' ]);
      assert.ok(!res);
      server.done();
    });


    it('inline with info', async function () {
      let embedza = new Embedza();

      const res = await embedza.render({ domain: 'a', src: 'b', meta: { title: 'c' } }, 'inline');

      assert.strictEqual(
        res.html,
        '<a class="ez-domain-a ez-inline" target="_blank" href="b" rel="nofollow">c</a>'
      );
    });


    it('bad url', async function () {
      let embedza = new Embedza({ enabledProviders: [ 'badurl.badurl' ] });

      await assert.rejects(
        embedza.render('http://badurl.badurl/asd', 'inline'),
        /getaddrinfo ENOTFOUND badurl[.]badurl/
      );
    });

    it('bad url', async function () {
      let embedza = new Embedza({ enabledProviders: [ 'badurl.badurl' ] });

      await assert.rejects(
        embedza.render('http://badurl.badurl/asd', 'inline'),
        /getaddrinfo ENOTFOUND badurl[.]badurl/
      );
    });


    // coverage
    it('input that prodices no data', async function () {
      let embedza = new Embedza();

      const res = await embedza.render(null);
      assert.strictEqual(res, null);
    });
  });
});
