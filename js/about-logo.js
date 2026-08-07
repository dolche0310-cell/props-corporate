(function () {
  'use strict';

  var svg = document.getElementById('about-logo-svg');
  if (!svg) return;

  var reducedMotionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var markPaths = svg.querySelectorAll('.logo-anim__mark path');

  // Each letterform path needs its own real length so the stroke-draw
  // reveal (stroke-dashoffset) grows evenly instead of at a guessed rate.
  markPaths.forEach(function (path) {
    var length = path.getTotalLength();
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;
  });

  if (reducedMotionMq.matches) return; // CSS reduced-motion rules show the final state directly

  var hasPlayed = false;
  function play() {
    if (hasPlayed) return;
    hasPlayed = true;
    svg.classList.add('is-playing');
    // An inline style always beats a class selector, so the outline's
    // draw-in (stroke-dashoffset -> 0) has to be set here rather than
    // relying on the .is-playing CSS rule to override the inline
    // dasharray/dashoffset set above.
    markPaths.forEach(function (path) {
      path.style.strokeDashoffset = '0';
    });
  }

  if (!('IntersectionObserver' in window)) {
    play();
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        play();
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  io.observe(svg);
})();
