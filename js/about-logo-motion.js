/* ====== About の MiAI ロゴ: 粒子が集まってロゴになる ======
   Figma 257:27640 の 01 Scatter / 02 Gather を、絵の切り替えではなく
   1つの連続した動きとして組む。

   粒子は Scatter と Gather で同名(P 0-0-C 〜 P 3-5-W)が1対1で対応する。
   同じ形が2セットあるだけなので、形は「集まった状態」のものだけを持ち、
   散開位置へは transform で飛ばしてから戻す。これで実際に移動する。
   形のデータは assets/logos/miai-particles.js(円 7158 個)。

   Figma のストーリーボードには 03 Glow / 04 Flash があるが、
   オレンジの発光とぼかしは安く見えるため使わない。粒子の集合と、
   そこから面が立ち上がるところだけで見せる。ぼかしは一切かけない。

   時間軸(ms):
     0-400      散開。ごく微細なドリフトのみ
     400-1700   収束。粒ごとに 30-100ms ずらし、軽い弧を描いて集まる。
                同時に C 粒子が #FF5A3C → 黒(02 Gather の色)へ
     1700-1900  粒でできた MiAI を認識できる間
     1900-2600  面の形成。中心から広がる遮蔽でロゴが実体化し、粒子が引く
     2600-      完全静止。静止デザインと同一

   終了後はステージを外し、元の静止ロゴだけが残る。
   IntersectionObserver で一度だけ。開発用に window.__replayAboutLogo()。 */
