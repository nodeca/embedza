embedza
=======

[![Build Status](https://img.shields.io/travis/nodeca/embedza/master.svg?style=flat)](https://travis-ci.org/nodeca/embedza)
[![NPM version](https://img.shields.io/npm/v/embedza.svg?style=flat)](https://www.npmjs.org/package/embedza)

> Generates site HTML snippets by URL.


Install
-------

```bash
npm install embedza --save
```


Examples
--------


Render player for youtube video:

```javascript
var embedza = require('embedza')();

embedza.render('https://www.youtube.com/watch?v=jNQXAC9IVRw', 'block', function (err, html) {
  if (err) {
    throw err;
  }
  
  if (html) {
    console.log(html);
  }
});
```


API
---


### new Embedza(options)


__options (not mandatory):__

- `enabledProviders`: array of enabled providers or `true` for all providers, default `true`
- `cache`: cache class with `.get(key, callback)` and `.set(key, value, callback)`, default cache stub (do nothing)

### Usage

- `.render(url, type, callback)` - render HTML snippet
  - url (String) - content url
  - type ([String]|String) - format name or list of suitable formats by priority ('block', 'inline')
  - callback (Function) - `function (err, result)`
    - `result.html`
    - `result.type`
- `.info(url, callback)` - get data for URL
  - url (String) - resource URL
  - callback (Function) - `function (err, result)`
    - `result.domain` - domain plugin id ('youtube.com', 'vimeo.com', ...)
    - `result.src` - source url
    - `result.meta` - title, description, site
    - `result.snippets` - snippets data: type, tags, href, media, html
- `.forEach(fn)` - iterate through domains to modify it
- `.rule(name)` - get domain rule by name

### Customize

- `.request` - `function (url, options, callback)`. By default it is wrapper for [request](npmjs.com/packages/request)
- templates: you can manage templates modify loader
  ``` javascript
  var _ = require('lodash');
  var templates = require('embedza/lib/templates');
  
  templates['default_inline'] = _.template('...template code...', { variable: 'self' });
  templates['youtube.com_block'] = _.template('...template code...', { variable: 'self' });
  ```
- `.addFetcher(options)` - add data fetcher
  - options (Object)
    - id (String) - fetcher id
    - priority (Number) - optional, run priority, default `0`
    - fn (Function) - fetcher handler - `function (env, callback)`
- `.addMixin(options)` - add mixin (data handler)
  - options (Object)
    - id (String) - mixin id
    - fn (Function) - mixin handler - `function (env, callback)`
- `.addMixinAfter(options)` - add mixin after handler
  - options (Object)
    - id (String) - post id
    - fn (Function) - post handler - `function (env, callback)`
- `.addDomain(options)` - enable domain with default rules or add custom one
  - options (Object|String)
    - id (String) - provider ID (`youtube.com`)
    - match ([RegExp]|RegExp) - patterns to match
    - fetchers ([String]) - optional, array of fetchers dependency
    - fetchersExtra ([Object]) - custom fetchers
    - mixins ([String]) - optional, array of mixins dependency
    - mixinsExtra ([Function]) - custom mixins
    - mixinsAfter ([String]) - optional, array of mixins after dependency
    - mixinsAfterExtra ([Function]) - custom mixins after
    - config (Object) - additional config: autoplay parameter name, API key

License
-------

[MIT](https://raw.github.com/nodeca/embedza/master/LICENSE)
