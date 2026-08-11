/* ====== スプラッシュ(Figma 257:27678) ======
   時間軸そのものは css/style.css の .is-run 配下の delay 群が持つ。
   ここでは開始・終了と FV への受け渡しだけを行う。

     0.20-1.10  MiAI が1文字ずつ下から滑り上がる
     1.10-1.32  ロゴ完成を見せる(間)
     1.32-1.54  i のドットだけオレンジに変わり、その状態を見せる(間)
     1.54-1.94  他の文字が粒に散って消える。ドットは残る
     1.94-2.16  オレンジのドットだけの状態を見せる(間)
     2.16-2.30  ドットが沈んで弾む(移動の予備動作)
     2.30-2.86  弧を描いて中央へ移動しながら育ち、軌跡が環になる
     2.86-3.06  環と円群が出そろった状態を見せる(間)
     3.06-3.76  円群が回りながらグレーへ寄って背景グラフィックへ収束
     3.60-4.10  オレンジのグラデーションが空間へ広がる(FV の Ellipse 55 と同位置)
     3.90-4.20  ドットが AI Shift のカプセルへ変形
     4.20       幕がフェード。同時に FV の形成(body.fv-in)を開始するので、
                背景グラフィック → 見出し → リードが幕の外で見える
     4.75       幕を除去。以後は FV 側の完成状態だけが残る

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
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 560);
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

  const t = setTimeout(finish, 4200);
  /* 保険。何かが凍っても幕がページを塞ぎ続けないようにする */
  setTimeout(() => { clearTimeout(t); if (overlay.parentNode) finish(); }, 7000);
})();
