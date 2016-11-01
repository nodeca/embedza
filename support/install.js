// Download whitelist from http://iframely.com/qa/whitelist.json
//
'use strict';
/* eslint-disable no-console */


const https   = require('https');
const fs      = require('fs');
const path    = require('path');


const URL = 'https://iframely.com/qa/whitelist.json';
const SAVE_PATH = path.join(__dirname, '..', 'config', 'domains_conf.json');


let stat;

try {
  stat = fs.statSync(SAVE_PATH);
} catch (__) {}

// If config exists and not empty - don't download again
if (stat && stat.size > 0) {
  return;
}

console.log('Downloading: ' + URL + ' ...');

// Download
https.get(URL, function (res) {
  if (res.statusCode !== 200) {
    console.error('Bad response code: ' + res.statusCode);
    process.exit(1);
  }

  let data = [];

  res.setEncoding('binary');

  res
    .on('data', function (chunk) {
      data.push(chunk);
    })
    .on('end', function () {
      // Save
      fs.writeFileSync(SAVE_PATH, data.join(''));
      console.log('Done.');
    })
    .on('error', function (err) {
      console.error(err);
      process.exit(1);
    });
});
