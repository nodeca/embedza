'use strict';


const Embedza = require('../..');
const assert  = require('assert');


describe('rutube.ru', function () {
  it('real request', function () {
    let embedza = new Embedza();

    return embedza.info('http://rutube.ru/video/d3ff6da94622b4faa7dd75217488c35a/')
      .then(res => {
        assert.strictEqual(res.meta.title, 'Дивергент / Divergent (2014)');
      });
  });
});
