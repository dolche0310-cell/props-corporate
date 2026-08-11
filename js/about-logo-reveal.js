/* ====== About の MiAI ロゴの立ち上がり ======
   「動いていることを見せる」のではなく、ロゴが静かに完成する瞬間を見せる。
   粒子や発光は使わない。動きの量を減らし、カーブと止まり方の精度で作る。

   ロゴ本体   opacity 0→1 / translateY 10px→0 / scale .985→1
              900ms / cubic-bezier(.16, 1, .3, 1)
              動き出しが速く、最後の3割で強く減衰して静止する。overshoot なし
   解像       中央からわずかに広がる遮蔽で全体が同時に立ち上がる。
              一文字ずつには見せない。ワイプ感も出さない
   i のドット 本体より 50ms 遅れて不透明度が決まるだけ。跳ねさせない
   本文       ロゴが決まってから 100ms 後にキャッチ、その後に本文。
              視線は ロゴ → コピー → 本文 の順に流れるが、
              個別に動いているようには見せない

   形は一切変えない。最終状態は transform:none / 遮蔽なしに戻し、
   静止したロゴが最もシャープに出る状態にする。 */
(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const EASE = 'cubic-bezier(.16, 1, .3, 1)';
  const DUR = 900;

  const init = () => {
    const wrap = document.querySelector('[data-miai-logo]');
    const mark = wrap && wrap.querySelector('.abt__logo-mark');
    if (!wrap || !mark) return;

    const done = () => wrap.classList.add('is-done');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); return; }

    /* 初期状態はここで伏せる。CSS に書くと JS が動かない環境で
       ロゴが出なくなるため。About は初期表示では画面外にある。 */
    wrap.style.opacity = '0';

    /* 中央からごくわずかに広がる遮蔽。字形には触れない。
       余白を大きめに取った楕円なので、輪郭を舐めるワイプには見えない。 */
    const vb = (mark.getAttribute('viewBox') || '0 0 266.312 96.985').split(/\s+/).map(Number);
    const cx = vb[0] + vb[2] / 2, cy = vb[1] + vb[3] / 2;
    const uid = 'abt-logo-reveal';
    const defs = document.createElementNS(NS, 'defs');
    defs.innerHTML =
      '<mask id="' + uid + '" maskUnits="userSpaceOnUse">' +
      '<ellipse class="abt__logo-reveal" cx="' + cx + '" cy="' + cy +
      '" rx="' + (vb[2] * .78).toFixed(2) + '" ry="' + (vb[3] * 1.9).toFixed(2) + '" fill="#fff"/></mask>';
    mark.insertBefore(defs, mark.firstChild);

    const art = document.createElementNS(NS, 'g');
    art.setAttribute('mask', 'url(#' + uid + ')');
    Array.from(mark.querySelectorAll(':scope > path')).forEach((p) => art.appendChild(p));
    mark.appendChild(art);

    /* i のドット。about-miai.svg の3番目(Vector_3)が "i"。
       縦棒と点が1つのパスなので、点だけを別に出すことはしない。
       代わりに i 全体の不透明度をわずかに遅らせる。 */
    const dot = art.children[2] || null;
    const reveal = defs.querySelector('.abt__logo-reveal');

    /* キャッチと本文は既存の .reveal(CSSトランジション)が動かす。
       こちらでは二重に持たず、CSS 側の transition-delay で
       ロゴ → コピー → 本文 の順になるようにしてある。 */

    let played = false;
    const run = () => {
      if (played) return;
      played = true;
      wrap.classList.add('is-playing');

      wrap.animate(
        [{ opacity: 0, transform: 'translateY(10px) scale(.985)' },
         { opacity: 1, transform: 'translateY(0) scale(1)' }],
        { duration: DUR, easing: EASE, fill: 'both' });

      reveal.animate(
        [{ transform: 'scale(.72)' }, { transform: 'scale(1)' }],
        { duration: DUR, easing: EASE, fill: 'both' });

      if (dot) {
        dot.animate([{ opacity: 0 }, { opacity: 0 }, { opacity: 1 }],
          { duration: DUR, easing: 'linear', fill: 'both',
            /* 本体が決まる少し前から 50ms 遅れて追いつく */
            delay: 50 });
      }

      /* 止まったら演出用のレイヤーを畳んで、静止した形だけを残す */
      setTimeout(() => {
        done();
        wrap.classList.remove('is-playing');
        wrap.style.opacity = '';
        [wrap, reveal, dot].forEach((el) => {
          if (!el) return;
          el.getAnimations().forEach((a) => { try { a.cancel(); } catch (e) {} });
        });
        art.removeAttribute('mask');
        defs.remove();
      }, DUR + 60);
    };
    window.__replayAboutLogo = () => { played = false; wrap.classList.remove('is-done'); run(); };

    if (!('IntersectionObserver' in window)) { run(); return; }
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (!e.isIntersecting) return; io.disconnect(); run(); });
    }, { threshold: .35 });
    io.observe(wrap);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
