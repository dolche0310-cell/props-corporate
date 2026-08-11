/* ============ SplashToHeroTimeline ============
   TOP冒頭のスプラッシュ〜FV完成までを1本のタイムラインで駆動する。
   Motion Reference: seedance2-5_Video_20260812_063239.mp4 (12.06s/24fps)
   Final Layout:     Figma 215:22653 (DESIGN A_brushup)

   ■ 思想
   「前の形が消えて次の形が出る」を作らない。ドット・円・リング・
   ブロブ・2本の線は全て同じ「カプセル汎化」1モデルの連続変形で表す。
     形 = 線分(中心C, 角度phi, 半長h) + 半径r + 半径方向のローブ(lobe)
     h=0        → 円
     h>0        → カプセル(丸端の線)
     lobe>0     → 有機的なブロブ
   つまり 円→楕円→リング片→ブロブ→極太ライン が1つのパスの
   キーフレーム補間になる。opacity切替のクロスフェードは使わない。

   ■ MASTER TIMELINE (ms)
      0- 400  DESIGN 1  白空間 + 左右の淡いPeach Glow
    400-1050  DESIGN 2  粒子が集まりMiAIが形成(canvas粒子→面が埋まる)
   1050-1350            Solid MiAI を見せる(300ms)
   1350-2500  DESIGN 3  Solid→多孔→粒子に分解。iのドットだけ残る
   2300-2550            iのドットが黒→オレンジに灯る
   2550-2900  DESIGN 4  オレンジドットのみ。0.96→1.04→1 の微パルス
   2900-4200  DESIGN 5a ドットが右へ流れ、軌跡から不揃いなドット列が生まれる
   4200-5600  DESIGN 5b ドット列が円/楕円へ成長(位置・大きさ・縦横比を補間)
   5600-6550  DESIGN 6  円群が寄り集まり有機的なリングへ
   6550-7500  DESIGN 7  リング中央に円形の窓が開き、AI面接の映像がReveal
   7500-8300            映像が柔らかく引き、リングの密度が上がる(約500ms重ね)
   8300-9700  DESIGN 8  リングがほどけて大きなブロブ+右上の小円へ
   9700       fv-in     ページUI形成開始(見出し/リード/ヘッダーはCSS側)
   9700-10600 DESIGN 9  ブロブ→Peachの極太ライン / 小円→Grayの極太ライン
                        着地前に制御点±8〜16pxの弱い「ぐにゃ」→収束
   10600      受け渡し  hero__lines(js/hero-lines.js)の最終形と同一座標で
                        settle()。以後は既存の呼吸のみ
   11200      幕を除去(11〜12sは完成状態を見せる時間)

   粒子のみ canvas。ロゴ・図形・線はベクター(SVG)を維持する。 */
