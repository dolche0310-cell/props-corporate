/* ====== About の MiAI ロゴ: ひとつの円が字を描き出す ======
   「黒い粒が集まってロゴになる」のはやめ、1個の円がロゴの骨格を
   なぞり、その通ったあとから字の面が現れる作りにする。
   最後にその円自身が i のドットとして着地するので、円が動いた結果
   MiAI という字が生まれた、と読める。

   ■ 仕掛け
   文字ごとに「骨格の線」を1本ずつ持ち、それを太い白の stroke として
   mask に入れる。stroke-dashoffset を詰めると、その文字の面だけが
   骨格に沿って現れる。mask は文字ごとに独立しているので、線が多少
   はみ出しても隣の字は出てこない。
   円は同じ骨格の上を getPointAtLength で走らせ、面の先端に置く。
   丸い線端のぶん(幅の半分)だけ手前を露出させるので、円が先、面が後。

   ■ 時間軸(ms / 全体 2000)
        0- 200  何も無い。静かな間
      200- 380  円が現れる(scale .85→1 / 濃度 0→1)
      380- 770  M。左下→左上→中央下→右上→右下
      880-1000  i の縦線
     1080-1420  A。左下→頂点→右下
     1530-1690  I
     1690-1880  円が i のドットへ寄って縮む
     1880-2000  着地の収まり(1.05→1.0)。ここで完成
   各文字の面は、円が走り切る時間の 1.18 倍かけて追いつく。つまり
   円が次の字へ移り始めても前の字はまだ描き終わっていない = 動きが
   繋がって見える。

   完成後はループしない。静止ロゴへ渡してステージを畳む。
   IntersectionObserver で一度だけ。開発用に window.__replayAboutLogo()。 */
