'use strict';


var assert   = require('assert');
var fs       = require('fs');
var yaml     = require('js-yaml');
var path     = require('path');
var fixtures = yaml.load(fs.readFileSync(path.join(__dirname, 'fixtures', 'domains.yml')));
var async    = require('async');
var _        = require('lodash');
var Embedza  = require('..');


describe('domains', function () {
  var embedza = new Embedza();


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
