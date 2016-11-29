$(document).on('click', '.ez-player-placeholder', function (event) {
  if (event.target.nodeName === 'A') {
    return;
  }

  var $el = $(this);

  $el.replaceWith($el.closest('.ez-player').data('placeholder'));
});
