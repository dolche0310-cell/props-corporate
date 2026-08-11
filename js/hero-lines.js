/* ============ FV 右側グラフィック「2本の軌跡」 ============
   Figma 215:22653 の Rectangle 64 / 65 (277:37297 / 277:37298)。
   どちらも rx = 幅の半分の角丸矩形なので、実体は「丸端の直線」。
   ここでは矩形ではなく中心線を stroke で引く。

     Peach 277:37297  #FFE0D3  太さ 153.465
       (1156.257, 229.871) → ( 907.369, 604.707)   長さ 449.94
     Gray  277:37298  #E9E9E9  太さ 153.465
       (1557.436, -39.631) → (1174.917, 536.461)   長さ 691.52

   座標は Figma の 1440 フレームそのまま。SVG の viewBox も
   フレーム座標にしてあるので、下の数値は Figma の値と一致する。

   ■ 構造
   1本の <path> を cubic 1本で持ち、制御点を「線に対して垂直」へ
   ずらすことでたわませる。制御点が 0 のときは完全な直線 = Figma の
   最終状態。したがって最終形は必ず Figma に一致する。

   ■ 流れ (t は begin() からのミリ秒)
        0 -  900   Peach を描画。dashoffset を詰めながら太さを
                   種(スプラッシュのドット径)から 153.465 へ。
                   描き始めは少したわみ、描き終わりで直線に戻る。
      300 - 1200   Gray が追いかけて描画(スタガ 300ms)。
      900 - 2600   Peach の有機的な変形(1200)＋最終状態への収束(500)。
                   5つの状態を smoothstep で補間し、最後は必ず直線に戻る。
     1200 - 2900   Gray は 300ms 遅れて、変形量も小さく追従。
     2900 -        ごく弱い呼吸。6.5s 周期・±5px。

   sin 波は使わない。離散した状態を滑らかに繋いでいるだけなので
   規則的な波には見えない。 */
(() => {
  'use strict';

  const svg = document.querySelector('.hero__lines');
  if (!svg) return;

  /* Figma の実測値 */
  const LINES = [
    { el: svg.querySelector('.hl--peach'),
      a: { x: 1156.257, y: 229.871 }, b: { x: 907.369, y: 604.707 },
      w: 153.465, draw: 900, delay: 0,
      /* 変形の状態(制御点1, 制御点2 の垂直方向オフセット px) */
      states: [[0, 0], [-15, 9], [10, -14], [-6, 7], [0, 0]],
      breathe: [[0, 0], [5, -3], [-4, 5], [0, 0]] },
    { el: svg.querySelector('.hl--gray'),
      a: { x: 1557.436, y: -39.631 }, b: { x: 1174.917, y: 536.461 },
      w: 153.465, draw: 900, delay: 300,
      /* Peach より遅れて、量も小さい */
      states: [[0, 0], [9, -6], [-8, 9], [4, -5], [0, 0]],
      breathe: [[0, 0], [3, -2], [-3, 3], [0, 0]] }
  ];
  if (LINES.some((l) => !l.el)) return;

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
  /* 描画の緩急。軽快に出て終盤で静かに収まる。
     Gray が走り出す 300ms の時点で Peach が約42%描けている量
     (仕様の「35〜50%描かれたところから追いかける」に合わせた指数)。 */
  const easeDraw = (t) => 1 - Math.pow(1 - t, 1.35);

  const ORGANIC = 1200;      /* 有機的変形 */
  const SETTLE  = 500;       /* 最終状態への収束 */
  const BREATH  = 6500;      /* 呼吸の周期 */

  let seedW = 20;            /* 種の太さ(スプラッシュのドット径) */
  let t0 = null;
  let raf = 0;
  let started = false;
  let idle = false;          /* 呼吸フェーズに入ったか */

  const setFinal = () => {
    LINES.forEach((l) => {
      l.el.setAttribute('d', pathOf(l, 0, 0));
      l.el.style.strokeWidth = l.w;
      l.el.style.strokeDasharray = 'none';
      l.el.style.strokeDashoffset = '0';
      l.el.style.opacity = '1';
    });
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
        const bow = (1 - drawn) * 26;
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
      /* 太さは種から Figma の 153.465 へ。線が育つように見せる */
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
    /* スプラッシュ側がブロブ→2本の線まで描き切ったあとの受け渡し。
       描画フェーズを飛ばして最終形で現れ、以後は呼吸だけを続ける。
       settle() 直後のフレームが Figma の最終形そのものなので、
       受け渡しでスナップしない。 */
    settle() {
      if (started) return;
      started = true;
      if (REDUCED) { setFinal(); return; }
      setFinal();
      settled = true;
      settledAt = null;
      raf = requestAnimationFrame(breatheFrame);
    },
    /* 2本の線の画面上の実ジオメトリ(始点/終点/太さ)。
       スプラッシュがブロブの着地先を測るのに使う。 */
    geometry() {
      const m = svg.getScreenCTM();
      if (!m) return null;
      const pt = (x, y) => {
        const p = svg.createSVGPoint(); p.x = x; p.y = y;
        const s = p.matrixTransform(m);
        return { x: s.x, y: s.y };
      };
      return LINES.map((l) => ({
        a: pt(l.a.x, l.a.y), b: pt(l.b.x, l.b.y), w: l.w * m.a
      }));
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
  if (REDUCED) { setFinal(); return; }

  const auto = () => {
    if (document.getElementById('intro-overlay')) return;   /* スプラッシュに委ねる */
    setTimeout(() => api.begin(), 180);
  };
  if (document.body.classList.contains('fv-in')) auto();
  else document.addEventListener('miai:fv-in', auto, { once: true });
})();
