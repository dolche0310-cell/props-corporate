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
   1610-2030  灯り切って一拍。オレンジの円と黒い粒子を重ねない
   2030-3180  文字が粒子化して散る。ドットの周りは粒子を作らない
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

  /* ---------- 粒子 ----------
     字形を細かい格子で埋め、静止中はタイルで完全な黒を作る。
     散るときは「i のドットから解放されたエネルギー」として、
     ドットに近い粒から順に持ち上がる。

     ・速度: 上方向 + ドットからの外向き + わずかな乱れ
     ・軌道: 直線でなく、粒ごとの位相でゆるく渦を巻く(curl)
     ・減速: 立ち上がりが速く、終盤はほとんど止まって消える
     ・寿命と大きさに個体差があるので、一斉に消えない */
  const particles = [];
  {
    const test = document.createElement('canvas').getContext('2d');
    const paths = letters.map((p) => new Path2D(p.getAttribute('d')));
    test.setTransform(LS, 0, 0, LS, LX, LY);
    /* i のドットの領域は粒子を作らない。オレンジの円と黒い粒が
       同じ場所で重なると濁って見えるため、そこは円だけに任せる。 */
    const DOT_KEEP = IDOT.r + 2.5;
    const STEP = 1.85;                       /* 格子。細かいほど密になる */
    const maxD = Math.hypot(LW, 97 * LS);
    for (let y = LY; y < LY + 97 * LS + 4; y += STEP) {
      for (let x = LX; x < LX + LW + 4; x += STEP) {
        if (Math.hypot(x - IDOT.x, y - IDOT.y) < DOT_KEEP) continue;
        let inside = false;
        for (const pa of paths) { if (test.isPointInPath(pa, x, y)) { inside = true; break; } }
        if (!inside) continue;
        /* ドットからの向きと距離。近い粒ほど早く、速く動く */
        const ddx = x - IDOT.x, ddy = y - IDOT.y;
        const dist = Math.hypot(ddx, ddy) || 1;
        const nx = ddx / dist, ny = ddy / dist;
        const near = 1 - Math.min(1, dist / maxD);          /* 0..1 */
        const jitter = (rnd() - 0.5) * 0.9;
        const speed = (58 + rnd() * 88) * (0.5 + near * 1.0);
        particles.push({
          x, y,
          /* 上へ立ち上がりつつ、ドットから外へ広がる */
          vx: nx * speed * 0.62 + jitter * 44,
          vy: -speed * 0.78 + ny * speed * 0.28 + (rnd() - 0.5) * 26,
          curlA: rnd() * Math.PI * 2,
          curlR: 5 + rnd() * 16,
          delay: (1 - near) * 260 + rnd() * 260,
          life: 720 + rnd() * 520,
          size: 0.75 + rnd() * 1.25,
          aMax: 0.72 + rnd() * 0.28
        });
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

  const STEP_F = 2.15, STEP_H = STEP_F / 2;   /* 静止中に字形を埋めるタイル */
  const SCATTER_LEN = 1700;                  /* 散り切るまで */
  const DIS = 1330;                /* ドット点灯の開始 */
  const LIT = DIS + 280;           /* 点灯し切る */
  const SCATTER = LIT + 420;       /* 灯り切って一拍おいてから文字が散る */
  const HANDOFF = SCATTER + 470;   /* hero-morph へ受け渡し */

  const drawIntro = (t) => {
    /* 文字: 1文字ずつライズ。散開開始後はグループごと消えていく */
    let ga = 1;
    if (t >= SCATTER) ga = 1 - smooth((t - SCATTER) / 220);
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
    if (t >= SCATTER && t <= SCATTER + SCATTER_LEN) {
      ctx.fillStyle = '#191919';
      for (const p of particles) {
        const lt = t - SCATTER - p.delay;
        if (lt < 0) {
          /* まだ散り始めていない粒は、字形を埋めるタイルとして置く */
          ctx.globalAlpha = 1;
          ctx.fillRect(p.x - STEP_H, p.y - STEP_H, STEP_F, STEP_F);
          continue;
        }
        const u = lt / p.life;
        if (u >= 1) continue;
        const sec = lt / 1000;
        /* 減速: 立ち上がりが速く、終盤はほとんど止まる */
        const damp = (1 - Math.exp(-sec * 1.45)) / 1.45;
        const cur = p.curlA + sec * 2.3;
        const px = p.x + p.vx * damp + Math.cos(cur) * p.curlR * damp * 1.6;
        const py = p.y + p.vy * damp + Math.sin(cur * 1.3) * p.curlR * damp;
        /* 濃度: 出はほぼ即時、消えぎわを長く引く */
        const fade = u < 0.18 ? 1 : Math.pow(1 - (u - 0.18) / 0.82, 1.7);
        const alpha = p.aMax * fade;
        if (alpha <= 0.012) continue;
        /* 大きさ: タイルから粒へ痩せる */
        const sz = lerp(STEP_F, p.size, smooth(clamp01(u * 2.2)));
        ctx.globalAlpha = alpha;
        ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;
    }

    /* ドット: ロゴ自身のドットの真上で黒→#FF2400、S04 へ移動して受け渡し */
    if (t >= DIS && t < HANDOFF) {
      dotEl.style.display = '';
      const cu = smooth((t - DIS) / 280);
      const mu = smooth((t - (HANDOFF - 350)) / 350);   /* S04 への移動 */
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
    if (t >= SCATTER + SCATTER_LEN) { finish(); return; }
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
