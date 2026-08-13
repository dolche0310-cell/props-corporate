/* ============ スプラッシュ(Figma 397:25889 冒頭) ============
   白 → MiAI が1文字ずつ立つ → Solid → i のドットが #FF2400 に灯る →
   文字が粒子になって散り、ドットだけが残る → ドットが S04 の位置へ
   吸い付き、js/hero-morph.js のモーフループへ受け渡す。

   幕(overlay)が担当するのはロゴと粒子とドットまで。以後のグラフィックは
   ヒーロー側のステージ(.hero__motif)が永続的に動かす。同一オブジェクトが
   スプラッシュから FV へ移動したように見せるため、幕のステージは
   .hero__motif の実 CTM を写して座標系を一致させている。

   ■ 時間軸 (ms)
      0- 200  白
    200- 970  文字が 70ms 刻みで 26px ライズ(各560ms)
    970-1330  Solid
   1330-1610  i のドットが黒→#FF2400 に灯る(文字は Solid のまま)
   1760-2830  文字が粒子化して散る。ドットは残る
   2150-2500  ドットが S04(709.5,292.5) r26.5 へ
   2500       幕の白が抜け、hero-morph.start() = S04 から引き継ぎ
   3200       幕を除去(粒子が散り終わる)
   S11到達    'miai:morph-fv' を受けて FV の文字・ヘッダー・スクロール解禁

   prefers-reduced-motion: 幕を出さず最終形を表示。保険 15s。 */
