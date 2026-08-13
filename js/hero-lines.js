/* ============ FV 右のモチーフ ============
   Figma 215:22653 / Group 148 (399:76725)。フレーム x848 y243 の 482x340。

     Rectangle 64 / 65  rx = 幅の半分 = 丸端カプセル。
       Figma は rect(x, 0, 88.7769, 349.061) を rotate(33.5838, x, 0)。
       これを解いた中心線(フレーム座標):
         A  (909.53, 521.37) → (1053.51, 304.53)
         B  (1097.53, 521.37) → (1241.51, 304.53)
       太さはどちらも 88.7769。
     Rectangle 66  89x90 の円 → 中心 (1285.50, 522.00) r44.5。

   ■ 構造
   カプセルは矩形ではなく中心線を stroke で引く。1本の cubic で持ち、
   制御点を「線に対して垂直」へずらすことでたわませる。制御点が 0 の
   ときは厳密な直線 = Figma の最終状態。したがって最終形は必ず一致する。
   円は半径だけを動かす。

   ■ 流れ (t は begin() からのミリ秒)
        0 -  820   A を描画。dashoffset を詰めながら太さを種(スプラッシュ
                   のドット径)から 88.7769 へ。描き終わりで直線に戻る。
      260 - 1080   B が追いかけて描画(スタガ 260ms)。
      560 -  980   円が湧く(遅れて、弾みは弱く)。
      820 - 2300   A の有機的な変形(1100)＋最終状態への収束(380)。
     1080 - 2560   B は遅れて、変形量も小さく追従。
     2560 -        ごく弱い呼吸。6.5s 周期・±4px。

   sin 波は使わない。離散した状態を滑らかに繋いでいるだけなので
   規則的な波には見えない。 */
