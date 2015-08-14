'use strict';


var assert = require('assert');
var utils  = require('../lib/utils');


describe('utils', function () {

  describe('.wlCheck()', function () {

    it('allow when record is string', function () {
      assert.ok(utils.wlCheck({
        test: {
          testIn: 'allow'
        }
      }, 'test.testIn'));
    });


    it('allow when record is array', function () {
      assert.ok(utils.wlCheck({
        test: {
          testIn: [ 'allow' ]
        }
      }, 'test.testIn'));
    });


    it('deny when record is string', function () {
      assert.ok(!utils.wlCheck({
        test: {
          testIn: 'deny'
        }
      }, 'test.testIn'));
    });


    it('deny when record is array', function () {
      assert.ok(!utils.wlCheck({
        test: {
          testIn: [ 'deny' ]
        }
      }, 'test.testIn'));
    });


    it('deny when record not exist', function () {
      assert.ok(!utils.wlCheck({}, 'test.testIn'));
    });
  });
});
