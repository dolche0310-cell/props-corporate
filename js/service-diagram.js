/* ============ Service 図解「構築されていく」アニメーション ============
   Figma 253:27104 / 253:27127 のベクターを組み直した inline SVG に対し、
   時間軸の変化だけを足す。構図・配色・カード位置・接続関係は変えない。

   流れ:
     1) 粒子状態    … 接続線と CORE の実パス上をサンプリングした点を散らす
     2) 接続線が引かれる … 粒子が線へ収束し、solid → dashed の順に描かれる
     3) カードが実体化 … 輪郭が立ち上がってから面が入る
     4) CORE が完成   … 円 → ラベル
   粒子座標は図解自身のパスから getPointAtLength で採っているので、
   別途パーティクル素材(2.2MB)を読み込む必要がない。

   端点ノードだけ、ごくゆっくりした呼吸(2.5-4s)を付ける。点滅にはしない。
   IntersectionObserver で一度だけ再生。prefers-reduced-motion は完成状態を静止表示。 */
(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('[data-diagram]').forEach((stage) => {
    const svg = stage.querySelector('svg.dg');
    if (!svg) return;

    if (reduced) { stage.classList.add('is-done'); return; }

    /* --- 粒子レイヤーを図解自身のパスから作る --- */
    const lines = Array.from(svg.querySelectorAll('.dg-line'));
    const NS = 'http://www.w3.org/2000/svg';
    const dust = document.createElementNS(NS, 'g');
    dust.setAttribute('class', 'dg-dust');

    /* 乱数は固定シードにして、再読み込みで粒の配置が暴れないようにする */
    let seed = 20260810;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    const COLORS = ['#FF5A3C', '#FF5A3C', '#B0B0B0', '#ffffff'];
    lines.forEach((p) => {
      let len = 0;
      try { len = p.getTotalLength(); } catch (e) { return; }
      const n = Math.max(8, Math.round(len / 9));
      for (let i = 0; i < n; i++) {
        const pt = p.getPointAtLength((i / n) * len);
        /* 親グループの transform を通して図解座標へ載せる */
        const m = p.ownerSVGElement.getScreenCTM();
        const c = document.createElementNS(NS, 'circle');
        const jitterX = (rnd() - 0.5) * 26;
        const jitterY = (rnd() - 0.5) * 26;
        c.setAttribute('r', (0.5 + rnd() * 0.9).toFixed(2));
        c.setAttribute('cx', pt.x.toFixed(2));
        c.setAttribute('cy', pt.y.toFixed(2));
        c.setAttribute('fill', COLORS[(rnd() * COLORS.length) | 0]);
        c.style.setProperty('--dx', jitterX.toFixed(1) + 'px');
        c.style.setProperty('--dy', jitterY.toFixed(1) + 'px');
        c.style.setProperty('--d', (rnd() * 0.5).toFixed(2) + 's');
        /* 線と同じ transform の中に入れる */
        (p.closest('g') || svg).appendChild(c);
        c.setAttribute('class', 'dg-dot');
      }
    });

    /* --- 線は dashoffset で引く --- */
    lines.forEach((p, i) => {
      let len = 0;
      try { len = p.getTotalLength(); } catch (e) { return; }
      p.style.setProperty('--len', len.toFixed(1));
      p.style.setProperty('--d', (0.45 + i * 0.07).toFixed(2) + 's');
    });

    const play = () => stage.classList.add('is-play');
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
