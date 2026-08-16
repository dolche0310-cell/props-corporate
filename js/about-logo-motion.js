/* ====== About の MiAI ロゴ: 文字が立ち上がり、色が引いて収まる ======
   参考(coralcap.co)の見出しと同じ質感を狙う。
   何もない余白から、字が足元のマスクの奥から立ち上がる。出てきた
   ときはアクセント色で、収まりながら正規の色へ引いていく。

   ■ やらないこと
   ・円をペンのように動かす(ロゴ描画デモに見える)
   ・粒子/点の集合
   ・1文字ずつ止まって順番に出す
   i のドットはロゴの一部としてそのまま扱う(切り離さない)。
   足元から立ち上がるので、ドットは最後に姿を現す。

   ■ 仕掛け
   1) 文字ごとに、足元から上へ伸びるマスク(矩形の高さ)を持つ。
      字はその奥から現れる。M の中央の谷も A の白い抜きも、
      この立ち上がりの中で自然に形になる。
   2) 字そのものも少し下から上がる。マスクより 15% 遅く収まるので、
      マスクの縁の内側で字が動き続け、面が起き上がって見える。
   3) 塗りは中心から四方へ広がる。放射のグラデーションの境目を
      外へ送ることで、色づいた範囲がじんわり広がっていく。
      広がり切ったら塗りが引いて、最後は正規ロゴと一致する。
   4) 4文字は 130ms ずつずらすだけ。尺は全部同じなので、左から右へ
      一続きの波として渡る(止まって次、にはならない)。

   ■ 時間軸(ms / 全体 1400)
        0- 120  何もない
      120- 640  M
      250- 770  i
      380- 900  A
      510-1030  I
      300-1060  塗りが中心から四方へ広がる
     1060-1520  塗りが引いて正規の色に収まる
   完成後はループしない。静止ロゴへ渡してステージを畳む。 */
