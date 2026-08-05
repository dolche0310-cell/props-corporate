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
})();
