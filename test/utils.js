'use strict';


const assert = require('assert');
const _      = require('lodash');
const utils  = require('../lib/utils');


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
      let calls = 0;

      function fn(__, cb) {
        calls++;

        // Next tick
        setTimeout(cb, 0);
      }

      let uniqueAsync = utils.uniqueAsync(fn);

      uniqueAsync(1, _.noop);
      uniqueAsync(1, _.noop);
      uniqueAsync(7, _.noop);
      uniqueAsync(1, function () {
        assert.equal(calls, 2);
        done();
      });
    });


    it('all callbacks should be called', function (done) {
      let calls = 0;

      function fn(__, cb) {
        // Next tick
        setTimeout(cb, 0);
      }

      let uniqueAsync = utils.uniqueAsync(fn);

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


    it('should throw on wrong function signature', function () {
      try {
        utils.uniqueAsync(function () {});
      } catch (e) {
        assert.strictEqual(e.message, "uniqueAsync: 'fn' should have two parameters");
      }
    });
  });
});
