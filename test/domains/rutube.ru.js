'use strict';


const Embedza = require('../..');
const assert  = require('assert');


describe('rutube.ru', function () {
  it('real request', function () {
    let embedza = new Embedza();

    return embedza.info('https://rutube.ru/video/c5daee24e06f0c29a5fdfd5d06b4ace6/')
      .then(res => {
        assert.strictEqual(res.meta.title, 'Танцы, 3 сезон, 22 серия ФИНАЛ');
        res.snippets.forEach(s => {
          if (s.tags.indexOf('player') !== -1) assert.strictEqual(s.media.autoplay, 'autoStart=true');
        });
      });
  });
});
