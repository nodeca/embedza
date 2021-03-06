// Utils
//
'use strict';


const _            = require('lodash');


// Get meta value by list of names in priority order
//
function findMeta(meta, names) {
  if (!meta) return null;

  if (!_.isArray(names)) names = [ names ];

  let record;

  names.some((name) => {
    record = _.find(meta, (item) => item.name === name);
    return record;
  });

  return (record || {}).value;
}


// Group meta records from namespace by fields
//
// - meta ([Object]) - array of meta records with `name` and `value`
// - namespace (String) - namespace filter by ('og:image', 'twitter:video', ...)
// - groupBy ([String]) - array of possible keys to group ('og:image:src', 'og:image:url')
//
//   console.log(getMeta(meta, 'og:video', [ 'og:video', 'og:video:src', 'og:video:url' ]));
//
//   [
//     [
//       { name: 'og:video:url', value: 'https://www.youtube.com/embed/jNQXAC9IVRw' },
//       { name: 'og:video:secure_url', value: 'https://www.youtube.com/embed/jNQXAC9IVRw' },
//       { name: 'og:video:type', value: 'text/html' },
//       { name: 'og:video:width', value: '480' },
//       { name: 'og:video:height', value: '360' }
//     ],
//     [
//       { name: 'og:video:url', value: 'http://www.youtube.com/v/jNQXAC9IVRw?version=3&autohide=1' },
//       { name: 'og:video:secure_url', value: 'https://www.youtube.com/v/jNQXAC9IVRw?version=3&autohide=1' },
//       { name: 'og:video:type', value: 'application/x-shockwave-flash' },
//       { name: 'og:video:width', value: '480' },
//       { name: 'og:video:height', value: '360' },
//       { name: 'og:video:tag', value: 'jawed' },
//       { name: 'og:video:tag', value: 'karim' },
//       { name: 'og:video:tag', value: 'elephant' },
//       { name: 'og:video:tag', value: 'zoo' },
//       { name: 'og:video:tag', value: 'youtube' },
//       { name: 'og:video:tag', value: 'first' },
//       { name: 'og:video:tag', value: 'video' }
//     ]
//   ]
//
function groupMeta(meta, namespace, groupBy) {
  if (!meta) return [];

  let records = _.filter(meta, o => o.name.toLowerCase().indexOf(namespace) === 0);

  let result = [], item = [];

  records.forEach(record => {
    if (_.find(item, (i) => i.name === record.name) &&
        groupBy.indexOf(record.name) !== -1) {
      result.push(item);
      item = [];
    }

    item.push(record);
  });

  result.push(item);

  return result;
}


// Check record allowed in whitelist
//
function wlCheck(wl, record, value) {
  if (!value) value = 'allow';

  let wlItem = _.get(wl, record);

  if (_.isArray(wlItem)) return wlItem.indexOf(value) !== -1;

  return wlItem === value;
}


exports.findMeta = findMeta;
exports.groupMeta = groupMeta;
exports.wlCheck = wlCheck;
