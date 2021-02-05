'use strict';


const assert  = require('assert');
const Embedza = require('../..');
const nock    = require('nock');


describe('youtube.com', function () {
  it('real request', async function () {
    let embedza = new Embedza();

    const res = await embedza.info('https://www.youtube.com/watch?v=jNQXAC9IVRw');
    assert.deepStrictEqual(res.meta, { title: 'Me at the zoo', site: 'YouTube', description: '' });
  });


  it('404', async function () {
    let embedza = new Embedza();
    let server = nock('https://www.youtube.com')
      .get('/oembed')
      .query({ format: 'json', url: 'https://www.youtube.com/watch?v=CCCCnrwxzDs' })
      .reply(404, '');

    await assert.rejects(
      embedza.info('https://www.youtube.com/watch?v=CCCCnrwxzDs&list=asd'),
      /YouTube fetcher: Bad response code: 404/
    );
    server.done();
  });


  it('connection error', async function () {
    let embedza = new Embedza();

    embedza.request = () => Promise.reject('err');

    await assert.rejects(
      embedza.info('https://www.youtube.com/watch?v=CCCCnrwxzDs'),
      /^err$/
    );
  });


  it('bad JSON', async function () {
    let embedza = new Embedza();
    let server = nock('https://www.youtube.com')
      .get('/oembed')
      .query({ format: 'json', url: 'https://m.youtube.com/watch?v=CCCCnrwxzDs' })
      .reply(200, 'foo');

    await assert.rejects(
      embedza.info('https://m.youtube.com/#/watch?v=CCCCnrwxzDs'),
      /YouTube fetcher: Can't parse oembed JSON response/
    );
    server.done();
  });


  it('astral characters', async function () {
    let embedza = new Embedza();
    let server = nock('https://www.youtube.com')
      .get('/oembed')
      .query({ format: 'json', url: 'https://www.youtube.com/watch?v=CCCCnrwxzDs' })
      .reply(200, '{ "title": "\\U0001f61c EMOJI \\\\U0001f61c \\U00000040" }');

    const res = await embedza.info('https://www.youtube.com/watch?v=CCCCnrwxzDs');
    assert.strictEqual(res.meta.title, '😜 EMOJI \\U0001f61c @');
    server.done();
  });
});