(() => {
  'use strict';

  const overlay = document.getElementById('intro-overlay');
  if (!overlay || !overlay.classList.contains('intro-overlay--splash')) return;

  const stage  = overlay.querySelector('.sp-stage');
  const canvas = overlay.querySelector('.sp-canvas');
  const svg    = overlay.querySelector('.sp-svg');
  const logoG  = overlay.querySelector('.sp-logo');
  const cellsG = overlay.querySelector('.sp-cells');
  const morph  = () => window.__miaiHeroMorph;

  const startFV = () => {
    if (window.__miaiStartFV) { window.__miaiStartFV(); return; }
    document.body.classList.add('fv-in');
    document.dispatchEvent(new CustomEvent('miai:fv-in'));
  };

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!stage || !canvas || !svg || REDUCED) {
    overlay.remove();
    document.body.classList.add('intro-revealed');
    startFV();
    return;
  }

  /* ---------- ステージ: .hero__motif の CTM を写す ----------
     ドットの受け渡しが座標変換なしで成立する(同じフレーム座標系)。 */
  const DW = 1440, DH = 810;
  let scale = 1;
  const layout = () => {
    const hm = document.querySelector('.hero__motif');
    const m = hm && hm.getScreenCTM();
    let ox = (innerWidth - DW) / 2, oy = 0;
    scale = 1;
    if (m) { scale = m.a; ox = m.e; oy = m.f; }
    stage.style.transform = 'translate(' + ox + 'px,' + oy + 'px) scale(' + scale + ')';
    const q = Math.min(2, (devicePixelRatio || 1) * scale);
    canvas.width = Math.round(DW * q);
    canvas.height = Math.round(DH * q);
    canvas.__q = q;
  };
  layout();
  addEventListener('resize', layout);

  document.documentElement.classList.add('splash-lock');
  const unlock = () => document.documentElement.classList.remove('splash-lock');

  let seed = 20260813;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

  /* ---------- ロゴ(190px / 中心 720,351.5) ---------- */
  const LW = 190, LS = LW / 266.312;
  const LX = 720 - LW / 2, LY = 351.5 - (96.985 * LS) / 2;
  const IDOT = { x: LX + 125.66 * LS, y: LY + 10.55 * LS, r: 9.62 * LS };
  logoG.setAttribute('transform',
    'translate(' + LX.toFixed(2) + ' ' + LY.toFixed(2) + ') scale(' + LS.toFixed(5) + ')');
  logoG.style.opacity = '0';
  const letters = [...logoG.querySelectorAll('path')];
  const L_BASE = 200, L_STAG = 70, L_DUR = 560;
  const L_RISE = 26 / LS;

  /* ---------- 粒子(全グリッド点 / 静止中は 2.8px タイルで完全な黒) ---------- */
  const particles = [];
  {
    const test = document.createElement('canvas').getContext('2d');
    const paths = letters.map((p) => new Path2D(p.getAttribute('d')));
    test.setTransform(LS, 0, 0, LS, LX, LY);
    for (let y = LY; y < LY + 97 * LS + 4; y += 2.4) {
      for (let x = LX; x < LX + LW + 4; x += 2.4) {
        for (const pa of paths) {
          if (test.isPointInPath(pa, x, y)) {
            const a2 = rnd() * Math.PI * 2, d2 = 10 + rnd() * 30;
            particles.push({
              x, y,
              outX: x + Math.cos(a2) * d2 * 1.5, outY: y + Math.sin(a2) * d2 + 3,
              delay: rnd() * 380, size: 0.9 + rnd() * 1.1
            });
            break;
          }
        }
      }
    }
  }

  /* ---------- ドット(常に1個) ---------- */
  const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
  const smooth = (t) => { const u = clamp01(t); return u * u * u * (u * (u * 6 - 15) + 10); };
  const lerp = (a, b, u) => a + (b - a) * u;
  const EASE_OUT = (t) => 1 - Math.pow(1 - clamp01(t), 3);
  const NSVG = 'http://www.w3.org/2000/svg';
  const dotEl = document.createElementNS(NSVG, 'circle');
  dotEl.style.display = 'none';
  cellsG.appendChild(dotEl);

  const DIS = 1330;                /* ドット点灯の開始 */
  const SCATTER = DIS + 430;       /* 文字が散り始める */
  const HANDOFF = 2500;            /* hero-morph へ受け渡し */

  const drawIntro = (t) => {
    /* 文字: 1文字ずつライズ。散開開始後はグループごと消えていく */
    let ga = 1;
    if (t >= SCATTER) ga = 1 - smooth((t - SCATTER) / 250);
    logoG.style.opacity = Math.max(0, ga).toFixed(3);
    letters.forEach((el, i) => {
      const u = EASE_OUT((t - L_BASE - i * L_STAG) / L_DUR);
      el.style.opacity = u.toFixed(3);
      el.setAttribute('transform', 'translate(0 ' + (L_RISE * (1 - u)).toFixed(2) + ')');
    });

    /* 粒子(タイル→粒に痩せながら散る) */
    const q = canvas.__q || 1;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(q, 0, 0, q, 0, 0);
    ctx.clearRect(0, 0, DW, DH);
    if (t >= SCATTER && t <= 2900) {
      ctx.fillStyle = '#191919';
      for (const p of particles) {
        const lt = t - SCATTER - p.delay;
        if (lt < 0) continue;
        const uIn = clamp01(lt / 90);
        const uOut = clamp01((lt - 430) / 560);
        if (uOut >= 1) continue;
        const e = smooth(uOut);
        const alpha = uIn * (1 - e);
        if (alpha <= 0.01) continue;
        const sz = lerp(2.8, p.size, e);
        ctx.globalAlpha = alpha;
        ctx.fillRect(lerp(p.x, p.outX, e) - sz / 2, lerp(p.y, p.outY, e) - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;
    }

    /* ドット: ロゴ自身のドットの真上で黒→#FF2400、S04 へ移動して受け渡し */
    if (t >= DIS && t < HANDOFF) {
      dotEl.style.display = '';
      const cu = smooth((t - DIS) / 280);
      const mu = smooth((t - 2150) / 350);          /* S04 への移動 */
      const x = lerp(IDOT.x, 709.5, mu);
      const y = lerp(IDOT.y, 292.5, mu);
      const r = lerp(IDOT.r, 26.5, mu);
      dotEl.setAttribute('cx', x.toFixed(2));
      dotEl.setAttribute('cy', y.toFixed(2));
      dotEl.setAttribute('r', Math.max(0.1, r).toFixed(2));
      dotEl.setAttribute('fill',
        'rgb(' + Math.round(lerp(25, 255, cu)) + ',' + Math.round(lerp(25, 36, cu)) + ',' + Math.round(lerp(25, 0, cu)) + ')');
    } else if (t >= HANDOFF) {
      dotEl.style.display = 'none';
    }
  };

  /* ---------- タイムライン ---------- */
  let t0 = null, raf = 0, handed = false, cleared = false, finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    if (overlay.parentNode) overlay.remove();
    removeEventListener('resize', layout);
  };

  const frame = (now) => {
    if (t0 === null) t0 = now;
    const t = now - t0;
    drawIntro(t);
    if (!cleared && t >= HANDOFF) {
      cleared = true;
      overlay.classList.add('is-page');          /* 白が抜ける */
    }
    if (!handed && t >= HANDOFF) {
      handed = true;
      const m = morph();
      if (m) m.start();                          /* S04 から引き継ぎ */
      else { startFV(); }                        /* 保険 */
    }
    if (t >= 3200) { finish(); return; }
    raf = requestAnimationFrame(frame);
  };

  /* S11 到達で FV の文字とヘッダー、スクロール解禁 */
  document.addEventListener('miai:morph-fv', () => {
    document.body.classList.add('intro-revealed');
    startFV();
    unlock();
  }, { once: true });

  requestAnimationFrame(() => { raf = requestAnimationFrame(frame); });

  /* 保険: 何かが凍っても幕とロックを残さない */
  setTimeout(() => {
    finish();
    unlock();
    if (!document.body.classList.contains('fv-in')) {
      document.body.classList.add('intro-revealed');
      startFV();
      const m = morph(); if (m) m.start();
    }
  }, 15000);
})();
