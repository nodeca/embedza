'use strict';


var _    = require('lodash');
var fs   = require('fs');
var path = require('path');


var templates = {};


function loadTemplates(folder, prefix) {
  fs.readdirSync(folder).forEach(function (tplFileName) {
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
  var dirPath = path.join(__dirname, '..', 'domains', dirName);
  var stat = fs.statSync(dirPath);

  if (!stat.isDirectory()) {
    return; // continue
  }

  loadTemplates(dirPath, dirName);
});


module.exports = templates;
