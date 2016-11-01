'use strict';


const Embedza = require('../..');
const assert  = require('assert');


describe('rutube.ru', function () {
  it('real request', function () {
    let embedza = new Embedza();

    return embedza.info('https://rutube.ru/video/8623c112d77065f9b8167da7b7d8214f/')
      .then(res => {
        assert.strictEqual(res.meta.title, 'Физрук: Жил-был пёс');
      });
  });
});
