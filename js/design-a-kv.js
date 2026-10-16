/* デザインA KV: 曲線だけの流動的な図形 + カーソルへの反応。
   ヘッダーの出没は main.js(#site-header)が担当する */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  // [cx, cy, r, ax, ay, sx, sy, phase]  ax/ay: 漂う幅, sx/sy: 速さ(rad/s)
  var GROUPS = {
    'red': [
      [1135, 320, 125, 46, 40, .23, .31, 0.0],
      [1385, 520, 128, 52, 48, .27, .21, 1.7],
      [1185, 672, 100, 44, 52, .31, .25, 3.1],
      [1262, 420, 84, 40, 36, .35, .29, 4.4],
      [1292, 604, 78, 38, 42, .29, .37, 5.6],
      [1030, 520, 60, 46, 56, .21, .27, 2.4],
      [1280, 540, 92, 22, 24, .19, .23, 0.9],
      // 右上の円: 大きく漂い、本体に近づくと融合する
      [1360, 228, 70, 78, 92, .21, .27, 0.4]
    ],
    'pink': [
      [230, 112, 125, 42, 36, .24, .30, 0.8],
      [470, 10, 130, 46, 40, .28, .22, 2.6],
      [503, 335, 74, 40, 50, .33, .26, 4.0],
      [348, 62, 98, 36, 34, .31, .35, 1.2],
      [490, 168, 62, 34, 44, .27, .33, 5.1],
      [498, 252, 56, 34, 40, .36, .29, 3.5],
      [380, 120, 70, 20, 22, .2, .24, 2.2],
      // 左の球: 大きく漂い、本体に近づくと融合する
      [62, 300, 82, 92, 78, .19, .23, 2.0]
    ],
    // SP の左下。SCROLL(画面中央 x≈240, y≈147〜243)には被せない。
    // その帯では x<205 に収め、帯の上(y<140)は右側へ広げる
    'spl': [
      [70, 215, 105, 20, 16, .25, .31, 0.6],
      [150, 85, 78, 20, 16, .29, .26, 2.4],
      [250, 300, 88, 22, 14, .3, .27, 4.1],
      [395, 215, 78, 18, 20, .27, .32, 1.5],
      [20, 70, 60, 14, 14, .24, .3, 3.2]
    ],
    // 薄いぼんやりした背景も、複数の円がゆっくり形を変えながら漂う
    'glow': [
      [1060, 170, 120, 70, 70, .3, .36, 1.0],
      [1180, 330, 120, 100, 80, .22, .28, 2.3],
      [1010, 110, 90, 60, 60, .26, .21, 4.2],
      [1260, 140, 90, 80, 90, .19, .31, 5.5]
    ]
  };

  // SP は図形が小さく写るぶん、円が離れて細かくちぎれて見える。
  // 円を大きく・漂う幅を小さくして、大きな塊でつながったままにする
  var spMq = window.matchMedia ? matchMedia('(max-width: 820px)') : null;
  var SP_R = 1.3, SP_A = .6;

  var items = [];
  Object.keys(GROUPS).forEach(function (key) {
    var host = document.querySelector('[data-blob="' + key + '"]');
    if (!host) return;
    GROUPS[key].forEach(function (c) {
      var el = document.createElementNS(NS, 'ellipse');
      host.appendChild(el);
      // ox/oy: カーソルに押し出されている量(なめらかに追従させる)
      items.push({ el: el, svg: host.ownerSVGElement, c: c, ox: 0, oy: 0, sw: 0, glow: key === 'glow', spl: key === 'spl' });
    });
  });

  /* ---- カーソルへの反応: 水面に指を近づけたように、近くの円がゆっくり離れる ---- */
  var PUSH = {
    sign: 1,       // 1 = 離れる(避ける) / -1 = 寄ってくる(引き寄せる)
    radius: 280,   // 反応する範囲(図形座標 1440x940 基準)
    max: 46,       // 最大の押し出し量(px 相当)。大きいほど強い
    swell: .05,    // 近い円がわずかに膨らむ割合
    follow: 2.2    // 追従の速さ。小さいほどゆっくり
  };
  var mouse = null;   // {x, y} クライアント座標。null なら反応なし
  window.addEventListener('pointermove', function (e) {
    mouse = e.pointerType === 'mouse' ? { x: e.clientX, y: e.clientY } : null;
  }, { passive: true });
  document.addEventListener('pointerleave', function () { mouse = null; });
  window.addEventListener('blur', function () { mouse = null; });

  function toUser(svg, m) {
    var r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
    return { x: vb.x + (m.x - r.left) / r.width * vb.width,
             y: vb.y + (m.y - r.top) / r.height * vb.height };
  }

  function draw(t, dt) {
    var mu = {};   // svg ごとのカーソル位置(図形座標)
    for (var i = 0; i < items.length; i++) {
      var it = items[i], c = it.c, ph = c[7];
      var sp = spMq && spMq.matches && !it.glow;
      var ka = sp ? SP_A : 1, kr = sp ? (it.spl ? 1 : SP_R) : 1;   // 左下は円を直接大きくしてあるのでそのまま
      var x = c[0] + c[3] * ka * Math.sin(t * c[5] + ph);
      var y = c[1] + c[4] * ka * Math.cos(t * c[6] + ph * 1.3);

      // 目標の押し出し量を、ドリフト位置とカーソルの距離から求める(ガウス型で端がなだらか)
      var tx = 0, ty = 0, ts = 0;
      if (mouse && !it.glow) {
        var key = it.svg.getAttribute('class');
        var m = mu[key] || (mu[key] = toUser(it.svg, mouse));
        var dx = x - m.x, dy = y - m.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        var k = Math.exp(-(d * d) / (PUSH.radius * PUSH.radius));
        tx = PUSH.sign * dx / d * PUSH.max * k;
        ty = PUSH.sign * dy / d * PUSH.max * k;
        ts = k;
      }
      var f = 1 - Math.exp(-dt * PUSH.follow);   // フレームレートに依存しない追従
      it.ox += (tx - it.ox) * f;
      it.oy += (ty - it.oy) * f;
      it.sw += (ts - it.sw) * f;

      var sc = (1 + PUSH.swell * it.sw) * kr;
      var rx = c[2] * (1 + .10 * Math.sin(t * .55 + ph * 2.1)) * sc;
      var ry = c[2] * (1 + .10 * Math.cos(t * .47 + ph * 1.7)) * sc;
      var e = it.el;
      e.setAttribute('cx', (x + it.ox).toFixed(1));
      e.setAttribute('cy', (y + it.oy).toFixed(1));
      e.setAttribute('rx', rx.toFixed(1));
      e.setAttribute('ry', ry.toFixed(1));
    }
    // 色も流れるように、グラデーションの向きをゆっくり動かす
    var gr = document.getElementById('gRed'), gp = document.getElementById('gPink');
    if (gr) {
      gr.setAttribute('x1', (1000 + 70 * Math.sin(t * .17)).toFixed(0));
      gr.setAttribute('y1', (180 + 60 * Math.cos(t * .13)).toFixed(0));
      gr.setAttribute('x2', (1440 - 70 * Math.sin(t * .15)).toFixed(0));
      gr.setAttribute('y2', (760 - 60 * Math.cos(t * .19)).toFixed(0));
    }
    if (gp) {
      gp.setAttribute('x1', (100 + 60 * Math.sin(t * .14)).toFixed(0));
      gp.setAttribute('y1', (0 + 50 * Math.cos(t * .18)).toFixed(0));
      gp.setAttribute('x2', (620 - 60 * Math.sin(t * .16)).toFixed(0));
      gp.setAttribute('y2', (400 - 50 * Math.cos(t * .12)).toFixed(0));
    }
  }

  draw(0, 0);
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var start = performance.now(), last = start;
  // 図形が見えていない間(About 以降)は描画しない。メタボールのフィルタ(ぼかし2段)は
  // 重く、見えないのに毎フレーム再計算すると Service のスクロールが引っかかる。
  var shapesEl = document.querySelector('.da-hero__shapes');
  function hidden() { return shapesEl && shapesEl.style.opacity === '0.000'; }
  (function loop(now) {
    var dt = Math.min((now - last) / 1000, .1);   // タブ復帰時の飛びを防ぐ
    last = now;
    if (!hidden() && !document.hidden) draw((now - start) / 1000, dt);
    requestAnimationFrame(loop);
  })(start);
})();

