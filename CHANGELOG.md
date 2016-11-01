1.2.4 / 2016-11-02
------------------

- Switch from `http` to `https` for initial config download.


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
