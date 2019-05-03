'use strict';


const Embedza = require('../..');
const assert  = require('assert');


describe('rutube.ru', function () {
  it('real request', async function () {
    let embedza = new Embedza();

    const res = await embedza.info('https://rutube.ru/video/c5daee24e06f0c29a5fdfd5d06b4ace6/');

    assert.strictEqual(res.meta.title, 'Танцы, 3 сезон, 22 серия ФИНАЛ');
    res.snippets.forEach(s => {
      if (s.tags.indexOf('player') !== -1) assert.strictEqual(s.media.autoplay, 'autoStart=true');
    });
  });
});
