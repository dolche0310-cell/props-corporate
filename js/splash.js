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

  /* ドット → FV カプセルへの受け渡し。
     互いに別のレイヤーにいるので、画面座標で差分を測って動かす。
     SVG 内の CSS transform はローカル単位なので、ステージの縮尺で割る。 */
  const handoff = () => {
    const dot = overlay.querySelector('.splash__dot');
    const pill = document.querySelector('.kv-pill');
    const svg = overlay.querySelector('.splash__svg');
    if (!dot || !pill || !svg) return;
    const sf = svg.getBoundingClientRect().width / 266.312;  /* 1ローカル単位のpx */
    const d = dot.getBoundingClientRect();
    const t = pill.getBoundingClientRect();
    const dx = (t.left + t.width / 2 - (d.left + d.width / 2)) / sf;
    const dy = (t.top + t.height / 2 - (d.top + d.height / 2)) / sf;
    const sx = t.width / d.width;
    const sy = t.height / d.height;
    dot.animate([
      { offset: 0,   transform: 'translate(0px, 0px) scale(1)', opacity: 1,
        easing: 'cubic-bezier(.4, 0, .2, 1)' },
      /* 弧: 中間点を進行方向の直交側へ膨らませる */
      { offset: .55, transform: 'translate(' + (dx * .5).toFixed(1) + 'px, ' + (dy * .5 - 26 / sf).toFixed(1) + 'px) '
        + 'scale(' + (1 + (sx - 1) * .35).toFixed(2) + ', ' + (1 + (sy - 1) * .35).toFixed(2) + ')', opacity: 1,
        easing: 'cubic-bezier(.22, 1, .36, 1)' },
      { offset: .88, transform: 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px) '
        + 'scale(' + sx.toFixed(2) + ', ' + sy.toFixed(2) + ')', opacity: 1 },
      /* 実カプセルに重なったら溶ける */
      { offset: 1,   transform: 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px) '
        + 'scale(' + sx.toFixed(2) + ', ' + sy.toFixed(2) + ')', opacity: 0 }
    ], { duration: 1170, fill: 'forwards' });
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