(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';

  /* ロゴの座標系(mark の viewBox と同じ) */
  const LW = 266.312;

  /* i のドット(splash と同じ実測値) */
  const DOT = { x: 125.66, y: 10.55, r: 9.62 };

  /* 文字ごとの骨格。実測の外形に合わせて引いた中心線。
     M x0..94.6 / i x116..135 / A x147..236 / I x249..266 */
  const LETTERS = [
    { key: 'M', d: 'M8.5 96 L8.5 10 L47.3 74 L86 10 L86 96', w: 34, travel: 390 },
    { key: 'i', d: 'M125.7 34 L125.7 96',                     w: 24, travel: 120 },
    { key: 'A', d: 'M156 96 L191.4 6 L226.8 96',              w: 34, travel: 340 },
    { key: 'I', d: 'M257.5 3 L257.5 96',                      w: 24, travel: 160 }
  ];

  /* 進行の割り当て(ms)。字と字の間(渡り)にも十分な時間を置く。
     ここを詰めすぎると、離れた字へ移る一瞬だけ円が飛んで見える
     (A→I は 98 ある。50ms では 1 フレーム 60 以上動いてしまう)。 */
  const T = {
    inAt: 200, inDur: 180,
    starts: [380, 880, 1080, 1530],   /* 各文字の描き始め */
    dotAt: 1690, dotDur: 190,
    settleAt: 1880, settleDur: 120,
    total: 2000,
    catchUp: 1.18                     /* 面が円に追いつくまでの倍率 */
  };

  const GUIDE_R = 13;                 /* 描いている間の円の半径 */

  const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
  /* 立ち上がりが速く、終わりで丁寧に止まる。線を引く動きに使う */
  const outCubic = (t) => 1 - Math.pow(1 - clamp01(t), 3);
  /* 出入りともに寝かせる。円が字から字へ移るときに使う */
  const inOut = (t) => { const u = clamp01(t); return u * u * u * (u * (u * 6 - 15) + 10); };
  /* 着地はさらに長く引く */
  const outQuint = (t) => 1 - Math.pow(1 - clamp01(t), 5);
  const lerp = (a, b, u) => a + (b - a) * u;

  /* d 属性をサブパスへ分ける。i はドットが別のサブパスになっている */
  const splitSub = (d) => d.split(/(?=[Mm])/).filter((s) => s.trim());

  const build = (stage, mark) => {
    const k = 233.661 / LW;                    /* ステージへ載せる倍率 */
    const LX = 132.408, LY = 97.649;           /* ステージ内のロゴ矩形 */
    stage.setAttribute('viewBox', '0 0 498.476 280.393');
    stage.textContent = '';

    const defs = document.createElementNS(NS, 'defs');
    stage.appendChild(defs);

    const root = document.createElementNS(NS, 'g');
    root.setAttribute('transform',
      'translate(' + LX + ' ' + LY + ') scale(' + k.toFixed(6) + ')');
    stage.appendChild(root);

    const fill = getComputedStyle(mark).color || '#040404';
    const srcPaths = Array.from(mark.querySelectorAll('path'));

    /* 元の4本を、描く順(M → i → A → I)に並べ替える。
       id ではなく実測の x で判定するので、Figma 側の並びが変わっても効く */
    const byX = srcPaths.map((p) => ({ p, x: p.getBBox().x }))
      .sort((a, b) => a.x - b.x).map((o) => o.p);

    const letters = [];
    byX.forEach((src, i) => {
      const spec = LETTERS[i];
      if (!spec) return;
      let d = src.getAttribute('d');

      /* i はドットを切り離す。ドットは最後に円そのものが担うので、
         骨格の露出では出さない */
      if (spec.key === 'i') {
        const subs = splitSub(d);
        if (subs.length > 1) {
          const probe = document.createElementNS(NS, 'path');
          root.appendChild(probe);
          const boxes = subs.map((s) => {
            probe.setAttribute('d', s);
            const b = probe.getBBox();
            return { s, b };
          });
          probe.remove();
          /* 背の低いほうがドット */
          boxes.sort((a, b) => a.b.height - b.b.height);
          d = boxes.slice(1).map((o) => o.s).join(' ');
        }
      }

      /* 骨格 = mask の中の太い白線 */
      const mid = 'lgm-' + i;
      const mask = document.createElementNS(NS, 'mask');
      mask.setAttribute('id', mid);
      mask.setAttribute('maskUnits', 'userSpaceOnUse');
      const rev = document.createElementNS(NS, 'path');
      rev.setAttribute('d', spec.d);
      rev.setAttribute('stroke', '#fff');
      rev.setAttribute('stroke-width', String(spec.w));
      rev.setAttribute('stroke-linecap', 'round');
      rev.setAttribute('stroke-linejoin', 'round');
      rev.setAttribute('fill', 'none');
      mask.appendChild(rev);
      defs.appendChild(mask);

      const g = document.createElementNS(NS, 'g');
      g.setAttribute('mask', 'url(#' + mid + ')');
      const glyph = document.createElementNS(NS, 'path');
      glyph.setAttribute('d', d);
      glyph.setAttribute('fill', fill);
      glyph.setAttribute('fill-rule', src.getAttribute('fill-rule') || 'nonzero');
      g.appendChild(glyph);
      root.appendChild(g);

      /* 円を走らせるための骨格(描画はしない) */
      const rail = document.createElementNS(NS, 'path');
      rail.setAttribute('d', spec.d);
      rail.setAttribute('fill', 'none');
      rail.style.display = 'none';
      root.appendChild(rail);

      const len = rev.getTotalLength();
      rev.style.strokeDasharray = len;
      rev.style.strokeDashoffset = len;
      letters.push({ spec, rev, rail, len });
    });

    /* 導く円。最後に i のドットとしてそのまま残る */
    const guide = document.createElementNS(NS, 'circle');
    guide.setAttribute('fill', fill);
    guide.setAttribute('r', String(GUIDE_R));
    guide.setAttribute('cx', String(DOT.x));
    guide.setAttribute('cy', String(DOT.y));
    guide.style.opacity = '0';
    root.appendChild(guide);

    return { letters, guide, root };
  };

  const play = (P, wrap, done) => {
    const { letters, guide } = P;
    /* 円が字から字へ渡るときの出発点と到達点 */
    const at = (L, s) => {
      const p = L.rail.getPointAtLength(Math.max(0, Math.min(L.len, s)));
      return [p.x, p.y];
    };

    let raf = 0, t0 = 0, finished = false;

    const frame = (now) => {
      if (!t0) t0 = now;
      const t = now - t0;

      /* --- 円の出現 --- */
      const ap = clamp01((t - T.inAt) / T.inDur);
      const appear = outCubic(ap);

      /* --- 各文字の面。円が走る時間の catchUp 倍かけて追いつく --- */
      letters.forEach((L, i) => {
        const s = T.starts[i];
        const u = inOut(clamp01((t - s) / (L.spec.travel * T.catchUp)));
        L.rev.style.strokeDashoffset = (L.len * (1 - u)).toFixed(2);
      });

      /* --- 円の位置 --- */
      let cx, cy, r = GUIDE_R;
      const last = letters.length - 1;
      if (t < T.starts[0]) {
        /* 出現中は M の描き始めに待機 */
        const p = at(letters[0], 0);
        cx = p[0]; cy = p[1];
      } else if (t >= T.dotAt) {
        /* i のドットへ寄って縮む。前半速く、終盤で滑らかに減速 */
        const from = at(letters[last], letters[last].len);
        /* 前半は少し速く、終盤で長く減速。静止から始めるので
           出だしで位置が飛ばない(inOut と outCubic の合成) */
        const mp = clamp01((t - T.dotAt) / T.dotDur);
        const m = inOut(mp) * 0.35 + outCubic(mp) * 0.65;
        cx = lerp(from[0], DOT.x, m);
        cy = lerp(from[1], DOT.y, m);
        r = lerp(GUIDE_R, DOT.r * 1.05, m);
        if (t >= T.settleAt) {
          const sm = outQuint(clamp01((t - T.settleAt) / T.settleDur));
          r = lerp(DOT.r * 1.05, DOT.r, sm);
        }
      } else {
        /* どの文字を走っているか、あるいは字の間を渡っているか */
        let idx = 0;
        for (let i = 0; i < letters.length; i++) if (t >= T.starts[i]) idx = i;
        const L = letters[idx];
        const into = t - T.starts[idx];
        if (into <= L.spec.travel) {
          /* 円も面と同じ曲線。面の時計だけ遅いので、面が円を追い越さない */
          const p = at(L, L.len * inOut(into / L.spec.travel));
          cx = p[0]; cy = p[1];
        } else {
          /* 次の字へ渡る。出発は今の字の終点、到達は次の字の始点 */
          const nx = letters[idx + 1];
          const a = at(L, L.len);
          if (!nx) { cx = a[0]; cy = a[1]; }
          else {
            const b = at(nx, 0);
            const gapStart = T.starts[idx] + L.spec.travel;
            const gapDur = Math.max(1, T.starts[idx + 1] - gapStart);
            const m = inOut(clamp01((t - gapStart) / gapDur));
            cx = lerp(a[0], b[0], m);
            cy = lerp(a[1], b[1], m);
          }
        }
      }
      guide.setAttribute('cx', cx.toFixed(2));
      guide.setAttribute('cy', cy.toFixed(2));
      guide.setAttribute('r', r.toFixed(2));
      guide.style.opacity = appear.toFixed(3);

      if (t >= T.total) {
        if (!finished) {
          finished = true;
          /* 円はドットと寸分違わぬ位置・大きさで止まっている。
             ここで静止ロゴへ渡しても見た目は1ピクセルも動かない */
          guide.setAttribute('cx', String(DOT.x));
          guide.setAttribute('cy', String(DOT.y));
          guide.setAttribute('r', String(DOT.r));
          letters.forEach((L) => { L.rev.style.strokeDashoffset = '0'; });
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
    /* 開発確認用。毎回スクロールし直さずに見られるようにする */
    window.__replayAboutLogo = run;

    /* ピン留めに入った瞬間を起点にする。セクションが画面いっぱいに
       収まって「止まった」その時から描き始める。 */
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
        /* 止めるのは初回だけ。2回目からは普通に流す。
           解除は「変化する場所が画面の外」でしか行わない。 */
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
