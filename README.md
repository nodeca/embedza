embedza
=======

[![Greenkeeper badge](https://badges.greenkeeper.io/nodeca/embedza.svg)](https://greenkeeper.io/)

[![Build Status](https://img.shields.io/travis/nodeca/embedza/master.svg?style=flat)](https://travis-ci.org/nodeca/embedza)
[![NPM version](https://img.shields.io/npm/v/embedza.svg?style=flat)](https://www.npmjs.org/package/embedza)
[![Coverage Status](https://coveralls.io/repos/github/nodeca/embedza/badge.svg?branch=master)](https://coveralls.io/github/nodeca/embedza?branch=master)

> Create HTML snippets/embeds from URLs using info from oEmbed,
> Open Graph, meta tags.

Key feature:

- Supports both block & inline snippets (by default extracts data from oembed,
  opengraph and meta tags).
- Light placeholders for video players to load page without delays. Iframes are
  loaded only after user clicks "play" button.
- Cacheing.
- Easy to customize and extend.
- Dev server to test your changes.

[**Live Demo**](https://embedza.herokuapp.com/)


Install
-------

```bash
npm install embedza --save
```

run dev server (with debug messages):

```bash
DEBUG=embedza:* npm start
```


Example
-------

Render player for youtube video:

```javascript
var embedza = require('embedza')();

embedza.render('https://www.youtube.com/watch?v=JrZSfMiVC88', 'block')
  .then(result => {
    if (result) console.log(result.html, result.type);
  });
});
```


API
---


### new Embedza(options)

Creates new `Embedza` instance with specified options:

- __enabledProviders__ - array of enabled providers or `true` for all providers,
  default `true`.
- __cache__ - object with `.get(key, callback)` and `.set(key, value, callback)`
  methods. Default stub does nothing.
- __request__ (optional) - any options for external requests, as described
  in [`got` docs](https://github.com/sindresorhus/got). For example, you can
  customize user agent header.


### .render(url, type [, callback]) -> Promise

Try to create HTML snippet of requested type by URL.

- __url__ (String|Object) - content url or result of `.info()`.
- __type__ ([String]|String) - format name or list of suitable formats
  by priority ('block', 'inline')

Returns:

- `result.html` - html code
- `result.type` - matched format type

If url can not be rendered - returns null. On remote errors fails with
error info.


### .info(url [, callback]) -> Promise

Similar to `.render()`, but returns object with full url description.

- __url__ (String) - resource URL.

Returns:

- `result.domain` - domain plugin id ('youtube.com', 'vimeo.com', ...)
- `result.src` - source url
- `result.meta` - title, description, site
- `result.snippets` - snippets data: type, tags, href, media, html

If url info does not exists - returns null. On remote errors fails with
error info.


### .forEach(fn(rule))

Iterates through domains rules to modify those.


### .rule(name)

Get domain rule by name.


### .addDomain(options)

Rerister new service. If `String` passed - enable domain with default rules.
If `Object` passed - create custom configuration:

- __id__ (String) - provider ID (`youtube.com`)
- __match__ ([RegExp]|RegExp) - patterns to match
- __fetchers__ ([String|Function|Object]) - optional, array of fetchers dependency
- __mixins__ ([String|Function]) - optional, array of mixins dependency
- __mixinsAfter__ ([String|Function]) - optional, array of mixins after dependency
- __config__ (Object) - additional config: autoplay parameter name, API key


### .addFetcher(options)

Add add data fetcher. Options:

- __id__ (String) - fetcher name.
- __priority__ (Number) - optional, run priority, default - `0`.
- __fn__ (Function) - fetcher handler, `function (env, callback)`.


### .addMixin(options)

Add mixin (data handler). Options:

- __id__ (String) - mixin name.
- __fn__ (Function) - mixin handler, `function (env, callback)`.


### .addMixinAfter(options)

Add post-processor "after" handler. The same as `.addMixin`, but handlers
are axecuted after all mixins. Options:

- __id__ (String) - post-processor name.
- __fn__ (Function) - post-processor handler, `function (env, callback)`.


## Advanced customization

### .request()

By default it's a wrapper for [request](npmjs.com/packages/request). You can
override it. For example to force use cache only.


### Templates

Manage available templates:

```js
var _ = require('lodash');
var embedza = require('embedza')();

// Customize templates
embedza.templates['default_inline'] = _.template('...template code...', { variable: 'self' });
embedza.templates['youtube.com_player'] = _.template('...template code...', { variable: 'self' });

// Customize template aliases
embedza.aliases.block = [ 'player', 'photo' ];
```


Similar projects
----------------

- [iframely](https://github.com/itteco/iframely)
- [onebox](https://github.com/discourse/onebox)

Embedza is inspired by projects above, but designed to satisfy our requirements.
For example, it supports inline output format.


License
-------

[MIT](https://raw.github.com/nodeca/embedza/master/LICENSE)
