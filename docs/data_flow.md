# Embedza data flow

## `env` data structure

To resolve link, we take initial `env` object and pipe it through multiple processing stages. Here is initial `env` structure:

- __src__ - resource url
- __wl__ - whitelisted domain config. Contains info about supported sites and
  additionsl instructions about available features (if description in page
  html/omebed has mistakes or not enougth). This info is taken from iframely
  site on package install, to reduce local config data and simplify maintenance.
- __config__ - additional config info (data from iframely is not enougth
  for us). On embedza init you can pass API keys and other options here.
- __data__ - fetchers data sandbox
- __result__ - output data
  - __domain__ - domain (provider) rule id ('youtube.com', 'vimeo.com', ...)
  - __src__ - source url
  - __meta__ - title, description, site
  - __snippets__ - snippets data: type, tags, href, media, html
- __self__ (Embedza)

## Procesing stages

`env` pass throuhg sereval stages, each stage has multiple plugins. This
division is done do simplify priorities control. May be, this could be done
better, but current implementation is simple and enougth for our needs.

- __initialize__ - create `env`
  - parse url
  - check url match rules
  - fill domain config
  - lookup and fill whitelist config
- __fetchers__ stage - fetch remote page & oembed info
  - fetch page data
  - parse tags
  - fetch oembed data (if exists)
  - fill `env.data` structure
- __mixins__ stage - no remote fetches, process page metadata
  - fill `env.result.meta` and `env.result.snippets`
- __mixins_after__ stage - compact output (if duplicated in different tags)
  and fetch remote image sizes.
  - resolve snippet's href
  - detect content-type
  - merge snippets data by href
  - load images size

Details about each stage are described below.

### fetchers

- __meta__ - Meta-data fetcher. Parse `head` tag for: `title`, `link` and
  `meta` tags. Fill `env.data.meta` and `env.data.links`.
- __oembed__ - Oembed fetcher. Look for `env.data.links.alternate` and try
  to request `json` or `xml` data in oembed format. Fill `env.data.oembed`.

### mixins

- __meta__ - Fill `env.result.meta` with `title`, `site` and `description`.
- __twitter-thumbnail__ - Extract data from `<twitter:image>` tag.
- __twitter-player__ - Extract data from `<twitter:player>` tag.
- __og-player__ - Extract data from `<og:video>` tag.
- __og-thumbnail__ - Extract data from `<og:image>` tag.
- __oembed-player__ - Extract data from `oembed.html` tag.
- __oembed-photo__ - Extract data from `oembed.url` tag.
- __oembed-icon__ - Extract data from `oembed.icon_url` tag.
- __oembed-thumbnail__ - Extract data from `oembed.thumbnail_url` tag.
- __oembed-rich__ - Extract data from oembed rich.
- __favicon__ - Extract favicons.
- __logo__ - Extract logo from meta.

### mixins_after

- __resolve-href__ - Resolve snippet's href: `/img/icon.png` -> `http://example.com/img/icon.png`,
  `//example.com/img/icon.png` -> `http(s)://example.com/img/icon.png`
- __mime-detect__ - Detect content-type of snippet (if not defined yet).
- __ssl-force__ - Add ssl tag for https snippets.
- __merge__ - Merge snippets data by href.
- __image-size__ - Load images size.
- __set-autoplay__ - Set autoplay parameter to `snippet.media`.
- __convert-str-int__ - Convert 'width', 'height' and 'duration' to float and remove bad values.

## Example

For https://www.youtube.com/watch?v=JrZSfMiVC88.

Initial:

```js
{
  "src": "https://www.youtube.com/watch?v=JrZSfMiVC88",
  "wl": {
    "date": 1462976678567,
    "oembed": { "video": [ "allow", "responsive", "ssl", "html5" ] },
    "og": { "video": [ "allow", "responsive", "ssl" ] },
    "twitter": { "player": [ "allow", "responsive", "html5" ] },
    "html-meta": { "embedURL": [ "allow", "responsive", "html5" ] }
  },
  "config": {
    "autoplay": "autoplay=1"
  },
  "data": {},
  "result": {
    "src": "https://www.youtube.com/watch?v=JrZSfMiVC88",
    "domain": "youtube.com",
    "meta": {},
    "snippets": []
  }
}
```

After `fetchers`:

```js
{
  // ...
  "data": {
    // Added by `oembed` fetcher
    "oembed": {
      "author_url": "https://www.youtube.com/user/LakeParadiseMusic1",
      "author_name": "LakeParadiseMusic1",
      "version": "1.0",
      "thumbnail_url": "https://i.ytimg.com/vi/JrZSfMiVC88/hqdefault.jpg",
      "html": "<iframe width=\"459\" height=\"344\" src=\"https://www.youtube.com/embed/JrZSfMiVC88?feature=oembed\" frameborder=\"0\" allowfullscreen></iframe>",
      "provider_url": "https://www.youtube.com/",
      "thumbnail_height": 360,
      "width": 459,
      "type": "video",
      "title": "The   Mamas  &  The  Papas   --   California  Dreaming  [[  Official  Live   Video  ]]  HD",
      "provider_name": "YouTube",
      "height": 344,
      "thumbnail_width": 480
    }
  },
  // ...
}
```

After `mixins`:

```js
{
  // ...
  "result": {
    // ...
    "snippets": [
      // Added by `oembed-player` mixin
      {
        "type": "text/html",
        "href": "https://www.youtube.com/embed/JrZSfMiVC88?feature=oembed",
        "tags": [
          "player",
          "oembed",
          "responsive",
          "html5"
        ],
        "media": {
          "width": 459,
          "height": 344
        }
      },
      // Added by `oembed-thumbnail` mixin
      {
        "type": "image",
        "href": "https://i.ytimg.com/vi/JrZSfMiVC88/hqdefault.jpg",
        "tags": [
          "thumbnail",
          "oembed"
        ],
        "media": {
          "width": 480,
          "height": 360
        }
      }
    ]
  }
  // ...
}
```

After `mixins_after`:

```js
{
  // ...
  "result": {
    // ...
    "snippets": [
      {
        "type": "text/html",
        "href": "https://www.youtube.com/embed/JrZSfMiVC88?feature=oembed",
        "tags": [
          "player",
          "oembed",
          "responsive",
          "html5",
          "ssl" // added by `ssl-force` in `mixin_after`
        ],
        "media": {
          "width": 459,
          "height": 344,
          "autoplay": "autoplay=1" // added by `set-autoplay` in `mixin_after`
        }
      },
      {
        "type": "image",
        "href": "https://i.ytimg.com/vi/JrZSfMiVC88/hqdefault.jpg",
        "tags": [
          "thumbnail",
          "oembed",
          "ssl" // added by `ssl-force` in `mixin_after`
        ],
        "media": {
          "width": 480,
          "height": 360
        }
      }
    ]
  }
  // ...
}
```
