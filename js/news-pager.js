/* お知らせ一覧のページ送り。1ページ10件、11件目から2ページ目へ。
   記事は全件 HTML に並べておき、現在ページ以外を hidden にする。
   ?page=N で直接開ける。1ページに収まるときは送りを出さない。 */
(function () {
  var PER_PAGE = 10;
  var list = document.querySelector('.news__list');
  var nav = document.getElementById('news-pager');
  if (!list || !nav) return;

  var items = Array.prototype.slice.call(list.querySelectorAll('.news__item'));
  var total = Math.max(1, Math.ceil(items.length / PER_PAGE));
  if (total < 2) { nav.hidden = true; return; }

  function pageFromUrl() {
    var n = parseInt(new URLSearchParams(location.search).get('page'), 10);
    return n >= 1 && n <= total ? n : 1;
  }

  function href(n) { return n === 1 ? location.pathname : '?page=' + n; }

  function render(page) {
    items.forEach(function (el, i) {
      el.hidden = Math.floor(i / PER_PAGE) + 1 !== page;
    });
    var html = '';
    html += page > 1
      ? '<a class="pager__arrow" href="' + href(page - 1) + '" data-page="' + (page - 1) + '" rel="prev" aria-label="前のページ">&larr;</a>'
      : '<span class="pager__arrow is-disabled" aria-hidden="true">&larr;</span>';
    for (var n = 1; n <= total; n++) {
      html += n === page
        ? '<span class="pager__num is-current" aria-current="page">' + n + '</span>'
        : '<a class="pager__num" href="' + href(n) + '" data-page="' + n + '" aria-label="' + n + 'ページ目">' + n + '</a>';
    }
    html += page < total
      ? '<a class="pager__arrow" href="' + href(page + 1) + '" data-page="' + (page + 1) + '" rel="next" aria-label="次のページ">&rarr;</a>'
      : '<span class="pager__arrow is-disabled" aria-hidden="true">&rarr;</span>';
    nav.innerHTML = html;
    nav.hidden = false;
  }

  nav.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-page]');
    if (!a) return;
    e.preventDefault();
    var page = parseInt(a.getAttribute('data-page'), 10);
    history.pushState({ page: page }, '', href(page));
    render(page);
    list.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  window.addEventListener('popstate', function () { render(pageFromUrl()); });

  render(pageFromUrl());
})();