(() => {
  'use strict';

  const svg = document.querySelector('.hero__motif');
  if (!svg) return;

  const W = 88.7769;

  /* Figma を解いた実測値 */
  const LINES = [
    { el: svg.querySelector('.hm--a'),
      a: { x: 909.53, y: 521.37 }, b: { x: 1053.51, y: 304.53 },
      w: W, draw: 820, delay: 0,
      /* 変形の状態(制御点1, 制御点2 の垂直方向オフセット px) */
      states: [[0, 0], [-11, 7], [8, -10], [-4, 5], [0, 0]],
      breathe: [[0, 0], [4, -2], [-3, 4], [0, 0]] },
    { el: svg.querySelector('.hm--b'),
      a: { x: 1097.53, y: 521.37 }, b: { x: 1241.51, y: 304.53 },
      w: W, draw: 820, delay: 260,
      /* A より遅れて、量も小さい */
      states: [[0, 0], [7, -5], [-6, 7], [3, -4], [0, 0]],
      breathe: [[0, 0], [3, -2], [-2, 3], [0, 0]] }
  ];
  const DOT = { el: svg.querySelector('.hm--dot'), cx: 1285.50, cy: 522.00, r: 44.5,
                t0: 560, dur: 420 };
  if (LINES.some((l) => !l.el) || !DOT.el) return;

  /* 各線の単位ベクトルと法線 */
  LINES.forEach((l) => {
    const dx = l.b.x - l.a.x, dy = l.b.y - l.a.y;
    l.len = Math.hypot(dx, dy);
    l.n = { x: -dy / l.len, y: dx / l.len };   /* 進行方向の法線 */
  });

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 制御点を法線方向へ o1 / o2 だけずらした cubic。
     o1 = o2 = 0 のとき厳密な直線 = Figma の最終状態。 */
  const pathOf = (l, o1, o2) => {
    const c1x = l.a.x + (l.b.x - l.a.x) / 3 + l.n.x * o1;
    const c1y = l.a.y + (l.b.y - l.a.y) / 3 + l.n.y * o1;
    const c2x = l.a.x + (l.b.x - l.a.x) * 2 / 3 + l.n.x * o2;
    const c2y = l.a.y + (l.b.y - l.a.y) * 2 / 3 + l.n.y * o2;
    return 'M' + l.a.x.toFixed(2) + ' ' + l.a.y.toFixed(2) +
           'C' + c1x.toFixed(2) + ' ' + c1y.toFixed(2) +
           ',' + c2x.toFixed(2) + ' ' + c2y.toFixed(2) +
           ',' + l.b.x.toFixed(2) + ' ' + l.b.y.toFixed(2);
  };

  const smooth = (t) => t * t * (3 - 2 * t);
  const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
  /* 状態列を位置 u(0..1) で補間 */
  const sample = (states, u) => {
    const n = states.length - 1;
    const p = clamp01(u) * n;
    const i = Math.min(Math.floor(p), n - 1);
    const f = smooth(p - i);
    return [states[i][0] + (states[i + 1][0] - states[i][0]) * f,
            states[i][1] + (states[i + 1][1] - states[i][1]) * f];
  };
  /* 描画の緩急。軽快に出て終盤で静かに収まる */
  const easeDraw = (t) => 1 - Math.pow(1 - t, 1.35);

  const ORGANIC = 1100;      /* 有機的変形 */
  const SETTLE  = 380;       /* 最終状態への収束 */
  const BREATH  = 6500;      /* 呼吸の周期 */

  let seedW = 20;            /* 種の太さ(スプラッシュのドット径) */
  let t0 = null;
  let raf = 0;
  let started = false;
  let idle = false;          /* 呼吸フェーズに入ったか */

  const setDot = (r, alpha) => {
    DOT.el.setAttribute('r', r.toFixed(2));
    DOT.el.style.opacity = alpha.toFixed(3);
  };

  const setFinal = () => {
    LINES.forEach((l) => {
      l.el.setAttribute('d', pathOf(l, 0, 0));
      l.el.style.strokeWidth = l.w;
      l.el.style.strokeDasharray = 'none';
      l.el.style.strokeDashoffset = '0';
      l.el.style.opacity = '1';
    });
    setDot(DOT.r, 1);
  };

  const frame = (now) => {
    if (t0 === null) t0 = now;
    const t = now - t0;
    let running = false;

    LINES.forEach((l) => {
      const lt = t - l.delay;
      if (lt < 0) { l.el.style.opacity = '0'; running = true; return; }
      l.el.style.opacity = '1';

      /* --- 1) 描画 --- */
      const dp = clamp01(lt / l.draw);
      const drawn = easeDraw(dp);

      /* --- 2) たわみ --- */
      let o1 = 0, o2 = 0;
      if (dp < 1) {
        /* 描いている間はゆるく弓なり。描き終わりで 0 に戻る */
        const bow = (1 - drawn) * 20;
        o1 = bow; o2 = bow * 0.45;
        running = true;
      } else {
        const ot = lt - l.draw;
        if (ot < ORGANIC + SETTLE) {
          const s = sample(l.states, ot / (ORGANIC + SETTLE));
          o1 = s[0]; o2 = s[1];
          running = true;
        } else if (!REDUCED) {
          /* --- 3) 呼吸。気づかれない程度に --- */
          const u = ((ot - ORGANIC - SETTLE) / BREATH) % 1;
          const s = sample(l.breathe, u);
          o1 = s[0]; o2 = s[1];
          idle = true;
          running = true;
        }
      }

      l.el.setAttribute('d', pathOf(l, o1, o2));
      /* 太さは種から Figma の 88.7769 へ。線が育つように見せる */
      l.el.style.strokeWidth = dp < 1 ? (seedW + (l.w - seedW) * drawn) : l.w;

      if (dp < 1) {
        const total = l.el.getTotalLength();
        l.el.style.strokeDasharray = total;
        l.el.style.strokeDashoffset = total * (1 - drawn);
      } else {
        l.el.style.strokeDasharray = 'none';
        l.el.style.strokeDashoffset = '0';
      }
    });

    /* --- 円。2本が育ったあと、遅れて静かに湧く --- */
    const dt = clamp01((t - DOT.t0) / DOT.dur);
    if (dt <= 0) { setDot(0.01, 0); running = true; }
    else {
      const e = smooth(dt);
      setDot(Math.max(0.01, DOT.r * e), e);
      if (dt < 1) running = true;
    }

    raf = running ? requestAnimationFrame(frame) : 0;
  };

  /* 画面外では呼吸を止める */
  let visible = true;
  let settled = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      if (visible && idle && !raf) {
        if (settled) settledAt = null;
        raf = requestAnimationFrame(settled ? breatheFrame : frame);
      }
      if (!visible && idle && raf) { cancelAnimationFrame(raf); raf = 0; }
    }, { threshold: 0 }).observe(svg);
  }

  const api = {
    /* スプラッシュのドットが着地すべき画面座標 */
    originScreen() {
      const m = svg.getScreenCTM();
      if (!m) return null;
      const p = svg.createSVGPoint();
      p.x = LINES[0].a.x; p.y = LINES[0].a.y;
      const s = p.matrixTransform(m);
      return { x: s.x, y: s.y, scale: m.a };
    },
    /* ドットの直径(画面px)を種の太さとして引き継ぐ */
    setSeedWidth(px) {
      const m = svg.getScreenCTM();
      if (m && m.a) seedW = Math.max(6, px / m.a);
    },
    begin() {
      if (started) return;          /* スプラッシュ経由と自走の二重起動を防ぐ */
      started = true;
      if (REDUCED) { setFinal(); return; }
      raf = requestAnimationFrame(frame);
    },
    /* スプラッシュ側が最終形まで描き切ったあとの受け渡し。
       描画フェーズを飛ばして最終形で現れ、以後は呼吸だけを続ける。 */
    settle() {
      if (started) return;
      started = true;
      if (REDUCED) { setFinal(); return; }
      setFinal();
      settled = true;
      settledAt = null;
      raf = requestAnimationFrame(breatheFrame);
    },
    /* モチーフの画面上の実ジオメトリ。スプラッシュが着地先を測るのに使う。
       円は「長さ0のカプセル」として返す(始点=終点)。受け側の
       capsuleOutline は L=0 のとき厳密な円になる。 */
    geometry() {
      const m = svg.getScreenCTM();
      if (!m) return null;
      const pt = (x, y) => {
        const p = svg.createSVGPoint(); p.x = x; p.y = y;
        const s = p.matrixTransform(m);
        return { x: s.x, y: s.y };
      };
      const out = LINES.map((l) => ({
        a: pt(l.a.x, l.a.y), b: pt(l.b.x, l.b.y), w: l.w * m.a
      }));
      const c = pt(DOT.cx, DOT.cy);
      out.push({ a: c, b: c, w: DOT.r * 2 * m.a });
      return out;
    }
  };

  /* settle 後の呼吸専用ループ(描画・有機変形はスプラッシュ側が済ませている) */
  let settledAt = null;
  const breatheFrame = (now) => {
    if (settledAt === null) settledAt = now;
    if (REDUCED) return;
    const u = ((now - settledAt) / BREATH) % 1;
    LINES.forEach((l) => {
      const s = sample(l.breathe, u);
      l.el.setAttribute('d', pathOf(l, s[0], s[1]));
    });
    idle = true;
    raf = requestAnimationFrame(breatheFrame);
  };
  window.__miaiHeroLines = api;

  /* 初期状態は非表示。スプラッシュの幕がある間はスプラッシュ側が
     settle() で受け渡してくるので自走しない。幕が無いページ(縮小
     モーション環境や直リンク後の再訪キャッシュ等)のみ自走する。 */
  LINES.forEach((l) => { l.el.style.opacity = '0'; });
  setDot(0.01, 0);
  if (REDUCED) { setFinal(); return; }

  const auto = () => {
    if (document.getElementById('intro-overlay')) return;   /* スプラッシュに委ねる */
    setTimeout(() => api.begin(), 180);
  };
  if (document.body.classList.contains('fv-in')) auto();
  else document.addEventListener('miai:fv-in', auto, { once: true });
})();
