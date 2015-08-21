'use strict';


var assert = require('assert');
var _      = require('lodash');
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


  describe('.uniqueAsync()', function () {

    it('unique params debounce', function (done) {
      var calls = 0;

      function fn(__, cb) {
        calls++;

        // Next tick
        setTimeout(cb, 0);
      }

      var uniqueAsync = utils.uniqueAsync(fn);

      uniqueAsync(1, _.noop);
      uniqueAsync(1, _.noop);
      uniqueAsync(7, _.noop);
      uniqueAsync(1, function () {
        assert.equal(calls, 2);
        done();
      });
    });


    it('all callbacks should be called', function (done) {
      var calls = 0;

      function fn(__, cb) {
        // Next tick
        setTimeout(cb, 0);
      }

      var uniqueAsync = utils.uniqueAsync(fn);

      function finish() {
        calls++;

        if (calls === 3) {
          done();
        }
      }

      uniqueAsync('a', finish);
      uniqueAsync('a', finish);
      uniqueAsync('a', finish);
    });
  });
});