(() => {
  'use strict';

  const overlay = document.getElementById('intro-overlay');
  if (!overlay || !overlay.classList.contains('intro-overlay--splash')) return;

  const stage  = overlay.querySelector('.sp-stage');
  const canvas = overlay.querySelector('.sp-canvas');
  const svg    = overlay.querySelector('.sp-svg');
  const logoG  = overlay.querySelector('.sp-logo');
  const cellsG = overlay.querySelector('.sp-cells');
  const winEl  = overlay.querySelector('.sp-window');
  const video  = winEl ? winEl.querySelector('video') : null;

  const startFV = () => {
    if (window.__miaiStartFV) { window.__miaiStartFV(); return; }
    document.body.classList.add('fv-in');
    document.dispatchEvent(new CustomEvent('miai:fv-in'));
  };
  const settleLines = () => {
    const hl = window.__miaiHeroLines;
    if (hl) hl.settle();
  };

  if (!stage || !canvas || !svg ||
      matchMedia('(prefers-reduced-motion: reduce)').matches) {
    overlay.remove();
    document.body.classList.add('intro-revealed');
    startFV();
    settleLines();
    return;
  }

  /* ---------- ステージ: 1440x810 の設計座標を viewport に cover で敷く ---------- */
  const DW = 1440, DH = 810;
  let scale = 1, ox = 0, oy = 0;
  const layout = () => {
    scale = Math.max(innerWidth / DW, innerHeight / DH);
    ox = (innerWidth - DW * scale) / 2;
    oy = (innerHeight - DH * scale) / 2;
    stage.style.transform = 'translate(' + ox + 'px,' + oy + 'px) scale(' + scale + ')';
    const q = Math.min(2, (devicePixelRatio || 1) * scale);
    canvas.width = Math.round(DW * q);
    canvas.height = Math.round(DH * q);
    canvas.__q = q;
  };
  layout();
  addEventListener('resize', layout);

  /* スクロールはスプラッシュ中だけ止める */
  document.documentElement.classList.add('splash-lock');
  const unlock = () => document.documentElement.classList.remove('splash-lock');

  /* ---------- 乱数(再生ごとに同じ画になるよう種を固定) ---------- */
  let seed = 20260812;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

  /* ---------- ロゴ配置と粒子サンプリング ---------- */
  /* ロゴ 266.312x96.985 を中央(720,400)へ。参考動画の見え方に合わせ幅260 */
  const LW = 260, LS = LW / 266.312;
  const LX = 720 - LW / 2, LY = 400 - (96.985 * LS) / 2;
  logoG.setAttribute('transform',
    'translate(' + LX.toFixed(2) + ' ' + LY.toFixed(2) + ') scale(' + LS.toFixed(5) + ')');
  /* i のドット(ロゴ座標 125.66/10.55 r9.62) → ステージ座標 */
  const IDOT = { x: LX + 125.66 * LS, y: LY + 10.55 * LS, r: 9.62 * LS };

  const particles = [];
  {
    const test = document.createElement('canvas').getContext('2d');
    const paths = [...logoG.querySelectorAll('path')].map((p) => new Path2D(p.getAttribute('d')));
    test.setTransform(LS, 0, 0, LS, LX, LY);
    const STEP = 2.3;
    const pts = [];
    for (let y = LY; y < LY + 97 * LS; y += STEP) {
      for (let x = LX; x < LX + LW; x += STEP) {
        for (const pa of paths) {
          if (test.isPointInPath(pa, x, y)) { pts.push([x, y]); break; }
        }
      }
    }
    /* 1600個に間引く */
    const want = 1600;
    for (let i = 0; i < pts.length; i++) {
      if (rnd() < want / pts.length) {
        const [x, y] = pts[i];
        const a1 = rnd() * Math.PI * 2, d1 = 30 + rnd() * 70;   /* 形成前の散開 */
        const a2 = rnd() * Math.PI * 2, d2 = 10 + rnd() * 30;   /* 分解後の散開 10-40px */
        particles.push({
          x, y,
          inX: x + Math.cos(a1) * d1, inY: y + Math.sin(a1) * d1 - 8,
          outX: x + Math.cos(a2) * d2 * 1.6, outY: y + Math.sin(a2) * d2 + 4,
          delayIn: rnd() * 420, delayOut: rnd() * 480,
          size: 0.8 + rnd() * 1.0, aMax: 0.55 + rnd() * 0.35
        });
      }
    }
  }

  /* ---------- カプセル汎化セル ---------- */
  const TAU = Math.PI * 2;
  const smooth = (t) => t * t * (3 - 2 * t);
  const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
  const lerp = (a, b, u) => a + (b - a) * u;
  const lerpAng = (a, b, u) => {
    let d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return a + d * u;
  };

  /* 中心からみた方向thetaでのカプセル輪郭までの距離 */
  const capsuleR = (theta, phi, h, r) => {
    if (h < 0.01) return r;
    const dx = Math.cos(theta - phi), dy = Math.sin(theta - phi);
    if (Math.abs(dy) > 1e-6) {
      const t = r / Math.abs(dy);
      if (Math.abs(t * dx) <= h) return t;
    }
    const hd = h * Math.abs(dx);
    return hd + Math.sqrt(Math.max(0, hd * hd + r * r - h * h));
  };

  const M = 22;   /* 輪郭のサンプル数 */
  const cellPath = (c) => {
    const pts = [];
    for (let i = 0; i < M; i++) {
      const th = (i / M) * TAU;
      let R = capsuleR(th, c.phi, c.h, c.r);
      if (c.lobe > 0.01) {
        R += c.lobe * (Math.sin(th * 2 + c.ls) * 0.55 +
                       Math.sin(th * 3 + c.ls * 1.7) * 0.45);
      }
      pts.push([c.x + Math.cos(th) * R, c.y + Math.sin(th) * R]);
    }
    /* Catmull-Rom → cubic で滑らかに閉じる */
    let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (let i = 0; i < M; i++) {
      const p0 = pts[(i - 1 + M) % M], p1 = pts[i], p2 = pts[(i + 1) % M], p3 = pts[(i + 2) % M];
      d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)
         + ',' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)
         + ',' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d + 'Z';
  };

  /* key: {t, x,y, phi,h,r, lobe, a(不透明度), col:[r,g,b]} を補間 */
  const COL = { ink: [25, 25, 25], orange: [241, 110, 54], gray: [227, 227, 227],
                peach: [255, 216, 194], peachL: [255, 224, 211], grayL: [233, 233, 233] };
  const sampleKeys = (keys, t) => {
    if (t <= keys[0].t) return { ...keys[0], a: t < keys[0].t ? 0 : keys[0].a };
    if (t >= keys[keys.length - 1].t) return keys[keys.length - 1];
    let i = 0;
    while (keys[i + 1].t < t) i++;
    const k0 = keys[i], k1 = keys[i + 1];
    const u = smooth(clamp01((t - k0.t) / (k1.t - k0.t)));
    return {
      x: lerp(k0.x, k1.x, u), y: lerp(k0.y, k1.y, u),
      phi: lerpAng(k0.phi, k1.phi, u), h: lerp(k0.h, k1.h, u), r: lerp(k0.r, k1.r, u),
      lobe: lerp(k0.lobe, k1.lobe, u), a: lerp(k0.a, k1.a, u),
      col: [0, 1, 2].map((c) => Math.round(lerp(k0.col[c], k1.col[c], u))),
      ls: lerp(k0.ls || 0, k1.ls || 0, u)
    };
  };

  const D = Math.PI / 180;
  const RC = { x: 1040, y: 420 };          /* リング中心 */
  const ringPos = (deg, R) => ({ x: RC.x + Math.cos(deg * D) * (R || 150),
                                 y: RC.y + Math.sin(deg * D) * (R || 150) });

  /* ---- セル定義。DESIGN 4〜9 を通しで生きる ---- */
  const K = (t, x, y, o) => ({ t, x, y, phi: 0, h: 0, r: 8, lobe: 0, a: 1, col: COL.gray, ls: 0, ...o });
  const cells = [];

  /* オレンジ: iドット → ドット → 右下の縦長楕円 → リング右上の弧 → ブロブへ溶ける */
  cells.push({ keys: [
    K(1330, IDOT.x, IDOT.y, { r: IDOT.r, col: COL.ink }),
    K(2300, IDOT.x + 4, IDOT.y + 22, { r: IDOT.r, col: COL.ink }),
    K(2550, 726, 430, { r: 13, col: COL.orange }),
    K(2680, 726, 430, { r: 13 * 0.96, col: COL.orange }),
    K(2810, 726, 430, { r: 13 * 1.04, col: COL.orange }),
    K(2900, 728, 431, { r: 13, col: COL.orange }),
    K(4200, 762, 436, { r: 15, col: COL.orange }),
    K(5100, 1262, 428, { phi: 90 * D, h: 26, r: 19, col: COL.orange }),
    K(5600, 1272, 424, { phi: 90 * D, h: 40, r: 22, col: COL.orange }),
    K(6550, ringPos(-38).x, ringPos(-38).y, { phi: 52 * D, h: 30, r: 42, col: COL.orange }),
    K(7500, ringPos(-52).x, ringPos(-52).y, { phi: 38 * D, h: 52, r: 27, col: COL.orange }),
    K(8300, ringPos(-64).x, ringPos(-64).y, { phi: 26 * D, h: 56, r: 26, col: COL.orange, a: 0.92 }),
    K(8900, 1150, 380, { h: 10, r: 58, col: COL.peach, a: 0 })
  ]});

  /* 軌跡のグレードット(6) + 下段(2) + 先端の小オレンジ(1) */
  const trail = [
    { t0: 3000, x: 792, y: 401, r: 10, g: [897, 388, 38, 20, 100], ring: 205 },
    { t0: 3130, x: 851, y: 403, r: 7,  g: [977, 353, 42, 24, 95],  ring: 240 },
    { t0: 3260, x: 906, y: 400, r: 6,  g: [1056, 344, 45, 26, 90], ring: 275 },
    { t0: 3390, x: 957, y: 404, r: 5,  g: [1131, 369, 40, 22, 85], ring: 310 },
    { t0: 3520, x: 1003, y: 405, r: 4, g: [935, 506, 40, 20, 100], ring: 118 },
    { t0: 3160, x: 748, y: 456, r: 9,  g: [1016, 521, 42, 22, 95], ring: 86 },
    { t0: 3330, x: 803, y: 459, r: 8,  g: [861, 462, 30, 12, 100], ring: 160 },
    { t0: 3650, x: 1052, y: 402, r: 6, g: [1106, 500, 36, 16, 88], ring: 54 }
  ];
  trail.forEach((s) => {
    const [gx, gy, gr, gh, gphi] = s.g;
    const rp = ringPos(s.ring), tang = (s.ring + 90) * D;
    cells.push({ keys: [
      K(s.t0, s.x - 14, s.y, { r: 0.1, a: 0 }),
      K(s.t0 + 200, s.x, s.y, { r: s.r }),
      K(4200, s.x + 8, s.y + 2, { r: s.r + 1 }),
      K(5600, gx, gy, { phi: gphi * D, h: gh, r: gr }),
      K(6550, rp.x, rp.y, { phi: tang, h: 40, r: 28 }),
      K(7200, rp.x, rp.y, { phi: tang + 8 * D, h: 44, r: 27, col: s.ring < 180 ? COL.gray : COL.peach }),
      K(8300, rp.x, rp.y, { phi: tang + 14 * D, h: 44, r: 26, col: s.ring < 180 ? COL.gray : COL.peach, a: 0.9 }),
      K(8850 + (s.ring % 3) * 120, 1150 + (rp.x - RC.x) * 0.25, 420 + (rp.y - RC.y) * 0.25,
        { h: 6, r: 30, col: COL.peach, a: 0 })
    ]});
  });
  /* 軌跡の先端に一瞬灯る小さなオレンジ(参考動画 3.5-4.0s) */
  cells.push({ keys: [
    K(3450, 1090, 437, { r: 0.1, a: 0, col: COL.orange }),
    K(3650, 1104, 437, { r: 4.5, col: COL.orange }),
    K(4300, 1150, 434, { r: 6, col: COL.orange }),
    K(4900, 1252, 428, { r: 8, col: COL.orange, a: 0 })
  ]});

  /* ブロブ本体(Peach)。リングがほどけて生まれ、最後はPeachの極太ラインへ */
  const blob = { keys: [
    K(8200, 1120, 430, { h: 20, r: 60, lobe: 6, col: COL.peach, a: 0 }),
    K(8700, 1150, 435, { phi: 115 * D, h: 45, r: 92, lobe: 16, col: COL.peach, a: 0.93 }),
    K(9300, 1160, 440, { phi: 125 * D, h: 60, r: 96, lobe: 22, col: COL.peach, a: 0.95, ls: 0.9 }),
    K(9700, 1155, 438, { phi: 122 * D, h: 70, r: 94, lobe: 18, col: COL.peach, a: 0.97, ls: 1.4 })
    /* 9700以降のキーは実測ジオメトリから動的に足す */
  ]};
  cells.push(blob);

  /* 右上の小円。ブロブから分離し、最後はGrayの極太ラインへ */
  const dotS = { keys: [
    K(8500, 1210, 380, { r: 6, col: COL.peach, a: 0 }),
    K(8900, 1242, 348, { r: 30, col: COL.peach, a: 0.85 }),
    K(9400, 1256, 336, { r: 37, col: COL.peach, a: 0.88, lobe: 3, ls: 2.1 }),
    K(9700, 1258, 338, { r: 38, col: COL.peach, a: 0.9, lobe: 3, ls: 2.4 })
  ]};
  cells.push(dotS);

  /* SVG path 要素を生成(ブロブ2つは最後に描いて前面へ) */
  cells.forEach((c) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    cellsG.appendChild(el);
    c.el = el;
  });

  /* ---------- DESIGN 9: 着地キーを hero__lines の実測から合成 ---------- */
  let linesPlanned = false;
  const planLines = () => {
    if (linesPlanned) return;
    linesPlanned = true;
    const hl = window.__miaiHeroLines;
    const g = hl && hl.geometry();
    const toStage = (p) => ({ x: (p.x - ox) / scale, y: (p.y - oy) / scale });
    const mk = (seg) => {
      const a = toStage(seg.a), b = toStage(seg.b);
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
               phi: Math.atan2(b.y - a.y, b.x - a.x),
               h: Math.hypot(b.x - a.x, b.y - a.y) / 2, r: (seg.w / scale) / 2 };
    };
    /* 実測できない場合は Figma のフレーム座標(=ステージ座標とほぼ同一)で着地 */
    const P = g ? mk(g[0]) : { x: 1031.8, y: 417.3, phi: Math.atan2(374.84, -248.89), h: 224.97, r: 76.73 };
    const G = g ? mk(g[1]) : { x: 1366.2, y: 248.4, phi: Math.atan2(576.09, -382.52), h: 345.76, r: 76.73 };
    /* ブロブ → Peach line。伸長しながら回転し、±12pxの弱いぐにゃ→収束 */
    blob.keys.push(
      K(10050, lerp(1155, P.x, 0.55), lerp(438, P.y, 0.55),
        { phi: lerpAng(122 * D, P.phi, 0.6), h: lerp(70, P.h, 0.55), r: lerp(94, P.r, 0.6),
          lobe: 12, ls: 2.0, col: COL.peachL, a: 1 }),
      K(10350, P.x, P.y, { phi: P.phi, h: P.h, r: P.r, lobe: 8, ls: 2.6, col: COL.peachL, a: 1 }),
      K(10600, P.x, P.y, { phi: P.phi, h: P.h, r: P.r, lobe: 0, col: COL.peachL, a: 1 })
    );
    /* 小円 → Gray line。少し遅れて追従、変形量は小さめ */
    dotS.keys.push(
      K(10150, lerp(1258, G.x, 0.5), lerp(338, G.y, 0.5),
        { phi: lerpAng(0, G.phi, 0.6), h: lerp(0, G.h, 0.5), r: lerp(38, G.r, 0.6),
          lobe: 8, ls: 2.9, col: [240, 226, 216], a: 1 }),
      K(10450, G.x, G.y, { phi: G.phi, h: G.h, r: G.r, lobe: 5, ls: 3.3, col: COL.grayL, a: 1 }),
      K(10600, G.x, G.y, { phi: G.phi, h: G.h, r: G.r, lobe: 0, col: COL.grayL, a: 1 })
    );
  };

  /* ---------- 粒子(canvas)。形成 400-1350 / 分解 1350-2500 ---------- */
  const ctx = canvas.getContext('2d');
  const drawParticles = (t) => {
    const q = canvas.__q || 1;
    ctx.setTransform(q, 0, 0, q, 0, 0);
    ctx.clearRect(0, 0, DW, DH);
    if (t < 380 || t > 2620) return;
    ctx.fillStyle = '#191919';
    for (const p of particles) {
      let x, y, a;
      if (t < 1350) {
        const u = clamp01((t - 400 - p.delayIn) / 520);
        if (u <= 0) continue;
        const e = 1 - Math.pow(1 - u, 3);
        x = lerp(p.inX, p.x, e); y = lerp(p.inY, p.y, e);
        a = p.aMax * Math.min(1, u * 1.6);
      } else {
        const u = clamp01((t - 1350 - p.delayOut) / 780);
        if (u >= 1) continue;
        const e = smooth(u);
        x = lerp(p.x, p.outX, e); y = lerp(p.y, p.outY, e);
        a = p.aMax * (1 - e);
      }
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      ctx.fillRect(x, y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  };

  /* ---------- Solid ロゴの不透明度(粒子密度が上がりきってから面が埋まる) ---------- */
  const logoAlpha = (t) => {
    if (t < 900) return 0;
    if (t < 1120) return smooth((t - 900) / 220);      /* 密度最大→面が埋まる */
    if (t < 1420) return 1;                            /* 完成を見せる(300ms) */
    if (t < 1750) return 1 - smooth((t - 1420) / 330); /* 多孔化(粒子側が受ける) */
    return 0;
  };

  /* ---------- 円形ウィンドウ + 映像 (6550-8400) ---------- */
  const WIN = { x: RC.x, y: RC.y, R: 122 };
  let videoStarted = false;
  const driveWindow = (t) => {
    if (!winEl || !video) return;
    if (t < 6500 || t > 8500) { winEl.style.display = 'none'; return; }
    winEl.style.display = 'block';
    /* 窓: circle 0% → 100% (scaleで開閉。中の映像は逆スケールで静止) */
    let k;
    if (t < 7150) k = smooth(clamp01((t - 6550) / 600));
    else if (t < 7900) k = 1;
    else k = 1 - smooth(clamp01((t - 7900) / 500));     /* 8400で閉じ切る */
    const s = Math.max(0.001, k);
    winEl.style.transform = 'translate(' + (WIN.x - WIN.R) + 'px,' + (WIN.y - WIN.R) + 'px) scale(' + s + ')';
    const vu = clamp01((t - 6550) / 700);               /* 映像: 0→1 / 1.03→1 / blur3→0 */
    const vo = t < 7500 ? vu : 1 - clamp01((t - 7500) / 600);  /* 500ms以上Graphicと重ねて引く */
    video.style.opacity = vo.toFixed(3);
    video.style.transform = 'scale(' + Math.min(10, (1.03 - 0.03 * vu) / s).toFixed(3) + ')';
    video.style.filter = 'blur(' + (3 * (1 - vu)).toFixed(1) + 'px)';
    if (!videoStarted && t > 6350) {
      videoStarted = true;
      video.play().catch(() => {});
    }
    if (videoStarted && t > 8450 && !video.paused) video.pause();
  };

  /* ---------- マスタータイムライン ---------- */
  const TOTAL = 11200;
  let t0 = null, done = false, fvFired = false, handed = false;
  let raf = 0;

  const frame = (now) => {
    if (t0 === null) t0 = now;
    const t = now - t0;

    /* 粒子 */
    drawParticles(t);

    /* Solid ロゴ */
    const la = logoAlpha(t);
    logoG.style.opacity = la.toFixed(3);

    /* セル群 */
    if (t >= 1300) {
      if (t >= 9400) planLines();          /* 着地キーを実測で確定 */
      for (const c of cells) {
        const k = sampleKeys(c.keys, t);
        if (k.a <= 0.005) { c.el.setAttribute('fill', 'none'); c.el.removeAttribute('d'); continue; }
        c.el.setAttribute('d', cellPath(k));
        c.el.setAttribute('fill', 'rgba(' + k.col[0] + ',' + k.col[1] + ',' + k.col[2] + ',' + k.a.toFixed(3) + ')');
      }
    }

    /* 窓と映像 */
    driveWindow(t);

    /* ページUIの形成開始 */
    if (!fvFired && t >= 9700) {
      fvFired = true;
      document.body.classList.add('intro-revealed');
      overlay.classList.add('is-page');    /* 幕の白を抜く(下も白なので見えない) */
      startFV();
    }

    /* 2本の線の受け渡し: 直前フレームと同一形状で hero__lines に交代 */
    if (!handed && t >= 10600) {
      handed = true;
      settleLines();
      cellsG.style.display = 'none';
      overlay.classList.add('is-hiding');  /* 残る演出(グロー)をフェード */
    }

    if (t >= TOTAL) { finish(); return; }
    raf = requestAnimationFrame(frame);
  };

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    unlock();
    if (!fvFired) { document.body.classList.add('intro-revealed'); startFV(); }
    if (!handed) settleLines();
    if (video) { try { video.pause(); } catch (e) {} video.removeAttribute('src'); video.load(); }
    if (overlay.parentNode) overlay.remove();
    removeEventListener('resize', layout);
  };

  /* 開始。最初のフレームは必ず白から */
  requestAnimationFrame(() => { raf = requestAnimationFrame(frame); });

  /* 保険。何かが凍っても幕がページを塞ぎ続けないようにする */
  setTimeout(finish, 15000);

  /* 開発用 */
  window.__splashTimeline = {
    finish,
    seek(ms) { t0 = performance.now() - ms; }
  };
})();
