(function () {
  'use strict';

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
  var reducedMotionMq = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (heroDotsEl && !reducedMotionMq.matches) {
    var buildHeroDots = function () {
      heroDotsEl.innerHTML = '';

      var isDesktop = window.matchMedia('(min-width: 768px)').matches;
      var size = isDesktop ? 630 : 380;
      var spacing = isDesktop ? 26 : 20;
      var centerX = size * 0.30;
      var centerY = size * 0.65;
      // Match the old mask's "closest-side" radius so the cluster keeps
      // the same circular footprint as before.
      var radius = Math.min(centerX, centerY, size - centerX, size - centerY);

      var frag = document.createDocumentFragment();

      for (var y = spacing / 2; y < size; y += spacing) {
        for (var x = spacing / 2; x < size; x += spacing) {
          var dx = x - centerX;
          var dy = y - centerY;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > radius) continue;

          var falloff = Math.max(0, 1 - Math.pow(dist / radius, 1.6));
          var dot = document.createElement('span');
          dot.className = 'hero__dot';
          dot.style.left = x + 'px';
          dot.style.top = y + 'px';
          dot.style.opacity = (falloff * 0.75).toFixed(2);

          // Each dot drifts outward in its own random direction and back,
          // on its own timing, so the cluster reads as scattering and
          // re-gathering rather than one rigid shape.
          var angle = Math.random() * Math.PI * 2;
          var travel = 10 + Math.random() * 26;
          dot.style.setProperty('--dx', (Math.cos(angle) * travel).toFixed(1) + 'px');
          dot.style.setProperty('--dy', (Math.sin(angle) * travel).toFixed(1) + 'px');
          dot.style.animationDuration = (4 + Math.random() * 5).toFixed(2) + 's';
          dot.style.animationDelay = (-Math.random() * 8).toFixed(2) + 's';

          frag.appendChild(dot);
        }
      }

      heroDotsEl.appendChild(frag);
    };

    buildHeroDots();

    var heroDotsResizeMq = window.matchMedia('(min-width: 768px)');
    heroDotsResizeMq.addEventListener('change', buildHeroDots);
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
  var serviceImages = document.querySelectorAll('.service__mockup-img');

  if (serviceScroller && servicePin && serviceItems.length) {
    var serviceDesktopMq = window.matchMedia('(min-width: 768px)');
    var serviceTicking = false;

    var setServiceActive = function (index) {
      var indexStr = String(index);
      serviceItems.forEach(function (el) {
        el.classList.toggle('is-active', el.dataset.serviceItem === indexStr);
      });
      serviceImages.forEach(function (img) {
        img.classList.toggle('is-active', img.dataset.serviceImage === indexStr);
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
        return;
      }

      var scrollerRect = serviceScroller.getBoundingClientRect();
      var totalRange = serviceScroller.offsetHeight - servicePin.offsetHeight;

      if (totalRange <= 0) {
        setServiceActive(0);
        return;
      }

      var scrolledIntoPin = getStickyTopOffset() - scrollerRect.top;
      var progress = Math.min(1, Math.max(0, scrolledIntoPin / totalRange));
      var index = Math.min(serviceItems.length - 1, Math.floor(progress * serviceItems.length));
      setServiceActive(index);

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
