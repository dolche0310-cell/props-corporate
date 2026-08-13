/* ============ FV モーションアイデンティティ ============
   「ONE FORM, INFINITE POSSIBILITIES」
   Figma 397:25889 のストーリーボード(下記18状態)を Keyframe とし、
   ひとつの赤い形が 分裂・接続・変形・回転・圧縮・展開 を繰り返す。
   状態間はアウトライン補間(64点)による SVG path morph。
   クロスフェードは使わない。分裂・合体も同じ補間で表す。

   ■ 状態列(座標は 1440x810 フレーム系 / すべて #FF2400)
     S04  ドット(709.5,292.5) r26.5          306:54534
     S05  ドットが沈む(709.5,423.5)          397:29827
     S06  ドットが跳ね上がる(709.5,192.5)    397:31094
     S07  2x2 の4ドット                      306:55849
     S08  2本の縦カプセル「‖」               397:28543
     S09  2本の斜めカプセル「⫽」(45°)        397:32361
     S10  1本の長い縦カプセル                397:60686
     S11  大円(703.5,399.5) r262.5 ← fv-in   397:63264
     S12  12ドットの円環(中心1125,377.5)     397:56808
     S13  散在する5つの円                    304:46481
     S14  絡む2つのリング(穴あき円環)        397:25916
     S15  ブロブ+円                          397:64620
     S16  H形+円                             397:55498
     S17  イコライザー(7要素)                397:65958
     S18a 中円(720.5,355.5) r117.5           397:65961
     S18b 巨大円(1139.5,355.5) r546.5        397:67289
     S19  N形                                304:49121
     S20  最終モチーフ(2カプセル+円) = Figma の FV 完成形
     → S04 へ収束してシームレスにループ

   ■ リズム
   遷移は短く軽快に、状態ごとに 溜め(hold) を置く。静→動→静。
   ease は3種(soft/bold/over)を使い分け、ジオメトリだけに
   わずかなオーバーシュートを掛ける(局所u=1で厳密に目標形へ)。

   ■ スプラッシュとの関係
   スプラッシュ(js/splash.js)がロゴ→粒子→ドットまでを演じ、
   start() でこのエンジンが S04 から引き継ぐ。S11 到達で
   'miai:morph-fv' を発火し FV の文字とヘッダーが立ち上がる。
   以後は止まらない(FV では強度を75%に落として永続ループ)。

   ■ 奥行きとマイクロモーション
   ステージ全体に perspective + rotateX/rotateY。ポインタに
   100〜300ms 遅れて ±2〜3° だけ追従し、離れると中央へ戻る。
   これとは別に周期の異なる2チャンネルの微小ドリフトを常時加算。
   スクロール 0〜15vh で scale/位置/不透明度をわずかに変え、
   次のセクションへ自然に接続する。

   prefers-reduced-motion: ループを止め、Figma の最終形(静的グループ)
   のみを表示する。 */
