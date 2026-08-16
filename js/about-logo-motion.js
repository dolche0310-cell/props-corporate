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
   3) 色はアクセントで出て、立ち上がりの後半から正規の色へ引く。
      塗りが後から入っていくように見える。最後は正規ロゴと一致。
   4) 4文字は 130ms ずつずらすだけ。尺は全部同じなので、左から右へ
      一続きの波として渡る(止まって次、にはならない)。

   ■ 時間軸(ms / 全体 1400)
        0- 120  何もない
      120- 640  M
      250- 770  i
      380- 900  A
      510-1030  I
      各文字は立ち上がりの 55% から 420ms かけて色が引く
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
  const TINT_AT = 0.55;                  /* 色が引き始める位置(尺の比) */
  const TINT_DUR = 420;
  const TOTAL = 1400;

  const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
  /* 立ち上がりは俊敏に出て、止まる直前だけ丁寧に */
  const out4 = (t) => 1 - Math.pow(1 - clamp01(t), 4);
  const out3 = (t) => 1 - Math.pow(1 - clamp01(t), 3);
  const lerp = (a, b, u) => a + (b - a) * u;

  const ACCENT = (getComputedStyle(document.documentElement)
    .getPropertyValue('--color-primary') || '#FF2400').trim() || '#FF2400';

  const toRGB = (c) => {
    const r = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(c);
    if (r) return [+r[1], +r[2], +r[3]];
    const m = /^#?([0-9a-f]{6})$/i.exec(c);
    if (!m) return [0, 0, 0];
    const n = parseInt(m[1], 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  };
  const mixRGB = (a, b, u) => 'rgb(' + Math.round(lerp(a[0], b[0], u)) + ',' +
    Math.round(lerp(a[1], b[1], u)) + ',' + Math.round(lerp(a[2], b[2], u)) + ')';

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
      glyph.setAttribute('fill', ACCENT);
      glyph.setAttribute('fill-rule', sp.getAttribute('fill-rule') || 'nonzero');
      inner.appendChild(glyph);
      outer.appendChild(inner);
      root.appendChild(outer);

      const bottom = b.y + b.height + 6;
      const top = b.y - 6;
      letters.push({
        rect, outer, glyph,
        s: START + STEP * i,
        top, bottom, h: bottom - top,
        rise: b.height * RISE
      });
    });

    return { letters, fill };
  };

  const play = (P, wrap, done) => {
    const { letters, fill } = P;
    const ACC = toRGB(ACCENT), DST = toRGB(fill);
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

        /* 色: アクセントで出て、立ち上がりの後半から正規の色へ引く */
        const c = out3(clamp01((t - (L.s + DUR * TINT_AT)) / TINT_DUR));
        L.glyph.setAttribute('fill', mixRGB(ACC, DST, c));
      });

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
