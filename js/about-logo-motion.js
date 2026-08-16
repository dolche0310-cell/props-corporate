/* ====== About の MiAI ロゴ: 円が文字を生み出す ======
   何もない白い余白から、小さな円が現れて左から右へ抜けていく。
   円が通り過ぎた少し後ろから、黒い字面がマスクの奥から立ち上がる。
   最後にその円自身が i のドットとして着地して完成する。

   ■ やらないこと
   ・輪郭を一筆書きでなぞる(ロゴ描画デモに見える)
   ・粒子/点の集合
   ・1文字ずつ順番に出す
   見えるのは「円」と「MiAI ロゴ」だけ。線は一切見せない。

   ■ 仕掛け
   1) 文字ごとに横へ開くマスク(白い矩形の幅)を持つ。円が到達した
      あたりから幅が伸び、字面が左から押し出されるように現れる。
      M の中央の谷も A の白い抜きも、この横の開きの中で自然に
      後から形になる(別々に組まない)。
   2) 開きと同時に、ごく小さな変形を効かせて収束させる。
      M は scaleX .94→1 と +10px の沈み、A は scaleX .96→1 と 1度の
      傾き、I は scaleY .85→1。最後は必ず正規ロゴと完全一致する。
   3) 文字どうしは 30% 前後重ねる。M が 7割できた頃に i、i が
      65% で A、A の終盤で I。左から右へ一つの波として伝わる。
   4) 円は各文字の開き始めにちょうど到達する。前の文字はまだ
      できあがっていないので、字面が円に引かれて追ってくる。

   ■ 時間軸(ms / 全体 1700)
        0- 100  何もない
      100- 220  円が現れる
      280- 740  M
      520- 860  i   (M が 76% のところで始まる)
      700-1120  A   (i が 77%)
      980-1300  I   (A が 86%)
     1300-1560  円が i のドットへ戻る
     1560-1680  着地の収まり(1.05→1.0)
   完成後はループしない。静止ロゴへ渡してステージを畳む。 */
