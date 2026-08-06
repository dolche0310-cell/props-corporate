(function () {
  'use strict';

  var stage = document.getElementById('service-stage');
  if (!stage) return;

  var layerEls = Array.prototype.slice.call(stage.querySelectorAll('.service__layer'));
  if (!layerEls.length) return;

  var panel = stage.closest('.service__panel') || stage;

  var reducedMotionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fineHoverMq = window.matchMedia('(hover: hover) and (pointer: fine)');
  var desktopMq = window.matchMedia('(min-width: 768px)');

  if (reducedMotionMq.matches) return; // static CSS composition is enough

  var MOUSE_RANGE_X = 26; // px, max translate for a depth-1 layer
  var MOUSE_RANGE_Y = 16;
  var TILT_RANGE = 5; // deg, max tilt for a depth-1 layer

  var layers = layerEls.map(function (el) {
    return {
      el: el,
      depth: parseFloat(el.dataset.depth) || 0.6,
      rotateBase: parseFloat(el.dataset.rotate) || 0,
      isFirst: el.dataset.serviceImage === '0',
      baseZ: el.dataset.serviceImage === '0' ? 40 : -30,
      mouseX: 0,
      mouseY: 0
    };
  });

  var pointerX = 0; // normalized -1..1 across the panel
  var pointerY = 0;
  var rafId = null;
  var isRunning = false;

  function onPointerMove(e) {
    var rect = panel.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    pointerX = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width / 2)));
    pointerY = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height / 2)));
  }

  function onPointerLeave() {
    pointerX = 0;
    pointerY = 0;
  }

  function frame() {
    var progress = window.__miaiServiceProgress || 0;

    layers.forEach(function (layer) {
      var targetX = pointerX * MOUSE_RANGE_X * layer.depth;
      var targetY = pointerY * MOUSE_RANGE_Y * layer.depth;

      // Foreground (higher depth) layers travel further but still settle
      // smoothly; background layers travel less and lag further behind,
      // which is what actually reads as "depth" here.
      var ease = 0.03 + layer.depth * 0.045;
      layer.mouseX += (targetX - layer.mouseX) * ease;
      layer.mouseY += (targetY - layer.mouseY) * ease;

      // Continuous scroll-driven morph: localT goes 0 -> 1 as this layer's
      // item recedes from "current" to "next", with no hard cut between
      // the two states.
      var localT = layer.isFirst ? progress : 1 - progress;
      var scale = 1 - localT * 0.16;
      var driftX = layer.mouseX + localT * (layer.isFirst ? -22 : 22);
      var driftY = layer.mouseY - localT * 46;
      var z = layer.baseZ - localT * 60;
      var rotate = layer.rotateBase + localT * (layer.isFirst ? -3 : 3);
      var tiltX = -layer.mouseY * TILT_RANGE * layer.depth * 0.35;
      var tiltY = layer.mouseX * TILT_RANGE * layer.depth * 0.35;
      var opacity = Math.max(0.12, 1 - localT * 0.75);

      layer.el.style.transform =
        'translate3d(' + driftX.toFixed(2) + 'px, ' + driftY.toFixed(2) + 'px, ' + z.toFixed(1) + 'px) ' +
        'scale(' + scale.toFixed(3) + ') ' +
        'rotate(' + rotate.toFixed(2) + 'deg) ' +
        'rotateX(' + tiltX.toFixed(2) + 'deg) rotateY(' + tiltY.toFixed(2) + 'deg)';
      layer.el.style.opacity = opacity.toFixed(3);
      layer.el.style.zIndex = layer.isFirst
        ? String(Math.round(30 - localT * 15))
        : String(Math.round(15 + localT * 15));
    });

    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (isRunning) return;
    isRunning = true;
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    isRunning = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function syncPointerListeners() {
    if (fineHoverMq.matches && desktopMq.matches) {
      window.addEventListener('mousemove', onPointerMove, { passive: true });
      panel.addEventListener('mouseleave', onPointerLeave);
    } else {
      window.removeEventListener('mousemove', onPointerMove);
      panel.removeEventListener('mouseleave', onPointerLeave);
      onPointerLeave();
    }
  }

  syncPointerListeners();
  fineHoverMq.addEventListener('change', syncPointerListeners);
  desktopMq.addEventListener('change', function () {
    syncPointerListeners();
    if (!desktopMq.matches) stop(); else if (isIntersecting) start();
  });

  // Only run the rAF loop while the stage is actually visible.
  var isIntersecting = false;
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        isIntersecting = entry.isIntersecting;
        if (isIntersecting && desktopMq.matches) start();
        else stop();
      });
    }, { threshold: 0.05 });
    io.observe(stage);
  } else {
    isIntersecting = true;
    start();
  }
})();