/* SP メニュー(ハンバーガー) */
(function () {
  var btn = document.getElementById('da-burger'), nav = document.getElementById('da-nav');
  if (!btn || !nav) return;
  function set(open) { nav.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open)); }
  btn.addEventListener('click', function () { set(!nav.classList.contains('is-open')); });
  nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
})();

/* 図形は画面に固定。About の円が上がってきたら流動的な図形(pink / red)を消し、
   About を抜けて Service に入るあたりで残りの薄い glow も消す */
(function () {
  var shapes = document.querySelector('.da-hero__shapes');
  var about = document.getElementById('about');
  var circle = about && about.querySelector('.da-about__circle');
  if (!shapes || !circle) return;
  var ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight || 800;
    shapes.classList.toggle('is-about', circle.getBoundingClientRect().top < vh * 0.7);
    var b = about.getBoundingClientRect().bottom;
    var o = Math.max(0, Math.min(1, b / (vh * 0.6)));
    shapes.style.opacity = o.toFixed(3);
    shapes.style.visibility = o === 0 ? 'hidden' : '';
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

/* ページ先頭へ戻るボタン: About を抜けるまでは #E15F48 */
(function () {
  var btn = document.getElementById('to-top');
  var about = document.getElementById('about');
  if (!btn || !about) return;
  function update() {
    var vh = window.innerHeight || 800;
    btn.classList.toggle('is-on-about', about.getBoundingClientRect().bottom > vh - 72);
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