(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const LW = 266.312;                        /* ロゴの座標系(mark と同じ) */
  const DOT = { x: 125.66, y: 10.55, r: 9.62 };   /* i のドット(実測) */
  const SWEEP_Y = -14;                       /* 抜けていく高さ(字の上) */
  const GUIDE_R = 11;

  /* 文字ごと: 開く範囲(左右に少し余白)と、収束させる微小な変形。
     x0/x1 は実測の外形から。M 0..94.6 / i 116..135.3 /
     A 146.8..235.9 / I 248.7..266.3 */
  const LETTERS = [
    { key: 'M', x0: -18,   x1: 98.6,  s: 280,  d: 460, sx: 0.94, ty: 10, rot: 0 },
    { key: 'i', x0: 112,   x1: 139.3, s: 520,  d: 340, sx: 1,    ty: 8,  rot: 0 },
    { key: 'A', x0: 142.8, x1: 239.9, s: 700,  d: 420, sx: 0.96, ty: 0,  rot: 1 },
    { key: 'I', x0: 244.7, x1: 272.3, s: 980,  d: 320, sx: 1,    ty: 0,  rot: 0, sy: 0.85 }
  ];

  const T = {
    inAt: 100, inDur: 120,
    toDot: 1300, toDotDur: 260,
    settle: 1560, settleDur: 120,
    total: 1720
  };

  /* 円の通り道。各文字が開き始める瞬間にちょうどその左端へ着く */
  const WAY = [
    [0, -30], [280, -18], [520, 112], [700, 142.8], [980, 244.7], [1300, 274]
  ];

  const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
  /* 動き出しは俊敏、止まる直前だけ丁寧に */
  const out3 = (t) => 1 - Math.pow(1 - clamp01(t), 3);
  /* 字面の開きはこれ。out3 だけだと時間 70% で見た目 97% まで進んで
     しまい、次の字が始まる頃には前の字が出来上がって見える
     (= 1文字ずつ順番に出しているのと同じになる)。等速を少し混ぜて、
     見た目の進み方をなだらかにする。俊敏さは変形と円の運びで出す。 */
  const reveal = (t) => { const u = clamp01(t); return u * 0.35 + out3(u) * 0.65; };
  const out4 = (t) => 1 - Math.pow(1 - clamp01(t), 4);
  /* 出入りを寝かせる。円の運びの合成に使う */
  const inOut = (t) => { const u = clamp01(t); return u * u * u * (u * (u * 6 - 15) + 10); };
  const lerp = (a, b, u) => a + (b - a) * u;

  /* 露出の先端に差すアクセント。A-2 は --color-primary が #0D0D0D
     なので、そのまま無彩色になる(色味だけが抜ける) */
  const ACCENT = (getComputedStyle(document.documentElement)
    .getPropertyValue('--color-primary') || '#FF2400').trim() || '#FF2400';
  const BAND = 58;                 /* オレンジが尾を引く長さ */

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

  /* 通り道を Catmull-Rom で通す。折れ点で速度が跳ねないようにする */
  const pathX = (t) => {
    const P = WAY;
    if (t <= P[0][0]) return P[0][1];
    if (t >= P[P.length - 1][0]) return P[P.length - 1][1];
    let i = 0;
    while (i < P.length - 2 && t > P[i + 1][0]) i++;
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1],
          p3 = P[Math.min(P.length - 1, i + 2)];
    const u = (t - p1[0]) / (p2[0] - p1[0]);
    const u2 = u * u, u3 = u2 * u;
    return 0.5 * ((2 * p1[1]) +
      (-p0[1] + p2[1]) * u +
      (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 +
      (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3);
  };

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
       ラッパの color を使うと別の色(#0F172A)になり、静止ロゴへ
       渡した瞬間に黒へ跳ねる */
    const fill = src.length ? getComputedStyle(src[0]).fill : 'rgb(0,0,0)';

    const letters = [];
    src.forEach((sp, i) => {
      const L = LETTERS[i];
      if (!L) return;
      let d = sp.getAttribute('d');

      /* i のドットは切り離す。最後に円そのものが担うので字面には出さない */
      if (L.key === 'i') {
        const subs = d.split(/(?=[Mm])/).filter((s) => s.trim());
        if (subs.length > 1) {
          const probe = document.createElementNS(NS, 'path');
          root.appendChild(probe);
          const boxes = subs.map((s) => {
            probe.setAttribute('d', s);
            return { s, h: probe.getBBox().height };
          });
          probe.remove();
          boxes.sort((a, b) => a.h - b.h);
          d = boxes.slice(1).map((o) => o.s).join(' ');
        }
      }

      /* 横へ開くマスク。線は見せない(見えるのは字面だけ) */
      const mid = 'lgm-' + i;
      const mask = document.createElementNS(NS, 'mask');
      mask.setAttribute('id', mid);
      mask.setAttribute('maskUnits', 'userSpaceOnUse');
      const rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', String(L.x0));
      rect.setAttribute('y', '-40');
      rect.setAttribute('height', '180');
      rect.setAttribute('width', '0');
      rect.setAttribute('fill', '#fff');
      mask.appendChild(rect);
      defs.appendChild(mask);

      /* 露出の先端に差すアクセント用。先頭が濃く、後ろへ尾を引く帯。
         x1/x2 を毎フレーム動かして先端に追従させる */
      const gid = 'lgg-' + i;
      const grad = document.createElementNS(NS, 'linearGradient');
      grad.setAttribute('id', gid);
      grad.setAttribute('gradientUnits', 'userSpaceOnUse');
      grad.setAttribute('y1', '0');
      grad.setAttribute('y2', '0');
      const s0 = document.createElementNS(NS, 'stop');
      s0.setAttribute('offset', '0'); s0.setAttribute('stop-color', '#000');
      const s1 = document.createElementNS(NS, 'stop');
      s1.setAttribute('offset', '1'); s1.setAttribute('stop-color', '#fff');
      grad.appendChild(s0); grad.appendChild(s1);
      defs.appendChild(grad);

      const wid = 'lgw-' + i;
      const wmask = document.createElementNS(NS, 'mask');
      wmask.setAttribute('id', wid);
      wmask.setAttribute('maskUnits', 'userSpaceOnUse');
      const wrect = document.createElementNS(NS, 'rect');
      wrect.setAttribute('x', String(L.x0 - BAND));
      wrect.setAttribute('y', '-40');
      wrect.setAttribute('width', String(L.x1 - L.x0 + BAND * 2));
      wrect.setAttribute('height', '180');
      wrect.setAttribute('fill', 'url(#' + gid + ')');
      wmask.appendChild(wrect);
      defs.appendChild(wmask);

      /* 微小な変形は外側、マスクは内側。変形が収まれば正規ロゴと一致する */
      const outer = document.createElementNS(NS, 'g');
      const inner = document.createElementNS(NS, 'g');
      inner.setAttribute('mask', 'url(#' + mid + ')');
      const glyph = document.createElementNS(NS, 'path');
      glyph.setAttribute('d', d);
      glyph.setAttribute('fill', fill);
      glyph.setAttribute('fill-rule', sp.getAttribute('fill-rule') || 'nonzero');
      inner.appendChild(glyph);

      /* 同じ字形をアクセント色で重ね、帯のマスクで先端だけ見せる。
         開き切ったら引いていくので、最後には正規の色だけが残る */
      const warmG = document.createElementNS(NS, 'g');
      warmG.setAttribute('mask', 'url(#' + wid + ')');
      const warm = glyph.cloneNode();
      warm.setAttribute('fill', ACCENT);
      warmG.appendChild(warm);
      inner.appendChild(warmG);

      outer.appendChild(inner);
      root.appendChild(outer);

      const b = sp.getBBox();
      letters.push({ L, rect, outer, grad, warmG,
        cx: b.x + b.width / 2, cy: b.y + b.height / 2, by: b.y + b.height });
    });

    const guide = document.createElementNS(NS, 'circle');
    guide.setAttribute('fill', ACCENT);
    guide.setAttribute('r', String(GUIDE_R));
    guide.setAttribute('cx', String(WAY[0][1]));
    guide.setAttribute('cy', String(SWEEP_Y));
    guide.style.opacity = '0';
    root.appendChild(guide);

    return { letters, guide, fill };
  };

  const play = (P, wrap, done) => {
    const { letters, guide, fill } = P;
    const ACC_RGB = toRGB(ACCENT), FILL_RGB = toRGB(fill);
    let raf = 0, t0 = 0, finished = false;

    const frame = (now) => {
      if (!t0) t0 = now;
      const t = now - t0;

      /* --- 字面: 横に開きながら、微小な変形が収まっていく --- */
      letters.forEach((o) => {
        const L = o.L;
        const p = reveal(clamp01((t - L.s) / L.d));
        o.rect.setAttribute('width', ((L.x1 - L.x0) * p).toFixed(2));
        /* アクセントの帯を露出の先端に置く。開き切ってから 320ms で
           じんわり引き、最後は正規の色だけが残る */
        const front = L.x0 + (L.x1 - L.x0) * p;
        o.grad.setAttribute('x1', (front - BAND).toFixed(2));
        o.grad.setAttribute('x2', front.toFixed(2));
        const warmFade = 1 - out3(clamp01((t - (L.s + L.d)) / 320));
        o.warmG.style.opacity = warmFade.toFixed(3);
        /* 変形は開きよりわずかに遅れて収める。字面が円に引かれて
           追ってくるように見せるための遅れ */
        const q = out4(clamp01((t - L.s) / (L.d * 1.25)));
        const sx = lerp(L.sx, 1, q);
        const sy = lerp(L.sy !== undefined ? L.sy : 1, 1, q);
        const ty = lerp(L.ty, 0, q);
        const rot = lerp(L.rot, 0, q);
        /* I の縦伸びだけは足元を軸にする。他は図形の中心 */
        const ax = o.cx, ay = (L.sy !== undefined) ? o.by : o.cy;
        o.outer.setAttribute('transform',
          'translate(' + ax.toFixed(2) + ' ' + (ay + ty).toFixed(2) + ')' +
          ' rotate(' + rot.toFixed(3) + ')' +
          ' scale(' + sx.toFixed(4) + ' ' + sy.toFixed(4) + ')' +
          ' translate(' + (-ax).toFixed(2) + ' ' + (-ay).toFixed(2) + ')');
      });

      /* --- 円 --- */
      const appear = out3(clamp01((t - T.inAt) / T.inDur));
      let cx, cy, r = GUIDE_R;
      if (t < T.toDot) {
        cx = pathX(t);
        cy = SWEEP_Y;
      } else {
        /* i のドットへ。前半は少し速く、終盤は長く引く。
           静止から始めるので出だしで位置が飛ばない */
        const mp = clamp01((t - T.toDot) / T.toDotDur);
        const m = inOut(mp) * 0.35 + out3(mp) * 0.65;
        cx = lerp(pathX(T.toDot), DOT.x, m);
        cy = lerp(SWEEP_Y, DOT.y, m);
        r = lerp(GUIDE_R, DOT.r * 1.05, m);
        if (t >= T.settle) {
          const sm = out4(clamp01((t - T.settle) / T.settleDur));
          r = lerp(DOT.r * 1.05, DOT.r, sm);
        }
      }
      /* 出現は scale .85→1 相当。半径で表す */
      guide.setAttribute('cx', cx.toFixed(2));
      guide.setAttribute('cy', cy.toFixed(2));
      guide.setAttribute('r', (r * lerp(0.85, 1, appear)).toFixed(2));
      guide.style.opacity = appear.toFixed(3);
      /* 走っている間はアクセント。ドットへ着地しながら正規の色へ
         連続で寄せる(差し替えないので途切れない) */
      const cu = out3(clamp01((t - T.toDot) / (T.toDotDur + T.settleDur)));
      guide.setAttribute('fill', mixRGB(ACC_RGB, FILL_RGB, cu));

      if (t >= T.total) {
        if (!finished) {
          finished = true;
          /* 円はドットと寸分違わぬ位置・大きさで止まっている。
             ここで静止ロゴへ渡しても見た目は1ピクセルも動かない */
          guide.setAttribute('cx', String(DOT.x));
          guide.setAttribute('cy', String(DOT.y));
          guide.setAttribute('r', String(DOT.r));
          letters.forEach((o) => {
            o.rect.setAttribute('width', String(o.L.x1 - o.L.x0));
            o.outer.removeAttribute('transform');
            o.warmG.style.opacity = '0';
          });
          guide.setAttribute('fill', fill);
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
