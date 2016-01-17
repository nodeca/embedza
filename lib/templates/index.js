'use strict';


const _    = require('lodash');
const fs   = require('fs');
const path = require('path');


let templates = {};


function loadTemplates(folder, prefix) {
  fs.readdirSync(folder).forEach(tplFileName => {
    if (path.extname(tplFileName) === '.lodash') {
      templates[prefix + '_' + path.basename(tplFileName, '.lodash')] =
        _.template(fs.readFileSync(path.join(folder, tplFileName)), { variable: 'self' });
    }
  });
}


// Load default templates
//
loadTemplates(__dirname, 'default');


// Load custom domains templates
//
fs.readdirSync(path.join(__dirname, '..', 'domains')).forEach(function (dirName) {
  let dirPath = path.join(__dirname, '..', 'domains', dirName);
  let stat = fs.statSync(dirPath);

  if (!stat.isDirectory()) {
    return; // continue
  }

  loadTemplates(dirPath, dirName);
});


module.exports = templates;
