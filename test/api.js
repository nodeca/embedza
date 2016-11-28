'use strict';


const assert   = require('assert');
const Embedza  = require('..');
const nock     = require('nock');


describe('API', function () {

  it('.addFetcher()', function () {
    let embedza = new Embedza();

    embedza.addFetcher({
      id: 'test-fetcher',
      priority: -999,
      fn: () => Promise.reject('test fetcher error')
    });

    embedza.addDomain('example.org');

    return embedza.render('http://example.org/12345', 'block')
      .then(() => { throw new Error('error should be thrown here'); })
      .catch(err => assert.strictEqual(err, 'test fetcher error'));
  });


  it('.addMixin()', function () {
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

    return embedza.render('https://vimeo.com/channels/staffpicks/135373919', 'block')
      .then(() => { throw new Error('error should be thrown here'); })
      .catch(err => assert.strictEqual(err, 'test mixin error'));
  });


  it('.addMixinAfter()', function () {
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

    return embedza.render('https://vimeo.com/channels/staffpicks/135373919', 'block')
      .then(() => { throw new Error('error should be thrown here'); })
      .catch(err => assert.strictEqual(err, 'test mixin after error'));
  });


  it('.rule()', function () {
    let embedza = new Embedza();

    embedza.addDomain('test.com');

    let rule = embedza.rule('test.com');

    assert.ok(rule.enabled);
    assert.strictEqual(rule.id, 'test.com');
  });


  it('.forEach() - disable domain', function () {
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

    return embedza.info('https://www.youtube.com/watch?v=jNQXAC9IVRw')
      .then(res => assert.equal(res, null))
      .then(() => embedza.info('https://vimeo.com/channels/staffpicks/135373919'))
      .then(res => assert.strictEqual(res.src, 'https://vimeo.com/channels/staffpicks/135373919'));
  });


  describe('.addDomain()', function () {

    it('.addDomain() with domain name', function () {
      let embedza = new Embedza();

      // Mock `.request`
      embedza.request = () => Promise.resolve({
        statusCode: 200,
        body: ''
      });

      return embedza.info('https://example.com/')
        .then(res => assert.equal(res, null))
        .then(() => {
          embedza.addDomain('example.com');

          return embedza.info('https://example.com/');
        })
        .then(res => assert.strictEqual(res.src, 'https://example.com/'));
    });


    it('.addDomain() disabled', function () {
      let embedza = new Embedza({ enabledProviders: [ 'test.com', 'youtube.com' ] });

      embedza.addDomain('example.com');

      return embedza.info('https://example.com/asd')
        .then(res => assert.equal(res, null));
    });


    it('.addDomain() with options', function () {
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
          }
        ]
      });

      return embedza.info('https://example.com/asd').then(res => {
        assert.deepEqual(res.snippets, [ {
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
  });


  describe('.info()', function () {
    it('from cache', function () {
      let embedza = new Embedza({
        cache: {
          get: () => Promise.resolve({ info: { foo: 'bar' } })
        },
        enabledProviders: [ 'test.com' ]
      });

      return embedza.info('http://test.com/bla')
        .then(res => assert.deepStrictEqual(res, { foo: 'bar' }));
    });


    it('from cache, via callback', function (done) {
      let embedza = new Embedza({
        cache: {
          get: () => Promise.resolve({ info: { foo: 'bar' } })
        },
        enabledProviders: [ 'test.com' ]
      });

      embedza.info('http://test.com/bla', (err, res) => {
        if (err) {
          done(err);
          return;
        }

        assert.deepStrictEqual(res, { foo: 'bar' });
        done();
      });
    });

    it('from cache with error', function () {
      let embedza = new Embedza({
        cache: {
          get: () => Promise.reject('err')
        },
        enabledProviders: [ 'test.com' ]
      });

      return embedza.info('http://test.com/bla')
        .then(() => { throw new Error('error should be thrown here'); })
        .catch(err => assert.strictEqual(err, 'err'));
    });


    it('bad url', function () {
      let embedza = new Embedza();

      return embedza.info('badurl')
        .then(res => assert.ok(!res));
    });
  });


  describe('.render()', function () {
    it('inline', function () {
      let embedza = new Embedza({ enabledProviders: [ 'example.com' ] });
      let server = nock('https://example.com')
        .get('/asd')
        .reply(200, '<head><meta name="title" value="test"></head>');

      return embedza.render('https://example.com/asd', 'inline')
        .then(res => {
          server.done();

          assert.strictEqual(
            res.html,
            '<a class="ez-domain-example_com ez-inline" target="_blank" ' +
            'href="https://example.com/asd" rel="nofollow">test</a>'
          );
        });
    });


    it('inline, via callback', function (done) {
      let embedza = new Embedza({ enabledProviders: [ 'example.com' ] });
      let server = nock('https://example.com')
        .get('/asd')
        .reply(200, '<head><meta name="title" value="test"></head>');

      embedza.render('https://example.com/asd', 'inline', (err, res) => {
        server.done();

        if (err) {
          done(err);
          return;
        }

        assert.strictEqual(
          res.html,
          '<a class="ez-domain-example_com ez-inline" target="_blank" ' +
          'href="https://example.com/asd" rel="nofollow">test</a>'
        );

        done();
      });
    });


    it('not enough data', function () {
      let embedza = new Embedza({ enabledProviders: [ 'example.com' ] });
      let server = nock('https://example.com')
        .get('/asd')
        .reply(200, '');

      return embedza.render('https://example.com/asd', [ 'player', 'rich', 'test' ])
        .then(res => {
          assert.ok(!res);
          server.done();
        });
    });


    it('inline with info', function () {
      let embedza = new Embedza();

      return embedza.render({ domain: 'a', src: 'b', meta: { title: 'c' } }, 'inline')
        .then(res => {
          assert.strictEqual(
            res.html,
            '<a class="ez-domain-a ez-inline" target="_blank" href="b" rel="nofollow">c</a>'
          );
        });
    });


    it('bad url', function () {
      let embedza = new Embedza({ enabledProviders: [ 'badurl.badurl' ] });

      return embedza.render('http://badurl.badurl/asd', 'inline')
        .then(() => { throw new Error('error should be thrown here'); })
        .catch(err => {
          assert.strictEqual(err.message, 'getaddrinfo ENOTFOUND badurl.badurl badurl.badurl:80');
        });
    });

    it('bad url', function () {
      let embedza = new Embedza({ enabledProviders: [ 'badurl.badurl' ] });

      return embedza.render('http://badurl.badurl/asd', 'inline')
        .then(() => { throw new Error('error should be thrown here'); })
        .catch(err => {
          assert.strictEqual(err.message, 'getaddrinfo ENOTFOUND badurl.badurl badurl.badurl:80');
        });
    });


    // coverage
    it('input that prodices no data', function () {
      let embedza = new Embedza();

      return embedza.render(null)
        .then(res => assert.equal(res, null));
    });
  });
});
