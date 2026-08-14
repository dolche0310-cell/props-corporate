/* ============ Company の写真スライドショー ============
   Figma 1〜6案(408:23239 / 24551 / 29798 / 27176 / 31120 / 28485)で
   使われている写真を、フィルム調のモノクロに調律して循環させる。

   狙いは「カルーセル」ではなく、写真作品が静かに入れ替わっていく
   ブランドコンテンツ。そのため UI(矢印・ドット・横スライド)は持たない。

   ・切り替え: 大きな矩形マスクが右から侵入して次の写真を露出する。
     旧写真は覆い切られるまで不透明のまま下に残るので白が透けない。
     2枚が重なるのは 0.62〜1.3s(マスクが開き切るまで)。
   ・写真は止めない: 表示中はケンバーンズが走り続け、その動きの
     途中で次の写真が重なり始める(完全に止まってから切り替えない)。
   ・情報パネルは固定。写真だけが背後で入れ替わる。
   ・視差(0.88倍)とポインタ追従(最大3px)はどちらもごく弱く。
   ・画面外・非表示タブでは進めない(戻ったら現在の1枚から再開)。 */
(() => {
  'use strict';

  const section = document.querySelector('.company--figma');
  const wrap = section && section.querySelector('.cmp__slides');
  if (!section || !wrap) return;
  const slides = [...wrap.querySelectorAll('.cmp__slide')];
  if (slides.length < 2) return;

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const HOLD = 5200;      /* 1枚を見せている時間 */
  const TRANS = 1300;     /* マスクが開き切るまで(CSS と同値) */

  let cur = 0;
  let timer = 0;
  let running = false;

  const advance = () => {
    const from = slides[cur];
    const next = (cur + 1) % slides.length;
    const to = slides[next];

    /* 抜ける側は不透明のまま下層へ。隙間から下地が見えないようにする */
    from.classList.remove('is-active');
    from.classList.add('is-leaving');

    /* 閉じた状態を一度確定させてから開く。同フレームで両方書くと
       トランジションが発火しないため、算出値を読んで同期させる。 */
    to.classList.remove('is-leaving', 'is-active', 'is-entering');
    getComputedStyle(to).clipPath;
    to.classList.add('is-entering');

    cur = next;

    setTimeout(() => {
      to.classList.remove('is-entering');
      to.classList.add('is-active');
      from.classList.remove('is-leaving');
    }, TRANS);
  };

  const tick = () => {
    if (!running) return;
    advance();
    timer = setTimeout(tick, HOLD + TRANS);
  };

  const start = () => {
    if (running || REDUCED) return;
    running = true;
    timer = setTimeout(tick, HOLD);
  };
  const stop = () => { running = false; clearTimeout(timer); };

  /* ---------- 画面に入っている間だけ動かす + パネルの登場 ---------- */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { section.classList.add('is-in'); start(); }
        else stop();
      });
    }, { threshold: 0.15 }).observe(section);
  } else {
    section.classList.add('is-in');
    start();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });

  if (REDUCED) return;

  /* ---------- ごく弱い視差(写真 0.88 / 情報 1.0) ---------- */
  /* 呼び出し元(共有ディスパッチャ)が既に rAF の中なので、ここでは
     二重に rAF を挟まない。値も 0.5px 刻みに丸め、変化時だけ書く。 */
  let lastPar = null;
  const onScroll = () => {
    const r = section.getBoundingClientRect();
    const vh = innerHeight || 800;
    const travel = vh + r.height;
    const p = Math.max(-1, Math.min(1,
      ((r.top + r.height / 2) - vh / 2) / (travel / 2)));
    const px = Math.round(-p * travel * 0.12 * 0.5 * 2) / 2;
    if (px !== lastPar) {
      lastPar = px;
      wrap.style.setProperty('--cmp-par', px + 'px');
    }
  };
  /* main.js の共有ディスパッチャに相乗りする(1フレーム1回にまとめる)。
     単独で動く場合は従来どおり自前で購読する。 */
  if (window.__miaiOnScroll) {
    window.__miaiOnScroll(onScroll);
    addEventListener('resize', onScroll);
  } else {
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    onScroll();
  }

  /* ---------- ポインタへの反応は最大3px。tilt はしない ---------- */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const MAX = 3;
    section.addEventListener('pointermove', (e) => {
      const r = section.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      wrap.style.setProperty('--cmp-px', (-nx * 2 * MAX).toFixed(2) + 'px');
      wrap.style.setProperty('--cmp-py', (-ny * 2 * MAX).toFixed(2) + 'px');
    });
    section.addEventListener('pointerleave', () => {
      wrap.style.setProperty('--cmp-px', '0px');
      wrap.style.setProperty('--cmp-py', '0px');
    });
  }
})();
