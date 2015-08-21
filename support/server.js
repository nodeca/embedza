// Test and debug server
//
'use strict';
/* eslint-disable no-console */


var express = require('express');
var path    = require('path');
var Embedza = require('../');


var cache = {
  data: {},
  get: function (key, callback) {
    callback(null, cache.data[key]);
  },
  set: function (key, value, callback) {
    cache.data[key] = value;
    callback(null);
  }
};

var embedza = new Embedza({
  cache: cache
});


express()
  .use(express.static(path.join(__dirname, 'assets')))
  .use(express.static(path.join(__dirname, '..', 'assets')))
  .set('view engine', 'jade')
  .set('views', path.join(__dirname, 'assets'))
  .get('/', function (req, res) {
    var url = req.query.url;

    if (url) {
      embedza.info(url, function (err, data) {
        if (err) {
          res.render('index', { err: err.toString(), url: url });
          return;
        }

        if (!data) {
          res.render('index', { url: url });
          return;
        }

        embedza.render(data, 'block', function (err, block) {
          if (err) {
            res.render('index', { err: err.toString(), url: url });
            return;
          }

          embedza.render(data, 'inline', function (err, inline) {
            if (err) {
              res.render('index', { err: err.toString(), url: url });
              return;
            }

            res.render('index', {
              json: JSON.stringify(data, null, 2),
              inline: inline ? inline.html : null,
              block: block ? block.html : null,
              url: url
            });
          });
        });
      });

      return;
    }

    res.render('index', { url: url });
  })
  .listen(3000, function () {
    var host = this.address().address;
    var port = this.address().port;

    console.log('Embedza listening at http://%s:%s', host, port);
  });
