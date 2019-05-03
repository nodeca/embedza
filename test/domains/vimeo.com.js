'use strict';


const assert  = require('assert');
const Embedza = require('../..');
const nock    = require('nock');


describe('vimeo.com', function () {
  it('real request', async function () {
    // skip this test while run on TRAVIS-CI,
    // because vimeo returns 403 error
    if (process.env.TRAVIS) {
      this.skip();
      return;
    }

    let embedza = new Embedza();

    const res = await embedza.info('https://vimeo.com/channels/staffpicks/135373919');
    assert.strictEqual(res.meta.title, '20 Minutes of Kite Flying Time Collapsed: San Diego Study #6');
  });


  it('404', async function () {
    let embedza = new Embedza();
    let server = nock('https://vimeo.com')
      .get('/api/oembed.json')
      .query({ url: 'https://vimeo.com/765972886' })
      .reply(404, '');

    await assert.rejects(
      embedza.info('https://vimeo.com/765972886'),
      /Vimeo fetcher: Bad response code: 404/
    );
    server.done();
  });


  it('connection error', async function () {
    let embedza = new Embedza();

    embedza.request = () => Promise.reject('err');

    await assert.rejects(
      embedza.info('https://vimeo.com/765972886'),
      /^err$/
    );
  });


  it('bad JSON', async function () {
    let embedza = new Embedza();
    let server = nock('https://vimeo.com')
      .get('/api/oembed.json')
      .query({ url: 'https://vimeo.com/765972886' })
      .reply(200, 'foo');

    await assert.rejects(
      embedza.info('https://vimeo.com/765972886'),
      /Vimeo fetcher: Can't parse oembed JSON response/
    );
    server.done();
  });


  it('thumbnail', async function () {
    let embedza = new Embedza();
    let server = nock('https://vimeo.com')
      .get('/api/oembed.json')
      .query({ url: 'https://vimeo.com/765972886' })
      .reply(
        200,
        '{"thumbnail_url":"https:\/\/i.vimeocdn.com\/video\/571881602_1280.webp",' +
        '"thumbnail_width":1280,"thumbnail_height":720}'
      );

    const res = await embedza.info('https://vimeo.com/765972886');
    assert.equal(res.snippets.length, 2);
    server.done();
  });


  it('no thumbnail', async function () {
    let embedza = new Embedza();
    let server = nock('https://vimeo.com')
      .get('/api/oembed.json')
      .query({ url: 'https://vimeo.com/765972886' })
      .reply(200, '{}');

    const res = await embedza.info('https://vimeo.com/765972886');
    assert.equal(res.snippets.length, 0);
    server.done();
  });
});
