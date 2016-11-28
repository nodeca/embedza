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


express()
  .use(express.static(path.join(__dirname, 'assets')))
  .use(express.static(path.join(__dirname, '..', 'assets')))
  .set('view engine', 'jade')
  .set('views', path.join(__dirname, 'assets'))
  .get('/', function (req, res) {
    let url = req.query.url;

    if (url) {
      embedza.info(url, (err, data) => {
        if (err) {
          res.render('index', { err: err.toString(), url });
          return;
        }

        if (!data) {
          res.render('index', { url });
          return;
        }

        embedza.render(data, 'block', (err, block) => {
          if (err) {
            res.render('index', { err: err.toString(), url });
            return;
          }

          embedza.render(data, 'inline', (err, inline) => {
            if (err) {
              res.render('index', { err: err.toString(), url });
              return;
            }

            res.render('index', {
              json: JSON.stringify(data, null, 2),
              inline: inline ? inline.html : null,
              block: block ? block.html : null,
              url
            });
          });
        });
      });

      return;
    }

    res.render('index', { url });
  })
  .listen(3000, function () {
    let host = this.address().address;
    let port = this.address().port;

    console.log('Embedza listening at http://%s:%s', host, port);
  });
