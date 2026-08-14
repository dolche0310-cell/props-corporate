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

  /* 点灯色はページのアクセント(--color-primary)。darkblack 案(A-2)は
     オレンジを使わないため、ここも #0D0D0D のまま灯る(=ほぼ黒)。 */
  const ACCENT = (() => {
    const v = (getComputedStyle(document.documentElement)
      .getPropertyValue('--color-primary') || '#FF2400').trim();
    const m = /^#?([0-9a-f]{6})$/i.exec(v);
    if (!m) return [255, 36, 0];
    const n = parseInt(m[1], 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  })();

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
  const SCATTER_LEN = 1700;                  /* 字が抜け切るまで */
  const DIS = 1330;                /* ドット点灯の開始 */
  const LIT = DIS + 280;           /* 点灯し切る */
  const SCATTER = LIT + 720;       /* 灯り切って一拍おいてから文字が散る */
  const HANDOFF = SCATTER + 780;   /* hero-morph へ受け渡し */

  const drawIntro = (t) => {
    /* 文字: 1文字ずつライズ。散開開始後はグループごと消えていく */
    /* 入りは1文字ずつ 26px ライズ、抜けは同じ間合いで上へ抜けながら消える。
       クリップで切ると枠の上端で字が途中から消えて不自然だったため、
       クリップは使わず不透明度で見せる(修正前の挙動)。 */
    logoG.style.opacity = '1';
    const L_OUT = 700;
    letters.forEach((el, i) => {
      const u = EASE_OUT((t - L_BASE - i * L_STAG) / L_DUR);
      const o = smooth(clamp01((t - SCATTER - i * L_STAG) / L_OUT));
      el.style.opacity = (u * (1 - o)).toFixed(3);
      el.setAttribute('transform',
        'translate(0 ' + (L_RISE * (1 - u) - L_RISE * o).toFixed(2) + ')');
    });

    /* 粒子は使わない。字は上の staggered な退場だけで消えるので、
       キャンバスは常に空のままにしておく(要素は互換のため残す)。 */
    const q = canvas.__q || 1;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(q, 0, 0, q, 0, 0);
    ctx.clearRect(0, 0, DW, DH);

    /* ドット: ロゴ自身のドットの位置で黒→#FF2400 に灯るだけ。
       以前はここから S04 の位置へ丸が単体で滑って行っていたが、
       文字が消えたあとに丸ひとつが画面を移動する画は間が持たず粗く見える。
       灯ったあとは他の字と同じ間合いで、その場で退場させる。
       FV 側は hero-morph が S04 から自分で立ち上げる。 */
    if (t >= DIS && t < HANDOFF) {
      dotEl.style.display = '';
      const cu = smooth((t - DIS) / 280);
      /* 最後の字と同じタイミングで抜ける(i は2文字目なので stagger も合わせる) */
      const o = smooth(clamp01((t - SCATTER - 1 * L_STAG) / 700));
      dotEl.setAttribute('cx', IDOT.x.toFixed(2));
      dotEl.setAttribute('cy', (IDOT.y - L_RISE * LS * o).toFixed(2));
      dotEl.setAttribute('r', IDOT.r.toFixed(2));
      dotEl.style.opacity = (1 - o).toFixed(3);
      dotEl.setAttribute('fill',
        'rgb(' + Math.round(lerp(25, ACCENT[0], cu)) + ',' + Math.round(lerp(25, ACCENT[1], cu)) + ',' + Math.round(lerp(25, ACCENT[2], cu)) + ')');
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
