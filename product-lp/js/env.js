(function () {
  if (window.__envJsLoaded) return;
  window.__envJsLoaded = true;

  var GTM_ID = 'GTM-N2XSBGKW';
  var isProd = location.hostname === 'lp.miai-app.com';

  try {
    if (isProd) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtm.js?id=' + GTM_ID;
      document.head.appendChild(s);
    } else {
      var m = document.createElement('meta');
      m.name = 'robots';
      m.content = 'noindex';
      document.head.insertBefore(m, document.head.firstChild);
    }
  } catch (e) {}
})();
