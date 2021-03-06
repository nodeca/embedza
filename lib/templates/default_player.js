'use strict';

module.exports = `<%
var player = _.find(self.snippets, snippet => {
  return snippet.tags.indexOf('player') !== -1 && snippet.tags.indexOf('html5') !== -1;
});

var desiredThumbnailWidth = 480;

var thumbnail = _.chain(self.snippets)
  // Get thumbnails
  .filter(snippet => snippet.tags.indexOf('thumbnail') !== -1)
  // Sort by width (closest to "desiredThumbnailWidth")
  .sortBy(snippet => Math.abs((snippet.media.width || 0) - desiredThumbnailWidth))
  // Get first
  .first()
  .value();

var href = player.href;

// Modify or set autoplay param. http://stackoverflow.com/questions/7517332
if (player.media.autoplay) {
  var param = player.media.autoplay.split('=');
  var parts = self.utils.url.parse(href, true);

  parts.query[param[0]] = param[1];
  delete parts.search;
  href = self.utils.url.format(parts);
}

var placeholder = '<iframe class="ez-player-frame" src="' + _.escape(href) + '" allowfullscreen></iframe>';

var duration;

if (player.media.duration && player.media.duration > 0) {
  var s = player.media.duration % 60;

  duration = [
    Math.floor(player.media.duration / 3600), // hours
    Math.floor(player.media.duration / 60) % 60, // minutes
    s < 10 ? '0' + s : s // seconds with leading '0'
  ];

  // Remove hours if video shorter than hour
  if (duration[0] === 0) {
    duration.shift();
  }
}
%>

<div class="ez-player ez-domain-<%= self.domain.replace(/[.]/g, '_') %> ez-block" data-placeholder="<%- placeholder %>">
  <div class="ez-player-container"  style="padding-bottom: <%= _.round(100 / player.media.width * player.media.height, 4) %>%;">
    <a class="ez-player-placeholder" target="_blank" href="<%- self.src %>" rel="nofollow">
      <div class="ez-player-picture" style="background-image: url('<%- thumbnail.href %>');"></div>
      <% if (self.meta.title) { %>
        <div class="ez-player-header">
          <div class="ez-player-title">
            <%- self.meta.title %>
          </div>
        </div>
      <% } %>
      <div class="ez-player-button"></div>
      <div class="ez-player-logo"></div>
      <% if (duration) { %>
        <div class="ez-player-duration"><%= duration.join(':') %></div>
      <% } %>
    </a>
  </div>
</div>`;
