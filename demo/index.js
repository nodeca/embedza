/* global $, window */
/* eslint-disable strict, no-console, new-cap */

(function () {

  var cache = {
    data: {},
    get: function (key) {
      return Promise.resolve(cache.data[key]);
    },
    set: function (key, value) {
      cache.data[key] = value;
      return Promise.resolve();
    }
  };

  var embedza = new window.embedza({
    cache: cache
  });


  function showError(err) {
    $('#error-message').removeClass('hidden').text(String(err));

    $('#tab-block').text('');
    $('#tab-inline').text('');
    $('#tab-json pre').text('');
    console.log(err);
  }


  function showResult(info) {
    if (!info) {
      showError(new Error('Can not recognize url'));
      return;
    }

    $('#error-message').addClass('hidden');

    embedza.render(info, 'block').then(function (result) {
      $('#tab-block').html(result ? result.html : '');
    });

    embedza.render(info, 'inline').then(function (result) {
      $('#tab-inline').html(result ? result.html : '');
    });

    $('#tab-json pre').text(JSON.stringify(info, null, 4));

    console.log(info);
  }


  // On page load
  $(function () {
    $('#url-form').on('submit', function (event) {
      event.preventDefault();

      embedza.info($('#url-input').val())
        .then(function (info) { showResult(info); })
        .catch(function (err) { showError(err); });
    });

    var providers = [];

    embedza.forEach(function (rule) {
      if (rule.enabled) providers.push(rule.id);
    });

    $('#tab-providers').html(providers.join('<br>'));

    // Stup initial value
    // $('#url-input').val('https://www.youtube.com/watch?v=o0u4M6vppCI');
    $('#url-input').val('https://vimeo.com/channels/staffpicks/135373919');
    $('#url-form').submit();
  });

}());
