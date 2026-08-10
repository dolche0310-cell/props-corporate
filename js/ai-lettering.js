/* ============ AIShift レタリング切り替え ============
   ヒーローのピル内で、Figmaの4種のレタリング(254:27435/27446/27457/27468)を
   一定リズムで切り替える。RICHKAの「書体がパッと切り替わる」テンポ感を踏襲。

   - SVGはHTMLに4枚とも置いてあり、DOMは生成し直さない(class切り替えのみ)
   - 表示1050ms → 切替280ms。IN は OUT の180ms後に始まり、
     二重に見える重なりは約100msだけ
   - document.hidden 中はタイマーを止め、復帰時に再開
   - prefers-reduced-motion では最初の1種を静止表示(ループしない)      */
(function () {
  'use strict';

  var box = document.querySelector('.ai-switch');
  if (!box) return;
  var vs = Array.prototype.slice.call(box.querySelectorAll('.ai-switch__v'));
  if (vs.length < 2) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var SHOW = 1050;    // 静止表示
  var FADE = 280;     // 切替時間
  var OVERLAP = 100;  // 二重表示を許す時間
  var i = 0;
  var t1 = null, t2 = null, t3 = null;

  function swap() {
    var cur = vs[i];
    var next = vs[(i + 1) % vs.length];
    cur.classList.remove('is-active');
    cur.classList.add('is-out');
    t1 = setTimeout(function () {
      next.classList.add('is-active');
    }, FADE - OVERLAP);
    t2 = setTimeout(function () {
      cur.classList.remove('is-out');
      i = (i + 1) % vs.length;
      schedule();
    }, FADE);
  }

  function schedule() { t3 = setTimeout(swap, SHOW); }

  function stop() {
    clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
    t1 = t2 = t3 = null;
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      stop();
      /* 切替の途中で止まった場合に備えて、現在のインデックスだけを
         表示した状態に整えてから休止する */
      vs.forEach(function (v, idx) {
        v.classList.remove('is-out');
        v.classList.toggle('is-active', idx === i);
      });
    } else if (t3 === null) {
      schedule();
    }
  });

  /* 非表示タブではブラウザがタイマーを大きく間引くため、最初から
     hidden の場合(バックグラウンドで開かれた等)は可視化まで待つ */
  if (!document.hidden) schedule();
})();