(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const LW = 266.312;                    /* ロゴの座標系(mark と同じ) */

  /* 立ち上がりの尺と間隔。全文字とも同じ尺で 130ms ずつずらす */
  const DUR = 520;
  const STEP = 130;
  const START = 120;
  const RISE = 0.17;                     /* 字が下から上がる量(高さ比) */
  /* 塗りは中心から四方へ広がる波。放射のグラデーションの
     「白と黒の境目」を外へ送ることで、塗られた範囲が広がる。
     SOFT が境目のぼけ幅で、これが「じんわり」の効き具合。 */
  const WAVE_AT = 300, WAVE_DUR = 760, WAVE_SOFT = 0.30;
  const TINT_OUT_AT = 1060, TINT_OUT_DUR = 460;   /* 塗りが正規色へ収まる */
  const TOTAL = 1560;

  const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
  /* 立ち上がりは俊敏に出て、止まる直前だけ丁寧に */
  const out4 = (t) => 1 - Math.pow(1 - clamp01(t), 4);
  const out3 = (t) => 1 - Math.pow(1 - clamp01(t), 3);
  const lerp = (a, b, u) => a + (b - a) * u;

  const ACCENT = (getComputedStyle(document.documentElement)
    .getPropertyValue('--color-primary') || '#FF2400').trim() || '#FF2400';


  const build = (stage, mark) => {
    const k = 233.661 / LW;
    const LX = 132.408, LY = 97.649;
    stage.setAttribute('viewBox', '0 0 498.476 280.393');
    stage.textContent = '';

    const defs = document.createElementNS(NS, 'defs');
    stage.appendChild(defs);
    const root = document.createElementNS(NS, 'g');
    root.setAttribute('transform',
      'translate(' + LX + ' ' + LY + ') scale(' + k.toFixed(6) + ')');
    stage.appendChild(root);

    /* 左から右の並びで取る。Figma 側の順序が変わっても効く */
    const src = Array.from(mark.querySelectorAll('path'))
      .map((p) => ({ p, x: p.getBBox().x }))
      .sort((a, b) => a.x - b.x).map((o) => o.p);
    /* 字面の色は静止ロゴのパスが実際に塗っている色をそのまま使う。
       ラッパの color を使うと別の色になり、渡した瞬間に跳ねる */
    const fill = src.length ? getComputedStyle(src[0]).fill : 'rgb(0,0,0)';

    /* ロゴ全体の外形。塗りの波の中心と、端まで届く半径を出す */
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    src.forEach((p) => { const b = p.getBBox();
      bx0 = Math.min(bx0, b.x); by0 = Math.min(by0, b.y);
      bx1 = Math.max(bx1, b.x + b.width); by1 = Math.max(by1, b.y + b.height); });
    const CX = (bx0 + bx1) / 2, CY = (by0 + by1) / 2;
    const RMAX = Math.hypot(bx1 - CX, by1 - CY);

    /* 中心から広がる塗りのマスク(全文字で共有)。
       内側 = 白(塗られた) / 外側 = 黒(まだ)。境目を外へ送る */
    const wave = document.createElementNS(NS, 'radialGradient');
    wave.setAttribute('id', 'lgw');
    wave.setAttribute('gradientUnits', 'userSpaceOnUse');
    wave.setAttribute('cx', CX.toFixed(2));
    wave.setAttribute('cy', CY.toFixed(2));
    wave.setAttribute('r', RMAX.toFixed(2));
    const w0 = document.createElementNS(NS, 'stop');
    w0.setAttribute('offset', '0'); w0.setAttribute('stop-color', '#fff');
    const w1 = document.createElementNS(NS, 'stop');
    w1.setAttribute('offset', '0'); w1.setAttribute('stop-color', '#fff');
    const w2 = document.createElementNS(NS, 'stop');
    w2.setAttribute('offset', '0'); w2.setAttribute('stop-color', '#000');
    wave.appendChild(w0); wave.appendChild(w1); wave.appendChild(w2);
    defs.appendChild(wave);

    const wmask = document.createElementNS(NS, 'mask');
    wmask.setAttribute('id', 'lgwm');
    wmask.setAttribute('maskUnits', 'userSpaceOnUse');
    const wrect = document.createElementNS(NS, 'rect');
    wrect.setAttribute('x', (CX - RMAX * 1.6).toFixed(2));
    wrect.setAttribute('y', (CY - RMAX * 1.6).toFixed(2));
    wrect.setAttribute('width', (RMAX * 3.2).toFixed(2));
    wrect.setAttribute('height', (RMAX * 3.2).toFixed(2));
    wrect.setAttribute('fill', 'url(#lgw)');
    wmask.appendChild(wrect);
    defs.appendChild(wmask);

    const letters = [];
    src.forEach((sp, i) => {
      const b = sp.getBBox();
      /* 足元から上へ伸びるマスク。左右と足元に少しだけ余白を取る */
      const mid = 'lgm-' + i;
      const mask = document.createElementNS(NS, 'mask');
      mask.setAttribute('id', mid);
      mask.setAttribute('maskUnits', 'userSpaceOnUse');
      const rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', (b.x - 8).toFixed(2));
      rect.setAttribute('width', (b.width + 16).toFixed(2));
      rect.setAttribute('height', '0');
      rect.setAttribute('fill', '#fff');
      mask.appendChild(rect);
      defs.appendChild(mask);

      const outer = document.createElementNS(NS, 'g');   /* 字の上下移動 */
      const inner = document.createElementNS(NS, 'g');   /* 立ち上がりのマスク */
      inner.setAttribute('mask', 'url(#' + mid + ')');
      const glyph = document.createElementNS(NS, 'path');
      glyph.setAttribute('d', sp.getAttribute('d'));
      glyph.setAttribute('fill', fill);
      glyph.setAttribute('fill-rule', sp.getAttribute('fill-rule') || 'nonzero');
      inner.appendChild(glyph);

      /* 同じ字形をアクセント色でもう1枚。放射のマスクで、中心から
         広がった範囲だけが色づく。最後に引いて正規色だけが残る */
      const tintG = document.createElementNS(NS, 'g');
      tintG.setAttribute('mask', 'url(#lgwm)');
      const tint = glyph.cloneNode();
      tint.setAttribute('fill', ACCENT);
      tintG.appendChild(tint);
      inner.appendChild(tintG);

      outer.appendChild(inner);
      root.appendChild(outer);

      const bottom = b.y + b.height + 6;
      const top = b.y - 6;
      letters.push({
        rect, outer, glyph, tintG,
        s: START + STEP * i,
        top, bottom, h: bottom - top,
        rise: b.height * RISE
      });
    });

    return { letters, fill, w1, w2 };
  };

  const play = (P, wrap, done) => {
    const { letters, fill, w1, w2 } = P;
    let raf = 0, t0 = 0, finished = false;

    const frame = (now) => {
      if (!t0) t0 = now;
      const t = now - t0;

      letters.forEach((L) => {
        /* 足元から上へ。マスクは俊敏に伸びる */
        const p = out4(clamp01((t - L.s) / DUR));
        const h = L.h * p;
        L.rect.setAttribute('y', (L.bottom - h).toFixed(2));
        L.rect.setAttribute('height', h.toFixed(2));

        /* 字はマスクより 15% 遅く収まる。マスクの縁の内側で字が
           動き続けるので、面が起き上がって見える */
        const q = out3(clamp01((t - L.s) / (DUR * 1.15)));
        const ty = lerp(L.rise, 0, q);
        L.outer.setAttribute('transform', 'translate(0 ' + ty.toFixed(2) + ')');

      });

      /* 塗りの波。中心から四方へ、境目をぼかしながら広がる */
      const wp = out3(clamp01((t - WAVE_AT) / WAVE_DUR));
      const front = lerp(-WAVE_SOFT, 1 + WAVE_SOFT, wp);
      w1.setAttribute('offset', clamp01(front).toFixed(4));
      w2.setAttribute('offset', clamp01(front + WAVE_SOFT).toFixed(4));

      /* 広がり切ったら、塗りがじんわり引いて正規の色に収まる */
      const fade = 1 - out3(clamp01((t - TINT_OUT_AT) / TINT_OUT_DUR));
      letters.forEach((L) => { L.tintG.style.opacity = fade.toFixed(3); });

      if (t >= TOTAL) {
        if (!finished) {
          finished = true;
          /* 到達値を確定させてから静止ロゴへ渡す。位置も色も同じなので
             受け渡しで1ピクセルも動かない */
          letters.forEach((L) => {
            L.rect.setAttribute('y', L.top.toFixed(2));
            L.rect.setAttribute('height', L.h.toFixed(2));
            L.outer.removeAttribute('transform');
            L.glyph.setAttribute('fill', fill);
            L.tintG.style.opacity = '0';
          });
          wrap.classList.add('is-done');
          done();
        }
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); };
  };

  const init = () => {
    const wrap = document.querySelector('[data-miai-logo]');
    const stage = wrap && wrap.querySelector('.abt__logo-fx');
    const mark = wrap && wrap.querySelector('.abt__logo-mark');
    if (!wrap || !stage || !mark) return;

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      wrap.classList.add('is-done');
      return;
    }

    let stop = null;
    const run = () => {
      if (stop) stop();
      wrap.classList.remove('is-done');
      const P = build(stage, mark);
      wrap.classList.add('is-playing');
      stop = play(P, wrap, () => { stop = null; });
    };
    window.__replayAboutLogo = run;

    /* ピン留めに入った瞬間を起点にする */
    const scroller = document.getElementById('about-scroller');
    const pinEl = scroller && scroller.querySelector('.abt-pin');
    if (scroller && pinEl && window.__miaiOnScroll &&
        matchMedia('(min-width: 768px)').matches) {
      let fired = false, unpinned = false, collapsed = false;
      window.__miaiOnScroll(() => {
        const r = scroller.getBoundingClientRect();
        if (!fired) {
          if (r.top > 0) return;
          fired = true;
          run();
          return;
        }
        /* 止めるのは初回だけ。解除は変化する場所が画面の外のときだけ */
        if (!unpinned && r.bottom <= 0) {
          unpinned = true;
          scroller.classList.add('is-unpinned');
          return;
        }
        if (unpinned && !collapsed) {
          const p = pinEl.getBoundingClientRect();
          if (p.bottom >= innerHeight) {
            collapsed = true;
            scroller.classList.add('is-collapsed');
          }
        }
      });
      return;
    }

    if (!('IntersectionObserver' in window)) { run(); return; }
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        run();
      });
    }, { threshold: .2 });
    io.observe(wrap);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
