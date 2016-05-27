'use strict';


const assert  = require('assert');
const Embedza = require('..');
const nock    = require('nock');


describe('vimeo.com', function () {
  it('404', function () {
    let embedza = new Embedza();
    let server = nock('https://vimeo.com')
      .get('/api/oembed.json')
      .query({ url: 'https://vimeo.com/765972886' })
      .reply(404, '');

    return embedza.info('https://vimeo.com/765972886')
      .catch(err => {
        assert.strictEqual(err.message, 'Vimeo fetcher: Bad response code: 404');
        server.done();
      });
  });


  it('connection error', function () {
    let embedza = new Embedza();

    embedza.request = (_, opt, cb) => {
      if (cb) cb('err');
      else opt('err');
    };

    return embedza.info('https://vimeo.com/765972886')
      .catch(err => {
        assert.strictEqual(err, 'err');
      });
  });


  it('bad JSON', function () {
    let embedza = new Embedza();
    let server = nock('https://vimeo.com')
      .get('/api/oembed.json')
      .query({ url: 'https://vimeo.com/765972886' })
      .reply(200, 'foo');

    return embedza.info('https://vimeo.com/765972886')
      .catch(err => {
        assert.strictEqual(err.message, "Vimeo fetcher: Can't parse oembed JSON response");
        server.done();
      });
  });


  it('thumbnail', function () {
    let embedza = new Embedza();
    let server = nock('https://vimeo.com')
      .get('/api/oembed.json')
      .query({ url: 'https://vimeo.com/765972886' })
      .reply(
        200,
        '{"thumbnail_url":"https:\/\/i.vimeocdn.com\/video\/571881602_1280.webp",' +
        '"thumbnail_width":1280,"thumbnail_height":720}'
      );

    return embedza.info('https://vimeo.com/765972886')
      .then(res => {
        assert.equal(res.snippets.length, 2);
        server.done();
      });
  });


  it('no thumbnail', function () {
    let embedza = new Embedza();
    let server = nock('https://vimeo.com')
      .get('/api/oembed.json')
      .query({ url: 'https://vimeo.com/765972886' })
      .reply(200, '{}');

    return embedza.info('https://vimeo.com/765972886')
      .then(res => {
        assert.equal(res.snippets.length, 0);
        server.done();
      });
  });
});
