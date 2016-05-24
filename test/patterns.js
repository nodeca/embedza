'use strict';


const assert   = require('assert');
const fs       = require('fs');
const yaml     = require('js-yaml');
const path     = require('path');
const fixtures = yaml.load(fs.readFileSync(path.join(__dirname, 'fixtures', 'patterns.yml')));
const _        = require('lodash');
const Embedza  = require('..');


describe('patterns', function () {
  let embedza = new Embedza();


  fixtures.forEach(function (data) {

    it(data.url, function (done) {

      // Render inline template for url
      embedza.render(data.url, 'inline', function (err, result) {
        if (err) {
          done(err);
          return;
        }

        if (_.isArray(data.inline)) {

          // If check rules is array - check each pattern
          data.inline.forEach(function (fixture) {
            assert.ok(fixture.test(result.html), "Inline template don't match pattern. ('" + data.url + "')");
          });
        } else if (_.isRegExp(data.inline)) {

          // If rule is pattern - check match
          assert.ok(data.inline.test(result.html), "Inline template don't match pattern. ('" + data.url + "')");
        } else {

          // If rule is string - check exact match
          assert.strictEqual(result.html, data.inline);
        }

        // Render block template
        embedza.render(data.url, 'block', function (err, result) {
          if (err) {
            done(err);
            return;
          }

          if (_.isArray(data.block)) {

            // If check rules is array - check each pattern
            data.block.forEach(function (fixture) {
              assert.ok(fixture.test(result.html), "Block template don't match pattern. ('" + data.url + "')");
            });
          } else if (_.isRegExp(data.block)) {

            // If rule is pattern - check match
            assert.ok(data.block.test(result.html), "Block template don't match pattern. ('" + data.url + "')");
          } else {

            // If rule is string - check exact match
            assert.strictEqual(result.html, data.block);
          }

          done();
        });
      });
    });

  });
});
