$(document).on('click', '.ez-player-placeholder', function (event) {
  // Click on title => follow link
  if ($(event.target).hasClass('ez-player-title')) return;

  event.preventDefault();

  var $el = $(this);

  $el.replaceWith($el.closest('.ez-player').data('placeholder'));
});
