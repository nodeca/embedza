# Internal env lifecycle

## Info

### `env`

- src (String) - resource url
- wl (Object) - whitelist domain config. Contains hashes for each provider
  type (`twitter`, `og`, `oembed`, `html-meta`) with hashes for content
  types (`player`, `video`, `photo`, `rich`). Each content type may contain tags:
  - allow
  - deny
  - responsive
  - html5
  - autoplay
- config (Object) - additional domain config: autoplay parameter name, API key
- data (Object) - fetchers data sandbox
- result (Object) - output data
  - `domain` - domain plugin id ('youtube.com', 'vimeo.com', ...)
  - `src` - source url
  - `meta` - title, description, site
  - `snippets` - snippets data: type, tags, href, media, html
- self (Embedza)

### Data flow stages

- **initialize**
  - parse url
  - check url match rules
  - fill domain config
  - lookup and fill whitelist config
- **fetchers** stage - fetch re
  - fetch page data
  - parse tags
  - fetch oembed data (if exists)
  - fill `env.data` structure
- **mixins** stage
  - fill `env.result.meta` and `env.result.snippets`
- **mixins_after** stage
  - resolve snippet's href
  - detect content-type
  - merge snippets data by href
  - load images size

### Fetchers

- **meta** - Meta-data fetcher. Parse `head` tag for: `title`, `link` and
  `meta` tags. Fill `env.data.meta` and `env.data.links`.
- **oembed** - Oembed fetcher. Look for `env.data.links.alternate` and try
  to request `json` or `xml` data in oembed format. Fill `env.data.oembed`.

### Mixins

- **meta** - Fill `env.result.meta` with `title`, `site` and `description`.
- **twitter-thumbnail** - Extract data from `<twitter:image>` tag.
- **twitter-player** - Extract data from `<twitter:player>` tag.
- **og-player** - Extract data from `<og:video>` tag.
- **og-thumbnail** - Extract data from `<og:image>` tag.
- **oembed-player** - Extract data from `oembed.html` tag.
- **oembed-photo** - Extract data from `oembed.url` tag.
- **oembed-icon** - Extract data from `oembed.icon_url` tag.
- **oembed-thumbnail** - Extract data from `oembed.thumbnail_url` tag.
- **oembed-rich** - Extract data from oembed rich.
- **favicon** - Extract favicons.
- **logo** - Extract logo from meta.

### Mixins after

- **resolve-href** - Resolve snippet's href. '/img/icon.png' -> 'http://example.com/img/icon.png',
  '//example.com/img/icon.png' -> 'http(s)://example.com/img/icon.png'
- **mime-detect** - Detect content-type of snippet (if not defined yet).
- **ssl-force** - Add ssl tag for https snippets.
- **merge** - Merge snippets data by href.
- **image-size** - Load images size.
- **set-autoplay** - Set autoplay parameter to `snippet.media`.
- **convert-str-int** - Convert 'width', 'height' and 'duration' to float and remove bad values.

## Example

For url: `https://www.youtube.com/watch?v=JrZSfMiVC88`.

### Initial

```javascript
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

### After fetchers

```javascript
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

### After mixins

```javascript
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

### After mixins_after

```javascript
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
          "ssl" // added by `ssl-force` mixin after
        ],
        "media": {
          "width": 459,
          "height": 344,
          "autoplay": "autoplay=1" // added by `set-autoplay` mixin after
        }
      },
      {
        "type": "image",
        "href": "https://i.ytimg.com/vi/JrZSfMiVC88/hqdefault.jpg",
        "tags": [
          "thumbnail",
          "oembed",
          "ssl" // added by `ssl-force` mixin after
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