(() => {
  'use strict';

  const svg = document.querySelector('.hero__motif');
  if (!svg) return;
  const liveG = svg.querySelector('.hm-live');
  const staticG = svg.querySelector('.hm-static');
  const SHAPES = window.MIAI_MORPH_SHAPES;
  if (!liveG || !staticG || !SHAPES) return;

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLOR = (getComputedStyle(document.documentElement)
    .getPropertyValue('--color-primary') || '#FF2400').trim() || '#FF2400';

  /* ---------- アウトライン ---------- */
  const N = 64;
  const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
  const smooth = (t) => { const u = clamp01(t); return u * u * u * (u * (u * 6 - 15) + 10); };
  const lerp = (a, b, u) => a + (b - a) * u;

  const circle = (cx, cy, r) => {
    const p = [];
    for (let i = 0; i < N; i++) {
      const th = -Math.PI / 2 + (i / N) * Math.PI * 2;
      p.push([cx + Math.cos(th) * r, cy + Math.sin(th) * r]);
    }
    return p;
  };
  const capsule = (ax, ay, bx, by, r) => {
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
    if (L < 0.5) return circle((ax + bx) / 2, (ay + by) / 2, r);
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
    let top = 0;
    for (let i = 1; i < N; i++) if (pts[i][1] < pts[top][1]) top = i;
    return pts.slice(top).concat(pts.slice(0, top));
  };
  /* 図形 = {p, hole} */
  const S = (p, hole) => ({ p, hole: hole || null });
  const dotG = (cx, cy) => S(circle(cx, cy, 26.5));

  /* ---------- 状態列(Figma 実測値) ---------- */
  const EQY = 400;
  const STATES = [
    /* S04 */ { id: 's04', t: 496, e: 'soft', h: 120, list: [dotG(709.5, 292.5)] },
    /* S05 */ { id: 's05', t: 256, e: 'bold', h: 72,  list: [dotG(709.5, 423.5)] },
    /* S06 */ { id: 's06', t: 272, e: 'over', h: 96,  list: [dotG(709.5, 192.5)] },
    /* S07 */ { id: 's07', t: 336, e: 'soft', h: 160,
      list: [dotG(669.5, 308.5), dotG(768.5, 308.5), dotG(669.5, 393.5), dotG(768.5, 393.5)] },
    /* S08 */ { id: 's08', t: 304, e: 'soft', h: 128,
      list: [S(capsule(670.5, 272.5, 670.5, 431.5, 26.5)), S(capsule(769.5, 272.5, 769.5, 431.5, 26.5))] },
    /* S09 */ { id: 's09', t: 336, e: 'bold', h: 128,
      list: [S(capsule(778.68, 373.22, 891.12, 260.79, 26.5)),
             S(capsule(848.69, 443.22, 961.13, 330.79, 26.5))] },
    /* S10 */ { id: 's10', t: 336, e: 'soft', h: 160,
      list: [S(capsule(720.5, 115.5, 720.5, 587.5, 26.5))] },
    /* S11 */ { id: 's11', t: 416, e: 'bold', h: 256, fv: true,
      list: [S(circle(703.5, 399.5, 262.5))] },
    /* S12 12点円環 (中心1125,377.5 / 各r21.5) */ { id: 's12', t: 448, e: 'soft', h: 192,
      list: [[954.5,281.5],[1295.5,281.5],[954.5,473.5],[1295.5,473.5],[928.5,377.5],[1321.5,377.5],
             [1024.5,209.5],[1222.5,209.5],[1024.5,548.5],[1222.5,548.5],[1129.5,181.5],[1129.5,570.5]]
             .map(([x,y]) => S(circle(x, y, 21.5))) },
    /* S13 散在5円 */ { id: 's13', t: 448, e: 'soft', h: 192,
      list: [S(circle(414.5, 217.5, 21.5)), S(circle(1223.5, 482.5, 132.5)),
             S(circle(17.5, 243.5, 132.5)), S(circle(911.5, 256.5, 60.5)),
             S(circle(222.5, 712.5, 60.5))] },
    /* S14 リング2 (外r113.5 / 内r98.64) */ { id: 's14', t: 448, e: 'soft', h: 208,
      list: [S(circle(1044.5, 314.5, 113.5), circle(1044.5, 314.5, 98.64)),
             S(circle(1179.5, 314.5, 113.5), circle(1179.5, 314.5, 98.64))] },
    /* S15 ブロブ */ { id: 's15', t: 448, e: 'soft', h: 192,
      list: SHAPES.blob.map((p) => S(p)) },
    /* S16 H形 */ { id: 's16', t: 416, e: 'soft', h: 192,
      list: SHAPES.hshape.map((p) => S(p)) },
    /* S17 イコライザー(y中心400) */ { id: 's17', t: 448, e: 'soft', h: 208,
      list: [S(circle(888.39, EQY, 23.3)),
             S(capsule(963.22, EQY - 25.4, 963.22, EQY + 25.4, 23.7)),
             S(capsule(1037.72, EQY - 62.66, 1037.72, EQY + 62.66, 23.7)),
             S(capsule(1112.22, EQY - 100, 1112.22, EQY + 100, 23.7)),
             S(capsule(1186.74, EQY - 62.66, 1186.74, EQY + 62.66, 23.7)),
             S(capsule(1261.24, EQY - 25.4, 1261.24, EQY + 25.4, 23.7)),
             S(circle(1335.43, EQY, 23.3))] },
    /* S18a 中円 */ { id: 's18a', t: 384, e: 'soft', h: 112, list: [S(circle(720.5, 355.5, 117.5))] },
    /* S18b 巨大円 */ { id: 's18b', t: 496, e: 'bold', h: 208, list: [S(circle(1139.5, 355.5, 546.5))] },
    /* S19 N形 */ { id: 's19', t: 496, e: 'soft', h: 208, list: SHAPES.nshape.map((p) => S(p)) },
    /* S20 最終モチーフ = Figma FV 完成形 */ { id: 's20', t: 480, e: 'soft', h: 900,
      list: [S(capsule(909.53, 521.37, 1053.51, 304.53, 44.3885)),
             S(capsule(1097.53, 521.37, 1241.51, 304.53, 44.3885)),
             S(circle(1285.5, 522.0, 44.5))] }
  ];

  /* ---------- 対応付け(最近傍 + 余剰は合流) ---------- */
  const centroid = (p) => {
    let x = 0, y = 0;
    for (const q of p) { x += q[0]; y += q[1]; }
    return [x / p.length, y / p.length];
  };
  const buildPairs = (src, dst) => {
    const sc = src.map((s) => centroid(s.p));
    const dc = dst.map((s) => centroid(s.p));
    const used = new Array(src.length).fill(false);
    const pairs = [];
    dst.forEach((d, di) => {
      let best = 0, bd = Infinity;
      sc.forEach((c, si) => {
        const v = Math.hypot(c[0] - dc[di][0], c[1] - dc[di][1]);
        if (v < bd) { bd = v; best = si; }
      });
      used[best] = true;
      pairs.push([best, di, false]);
    });
    src.forEach((s, si) => {
      if (used[si]) return;
      let best = 0, bd = Infinity;
      dc.forEach((c, di) => {
        const v = Math.hypot(c[0] - sc[si][0], c[1] - sc[si][1]);
        if (v < bd) { bd = v; best = di; }
      });
      pairs.push([si, best, true]);        /* 合流(到達時に消える) */
    });
    return pairs.map(([si, di, merge]) => {
      const a = src[si], b = dst[di];
      let bestK = 0, bestE = Infinity;
      for (let k = 0; k < N; k += 2) {
        let e = 0;
        for (let i = 0; i < N; i += 4) {
          const p = a.p[(i + k) % N], q = b.p[i];
          e += (p[0] - q[0]) * (p[0] - q[0]) + (p[1] - q[1]) * (p[1] - q[1]);
        }
        if (e < bestE) { bestE = e; bestK = k; }
      }
      /* 穴: どちらかにあれば、無い側は中心の微小円から生える/へ消える */
      let hA = a.hole, hB = b.hole;
      if (hA || hB) {
        if (!hA) hA = circle(centroid(a.p)[0], centroid(a.p)[1], 0.6);
        if (!hB) hB = circle(centroid(b.p)[0], centroid(b.p)[1], 0.6);
      }
      /* 移動の弧: 重心の移動量に応じて直交方向へ膨らむ。
         図形ごとに交互の向きで、流れに渦のような有機性を出す */
      const ca = centroid(a.p), cb = centroid(b.p);
      const mvx = cb[0] - ca[0], mvy = cb[1] - ca[1];
      const dist = Math.hypot(mvx, mvy);
      let nx = 0, ny = 0;
      if (dist > 1) { nx = -mvy / dist; ny = mvx / dist; }
      const bulge = Math.min(64, dist * 0.13);
      return { a: a.p, b: b.p, k: bestK, hA, hB, merge, nx, ny, bulge };
    });
  };

  /* ---------- 描画 ---------- */
  const NSVG = 'http://www.w3.org/2000/svg';
  const pool = [];
  const needActors = (n) => {
    while (pool.length < n) {
      const el = document.createElementNS(NSVG, 'path');
      el.setAttribute('fill', COLOR);
      el.setAttribute('fill-rule', 'evenodd');
      liveG.appendChild(el);
      pool.push(el);
    }
    for (let i = 0; i < pool.length; i++) pool[i].style.display = i < n ? '' : 'none';
  };
  const ringOf = (pts) => {
    let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[(i - 1 + pts.length) % pts.length], p1 = pts[i],
            p2 = pts[(i + 1) % pts.length], p3 = pts[(i + 2) % pts.length];
      d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)
         + ',' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)
         + ',' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d + 'Z';
  };
  const drawShape = (el, pts, hole) => {
    el.setAttribute('d', ringOf(pts) + (hole ? ringOf(hole) : ''));
  };

  /* ---------- タイムライン ---------- */
  /* ease: ジオメトリのみオーバーシュート付き。u=1 で厳密に 1 */
  /* soft: 速く出て長い尾で絹のように収まる(sun-asterisk 参考)。
     bold/over: 山なりに加速し、わずかに行き過ぎて戻る。
     いずれも u=1 で厳密に 1(最終形は崩れない)。 */
  const geoEase = (u, kind, strength) => {
    const uu = clamp01(u);
    const base = kind === 'soft' ? 1 - Math.pow(1 - uu, 3.2) : smooth(uu);
    const s = (kind === 'bold' ? 1.5 : kind === 'over' ? 2.1 : 0.7) * strength;
    const v = uu - 1;
    return base + s * 0.045 * (v * v * v + v * v) * 6.75;
  };

  const total = STATES.reduce((a, s) => a + s.t + s.h, 0);
  let strength = 1;                 /* Splash 100% → FV idle 75% */
  let firstPassDone = false;
  let fvFired = false;

  let pairCache = null, pairKey = '';
  const tmp = new Array(N), tmpH = new Array(N);

  let nowRef = 0;
  const renderAt = (cycleT) => {
    /* cycleT(0..total) から現在の区間を決める */
    let acc = 0, idx = 0, into = 0;
    for (let i = 0; i < STATES.length; i++) {
      const seg = STATES[i].t + STATES[i].h;
      if (cycleT < acc + seg) { idx = i; into = cycleT - acc; break; }
      acc += seg;
      if (i === STATES.length - 1) { idx = 0; into = 0; }
    }
    const st = STATES[idx];
    const prev = STATES[(idx - 1 + STATES.length) % STATES.length];

    if (st.fv && !fvFired && into >= st.t * 0.62) {
      fvFired = true;
      document.dispatchEvent(new CustomEvent('miai:morph-fv'));
    }

    if (into >= st.t) {
      /* ホールド中も完全静止させない(sun-asterisk 参考)。
         各図形が位相をずらした呼吸(半径±1.2% + 2〜4pxのドリフト)を
         続ける。振幅は strength に従い、FV では一段静かになる */
      needActors(st.list.length);
      const bt = nowRef / 1000;
      st.list.forEach((s, i) => {
        const cx = s.cx !== undefined ? s.cx : (s.cx = centroid(s.p)[0]);
        const cy = s.cy !== undefined ? s.cy : (s.cy = centroid(s.p)[1]);
        const ph = i * 1.7;
        const w1 = smooth(0.5 + 0.5 * Math.sin(bt * 0.85 + ph));
        const w2 = smooth(0.5 + 0.5 * Math.sin(bt * 0.53 + ph * 2.3));
        const grow = 1 + (w1 - 0.5) * 0.024 * strength;
        const dx = (w2 - 0.5) * 6 * strength;
        const dy = (w1 - 0.5) * 4 * strength;
        for (let j = 0; j < N; j++) {
          tmp[j] = [cx + (s.p[j][0] - cx) * grow + dx, cy + (s.p[j][1] - cy) * grow + dy];
        }
        let hole = null;
        if (s.hole) {
          for (let j = 0; j < N; j++) {
            tmpH[j] = [cx + (s.hole[j][0] - cx) * grow + dx, cy + (s.hole[j][1] - cy) * grow + dy];
          }
          hole = tmpH;
        }
        drawShape(pool[i], tmp, hole);
        pool[i].style.opacity = '1';
      });
      return;
    }
    const key = prev.id + '>' + st.id;
    if (pairKey !== key) { pairCache = buildPairs(prev.list, st.list); pairKey = key; }
    const nPairs = pairCache.length;
    const stag = nPairs > 1 ? Math.min(64, (st.t * 0.18) / (nPairs - 1)) : 0;
    const actDur = st.t - stag * (nPairs - 1);
    needActors(nPairs);
    pairCache.forEach((pr, i) => {
      const local = clamp01((into - stag * i) / actDur);
      const ug = geoEase(local, st.e, strength);
      /* 弧: 中間で最大、両端で0。u=1 では必ず消える */
      const arc = pr.bulge * 4 * ug * (1 - ug) * (i % 2 ? -1 : 1) * strength;
      const ax = pr.nx * arc, ay = pr.ny * arc;
      for (let j = 0; j < N; j++) {
        const p = pr.a[(j + pr.k) % N], q = pr.b[j];
        tmp[j] = [lerp(p[0], q[0], ug) + ax, lerp(p[1], q[1], ug) + ay];
      }
      let hole = null;
      if (pr.hA) {
        for (let j = 0; j < N; j++) {
          const p = pr.hA[j], q = pr.hB[j];
          tmpH[j] = [lerp(p[0], q[0], ug), lerp(p[1], q[1], ug)];
        }
        hole = tmpH;
      }
      drawShape(pool[i], tmp, hole);
      /* 合流組は着地直前に静かに引く(重なりの版ズレを作らない) */
      pool[i].style.opacity = pr.merge ? String(1 - smooth(clamp01((local - 0.55) / 0.35))) : '1';
    });
  };

  /* ---------- マイクロモーション / 奥行き / スクロール ---------- */
  const sample2 = (states, u) => {
    const n = states.length - 1;
    const p = clamp01(u) * n;
    const i = Math.min(Math.floor(p), n - 1);
    const f = smooth(p - i);
    return [states[i][0] + (states[i + 1][0] - states[i][0]) * f,
            states[i][1] + (states[i + 1][1] - states[i][1]) * f];
  };
  const DRIFT_A = [[0, 0], [3.6, -2.2], [-2.8, 3.4], [1.8, -3.0], [0, 0]];   /* 7.3s */
  const DRIFT_B = [[0.5, -0.4], [-0.35, 0.3], [0.25, 0.45], [0.5, -0.4]];    /* 11.7s 回転/スケール */
  let tiltX = 0, tiltY = 0, tiltTX = 0, tiltTY = 0;
  const hero = document.querySelector('.hero--brushup') || svg.parentElement;
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const nx = clamp01((e.clientX - r.left) / r.width);
      const ny = clamp01((e.clientY - r.top) / r.height);
      tiltTY = (nx - 0.5) * 6;        /* rotateY ±3deg */
      tiltTX = (0.5 - ny) * 4;        /* rotateX ±2deg */
    });
    hero.addEventListener('pointerleave', () => { tiltTX = 0; tiltTY = 0; });
  }

  const applyStage = (now) => {
    /* ポインタへ遅れて追従(約180ms) */
    tiltX += (tiltTX - tiltX) * 0.055;
    tiltY += (tiltTY - tiltY) * 0.055;
    const a = sample2(DRIFT_A, (now % 7300) / 7300);
    const b = sample2(DRIFT_B, (now % 11700) / 11700);
    const k = strength;
    /* スクロール 0〜15vh: 次のセクションへ静かに接続 */
    const sv = clamp01(scrollY / (innerHeight * 0.15));
    const sc = (1 + b[1] * 0.006 * k) * (1 - 0.03 * sv);
    svg.style.transform =
      'perspective(1200px)' +
      ' rotateX(' + (tiltX + b[0] * 0.6 * k).toFixed(3) + 'deg)' +
      ' rotateY(' + (tiltY).toFixed(3) + 'deg)' +
      ' translate3d(' + (a[0] * k).toFixed(2) + 'px,' + (a[1] * k + 14 * sv).toFixed(2) + 'px,0)' +
      ' rotate(' + (b[0] * 0.5 * k).toFixed(3) + 'deg)' +
      ' scale(' + sc.toFixed(4) + ')';
    svg.style.opacity = String(1 - 0.08 * sv);
  };

  /* ---------- メインループ ---------- */
  let t0 = null, raf = 0, running = false;
  let pausedByVisibility = false;
  /* 開始位相: 1周目は S04 のホールドから始める(ラップ遷移 20→04 は
     2周目以降にだけ現れる)。スプラッシュのドットが既に S04 に居るため */
  const START_OFFSET = STATES[0].t;
  const frame = (now) => {
    if (t0 === null) t0 = now;
    let t = now - t0 + START_OFFSET;
    const cycleT = t % total;
    if (t >= total + START_OFFSET && !firstPassDone) { firstPassDone = true; strength = 0.75; }
    nowRef = now;
    renderAt(cycleT);
    applyStage(now);
    raf = requestAnimationFrame(frame);
  };

  /* 画面外では止める(ループは戻ったときに続きから) */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      const vis = es[0].isIntersecting;
      if (!vis && raf) { cancelAnimationFrame(raf); raf = 0; pausedByVisibility = true; }
      else if (vis && running && pausedByVisibility && !raf) {
        pausedByVisibility = false;
        t0 = null;                     /* 復帰時は続きの位相から */
        raf = requestAnimationFrame(frame);
      }
    }, { threshold: 0 }).observe(svg);
  }

  const showStatic = () => {
    staticG.style.display = '';
    liveG.style.display = 'none';
  };

  const api = {
    /* スプラッシュのドットが着地する S04 の画面座標 */
    pointScreen(x, y) {
      const m = svg.getScreenCTM();
      if (!m) return null;
      const p = svg.createSVGPoint(); p.x = x; p.y = y;
      const s = p.matrixTransform(m);
      return { x: s.x, y: s.y, scale: m.a };
    },
    start() {
      if (running) return;
      running = true;
      if (REDUCED) { showStatic(); document.dispatchEvent(new CustomEvent('miai:morph-fv')); return; }
      staticG.style.display = 'none';
      liveG.style.display = '';
      raf = requestAnimationFrame(frame);
    }
  };
  window.__miaiHeroMorph = api;

  /* 初期状態: 静的グループ(= Figma 最終形)は JS 到達時点で隠し、
     スプラッシュからの start() を待つ。幕が無い環境では自走。 */
  if (REDUCED) { showStatic(); return; }
  staticG.style.display = 'none';
  if (!document.getElementById('intro-overlay')) {
    document.body.classList.contains('fv-in')
      ? api.start()
      : document.addEventListener('miai:fv-in', () => api.start(), { once: true });
  }
})();
