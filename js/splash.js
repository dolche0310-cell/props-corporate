/* ====== スプラッシュ(Figma 257:27678) ======
   時間軸そのものは css/style.css の .is-run 配下の delay 群が持つ。
   ここでは開始・終了と FV への受け渡しだけを行う。

     0.15-1.5s  Mi → MiAI が立ち上がる
     1.75s      i のドットがオレンジで灯る
     1.85s      文字が解けて消える(ドットだけ残る)
     2.15s      ドットが中央へ寄りながら育つ
     2.45-3.0s  ブロブの環が回りながら現れる
     2.95s      環が淡くなり右へ / 右側にグラデーション円(FVの Ellipse 55 と同位置)
     3.15s      幕がフェード。FV の形成(body.fv-in)をここで開始するので、
                背景グラフィック → タイトル → リードの立ち上がりが
                幕の裏ではなく実際に見える
     3.7s       幕を除去。以後は FV 側の完成状態だけが残る

   prefers-reduced-motion はスプラッシュ自体を出さない。
   保険として 6s で必ず幕を落とす(タブ非表示などで凍っても詰まらない)。 */
(() => {
  'use strict';

  const overlay = document.getElementById('intro-overlay');
  if (!overlay || !overlay.classList.contains('intro-overlay--splash')) return;

  const startFV = () => {
    if (window.__miaiStartFV) { window.__miaiStartFV(); return; }
    document.body.classList.add('fv-in');
    document.dispatchEvent(new CustomEvent('miai:fv-in'));
  };
  const finish = () => {
    document.body.classList.add('intro-revealed');
    startFV();
    overlay.classList.add('is-hiding');
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 550);
  };

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    overlay.remove();
    document.body.classList.add('intro-revealed');
    startFV();
    return;
  }

  /* 最初のフレームは必ず白から。次フレームで時間軸を開始する */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => overlay.classList.add('is-run'));
  });

  const t = setTimeout(finish, 3150);
  /* 保険。何かが凍っても幕がページを塞ぎ続けないようにする */
  setTimeout(() => { clearTimeout(t); if (overlay.parentNode) finish(); }, 6000);
})();
