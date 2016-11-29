// Test and debug server
//
'use strict';
/* eslint-disable no-console */


const express = require('express');
const path    = require('path');
const Embedza = require('../');


let cache = {
  data: {},
  get: key => Promise.resolve(cache.data[key]),
  set: (key, value) => {
    cache.data[key] = value;
    return Promise.resolve();
  }
};

let embedza = new Embedza({ cache });

let providers = [];

embedza.forEach(rule => {
  if (rule.enabled) providers.push(rule.id);
});

express()
  .use(express.static(path.join(__dirname, 'assets')))
  .use(express.static(path.join(__dirname, '..', 'assets')))
  .set('view engine', 'jade')
  .set('views', path.join(__dirname, 'assets'))
  .get('/', function (req, res) {
    let url = req.query.url;

    let result = {
      url,
      providers
    };

    if (url) {
      embedza.info(url, (err, data) => {
        if (err) {
          result.err = err.toString();
          res.render('index', result);
          return;
        }

        if (!data) {
          result.err = 'Can not recognize url';
          res.render('index', result);
          return;
        }

        embedza.render(data, 'block', (err, block) => {
          if (err) {
            result.err = err.toString();
            res.render('index', result);
            return;
          }

          embedza.render(data, 'inline', (err, inline) => {
            if (err) {
              result.err = err.toString();
              res.render('index', result);
              return;
            }

            result.json = JSON.stringify(data, null, 2);
            result.inline = inline ? inline.html : null;
            result.block = block ? block.html : null;

            res.render('index', result);
          });
        });
      });

      return;
    }

    res.render('index', result);
  })
  .listen(3000, function () {
    let host = this.address().address;
    let port = this.address().port;

    console.log('Embedza listening at http://%s:%s', host, port);
  });
