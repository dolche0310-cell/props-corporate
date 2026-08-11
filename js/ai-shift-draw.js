/* ============ FV「AI Shift」ラインドロー描画 ============
   Figma の完成 Vector(254:27424 / 254:27428)は一切変えず、
   「文字を書く軌跡」= センターラインを別レイヤーで新規に作り、
   それを mask にして完成 Vector を露出させていく。

   完成 Vector 自体に stroke-dasharray を掛けると外周をなぞる動きに
   なってしまうため、その方式は使わない。

   構造:
     <svg>
       <defs><mask id><path(センターライン, 太い白stroke)/>…</mask></defs>
       <g mask="url(#id)"> Figmaの完成Vector </g>   ← 露出していく
       <g class="pen">      同じセンターライン(細い白) </g> ← ペン先
     </svg>

   センターラインは Figma に存在しない(字形はアウトライン化された面)ため、
   各グリフの骨格に沿って手で起こしている。座標は各SVGの viewBox 基準。  */
(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';

  /* 書き順と軌跡。d = 開始(ms) / u = 所要(ms) */
  const STROKES = {
    ai: [
      { d: 'M4.6 48.4 L20.8 4.2',                                   t: 0,   u: 260 }, // A 左下→頂点
      { d: 'M20.8 4.2 L37.4 48.4',                                  t: 100, u: 260 }, // A 頂点→右下
      { d: 'M20.7 34.7 l0.2 0', dot: true,                          t: 250, u: 150 }, // A 中央のドット
      { d: 'M54.1 3.2 L54.1 47.8',                                  t: 270, u: 230 }  // I 上→下
    ],
    shift: [
      { d: 'M29.5 11.5 C29.5 3.5 6.5 1.5 5.6 13.2 C4.8 23.4 28 21.8 28 33 C28 44.4 5 44.6 4.4 34.2', t: 380, u: 320 }, // S
      { d: 'M45.6 2.2 L45.6 48.2',                                  t: 520, u: 180 }, // h 縦
      { d: 'M45.6 20.5 C50.5 13.2 69.2 12.4 69.2 26.4 L69.2 48.2',  t: 620, u: 200 }, // h アーチ
      { d: 'M85.8 15.2 L85.8 48.2',                                 t: 650, u: 160 }, // i 縦
      { d: 'M85.8 4.8 l0.2 0', dot: true,                           t: 780, u: 100 }, // i ドット
      { d: 'M108.4 48.2 L108.4 12.4 C108.4 5.2 103.2 3.8 99.2 5.4', t: 750, u: 220 }, // f 縦
      { d: 'M97.6 15.4 L115.2 15.4',                                t: 900, u: 150 }, // f 横棒
      { d: 'M129.2 4.2 L129.2 42.4 C129.2 47.2 133 48.6 137.4 48.4', t: 850, u: 220 }, // t 縦
      { d: 'M121.8 15.4 L140.2 15.4',                               t: 990, u: 160 }  // t 横棒
    ]
  };

  /* 描き始めは FV の立ち上がり(body.fv-in)を待つ。読み込み直後に走らせると
     スプラッシュの幕の裏で描き終わってしまい、一度も見られない。
     カプセルは fv-in+520ms から 600ms かけて横に開く(ドットの受け渡しを
     受ける入り方)。成立しきってから描き始める。 */
  const AFTER_FV = 900;
  const SPEED = 0.9;
  const TOTAL = 1150 * SPEED;

  const build = (svg, strokes, uid) => {
    const defs = document.createElementNS(NS, 'defs');
    const mask = document.createElementNS(NS, 'mask');
    mask.setAttribute('id', uid);
    mask.setAttribute('maskUnits', 'userSpaceOnUse');

    const pen = document.createElementNS(NS, 'g');
    pen.setAttribute('class', 'kv-pen');

    strokes.forEach((s) => {
      /* マスク側: 完成字形を確実に覆えるよう太めに引く */
      const m = document.createElementNS(NS, 'path');
      m.setAttribute('d', s.d);
      m.setAttribute('class', s.dot ? 'kv-draw kv-draw--dot' : 'kv-draw');
      m.setAttribute('stroke', '#fff');
      m.setAttribute('stroke-width', '16');
      m.setAttribute('stroke-linecap', 'round');
      m.setAttribute('stroke-linejoin', 'round');
      m.setAttribute('fill', 'none');
      mask.appendChild(m);

      /* ペン先: 同じ軌跡を細い白で。描き終わったら消える */
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', s.d);
      p.setAttribute('class', s.dot ? 'kv-draw kv-draw--dot kv-pen__line' : 'kv-draw kv-pen__line');
      p.setAttribute('stroke', 'rgba(255,255,255,.8)');
      p.setAttribute('stroke-width', '1.3');
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('fill', 'none');
      pen.appendChild(p);

      [m, p].forEach((el) => {
        el.style.setProperty('--t', Math.round(s.t * SPEED) + 'ms');
        el.style.setProperty('--u', Math.round(s.u * SPEED) + 'ms');
      });
    });

    defs.appendChild(mask);
    svg.insertBefore(defs, svg.firstChild);

    /* 既存の完成Vectorをマスク付きグループへ包む(パスは書き換えない) */
    const art = document.createElementNS(NS, 'g');
    art.setAttribute('mask', 'url(#' + uid + ')');
    const originals = Array.from(svg.children).filter(
      (n) => n !== defs && n.tagName.toLowerCase() === 'path'
    );
    originals.forEach((n) => art.appendChild(n));
    svg.appendChild(art);
    svg.appendChild(pen);

    /* 接続後にパス長を測って dash を設定 */
    svg.querySelectorAll('.kv-draw').forEach((el) => {
      const len = el.getTotalLength();
      el.style.setProperty('--len', len.toFixed(1));
    });
  };

  const init = () => {
    const pills = document.querySelectorAll('.kv-pill');
    if (!pills.length) return;

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pills.forEach((p) => p.classList.add('is-drawn'));
      return;
    }

    pills.forEach((pill, i) => {
      const ai = pill.querySelector('.kv-pill__ai');
      const sh = pill.querySelector('.kv-pill__shift');
      if (!ai || !sh) return;
      build(ai, STROKES.ai, 'kvmask-ai-' + i);
      build(sh, STROKES.shift, 'kvmask-sh-' + i);
      pill.classList.add('is-ready');

      const draw = () => {
        if (pill.classList.contains('is-drawing') || pill.classList.contains('is-drawn')) return;
        pill.classList.add('is-drawing');
        /* 描き切ったら演出用レイヤーの存在を消し、完成形だけ残す */
        setTimeout(() => {
          pill.classList.add('is-drawn');
          pill.classList.remove('is-drawing');
        }, TOTAL + 250);
      };
      const start = () => setTimeout(draw, AFTER_FV);

      if (document.body.classList.contains('fv-in')) start();
      else document.addEventListener('miai:fv-in', start, { once: true });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
