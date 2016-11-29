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
  .set('view engine', 'pug')
  .set('views', path.join(__dirname, 'assets'))

  .get('/', function (req, res, next) {
    let url = req.query.url;
    let info;

    let result = {
      url,
      providers
    };

    if (!url) {
      res.render('index', result);
      return;
    }

    Promise.resolve()
      .then(() => embedza.info(url))
      .then(data => {
        if (!data) throw new Error('Can not recognize url');
        info = data;

        result.json = JSON.stringify(data, null, 4);

        return embedza.render(info, 'block');
      })
      .then(block => {
        result.block = block ? block.html : null;

        return embedza.render(info, 'inline');
      })
      .then(inline => {
        result.inline = inline ? inline.html : null;

        res.render('index', result);
      })
      .catch(next);
  })

  /* eslint-disable no-unused-vars */
  .use(function (err, req, res, next) {
    res.render('index', {
      url: req.query.url,
      providers,
      err: err.toString()
    });
  })
  /* eslint-enable no-unused-vars */

  .listen(3000, function () {
    let host = this.address().address;
    let port = this.address().port;

    console.log('Embedza listening at http://%s:%s', host, port);
  });
