/* ============ SplashToHeroTimeline ============
   TOP冒頭のスプラッシュ〜FV完成までを1本の rAF タイムラインで駆動する。

   デザインの正解: 現行ページ / Figma DESIGN 1〜9 (storyboard 304:50429 一帯)
   動きの参考:     seedance2-5_Video_20260812_063239.mp4 (テンポ・つながりのみ)

   ■ 思想
   DESIGN 1〜9 を「参考画像」ではなく Animation Keyframe として扱う。
   各 DESIGN の実グラフィック(js/splash-shapes.js に Figma からリサンプル
   済みの 64 点アウトライン)そのものを到達状態にし、状態間は
   「対応する図形同士のアウトライン補間」で繋ぐ。図形は新規に作らない。
   クロスフェードによる状態切替はしない(分裂・合体も同じ補間で表す)。

   ■ MASTER TIMELINE (ms)
      0- 350  D1  白 + 左右の淡い Glow
    200- 970  D2  MiAI(最初のスプラッシュと同じ190px)が1文字ずつ
              26pxライズ+ぼけの解像でスライドして立つ
    970-1330  D2  Solid を見せる(360ms)。以降の時刻は +250ms シフト
   1330-2400  D3  エッジから粒子化(canvas)。iのドットだけ残り橙へ
   2150-2500  D3→D4 ドットが Figma D4 の位置(709.5,292.5) r26.5 へ
   2500-2680  D4  ドットのみ
   2680-3480  D4→D5a ドットが左上へ寄り、3つのグレードットが軌跡から生まれる
   3480-3660  D5a 2x2 グリッド(306:55849 の実座標)
   3660-4760  D5a→D5b 4点 → 5弧+塊(306:58400-58405)
   4760-4940  D5b
   4800       fv-in: 見出し/リード/ヘッダーの形成開始(D6a で UI 完成表示)
   4940-6040  D5b→D6a グレー → ピーチの クラスタ(304:49114)
   6040-6220  D6a
   6220-7320  D6a→D6b リング(304:45169)へ組み替え
   7320-9020  D6b/D7 リング保持。7520-8120 中央の円窓(r217.86)が開き
              AI面接の実映像が Reveal。8720-9320 映像が引き 8900-9600 窓が閉じる
   9020-10120 D7→D8a リングがほどけてブロブ(304:43858)へ(映像と重ねて変形)
  10120-10300 D8a
  10300-11200 D8a→D8b N形(277:37247)へ
  11200-11300 D8b
  11300-12150 D8b→D9 Nが伸び分離して2本の線へ。着地は hero__lines の実測
              ジオメトリ(= Figma 215:22653 の Rectangle 64/65)
  12150       受け渡し hero-lines.settle()。最終フレーム = 通常CSSの最終状態
  12700       幕を除去 */
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
  const DATA   = window.MIAI_SPLASH_STATES;

  const startFV = () => {
    if (window.__miaiStartFV) { window.__miaiStartFV(); return; }
    document.body.classList.add('fv-in');
    document.dispatchEvent(new CustomEvent('miai:fv-in'));
  };
  const settleLines = () => {
    const hl = window.__miaiHeroLines;
    if (hl) hl.settle();
  };

  if (!stage || !canvas || !svg || !DATA ||
      matchMedia('(prefers-reduced-motion: reduce)').matches) {
    overlay.remove();
    document.body.classList.add('intro-revealed');
    startFV();
    settleLines();
    return;
  }

  /* ---------- ステージ: 1440x810 の設計座標を viewport に cover ----------
     図形データは 1440x703 のフレーム系。ヘッダー起点が一致するよう
     上端を合わせる(縦の余りは下へ逃がす)。 */
  const DW = 1440, DH = 810;
  let scale = 1, ox = 0, oy = 0;
  const layout = () => {
    scale = Math.max(innerWidth / DW, innerHeight / DH);
    ox = (innerWidth - DW * scale) / 2;
    oy = 0;
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

  let seed = 20260812;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

  /* ---------- ロゴ。大きさは最初のスプラッシュと同じ 190px。
     中心は DESIGN 2 の位置(720,351.5) ---------- */
  const LW = 190, LS = LW / 266.312;
  const LX = 720 - LW / 2, LY = 351.5 - (96.985 * LS) / 2;
  const IDOT = { x: LX + 125.66 * LS, y: LY + 10.55 * LS, r: 9.62 * LS };
  logoG.setAttribute('transform',
    'translate(' + LX.toFixed(2) + ' ' + LY.toFixed(2) + ') scale(' + LS.toFixed(5) + ')');
  logoG.style.opacity = '0';
  /* 文字は M, i, a, l の4パス。最初のスプラッシュと同じく1文字ずつ
     26px ライズ + ぼけの解像で立ち上がる(値はロゴのローカル単位へ換算) */
  const letters = [...logoG.querySelectorAll('path')];
  const L_BASE = 200, L_STAG = 70, L_DUR = 560;
  const L_RISE = 26 / LS;

  /* ---------- D3 の粒子(canvas)。ロゴの字形からサンプリング ---------- */
  const particles = [];
  {
    const test = document.createElement('canvas').getContext('2d');
    const paths = [...logoG.querySelectorAll('path')].map((p) => new Path2D(p.getAttribute('d')));
    test.setTransform(LS, 0, 0, LS, LX, LY);
    const pts = [];
    for (let y = LY; y < LY + 97 * LS + 4; y += 2.4) {
      for (let x = LX; x < LX + LW + 4; x += 2.4) {
        for (const pa of paths) {
          if (test.isPointInPath(pa, x, y)) { pts.push([x, y]); break; }
        }
      }
    }
    const want = 1500;
    for (const [x, y] of pts) {
      if (rnd() < want / pts.length) {
        const a2 = rnd() * Math.PI * 2, d2 = 10 + rnd() * 30;   /* 10〜40px 静かにほどける */
        particles.push({
          x, y,
          outX: x + Math.cos(a2) * d2 * 1.5, outY: y + Math.sin(a2) * d2 + 3,
          delay: rnd() * 520, size: 0.9 + rnd() * 1.1, aMax: 0.5 + rnd() * 0.35
        });
      }
    }
  }

  /* ---------- 補間ユーティリティ ---------- */
  const N = 64;
  const smooth = (t) => { const u = t < 0 ? 0 : t > 1 ? 1 : t; return u * u * u * (u * (u * 6 - 15) + 10); };
  const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
  const lerp = (a, b, u) => a + (b - a) * u;
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

  const circleOutline = (cx, cy, r) => {
    const p = [];
    for (let i = 0; i < N; i++) {
      const th = -Math.PI / 2 + (i / N) * Math.PI * 2;   /* 最上点始まり・時計回り */
      p.push([cx + Math.cos(th) * r, cy + Math.sin(th) * r]);
    }
    return p;
  };
  /* 丸端カプセル(D9 の線)。中心線 a-b と半径 r から 64 点 */
  const capsuleOutline = (ax, ay, bx, by, r) => {
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
    const cx = (ax + bx) / 2, cy = (ay + by) / 2, phi = Math.atan2(dy, dx), h = L / 2;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2;
      const c = Math.cos(th - phi), s = Math.sin(th - phi);
      let R;
      const t = Math.abs(s) > 1e-6 ? r / Math.abs(s) : Infinity;
      if (Math.abs(t * c) <= h) R = t;
      else { const hd = h * Math.abs(c); R = hd + Math.sqrt(Math.max(0, hd * hd + r * r - h * h)); }
      pts.push([cx + Math.cos(th) * R, cy + Math.sin(th) * R]);
    }
    /* 最上点始まりに正規化 */
    let top = 0;
    for (let i = 1; i < N; i++) if (pts[i][1] < pts[top][1]) top = i;
    return pts.slice(top).concat(pts.slice(0, top));
  };

  const centroid = (p) => {
    let x = 0, y = 0;
    for (const q of p) { x += q[0]; y += q[1]; }
    return [x / p.length, y / p.length];
  };
  const isOrange = (f) => f.toUpperCase() === '#F16E36';

  /* 状態 = [{p:64点, f:'#hex', a:不透明度}] */
  const shp = (pts, f, a) => ({ p: pts, f, a: a === undefined ? 1 : a });

  const S_DOT3  = [shp(circleOutline(IDOT.x, IDOT.y, IDOT.r), '#F16E36')];
  const S_D4    = [shp(circleOutline(709.5, 292.5, 26.5), '#F16E36')];
  const S_D5A   = [shp(circleOutline(669.5, 308.5, 26.5), '#F16E36'),
                   shp(circleOutline(768.5, 308.5, 26.5), '#E9E9E9'),
                   shp(circleOutline(669.5, 393.5, 26.5), '#E9E9E9'),
                   shp(circleOutline(768.5, 393.5, 26.5), '#E9E9E9')];
  /* D4→D5a: グレーはドットの軌跡から生まれる(発生源 = それぞれの位置の
     少し内側の微小円)。状態遷移として同じ補間器で扱う */
  const S_D4X   = [S_D4[0],
                   shp(circleOutline(742, 312, 2), '#E9E9E9'),
                   shp(circleOutline(676, 368, 2), '#E9E9E9'),
                   shp(circleOutline(744, 372, 2), '#E9E9E9')];

  const LINES_STATE = { list: null };   /* D9。実測ジオメトリから遅延生成 */
  const planLines = () => {
    if (LINES_STATE.list) return;
    const hl = window.__miaiHeroLines;
    const g = hl && hl.geometry();
    const toStage = (p) => [(p.x - ox) / scale, (p.y - oy) / scale];
    if (g) {
      const [pa, pb] = [toStage(g[0].a), toStage(g[0].b)];
      const [ga, gb] = [toStage(g[1].a), toStage(g[1].b)];
      LINES_STATE.list = [
        shp(capsuleOutline(pa[0], pa[1], pb[0], pb[1], (g[0].w / scale) / 2), '#FFE0D3'),
        shp(capsuleOutline(ga[0], ga[1], gb[0], gb[1], (g[1].w / scale) / 2), '#E9E9E9')
      ];
    } else {
      /* 保険: Figma 215:22653 の値(フレーム座標) */
      LINES_STATE.list = [
        shp(capsuleOutline(1156.257, 229.871, 907.369, 604.707, 76.7325), '#FFE0D3'),
        shp(capsuleOutline(1557.436, -39.631, 1174.917, 536.461, 76.7325), '#E9E9E9')
      ];
    }
  };

  /* ---------- セグメント表(文字ライズの分だけ +250ms して使う) ---------- */
  const SHIFT = 250;
  const SEG = [
    { t0: 2150, t1: 2500, from: S_DOT3, to: S_D4 },
    { t0: 2500, t1: 2680, hold: S_D4 },
    { t0: 2680, t1: 3480, from: S_D4X, to: S_D5A },
    { t0: 3480, t1: 3660, hold: S_D5A },
    { t0: 3660, t1: 4760, from: S_D5A, to: DATA.d5b },
    { t0: 4760, t1: 4940, hold: DATA.d5b },
    { t0: 4940, t1: 6040, from: DATA.d5b, to: DATA.d6a },
    { t0: 6040, t1: 6220, hold: DATA.d6a },
    { t0: 6220, t1: 7320, from: DATA.d6a, to: DATA.ring },
    { t0: 7320, t1: 9020, hold: DATA.ring },
    { t0: 9020, t1: 10120, from: DATA.ring, to: DATA.blob },
    { t0: 10120, t1: 10300, hold: DATA.blob },
    { t0: 10300, t1: 11200, from: DATA.blob, to: DATA.nshape },
    { t0: 11200, t1: 11300, hold: DATA.nshape },
    { t0: 11300, t1: 12150, from: DATA.nshape, to: LINES_STATE },
    { t0: 12150, t1: 12700, hold: LINES_STATE }
  ];
  SEG.forEach((g) => { g.t0 += SHIFT; g.t1 += SHIFT; });

  /* 遷移のペア組み。各到達図形に最も近い出発図形を(色クラス優先で)割り当て、
     使われなかった出発図形は最寄りの到達図形へ合流させる。
     ひとつの出発図形が複数の到達図形へ分裂するのも同じ仕組みで表す。 */
  const buildPairs = (seg) => {
    const src = seg.from.list ? seg.from.list : seg.from;
    const dst = seg.to.list ? seg.to.list : seg.to;
    const sc = src.map((s) => centroid(s.p));
    const dc = dst.map((s) => centroid(s.p));
    const cost = (si, di) => {
      const d = Math.hypot(sc[si][0] - dc[di][0], sc[si][1] - dc[di][1]);
      return isOrange(src[si].f) === isOrange(dst[di].f) ? d * 0.25 : d;
    };
    const used = new Array(src.length).fill(false);
    const pairs = [];
    dst.forEach((d, di) => {
      let best = 0;
      for (let si = 1; si < src.length; si++) if (cost(si, di) < cost(best, di)) best = si;
      used[best] = true;
      pairs.push([best, di]);
    });
    src.forEach((s, si) => {
      if (used[si]) return;
      let best = 0;
      for (let di = 1; di < dst.length; di++) if (cost(si, di) < cost(si, best)) best = di;
      pairs.push([si, best, true]);   /* 合流(終了時に重なって消える) */
    });
    /* 開始インデックスを合わせる(2刻みの全探索で十分) */
    return pairs.map(([si, di, merge]) => {
      const a = src[si].p, b = dst[di].p;
      let bestK = 0, bestE = Infinity;
      for (let k = 0; k < N; k += 2) {
        let e = 0;
        for (let i = 0; i < N; i += 4) {
          const p = a[(i + k) % N], q = b[i];
          e += (p[0] - q[0]) * (p[0] - q[0]) + (p[1] - q[1]) * (p[1] - q[1]);
        }
        if (e < bestE) { bestE = e; bestK = k; }
      }
      return { a, b, k: bestK,
               fa: hex(src[si].f), fb: hex(dst[di].f),
               aa: src[si].a, ab: merge ? dst[di].a : dst[di].a };
    });
  };

  /* actor path 要素プール */
  const NSVG = 'http://www.w3.org/2000/svg';
  const pool = [];
  const needActors = (n) => {
    while (pool.length < n) {
      const el = document.createElementNS(NSVG, 'path');
      cellsG.appendChild(el);
      pool.push(el);
    }
    for (let i = 0; i < pool.length; i++) pool[i].style.display = i < n ? '' : 'none';
  };
  const drawShape = (el, pts, rgb, alpha) => {
    let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[(i - 1 + pts.length) % pts.length], p1 = pts[i],
            p2 = pts[(i + 1) % pts.length], p3 = pts[(i + 2) % pts.length];
      d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)
         + ',' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ',' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)
         + ',' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    el.setAttribute('d', d + 'Z');
    el.setAttribute('fill', 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha.toFixed(3) + ')');
  };

  let pairCache = null, pairSeg = -1;
  const tmp = new Array(N);
  const renderStates = (t) => {
    let seg = null, si = -1;
    for (let i = 0; i < SEG.length; i++) {
      if (t >= SEG[i].t0 && t < SEG[i].t1) { seg = SEG[i]; si = i; break; }
    }
    if (!seg) { needActors(0); return; }
    if (seg.to === LINES_STATE || seg.hold === LINES_STATE) planLines();

    if (seg.hold) {
      const list = seg.hold.list ? seg.hold.list : seg.hold;
      needActors(list.length);
      list.forEach((s, i) => drawShape(pool[i], s.p, hex(s.f), s.a));
      return;
    }
    if (pairSeg !== si) { pairCache = buildPairs(seg); pairSeg = si; }
    const u = smooth((t - seg.t0) / (seg.t1 - seg.t0));
    needActors(pairCache.length);
    pairCache.forEach((pr, i) => {
      for (let j = 0; j < N; j++) {
        const p = pr.a[(j + pr.k) % N], q = pr.b[j];
        tmp[j] = [lerp(p[0], q[0], u), lerp(p[1], q[1], u)];
      }
      const rgb = [Math.round(lerp(pr.fa[0], pr.fb[0], u)),
                   Math.round(lerp(pr.fa[1], pr.fb[1], u)),
                   Math.round(lerp(pr.fa[2], pr.fb[2], u))];
      drawShape(pool[i], tmp, rgb, lerp(pr.aa, pr.ab, u));
    });
  };

  /* ---------- D2/D3: ロゴと粒子と i ドット ----------
     文字は 200ms から 70ms 刻みで1文字ずつ立ち(各560ms)、970ms で完成。
     1330ms まで Solid を見せ、以降は粒子へ譲る(タイムラインは +250ms)。 */
  const EASE_OUT = (t) => 1 - Math.pow(1 - clamp01(t), 3);
  const DIS = 1330;                     /* 分解の開始 */
  const drawIntro = (t) => {
    /* グループは分解フェーズのフェードだけを担う */
    let ga = 1;
    if (t < L_BASE) ga = 1;
    if (t >= DIS) ga = 1 - smooth((t - DIS) / 300);
    logoG.style.opacity = Math.max(0, ga).toFixed(3);
    letters.forEach((el, i) => {
      const u = EASE_OUT((t - L_BASE - i * L_STAG) / L_DUR);
      el.style.opacity = u.toFixed(3);
      el.setAttribute('transform', 'translate(0 ' + (L_RISE * (1 - u)).toFixed(2) + ')');
      el.style.filter = u < 1 ? 'blur(' + (3 * (1 - u)).toFixed(1) + 'px)' : 'none';
    });

    /* 粒子(分解のみ)。エッジ側(delay小)から欠けていく */
    const q = canvas.__q || 1;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(q, 0, 0, q, 0, 0);
    ctx.clearRect(0, 0, DW, DH);
    if (t < DIS || t > 2600) return;
    ctx.fillStyle = '#191919';
    for (const p of particles) {
      const lt = t - DIS - p.delay;
      if (lt < 0) continue;
      const uIn = clamp01(lt / 110);
      const uOut = clamp01((lt - 110) / 640);
      if (uOut >= 1) continue;
      const e = smooth(uOut);
      const alpha = p.aMax * uIn * (1 - e);
      if (alpha <= 0.01) continue;
      ctx.globalAlpha = alpha;
      ctx.fillRect(lerp(p.x, p.outX, e), lerp(p.y, p.outY, e), p.size, p.size);
    }
    ctx.globalAlpha = 1;

    /* i のドット(常に1個)。ロゴ自身のドットの真上に重なった状態から
       始まり、粒子化の間に黒→橙。2150 からは状態機械が引き継ぐ */
    if (t >= DIS && t < 2400) {
      needActors(1);
      const cu = smooth((t - 1550) / 400);
      const rgb = [Math.round(lerp(25, 241, cu)), Math.round(lerp(25, 110, cu)), Math.round(lerp(25, 54, cu))];
      drawShape(pool[0], circleOutline(IDOT.x, IDOT.y, IDOT.r), rgb, 1);
    }
  };

  /* ---------- D7: 円窓と映像 (窓 = Figma の Ellipse 60 マスク) ---------- */
  const W = DATA.window;
  let videoStarted = false;
  if (winEl) {
    winEl.style.width = (W.r * 2).toFixed(1) + 'px';
    winEl.style.height = (W.r * 2).toFixed(1) + 'px';
  }
  const driveWindow = (t) => {
    if (!winEl || !video) return;
    if (t < 7480 + SHIFT || t > 9640 + SHIFT) { winEl.style.display = 'none'; return; }
    winEl.style.display = 'block';
    let k;
    const tw = t - SHIFT;
    if (tw < 8120) k = smooth((tw - 7520) / 600);
    else if (tw < 8900) k = 1;
    else k = 1 - smooth((tw - 8900) / 700);
    const s = Math.max(0.001, k);
    winEl.style.transform = 'translate(' + (W.cx - W.r) + 'px,' + (W.cy - W.r) + 'px) scale(' + s.toFixed(4) + ')';
    const vu = clamp01((tw - 7520) / 650);
    const vo = tw < 8720 ? vu : 1 - clamp01((tw - 8720) / 600);
    video.style.opacity = vo.toFixed(3);
    video.style.transform = 'scale(' + Math.min(10, (1.03 - 0.03 * vu) / s).toFixed(3) + ')';
    video.style.filter = 'blur(' + (3 * (1 - vu)).toFixed(1) + 'px)';
    if (!videoStarted && tw > 7300) { videoStarted = true; video.play().catch(() => {}); }
    if (videoStarted && tw > 9500 && !video.paused) video.pause();
  };

  /* ---------- マスタータイムライン ---------- */
  const TOTAL = 12700 + SHIFT;
  let t0 = null, fvFired = false, handed = false, raf = 0;

  const frame = (now) => {
    if (t0 === null) t0 = now;
    const t = now - t0;

    drawIntro(t);
    if (t >= 2400 && !handed) renderStates(t);
    driveWindow(t);

    if (!fvFired && t >= 4800 + SHIFT) {
      fvFired = true;
      document.body.classList.add('intro-revealed');
      overlay.classList.add('is-page');
      startFV();
    }
    if (!handed && t >= 12150 + SHIFT) {
      handed = true;
      settleLines();                       /* hero 側が同一形状で引き継ぐ */
      needActors(0);
      overlay.classList.add('is-hiding');
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

  requestAnimationFrame(() => { raf = requestAnimationFrame(frame); });
  setTimeout(finish, 16000);

  window.__splashTimeline = { finish, seek(ms) { t0 = performance.now() - ms; } };
})();
