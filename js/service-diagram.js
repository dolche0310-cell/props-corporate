/* ============ Service 図解 Network Diagram のアニメーション ============
   完成状態は Figma 253:27126(Network Diagram / 642×395)。
   このスクリプトは「時間軸」だけを足す。位置・角度・寸法・配色には触らない。

   Figma 座標は SVG の transform 属性(内側の <g>)が持っていて、
   ここで付ける演出クラスは外側の <g> に載る。CSS の transform が
   Figma の translate/skew を上書きしないようにするための分離。

   時間軸(各要素の --d をここで配る):
     1) Particles      0.00-0.60s  粒子場がわずかに収束
     2) Line Draw      0.40-1.90s  中央 → 上部 → 左右 → 下部へ伝播
     3) Node Activation            線が到達した端点の Glow が点灯
     4) Cards          1.70-2.70s  CORE 周辺から外側へ連鎖
     5) CORE           2.60-3.55s  円 → 70%形成でラベル → 弱い Pulse 一度
   終了後は .is-done に切り替えて演出用 transform を明示的に解除し、
   完成状態を Figma と同一にする。

   粒子は図解自身のパスを getPointAtLength でサンプリングして作る。
   Figma の Particles / Dark(253:27116)は書き出しが gzip 後 588KB あり、
   装飾のために読ませる重さではないため、同じ密度感を実データから作る。

   IntersectionObserver で一度だけ再生。
   prefers-reduced-motion は完成状態を静止表示。 */
(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 線を引く順。中央 → 上部 → 左右 → 下部 */
  const LINE_ORDER = [
    's donut-core', 's core-doc mid', 's core-n9',
    'dash n2-n4', 's n1-donut', 's n2-avatar',
    's n5-doc left', 's doc right-n6', 'dash n7-n5',
    's n9-grid', 'dash bar card-n9'
  ];
  const LINE_BASE = 0.40, LINE_STEP = 0.085, LINE_DUR = 0.65;
  const CARD_BASE = 1.70, CARD_STEP = 0.10;
  const CORE_AT = 2.60, CORE_DUR = 0.35;
  const END_AT = 3.6;

  /* 要素のローカル座標を SVG ビューポート座標へ載せ替える */
  const toRoot = (el, x, y) => {
    const m = el.getCTM();
    return m ? { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }
             : { x: x, y: y };
  };
  const centerOf = (el) => {
    try { const b = el.getBBox(); return toRoot(el, b.x + b.width / 2, b.y + b.height / 2); }
    catch (e) { return null; }
  };

  document.querySelectorAll('[data-diagram]').forEach((stage) => {
    const svg = stage.querySelector('svg.dg');
    if (!svg) return;
    if (reduced) { stage.classList.add('is-done'); return; }

    const lines = Array.from(svg.querySelectorAll('.dg-line'));

    /* ---------- 2) 接続線: 伝播順に --d を配る ---------- */
    const delayOf = new Map();
    lines.forEach((p) => {
      let len = 0;
      try { len = p.getTotalLength(); } catch (e) { return; }
      const i = LINE_ORDER.indexOf(p.id);
      const d = LINE_BASE + (i < 0 ? lines.indexOf(p) : i) * LINE_STEP;
      p.style.setProperty('--len', len.toFixed(1));
      p.style.setProperty('--d', d.toFixed(3) + 's');
      delayOf.set(p, d);
    });

    /* ---------- 1) Particles: 線の実パス上からサンプリング ---------- */
    /* 乱数は固定シードにして、再読み込みで粒の配置が暴れないようにする */
    let seed = 20260810;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const COLORS = ['#FF5A3C', '#FF5A3C', '#B0B0B0', '#ffffff'];
    const dust = document.createElementNS(NS, 'g');
    dust.setAttribute('class', 'dg-dust');
    dust.setAttribute('aria-hidden', 'true');

    lines.forEach((p) => {
      let len = 0;
      try { len = p.getTotalLength(); } catch (e) { return; }
      const n = Math.max(8, Math.round(len / 9));
      for (let i = 0; i < n; i++) {
        const pt = p.getPointAtLength((i / n) * len);
        const q = toRoot(p, pt.x, pt.y);   /* 図解座標へ載せ替えて1つの層にまとめる */
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('class', 'dg-dot');
        c.setAttribute('r', (0.5 + rnd() * 0.9).toFixed(2));
        c.setAttribute('cx', q.x.toFixed(2));
        c.setAttribute('cy', q.y.toFixed(2));
        c.setAttribute('fill', COLORS[(rnd() * COLORS.length) | 0]);
        c.style.setProperty('--dx', ((rnd() - 0.5) * 26).toFixed(1) + 'px');
        c.style.setProperty('--dy', ((rnd() - 0.5) * 26).toFixed(1) + 'px');
        c.style.setProperty('--d', (rnd() * 0.5).toFixed(2) + 's');
        dust.appendChild(c);
      }
    });
    svg.insertBefore(dust, svg.firstChild);   /* ネットワークの背面 */

    /* ---------- 3) ノード: 最初に線が到達した時刻で点灯 ---------- */
    const ends = [];
    lines.forEach((p) => {
      let len = 0;
      try { len = p.getTotalLength(); } catch (e) { return; }
      [p.getPointAtLength(0), p.getPointAtLength(len)].forEach((pt) => {
        const q = toRoot(p, pt.x, pt.y);
        ends.push({ x: q.x, y: q.y, t: delayOf.get(p) + LINE_DUR });
      });
    });
    svg.querySelectorAll('.dg-ring, .dg-node').forEach((g) => {
      /* グループ全体ではなく、点ひとつずつを線の端点と突き合わせる */
      const leaves = Array.from(g.querySelectorAll('path, circle'));
      let best = Infinity, at = null;
      leaves.forEach((leaf) => {
        const c = centerOf(leaf);
        if (!c) return;
        ends.forEach((e) => {
          const dist = Math.hypot(c.x - e.x, c.y - e.y);
          if (dist < 14 && (at === null || e.t < at)) { at = e.t; }
          if (dist < best) best = dist;
        });
      });
      g.style.setProperty('--d', (at !== null ? at : LINE_BASE + 1.2).toFixed(3) + 's');
    });

    /* ---------- 4) カード: CORE に近い順 ---------- */
    const core = svg.querySelector('.dg-core');
    const cc = centerOf(core) || { x: 317.75, y: 214.75 };
    Array.from(svg.querySelectorAll('.dg-card'))
      .map((g) => {
        const c = centerOf(g) || { x: 0, y: 0 };
        return { g: g, dist: Math.hypot(c.x - cc.x, c.y - cc.y) };
      })
      .sort((a, b) => a.dist - b.dist)
      .forEach((item, i) => {
        item.g.style.setProperty('--d', (CARD_BASE + i * CARD_STEP).toFixed(3) + 's');
      });

    /* ---------- 5) CORE ---------- */
    if (core) core.style.setProperty('--d', CORE_AT + 's');
    const label = svg.querySelector('.dg-core-label');
    /* 円が約70%形成されたところでラベルを出す */
    if (label) label.style.setProperty('--d', (CORE_AT + CORE_DUR * 0.7).toFixed(3) + 's');

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      stage.classList.add('is-done');
      stage.classList.remove('is-play');
    };
    const play = () => {
      stage.classList.add('is-play');
      setTimeout(finish, END_AT * 1000);
    };

    if (!('IntersectionObserver' in window)) { play(); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        play();
        io.disconnect();
      });
    }, { threshold: 0.25 });
    io.observe(stage);
  });
})();