(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const EASE = 'cubic-bezier(.22, 1, .36, 1)';

  /* 乱数は固定シード。読み込みのたびに粒の挙動が変わらないようにする */
  let seed = 20260811;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  /* 円の集合を1本の path にする。粒子1つあたり要素1つに抑える */
  const toPath = (s) => {
    const v = s.split(' ');
    let d = '';
    for (let i = 0; i < v.length; i += 3) {
      const x = +v[i], y = +v[i + 1], r = +v[i + 2], w = r * 2;
      d += 'M' + (x - r) + ' ' + y +
           'a' + r + ' ' + r + ' 0 1 0 ' + w + ' 0' +
           'a' + r + ' ' + r + ' 0 1 0 ' + (-w) + ' 0';
    }
    return d;
  };

  const build = (stage, data) => {
    const [SW, SH] = data.stage;
    const [LX, LY, LW, LH] = data.logo;
    stage.setAttribute('viewBox', '0 0 ' + SW + ' ' + SH);

    /* ロゴ本体(266.312x96.985)をステージ座標へ載せる倍率 */
    const k = LW / 266.312;
    const mark = document.querySelector('.abt__logo-mark');
    const logoPaths = mark ? Array.from(mark.querySelectorAll('path')) : [];

    /* 面の形成に使う遮蔽。SVG属性の r は CSS アニメーションの対象外なので、
       半径は最大で置いておき、CSS の transform(scale)で広げる。
       ぼかしも feGaussianBlur の stdDeviation ではなく CSS filter で動かす。 */
    const reach = Math.hypot(LW, LH) * .62;
    const defs = document.createElementNS(NS, 'defs');
    defs.innerHTML =
      '<mask id="lm-reveal" maskUnits="userSpaceOnUse">' +
      '<circle class="lm-reveal-c" cx="' + (LX + LW / 2) + '" cy="' + (LY + LH / 2) +
      '" r="' + reach.toFixed(2) + '" fill="#fff"/></mask>';
    stage.appendChild(defs);

    const logoGroup = (cls, fill, clip) => {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', cls);
      if (clip) g.setAttribute('mask', 'url(#lm-reveal)');
      const inner = document.createElementNS(NS, 'g');
      inner.setAttribute('transform', 'translate(' + LX + ' ' + LY + ') scale(' + k + ')');
      logoPaths.forEach((p) => {
        const c = p.cloneNode();
        c.setAttribute('fill', fill);
        inner.appendChild(c);
      });
      g.appendChild(inner);
      return g;
    };

    /* 粒子(背面) → 実体化するロゴ → Glow の順に重ねる */
    const dust = document.createElementNS(NS, 'g');
    dust.setAttribute('class', 'lm-dust');
    const items = [];
    Object.keys(data.p).forEach((key) => {
      const [dx, dy, sc, dots] = data.p[key];
      const el = document.createElementNS(NS, 'path');
      el.setAttribute('class', 'lm-p');
      el.setAttribute('data-particle', 'P ' + key);
      el.setAttribute('d', toPath(dots));
      el.setAttribute('fill', key.slice(-1) === 'C' ? '#FF5A3C' : '#FFD9CE');
      dust.appendChild(el);
      items.push({ el: el, dx: dx, dy: dy, sc: sc, warm: key.slice(-1) === 'C' });
    });
    stage.appendChild(dust);

    const solid = logoGroup('lm-solid', '#040404', true);
    stage.appendChild(solid);

    return {
      items: items, dust: dust, solid: solid,
      reveal: defs.querySelector('.lm-reveal-c')
    };
  };

  const play = (P, wrap) => {
    const anims = [];
    const A = (el, kf, opt) => { const a = el.animate(kf, opt); anims.push(a); return a; };

    /* --- 粒子: 微細なドリフト → 弧を描いて収束 ---------------------
       さっと下へスクロールした時にも見終えられるよう、全体を 1050ms に。
       粒子の収束と面の形成を重ね、待ち時間をつくらない。 */
    const TOTAL = 1050;
    const SPAN = 640;
    P.items.forEach((it) => {
      const { dx, dy, sc } = it;
      const at = (x, y, s) => 'translate(' + x.toFixed(2) + 'px, ' + y.toFixed(2) + 'px) scale(' + s.toFixed(3) + ')';
      const gStart = 120 + rnd() * 45;                  /* 立ち上がりのばらつき */
      const gDur = 450 + rnd() * 110 - 55;              /* 収束 0.68-0.84s */
      const gEnd = Math.min(SPAN, gStart + gDur);
      const w1 = (rnd() - .5) * 6, w2 = (rnd() - .5) * 6;   /* ±3px のドリフト */
      /* 直線だけだと機械的なので、進行方向と直交する向きへ 10-20px 膨らませる */
      const len = Math.hypot(dx, dy) || 1;
      const bow = (rnd() < .5 ? -1 : 1) * (10 + rnd() * 10);
      const mx = dx * .5 + (-dy / len) * bow;
      const my = dy * .5 + (dx / len) * bow;

      A(it.el, [
        { offset: 0,                transform: at(dx, dy, sc), easing: 'ease-in-out' },
        { offset: (gStart * .55) / SPAN, transform: at(dx + w1, dy + w2, sc), easing: 'ease-in-out' },
        { offset: gStart / SPAN,    transform: at(dx, dy, sc), easing: EASE },
        { offset: (gStart + gEnd) / 2 / SPAN, transform: at(mx, my, 1 + (sc - 1) * .35) },
        { offset: gEnd / SPAN,      transform: at(0, 0, 1) },
        { offset: 1,                transform: at(0, 0, 1) }
      ], { duration: SPAN, fill: 'both' });

      /* C 粒子は集まるにつれて 02 Gather の黒へ変わる */
      if (it.warm) {
        A(it.el, [
          { offset: 0, fill: '#FF5A3C' },
          { offset: gStart / SPAN, fill: '#FF5A3C' },
          { offset: gEnd / SPAN, fill: '#040404' },
          { offset: 1, fill: '#040404' }
        ], { duration: SPAN, fill: 'both' });
      }
    });

    /* --- 粒子は面が出来上がるにつれて薄くなる ---------------------- */
    A(P.dust, [
      { offset: 0, opacity: 1 }, { offset: 640 / TOTAL, opacity: 1 },
      { offset: 940 / TOTAL, opacity: 0 }, { offset: 1, opacity: 0 }
    ], { duration: TOTAL, fill: 'both' });

    /* --- 面の形成: 中心から広がる遮蔽でロゴが実体化 ---------------- */
    A(P.reveal, [
      { offset: 0, transform: 'scale(0)' },
      { offset: 600 / TOTAL, transform: 'scale(0)' },
      { offset: 940 / TOTAL, transform: 'scale(1)' },
      { offset: 1, transform: 'scale(1)' }
    ], { duration: TOTAL, easing: 'linear', fill: 'both' });
    A(P.solid, [
      { offset: 0, opacity: 0 }, { offset: 600 / TOTAL, opacity: 0 },
      { offset: 870 / TOTAL, opacity: 1 }, { offset: 1, opacity: 1 }
    ], { duration: TOTAL, easing: 'linear', fill: 'both' });

    /* --- 最後に静止ロゴへ引き渡す(位置も色も形も同じものが残る) ---- */
    const t = setTimeout(() => {
      wrap.classList.add('is-done');
      anims.forEach((a) => { try { a.cancel(); } catch (e) {} });
    }, TOTAL);
    return () => { clearTimeout(t); anims.forEach((a) => { try { a.cancel(); } catch (e) {} }); };
  };

  const init = () => {
    const wrap = document.querySelector('[data-miai-logo]');
    const stage = wrap && wrap.querySelector('.abt__logo-fx');
    const data = window.MIAI_PARTICLES;
    if (!wrap || !stage || !data) return;

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      wrap.classList.add('is-done');
      return;
    }

    let P = null, stop = null;
    const run = () => {
      if (stop) stop();
      stage.textContent = '';
      wrap.classList.remove('is-done');
      seed = 20260811;
      P = build(stage, data);
      wrap.classList.add('is-playing');
      stop = play(P, wrap);
    };
    /* 開発確認用。毎回スクロールし直さずに見られるようにする */
    window.__replayAboutLogo = run;

    /* ステージが 4割ほど見えてから。読み込み直後に画面外で終わらせない */
    if (!('IntersectionObserver' in window)) { run(); return; }
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        run();
      });
      /* rootMargin で下へ広げると、読み込み直後にもう交差扱いになり、
         画面外で再生し切って「アニメーションが無かった」状態になる。
         余白は足さず、しきい値だけ少し下げて早めに走り出させる。 */
    }, { threshold: .2 });
    io.observe(wrap);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
