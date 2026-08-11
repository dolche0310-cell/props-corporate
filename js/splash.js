/* ====== スプラッシュ(Figma 257:27678) ======
   時間軸の大半は css/style.css の .is-run 配下の delay 群が持つ。
   ここでは 開始 / ドット→カプセルの実座標受け渡し / FV の開始 /
   幕の後始末 だけを行う。

     0.20-1.05  MiAI が静かに立ち上がる(26pxのライズ + ぼけの解像)
     1.05-1.30  ロゴ完成の間
     1.30-1.55  i のドットにオレンジが灯る(黒い点は文字側の1つだけ)
     1.55-1.95  文字が粒に散る。オレンジのドットは残る
     1.95-2.15  ドットだけの間
     2.15-2.28  沈み込み(予備動作)
     2.28-3.20  ドットが弧を描いて FV のカプセルの実座標へ移動しながら
                横に伸びる(ここで WAAPI 駆動)
     2.75       幕の白が抜け始め、fv-in。背景では円群が回転しながら合体
     3.20-3.45  伸びたドットが実カプセルに重なって消える(受け渡し)
     3.65       幕を除去

   prefers-reduced-motion はスプラッシュ自体を出さない。
   保険として 7s で必ず幕を落とす。 */
(() => {
  'use strict';

  const overlay = document.getElementById('intro-overlay');
  if (!overlay || !overlay.classList.contains('intro-overlay--splash')) return;

  const startFV = () => {
    if (window.__miaiStartFV) { window.__miaiStartFV(); return; }
    document.body.classList.add('fv-in');
    document.dispatchEvent(new CustomEvent('miai:fv-in'));
  };

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    overlay.remove();
    document.body.classList.add('intro-revealed');
    startFV();
    return;
  }

  /* ドット → FV 右側グラフィックの起点への受け渡し。
     ドットはそのまま右へ流れ、Peach の線の描き始めの位置に着く。
     着いた瞬間から線が伸び始めるので、ドットが消えてから線が
     フェードインする、という見え方にはならない。
     互いに別のレイヤーにいるので、画面座標で差分を測って動かす。
     SVG 内の CSS transform はローカル単位なので、ステージの縮尺で割る。 */
  const DOT_TRAVEL = 650;

  const handoff = () => {
    const dot = overlay.querySelector('.splash__dot');
    const svg = overlay.querySelector('.splash__svg');
    const lines = window.__miaiHeroLines;
    const target = lines && lines.originScreen();
    if (!dot || !svg || !target) { if (lines) lines.begin(); return; }

    const sf = svg.getBoundingClientRect().width / 266.312;  /* 1ローカル単位のpx */
    const d = dot.getBoundingClientRect();
    const dx = (target.x - (d.left + d.width / 2)) / sf;
    const dy = (target.y - (d.top + d.height / 2)) / sf;

    /* 線はこのドットの太さを種にして育つ。取り違えないよう実測で渡す */
    lines.setSeedWidth(d.width);

    dot.animate([
      { offset: 0,   transform: 'translate(0px, 0px)', opacity: 1,
        easing: 'cubic-bezier(.36, 0, .12, 1)' },
      /* 弧: 中間点を進行方向の直交側へ少しだけ膨らませる */
      { offset: .58, transform: 'translate(' + (dx * .52).toFixed(1) + 'px, '
        + (dy * .52 - 30 / sf).toFixed(1) + 'px)', opacity: 1,
        easing: 'cubic-bezier(.3, .5, .2, 1)' },
      { offset: 1,   transform: 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px)', opacity: 1 }
    ], { duration: DOT_TRAVEL, fill: 'forwards' });

    /* 着地と同時に線が伸び始め、ドットは先端の丸みに吸収される */
    setTimeout(() => {
      lines.begin();
      dot.animate([{ opacity: 1 }, { opacity: 0 }],
        { duration: 140, delay: 60, fill: 'forwards' });
    }, DOT_TRAVEL);
  };

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 900);
  };

  /* 最初のフレームは必ず白から */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => overlay.classList.add('is-run'));
  });

  const t1 = setTimeout(handoff, 2280);
  const t2 = setTimeout(() => {
    document.body.classList.add('intro-revealed');
    startFV();
    overlay.classList.add('is-hiding');   /* 白が抜ける(要素は各自の時間で消える) */
  }, 2750);
  const t3 = setTimeout(finish, 3650);
  /* 保険。何かが凍っても幕がページを塞ぎ続けないようにする */
  setTimeout(() => {
    [t1, t2, t3].forEach(clearTimeout);
    if (overlay.parentNode) {
      document.body.classList.add('intro-revealed');
      startFV();
      overlay.remove();
    }
  }, 7000);
})();
