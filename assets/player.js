document.addEventListener('DOMContentLoaded', function () {
  document.body.addEventListener('click', function (event) {
    if (!event.target.classList.contains('ez-player-preview') && !event.target.classList.contains('ez-player-button')) {
      return;
    }

    var player = event.target;
    var responsive = event.target;

    // Find closest player container
    while (player && !player.classList.contains('ez-player-container')) {
      player = player.parentNode;
    }

    // Find closest responsive container
    while (responsive && !responsive.classList.contains('embed-responsive')) {
      responsive = responsive.parentNode;
    }

    responsive.innerHTML = player.getAttribute('data-placeholder');
  });
});
