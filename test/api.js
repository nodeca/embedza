'use strict';


var assert   = require('assert');
var Embedza  = require('..');


describe('API', function () {

  it('.addFetcher()', function (done) {
    var embedza = new Embedza();

    embedza.addFetcher({
      id: 'test-fetcher',
      priority: -999,
      fn: function (env, callback) {
        callback('test fetcher error');
      }
    });

    embedza.render('https://vimeo.com/channels/staffpicks/135373919', 'block', function (err) {
      assert.strictEqual(err, 'test fetcher error');
      done();
    });
  });


  it('.addMixin()', function (done) {
    var embedza = new Embedza();

    embedza.addMixin({
      id: 'test-mixin',
      fn: function (env, callback) {
        callback('test mixin error');
      }
    });

    // Mock `.request`
    embedza.request = function (url, opt, callback) {
      if (!callback) {
        callback = opt;
        opt = null;
      }

      callback(null, { statusCode: 200 }, '');
    };

    embedza.render('https://vimeo.com/channels/staffpicks/135373919', 'block', function (err) {
      assert.strictEqual(err, 'test mixin error');
      done();
    });
  });


  it('.addMixinAfter()', function (done) {
    var embedza = new Embedza();

    embedza.addMixinAfter({
      id: 'test-mixin-after',
      fn: function (env, callback) {
        callback('test mixin after error');
      }
    });

    // Mock `.request`
    embedza.request = function (url, opt, callback) {
      if (!callback) {
        callback = opt;
        opt = null;
      }

      callback(null, { statusCode: 200 }, '');
    };

    embedza.render('https://vimeo.com/channels/staffpicks/135373919', 'block', function (err) {
      assert.strictEqual(err, 'test mixin after error');
      done();
    });
  });


  it('.rule()', function () {
    var embedza = new Embedza();

    embedza.addDomain('test.com');

    var rule = embedza.rule('test.com');

    assert.ok(rule.enabled);
    assert.strictEqual(rule.id, 'test.com');
  });


  it('.forEach() - disable domain', function (done) {
    var embedza = new Embedza();

    embedza.forEach(function (domain) {
      if (domain.id === 'youtube.com') {
        domain.enabled = false;
      }
    });

    // Mock `.request`
    embedza.request = function (url, opt, callback) {
      if (!callback) {
        callback = opt;
        opt = null;
      }

      callback(null, { statusCode: 200 }, '');
    };

    embedza.info('https://www.youtube.com/watch?v=jNQXAC9IVRw', function (err, res) {
      if (err) {
        done(err);
        return;
      }

      assert.equal(res, null);

      embedza.info('https://vimeo.com/channels/staffpicks/135373919', function (err, res) {
        if (err) {
          done(err);
          return;
        }

        assert.strictEqual(res.src, 'https://vimeo.com/channels/staffpicks/135373919');
        done();
      });
    });
  });


  describe('.addDomain()', function () {

    it('.addDomain() with domain name', function (done) {
      var embedza = new Embedza();

      // Mock `.request`
      embedza.request = function (url, opt, callback) {
        if (!callback) {
          callback = opt;
          opt = null;
        }

        callback(null, { statusCode: 200 }, '');
      };

      embedza.info('https://example.com', function (err, res) {
        if (err) {
          done(err);
          return;
        }

        assert.equal(res, null);

        embedza.addDomain('example.com');

        embedza.info('https://example.com', function (err, res) {
          if (err) {
            done(err);
            return;
          }

          assert.strictEqual(res.src, 'https://example.com');
          done();
        });
      });
    });


    it('.addDomain() with options', function (done) {
      var embedza = new Embedza();

      // Mock `.request`
      embedza.request = function (url, opt, callback) {
        if (!callback) {
          callback = opt;
          opt = null;
        }

        callback(null, { statusCode: 200 }, '<head>' +
          '<meta name="twitter:image" content="https://example.com/123.jpg">' +
          '<meta name="twitter:image:width" content="222">' +
          '<meta name="twitter:image:height" content="333">' +
          '</head>');
      };

      embedza.addDomain({
        id: 'example.com',
        match: [
          /^https?:\/\/example.com\/.*/
        ],
        fetchers: [
          'meta',
          function (env, cb) {
            env.result.fetchersExtraTest1 = true;
            cb();
          },
          {
            fn: function (env, cb) {
              env.result.fetchersExtraTest2 = true;
              cb();
            },
            priority: 0
          }
        ],
        mixins: [
          'twitter-thumbnail',
          function (env, cb) {
            env.result.mixinsExtraTest = true;
            cb();
          }
        ],
        mixinsAfter: [
          'ssl-force',
          function (env, cb) {
            env.result.mixinsAfterExtraTest = true;
            cb();
          }
        ]
      });

      embedza.info('https://example.com/asd', function (err, res) {
        if (err) {
          done(err);
          return;
        }

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

        done();
      });
    });
  });
});
