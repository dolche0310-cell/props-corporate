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

   時間軸(ms) ※全体 1400ms:
     0-260      静止ロゴが淡く引き、入れ替わりに粒が立ち上がる
     160-880    収束。粒ごとにずらし、静止から加速し減速して着地する
                一本の速度曲線で、軽い弧を描いて集まる。
                同時に C 粒子が暖色 → 黒(02 Gather の色)へ
                (色は --lm-particle-warm / --lm-particle-pale。
                 A-2 は無彩色に差し替える)
     820-1300   面の形成。中心から広がる遮蔽でロゴが実体化し、
                粒子は 880-1290 で引いていく(収束の尾と重なる)
     1400-      完全静止。静止デザインと同一

   終了後はステージを外し、元の静止ロゴだけが残る。
   IntersectionObserver で一度だけ。開発用に window.__replayAboutLogo()。 */
(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const EASE = 'cubic-bezier(.22, 1, .36, 1)';

  /* 粒子の色。A-1(Red-orange)は暖色のまま、A-2(darkblack)は
     ページ側で無彩色に差し替える。既定値は A-1 の値そのもの。 */
  const cssVar = (name, fallback) => {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue(name).trim();
    return v || fallback;
  };
  const C_WARM = cssVar('--lm-particle-warm', '#FF5A3C');  /* C 粒子 */
  const C_PALE = cssVar('--lm-particle-pale', '#FFD9CE');  /* その他 */
  const C_SOLID = '#040404';                               /* 収束後 */

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
      el.setAttribute('fill', key.slice(-1) === 'C' ? C_WARM : C_PALE);
      dust.appendChild(el);
      items.push({ el: el, dx: dx, dy: dy, sc: sc, warm: key.slice(-1) === 'C' });
    });
    stage.appendChild(dust);

    const solid = logoGroup('lm-solid', C_SOLID, true);
    stage.appendChild(solid);

    return {
      items: items, dust: dust, solid: solid,
      reveal: defs.querySelector('.lm-reveal-c')
    };
  };

  const play = (P, wrap) => {
    const anims = [];
    const A = (el, kf, opt) => { const a = el.animate(kf, opt); anims.push(a); return a; };

    /* --- 粒子: 静止から弧を描いて収束 -----------------------------
       ピン留めで必ず頭から見てもらえるので、スプラッシュ/FV と同じ
       呼吸(ゆったり入ってそっと止まる)に合わせて 1400ms とる。 */
    const TOTAL = 1400;
    const SPAN = 880;
    P.items.forEach((it) => {
      const { dx, dy, sc } = it;
      const at = (x, y, s) => 'translate(' + x.toFixed(2) + 'px, ' + y.toFixed(2) + 'px) scale(' + s.toFixed(3) + ')';
      const gStart = 160 + rnd() * 60;                  /* 立ち上がりのばらつき */
      const gDur = 620 + rnd() * 150 - 75;              /* 収束 0.55-0.70s */
      const gEnd = Math.min(SPAN, gStart + gDur);
      /* 直線だけだと機械的なので、進行方向と直交する向きへ 10-20px 膨らませる */
      const len = Math.hypot(dx, dy) || 1;
      const bow = (rnd() < .5 ? -1 : 1) * (10 + rnd() * 10);
      const mx = dx * .5 + (-dy / len) * bow;
      const my = dy * .5 + (dx / len) * bow;

      /* 静止 → 加速 → 減速 → 着地 を1本の速度曲線でつなぐ。
         微細なドリフトは持たない。止まっているものが少し流れ、
         そこから改めて動き出す形になると、その継ぎ目で必ず速度が
         跳ねる。出だしの引っかかりはそこだった。
         前半は出口に速度を残す曲線、後半は速度を 0 に落とす曲線で
         受けるので、弧の頂点でも着地でも速度が跳ねない。 */
      A(it.el, [
        { offset: 0, transform: at(dx, dy, sc) },
        { offset: gStart / SPAN, transform: at(dx, dy, sc),
          easing: 'cubic-bezier(.5, 0, .75, .35)' },
        { offset: (gStart + gEnd) / 2 / SPAN, transform: at(mx, my, 1 + (sc - 1) * .35),
          easing: 'cubic-bezier(.25, .65, .3, 1)' },
        { offset: gEnd / SPAN,      transform: at(0, 0, 1) },
        { offset: 1,                transform: at(0, 0, 1) }
      ], { duration: SPAN, fill: 'both' });

      /* C 粒子は集まるにつれて 02 Gather の黒へ変わる */
      if (it.warm) {
        A(it.el, [
          { offset: 0, fill: C_WARM },
          { offset: gStart / SPAN, fill: C_WARM },
          { offset: gEnd / SPAN, fill: C_SOLID },
          { offset: 1, fill: C_SOLID }
        ], { duration: SPAN, fill: 'both' });
      }
    });

    /* --- 粒子は面が出来上がるにつれて薄くなる ---------------------- */
    /* 静止ロゴが消えるのと同じ 260ms で立ち上げる。いきなり全開で
       湧かせると、実体のロゴが1フレームで粒に置き換わって見える。 */
    A(P.dust, [
      { offset: 0, opacity: 0, easing: 'ease-in-out' },
      { offset: 260 / TOTAL, opacity: 1, easing: 'ease-in-out' },
      { offset: 880 / TOTAL, opacity: 1, easing: 'ease-in-out' },
      { offset: 1290 / TOTAL, opacity: 0 }, { offset: 1, opacity: 0 }
    ], { duration: TOTAL, fill: 'both' });

    /* --- 面の形成: 中心から広がる遮蔽でロゴが実体化 ----------------
       linear だと立ち上がりと止まりに角が立つ。FV と同じ
       「そっと入ってそっと止まる」曲線で広げる。 */
    A(P.reveal, [
      { offset: 0, transform: 'scale(0)' },
      { offset: 820 / TOTAL, transform: 'scale(0)', easing: 'cubic-bezier(.45, 0, .25, 1)' },
      { offset: 1300 / TOTAL, transform: 'scale(1)' },
      { offset: 1, transform: 'scale(1)' }
    ], { duration: TOTAL, fill: 'both' });
    A(P.solid, [
      { offset: 0, opacity: 0 },
      { offset: 820 / TOTAL, opacity: 0, easing: 'ease-in-out' },
      { offset: 1180 / TOTAL, opacity: 1 }, { offset: 1, opacity: 1 }
    ], { duration: TOTAL, fill: 'both' });

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

    /* デスクトップはピン留めに入った瞬間を起点にする。セクションが
       画面いっぱいに収まって「止まった」その時から粒子が動き出す。
       スクロールの購読は main.js の共有ディスパッチャに相乗りする
       (自前で scroll を購読して rAF を回すと1フレームに何度も
       レイアウトを読むことになるため)。 */
    const scroller = document.getElementById('about-scroller');
    const pinEl = scroller && scroller.querySelector('.abt-pin');
    if (scroller && pinEl && window.__miaiOnScroll &&
        matchMedia('(min-width: 768px)').matches) {
      let fired = false, unpinned = false, collapsed = false;
      window.__miaiOnScroll(() => {
        const r = scroller.getBoundingClientRect();
        if (!fired) {
          if (r.top > 0) return;
          fired = true;
          run();
          return;
        }
        /* 止めるのは初回だけ。2回目からは普通に流す。
           解除は「変化する場所が画面の外」でしか行わない。
           1) セクションが画面より上へ抜けたら sticky を切る。
              高さは変えないので文書の高さも変わらず、画面は動かない。 */
        if (!unpinned && r.bottom <= 0) {
          unpinned = true;
          scroller.classList.add('is-unpinned');
          return;
        }
        /* 2) 余った走行ぶんの高さを畳む。畳むのは pin より下の空きだけ
              なので、About の見えは動かない。動くのは pin より下の要素
              だけで、pin の下端が画面外にあればそれも見えない。 */
        if (unpinned && !collapsed) {
          const p = pinEl.getBoundingClientRect();
          if (p.bottom >= innerHeight) {
            collapsed = true;
            scroller.classList.add('is-collapsed');
          }
        }
      });
      return;
    }

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
