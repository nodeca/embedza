'use strict';


const assert  = require('assert');
const Embedza = require('../..');
const nock    = require('nock');


describe('youtube.com', function () {
  it('real request', function () {
    let embedza = new Embedza();

    return embedza.info('https://www.youtube.com/watch?v=jNQXAC9IVRw')
      .then(res => {
        assert.deepStrictEqual(res.meta, { title: 'Me at the zoo', site: 'YouTube', description: '' });
      });
  });


  it('404', function () {
    let embedza = new Embedza();
    let server = nock('http://www.youtube.com')
      .get('/oembed')
      .query({ format: 'json', url: 'https://www.youtube.com/watch?v=CCCCnrwxzDs' })
      .reply(404, '');

    return embedza.info('https://www.youtube.com/watch?v=CCCCnrwxzDs&list=asd')
      .catch(err => {
        assert.strictEqual(err.message, 'YouTube fetcher: Bad response code: 404');
        server.done();
      });
  });


  it('connection error', function () {
    let embedza = new Embedza();

    embedza.request = (_, opt, cb) => {
      if (cb) cb('err');
      else opt('err');
    };

    return embedza.info('https://www.youtube.com/watch?v=CCCCnrwxzDs')
      .catch(err => {
        assert.strictEqual(err, 'err');
      });
  });


  it('bad JSON', function () {
    let embedza = new Embedza();
    let server = nock('http://www.youtube.com')
      .get('/oembed')
      .query({ format: 'json', url: 'https://m.youtube.com/watch?v=CCCCnrwxzDs' })
      .reply(200, 'foo');

    return embedza.info('https://m.youtube.com/#/watch?v=CCCCnrwxzDs')
      .catch(err => {
        assert.strictEqual(err.message, "YouTube fetcher: Can't parse oembed JSON response");
        server.done();
      });
  });


  it('astral characters', function () {
    let embedza = new Embedza();
    let server = nock('http://www.youtube.com')
      .get('/oembed')
      .query({ format: 'json', url: 'https://www.youtube.com/watch?v=CCCCnrwxzDs' })
      .reply(200, '{ "title": "\\U0001f61c EMOJI \\\\U0001f61c \\U00000040" }');

    return embedza.info('https://www.youtube.com/watch?v=CCCCnrwxzDs')
      .then(res => {
        assert.strictEqual(res.meta.title, '😜 EMOJI \\U0001f61c @');
        server.done();
      });
  });
});
