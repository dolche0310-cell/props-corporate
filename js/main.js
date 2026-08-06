(function () {
  'use strict';

  var reducedMotionMq = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Page-load intro: a solid curtain covers the viewport from first paint
  // (pure CSS, no JS needed for that part) and, shortly after this script
  // runs, softly opens while the hero content streams in from the left.
  var introOverlay = document.getElementById('intro-overlay');
  if (introOverlay) {
    if (reducedMotionMq.matches) {
      introOverlay.remove();
      document.body.classList.add('intro-revealed');
    } else {
      setTimeout(function () {
        document.body.classList.add('intro-revealed');
        introOverlay.classList.add('is-hiding');
      }, 220);
      introOverlay.addEventListener('transitionend', function (e) {
        if (e.propertyName === 'opacity') introOverlay.remove();
      });
    }
  }

  var hamburgerBtn = document.getElementById('hamburger-btn');
  var nav = document.getElementById('site-nav');

  function closeNav() {
    nav.classList.remove('is-open');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
  }

  function toggleNav() {
    var isOpen = nav.classList.toggle('is-open');
    hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
  }

  if (hamburgerBtn && nav) {
    hamburgerBtn.addEventListener('click', toggleNav);

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });

    var mq = window.matchMedia('(min-width: 768px)');
    mq.addEventListener('change', function (e) {
      if (e.matches) closeNav();
    });
  }

  var form = document.getElementById('contact-form');
  var note = document.getElementById('contact-note');

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      // NOTE: no backend is wired up yet — this only confirms client-side.
      // Replace with a real submission (fetch/mailer) once an endpoint exists.
      note.hidden = false;
      form.reset();
    });
  }

  var heroDotsEl = document.getElementById('hero-dots');

  if (heroDotsEl && !reducedMotionMq.matches) {
    var heroDotsGathered = false;

    // Builds a point cloud on the surface of two interlocked tori (like
    // two chain-link rings, one lying flat, one standing perpendicular
    // through the other's hole). Each dot gets a "gathered" target
    // (--tx/--ty/--tz, its fixed point on the torus) and a "scattered"
    // start (--dx/--dy/--dz, a random offset) - the CSS transition on
    // .hero__dot morphs between the two.
    var buildHeroDots = function () {
      heroDotsEl.innerHTML = '';

      var isDesktop = window.matchMedia('(min-width: 768px)').matches;
      var size = isDesktop ? 760 : 460;
      var numU = isDesktop ? 42 : 24;
      var numV = isDesktop ? 14 : 10;

      var R = size * 0.19;   // major radius (ring size)
      var r = R * 0.22;      // tube radius (donut thickness) - kept slim so each hole stays visible
      var D = R * 0.88;      // offset between the two torus centers: close to R so the rings sit
                              // mostly side by side, only hooking through each other at one edge

      var tiltEl = document.createElement('div');
      tiltEl.className = 'hero__dots-tilt';
      var spinEl = document.createElement('div');
      spinEl.className = 'hero__dots-spin';

      var frag = document.createDocumentFragment();

      [0, 1].forEach(function (torusIndex) {
        for (var iu = 0; iu < numU; iu++) {
          for (var iv = 0; iv < numV; iv++) {
            var u = (iu / numU) * Math.PI * 2 + (Math.random() - 0.5) * (Math.PI * 2 / numU) * 0.7;
            var v = (iv / numV) * Math.PI * 2 + (Math.random() - 0.5) * (Math.PI * 2 / numV) * 0.8;
            var rr = r * (0.82 + Math.random() * 0.36);
            var ring = R + rr * Math.cos(v);

            var tx, ty, tz;
            if (torusIndex === 0) {
              // Lies flat in the XY plane (axis along Z).
              tx = -D + ring * Math.cos(u);
              ty = ring * Math.sin(u);
              tz = rr * Math.sin(v);
            } else {
              // Perpendicular ring, lying in the XZ plane (axis along Y),
              // passing through the first ring's hole.
              tx = D + ring * Math.cos(u);
              ty = rr * Math.sin(v);
              tz = ring * Math.sin(u);
            }

            // Static "baked" shading from the tube's local angle so the
            // surface reads as round even though it's rendered as flat dots.
            var shade = 0.55 + 0.45 * (Math.cos(v) * 0.5 + 0.5);
            var opacity = Math.min(0.95, Math.max(0.12, shade * (0.75 + Math.random() * 0.2)));

            var dot = document.createElement('span');
            dot.className = 'hero__dot';
            dot.style.opacity = opacity.toFixed(2);
            dot.style.setProperty('--tx', tx.toFixed(1) + 'px');
            dot.style.setProperty('--ty', ty.toFixed(1) + 'px');
            dot.style.setProperty('--tz', tz.toFixed(1) + 'px');

            // Scattered start position: a random point spread across the
            // whole cluster volume ("無秩序に広がった" chaos), well clear
            // of the eventual torus target.
            var angle = Math.random() * Math.PI * 2;
            var travel = size * 0.15 + Math.random() * size * 0.35;
            dot.style.setProperty('--dx', (Math.cos(angle) * travel).toFixed(1) + 'px');
            dot.style.setProperty('--dy', (Math.sin(angle) * travel).toFixed(1) + 'px');
            dot.style.setProperty('--dz', ((Math.random() - 0.5) * size * 0.25).toFixed(1) + 'px');

            // Continuous small, randomized wiggle that keeps the
            // still-scattered dots feeling alive before the big gather.
            var core = document.createElement('span');
            core.className = 'hero__dot-core';
            var wAngle = Math.random() * Math.PI * 2;
            var wTravel = 4 + Math.random() * 9;
            core.style.setProperty('--wx', (Math.cos(wAngle) * wTravel).toFixed(1) + 'px');
            core.style.setProperty('--wy', (Math.sin(wAngle) * wTravel).toFixed(1) + 'px');
            core.style.animationDuration = (2.2 + Math.random() * 3).toFixed(2) + 's';
            core.style.animationDelay = (-Math.random() * 5).toFixed(2) + 's';

            dot.appendChild(core);
            frag.appendChild(dot);
          }
        }
      });

      spinEl.appendChild(frag);
      tiltEl.appendChild(spinEl);
      heroDotsEl.appendChild(tiltEl);
      // If the user already scrolled (e.g. rebuilding on a breakpoint
      // change), keep the cluster gathered instead of re-scattering it.
      if (heroDotsGathered) heroDotsEl.classList.add('is-gathered');
    };

    buildHeroDots();

    var heroDotsResizeMq = window.matchMedia('(min-width: 768px)');
    heroDotsResizeMq.addEventListener('change', buildHeroDots);

    var gatherHeroDots = function () {
      if (heroDotsGathered || window.scrollY < 8) return;
      heroDotsGathered = true;
      heroDotsEl.classList.add('is-gathered');
      window.removeEventListener('scroll', gatherHeroDots);
    };
    window.addEventListener('scroll', gatherHeroDots, { passive: true });
  }

  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-reveal');

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    revealEls.forEach(function (el) { io.observe(el); });
  }

  var serviceScroller = document.getElementById('service-scroller');
  var servicePin = document.querySelector('.service__pin');
  var serviceTextList = document.getElementById('service-text-list');
  var serviceItems = document.querySelectorAll('.service__text-item');

  // Exposed for js/service-stage.js, which drives the floating image
  // layers off the same scroll progress without needing to duplicate
  // this section's sticky-pin geometry.
  window.__miaiServiceProgress = 0;

  if (serviceScroller && servicePin && serviceItems.length) {
    var serviceDesktopMq = window.matchMedia('(min-width: 768px)');
    var serviceTicking = false;

    var setServiceActive = function (index) {
      var indexStr = String(index);
      serviceItems.forEach(function (el) {
        el.classList.toggle('is-active', el.dataset.serviceItem === indexStr);
      });
    };

    var getStickyTopOffset = function () {
      var headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 96;
      return headerH + 24;
    };

    var updateServiceProgress = function () {
      serviceTicking = false;

      if (!serviceDesktopMq.matches) {
        setServiceActive(0);
        if (serviceTextList) serviceTextList.style.transform = '';
        window.__miaiServiceProgress = 0;
        return;
      }

      var scrollerRect = serviceScroller.getBoundingClientRect();
      var totalRange = serviceScroller.offsetHeight - servicePin.offsetHeight;

      if (totalRange <= 0) {
        setServiceActive(0);
        window.__miaiServiceProgress = 0;
        return;
      }

      var scrolledIntoPin = getStickyTopOffset() - scrollerRect.top;
      var progress = Math.min(1, Math.max(0, scrolledIntoPin / totalRange));
      var index = Math.min(serviceItems.length - 1, Math.floor(progress * serviceItems.length));
      setServiceActive(index);
      window.__miaiServiceProgress = progress;

      // The text list slides up continuously with scroll progress (not a
      // discrete jump), one "slot" (the first item's height) per item.
      if (serviceTextList && serviceItems.length > 1) {
        var slotHeight = serviceItems[0].offsetHeight;
        var maxOffset = slotHeight * (serviceItems.length - 1);
        serviceTextList.style.transform = 'translateY(' + (-progress * maxOffset) + 'px)';
      }
    };

    window.addEventListener('scroll', function () {
      if (!serviceTicking) {
        serviceTicking = true;
        requestAnimationFrame(updateServiceProgress);
      }
    }, { passive: true });

    window.addEventListener('resize', updateServiceProgress);
    updateServiceProgress();
  }
})();
