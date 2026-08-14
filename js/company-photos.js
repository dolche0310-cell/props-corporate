/* ============ Company の写真スライドショー ============
   会社概要の背景写真を、6枚の連続した写真作品として循環させる。

   ■ 思想
   カルーセルには見せない。矢印もドットも置かない。
   「情報は安定していて、ブランドイメージだけが変化する」ことを見せたい
   ので、白い情報パネルは切り替えず、写真だけが背後で入れ替わる。

   ■ 切替 (1.3s)
   単純なクロスフェードにしない。次の写真を覆っている大きな矩形マスクが
   静かに侵入して露出させ、同時に旧写真がわずかに開いて引く。
   2枚は 0.65s ほど重なる。マスクの向きは写真ごとに変える。
   ease は cubic-bezier(0.22, 1, 0.36, 1)(開始が速く終盤でゆっくり止まる)。

   ■ 表示中の動き (5.2s)
   Ken Burns にはしない。scale 1.00→1.04 程度、移動 5〜20px 程度。
   写真ごとに方向とリズムを変え、全部を同じ方向へズームさせない。
     01 非常に静か / 02 少し横へ / 03 ゆっくり引く
     04 わずかに縦へ / 05 静かに寄る / 06 ほぼ静止
   前の写真の動きが続いている途中から次を重ねるので、止まってから
   切り替わるようには見えない。

   ■ 奥行き
   スクロールに対して写真は 0.88 倍でだけ動く(情報パネルは 1.0)。
   パララックスだと気づかない強さ。
   ポインタには最大 3px、約300ms 遅れて反応するだけ。

   prefers-reduced-motion: 切替だけを行い、写真自体は動かさない。 */
(() => {
  'use strict';

  const root = document.querySelector('[data-cmp-slides]');
  if (!root) return;
  const slides = [...root.querySelectorAll('.cmp__slide')];
  if (slides.length < 2) return;

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HOLD = 5200;          /* 1枚の表示 */
  const TRANS = 1300;         /* 切替 */
  const OVERLAP = 650;        /* 2枚が重なる時間 */

  /* 写真ごとの性格。scale と移動(px)、マスクの侵入方向 */
  const MOVES = [
    { s0: 1.000, s1: 1.018, x0: 0,   x1: -6,  y0: 0,  y1: 2,   from: 'right'  },  /* 01 静か */
    { s0: 1.020, s1: 1.000, x0: 10,  x1: -10, y0: 0,  y1: 0,   from: 'bottom' },  /* 02 横へ */
    { s0: 1.040, s1: 1.006, x0: -6,  x1: 4,   y0: 4,  y1: -2,  from: 'left'   },  /* 03 引く */
    { s0: 1.006, s1: 1.030, x0: 0,   x1: 0,   y0: 12, y1: -8,  from: 'top'    },  /* 04 縦へ */
    { s0: 1.000, s1: 1.032, x0: -8,  x1: 6,   y0: -4, y1: 4,   from: 'right'  },  /* 05 寄る */
    { s0: 1.012, s1: 1.004, x0: 3,   x1: -3,  y0: 0,  y1: 0,   from: 'bottom' }   /* 06 ほぼ静止 */
  ];
  /* 矩形マスクの侵入。閉じた状態 → 開いた状態 */
  const CLIP = {
    right:  ['inset(0 0 0 100%)', 'inset(0 0 0 0)'],
    left:   ['inset(0 100% 0 0)', 'inset(0 0 0 0)'],
    bottom: ['inset(100% 0 0 0)', 'inset(0 0 0 0)'],
    top:    ['inset(0 0 100% 0)', 'inset(0 0 0 0)']
  };
  const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

  slides.forEach((el, i) => {
    const m = MOVES[i % MOVES.length];
    const img = el.querySelector('img');
    if (img && el.dataset.fit) img.style.objectPosition = el.dataset.fit;
    el.__m = m;
    el.style.clipPath = CLIP[m.from][0];
    el.style.opacity = '0';
    el.style.zIndex = '0';
  });

  /* ---------- 1枚ぶんの動き ---------- */
  const play = (el, dur) => {
    const m = el.__m;
    if (REDUCED) { el.querySelector('img').style.transform = 'scale(1.01)'; return null; }
    return el.querySelector('img').animate([
      { transform: `translate3d(${m.x0}px, ${m.y0}px, 0) scale(${m.s0})` },
      { transform: `translate3d(${m.x1}px, ${m.y1}px, 0) scale(${m.s1})` }
    ], { duration: dur, easing: 'linear', fill: 'forwards' });
  };

  let idx = 0, timer = 0, running = false;

  const show = (n, first) => {
    const next = slides[n];
    const prev = slides[(n - 1 + slides.length) % slides.length];
    const m = next.__m;

    next.style.zIndex = '2';
    prev.style.zIndex = '1';

    if (first) {
      next.style.clipPath = CLIP[m.from][1];
      next.style.opacity = '1';
    } else {
      /* 次の写真: マスクが静かに侵入して露出する */
      next.animate([
        { clipPath: CLIP[m.from][0], opacity: 1 },
        { clipPath: CLIP[m.from][1], opacity: 1 }
      ], { duration: TRANS, easing: EASE, fill: 'forwards' });
      next.style.opacity = '1';
      /* 旧写真: わずかに開いて静かに引く。0.65s ほど重なる */
      prev.animate([
        { opacity: 1 }, { opacity: 0 }
      ], { duration: TRANS - OVERLAP + 320, delay: OVERLAP - 320,
           easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' });
      prev.__pa && prev.__pa.cancel();
    }
    /* 表示中の動きは切替の前から始まっているので、止まって見えない */
    next.__pa = play(next, HOLD + TRANS);
  };

  const step = () => {
    idx = (idx + 1) % slides.length;
    show(idx, false);
    timer = setTimeout(step, HOLD);
  };

  const start = () => {
    if (running) return;
    running = true;
    show(0, true);
    timer = setTimeout(step, HOLD);
  };
  const stop = () => { running = false; clearTimeout(timer); };

  /* 画面に入っている間だけ動かす */
  const sec = root.closest('.company') || root;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { es[0].isIntersecting ? start() : stop(); },
      { threshold: 0.08 }).observe(sec);
  } else start();

  /* ---------- 奥行き: 弱いパララックスとポインタ ---------- */
  if (!REDUCED) {
    let px = 0, py = 0, tx = 0, ty = 0, raf = 0;
    const frame = () => {
      px += (tx - px) * 0.06;            /* 約300ms 遅れて追従 */
      py += (ty - py) * 0.06;
      const r = sec.getBoundingClientRect();
      /* スクロール速度 0.88(情報パネルは 1.0)。気づかない強さ */
      const par = (r.top + r.height / 2 - innerHeight / 2) * -0.12;
      root.style.transform =
        `translate3d(${px.toFixed(2)}px, ${(py + par).toFixed(2)}px, 0)`;
      raf = requestAnimationFrame(frame);
    };
    sec.addEventListener('pointermove', (e) => {
      const r = sec.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 6;    /* 最大 ±3px */
      ty = ((e.clientY - r.top) / r.height - 0.5) * 4;
    });
    sec.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
    raf = requestAnimationFrame(frame);
  }

  window.__miaiCompanyPhotos = { start, stop, show, slides };
})();
