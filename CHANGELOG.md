4.0.1 / WIP
------------------

- Switch youtube API requests to HTTPS.


4.0.0 / 2020-03-17
------------------

- Deps bump.
- Drop rutube.ru support (service become unuseable).


3.0.0 / 2019-07-11
------------------

- Requires node.js v10+.
- Deps bump. `got` option is now `retry` instead of `retries`.
- Removed callbacks support.


2.3.0 / 2017-06-08
------------------

- Maintenance, deps bump. `got` v6 -> v7. Timout option may work a bit
  different but should not affect result.


2.2.0 / 2017-05-05
------------------

- Improve player placeholder layout. All area should be
  clickable without JS.


2.1.0 / 2017-01-27
------------------

- Reworked player layout to allow `max-width` use.


2.0.0 / 2016-12-03
------------------

- API change: rewrite all methods to promises. You may need to update `.cache`
  methods. Callback in `.info()` & `.render()` are still supported but not
  recommended for use.
- Added `option.request` (in constructor) to customize params of external
  requests been done by embedza.
- `err.status` -> `err.statusCode`.
- Live demo (serverless).


1.2.4 / 2016-11-02
------------------

- Switch from `http` to `https` for initial config download.
- Deps bump.


1.2.3 / 2016-07-11
------------------

- Fixed nasty typos, causing double callbacks call errors in some cases.
- Added SVG support and fractional values for media dimentions.
- Improved media dimentions validation for bad data.


1.2.2 / 2016-05-30
------------------

- Maintenance release: deps bump.


1.2.1 / 2016-05-27
------------------

- Allow `.webp` thumbnails at vimeo.
- 100% tests coverage.


1.2.0 / 2016-05-25
------------------

- Added `Promise` support.
- Fix resolve resource URL-s without protocols (`//example.com`).


1.1.0 / 2016-01-17
------------------

- Drop old nodes support (use es6).
- Deps update.


1.0.3 / 2015-12-07
------------------

- Enchanced error info with `code` & `status` properties.
- Added missed rules to youtube & vimeo.


1.0.2 / 2015-12-04
------------------

- Optimized vimeo fetcher to avoid bans (use OEMBED directly, without HTML fetch).
- Fixed invalid astrals encoding from youtube.


1.0.1 / 2015-09-17
------------------

- Replaced image size catcher lib with `probe-image-size`.


1.0.0 / 2015-08-21
------------------

- First release.
