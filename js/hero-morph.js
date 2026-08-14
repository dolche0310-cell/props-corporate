/* ============ FV モーションアイデンティティ ============
   「ONE FORM, INFINITE POSSIBILITIES」
   Figma 397:25889 のストーリーボード(下記18状態)を Keyframe とし、
   ひとつの赤い形が 分裂・接続・変形・回転・圧縮・展開 を繰り返す。
   状態間はアウトライン補間(64点)による SVG path morph。
   クロスフェードは使わない。分裂・合体も同じ補間で表す。

   ■ 状態列(座標は 1440x810 フレーム系 / すべて #FF2400)
     S04  ドット(709.5,292.5) r26.5          306:54534
     S05  ドットが沈む(709.5,423.5)          397:29827
     S06  ドットが跳ね上がる(709.5,192.5)    397:31094
     S07  2x2 の4ドット                      306:55849
     S08  2本の縦カプセル「‖」               397:28543
     S09  2本の斜めカプセル「⫽」(45°)        397:32361
     S10  1本の長い縦カプセル                397:60686
     S11  大円(703.5,399.5) r262.5 ← fv-in   397:63264
     S12  12ドットの円環(中心1125,377.5)     397:56808
     S13  散在する5つの円                    304:46481
     S14  絡む2つのリング(穴あき円環)        397:25916
     S15  ブロブ+円                          397:64620
     S16  H形+円                             397:55498
     S17  イコライザー(7要素)                397:65958
     S18a 中円(720.5,355.5) r117.5           397:65961
     S18b 巨大円(1139.5,355.5) r546.5        397:67289
     S19  N形                                304:49121
     S20  最終モチーフ(2カプセル+円) = Figma の FV 完成形
     → S04 へ収束してシームレスにループ

   ■ リズム
   遷移は短く軽快に、状態ごとに 溜め(hold) を置く。静→動→静。
   ease は3種(soft/bold/over)を使い分け、ジオメトリだけに
   わずかなオーバーシュートを掛ける(局所u=1で厳密に目標形へ)。

   ■ スプラッシュとの関係
   スプラッシュ(js/splash.js)がロゴ→粒子→ドットまでを演じ、
   start() でこのエンジンが S04 から引き継ぐ。S11 到達で
   'miai:morph-fv' を発火し FV の文字とヘッダーが立ち上がる。
   以後は止まらない(FV では強度を75%に落として永続ループ)。

   ■ 奥行きとマイクロモーション
   ステージ全体に perspective + rotateX/rotateY。ポインタに
   100〜300ms 遅れて ±2〜3° だけ追従し、離れると中央へ戻る。
   これとは別に周期の異なる2チャンネルの微小ドリフトを常時加算。
   スクロール 0〜15vh で scale/位置/不透明度をわずかに変え、
   次のセクションへ自然に接続する。

   prefers-reduced-motion: ループを止め、Figma の最終形(静的グループ)
   のみを表示する。 */
(() => {
  'use strict';

  const svg = document.querySelector('.hero__motif');
  if (!svg) return;
  const liveG = svg.querySelector('.hm-live');
  const staticG = svg.querySelector('.hm-static');
  const SHAPES = window.MIAI_MORPH_SHAPES;
  if (!liveG || !staticG || !SHAPES) return;

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLOR = (getComputedStyle(document.documentElement)
    .getPropertyValue('--color-primary') || '#FF2400').trim() || '#FF2400';

  /* ---------- アウトライン ---------- */
  const N = 64;
  const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
  const smooth = (t) => { const u = clamp01(t); return u * u * u * (u * (u * 6 - 15) + 10); };
  const lerp = (a, b, u) => a + (b - a) * u;

  const circle = (cx, cy, r) => {
    const p = [];
    for (let i = 0; i < N; i++) {
      const th = -Math.PI / 2 + (i / N) * Math.PI * 2;
      p.push([cx + Math.cos(th) * r, cy + Math.sin(th) * r]);
    }
    return p;
  };
  const capsule = (ax, ay, bx, by, r) => {
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
    if (L < 0.5) return circle((ax + bx) / 2, (ay + by) / 2, r);
    const cx = (ax + bx) / 2, cy = (ay + by) / 2, phi = Math.atan2(dy, dx), h = L / 2;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2;
      const c = Math.cos(th - phi), s = Math.sin(th - phi);
      let R;
      const t = Math.abs(s) > 1e-6 ? r / Math.abs(s) : Infinity;
      if (Math.abs(t * c) <= h) R = t;
      else { const hd = h * Math.abs(c); R = hd + Math.sqrt(Math.max(0, hd * hd + r * r - h * h)); }
      pts.push([cx + Math.cos(th) * R, cy + Math.sin(th) * R]);
    }
    let top = 0;
    for (let i = 1; i < N; i++) if (pts[i][1] < pts[top][1]) top = i;
    return pts.slice(top).concat(pts.slice(0, top));
  };
  /* 図形 = {p, hole} */
  const S = (p, hole) => ({ p, hole: hole || null });
  const dotG = (cx, cy) => S(circle(cx, cy, 26.5));

  /* ---------- 状態列(Figma 実測値) ---------- */
  const EQY = 400;
  /* S12 の12点。Figma の実座標を中心(1125,377.5)まわりの角度に直したもの
     (半径はいずれも196)。回転させるので角度で持つ。 */
  const RING_A = [0.0, 29.4, 60.3, 88.7, 120.4, 150.6, 180.0, 209.4, 239.1, 271.3, 300.1, 330.6];
  /* FV の文字が出るまで(S04〜S11)は「規則的なビート」で運ぶ。
     変形は全て 260ms・間は 90ms に揃え、テンポを一定にして
     ランダムな揺らぎを感じさせない。文字が出た後は従来どおり。 */
  const STATES = [
    /* S04 ループの戻り(S20 の2本の棒+点 → 円)。棒が時計回りに振られながら
       着地点の円へ吸い込まれる。spinIn は「到達形の中心まわりに回す角度」で、
       u=0 で 0、u=1 で全角。u=1 では全員が同じ円になっているので、
       回し切ったところで形が飛ぶことはない。 */
    { id: 's04', t: 620, e: 'soft', h: 90, spinIn: 190 * Math.PI / 180,
      list: [dotG(709.5, 292.5)] },
    /* S05 */ { id: 's07', t: 260, e: 'soft', h: 560, dotsFill: true,
      dots: [[669.5, 308.5, 26.5], [768.5, 308.5, 26.5],
             [669.5, 393.5, 26.5], [768.5, 393.5, 26.5]],
      list: [dotG(669.5, 308.5), dotG(768.5, 308.5), dotG(669.5, 393.5), dotG(768.5, 393.5)] },
    /* S08 */ { id: 's10', t: 260, e: 'soft', h: 260, elastic: true,
      caps: [[720.5, 382.5, 186, 26.5]],
      list: [S(capsule(720.5, 196.5, 720.5, 568.5, 26.5))] },
    /* S11 */ { id: 's11', t: 360, e: 'soft', h: 200, fv: true,
      list: [S(circle(703.5, 399.5, 262.5))] },
    /* S12 12点円環(中心1125,377.5 / 半径196 / 各r21.5)。
       ぐるぐる回りながら、円が順に大きく明るくなる(spin:true)。 */
    { id: 's12', t: 448, e: 'soft', h: 600, spin: true,
      list: RING_A.map((d) => S(circle(1125 + Math.cos(d * Math.PI / 180) * 196,
                                       377.5 + Math.sin(d * Math.PI / 180) * 196, 21.5))) },
    /* S13 散在円。画面いっぱいに広がるパターンなので、FV でも
       Figma の原配置のまま(指示)。中心から弾けて外へ広がり、
       次々に現れる動きは burst:true で専用に駆動する(下の burstList)。 */
    { id: 's13', t: 1400, e: 'soft', h: 620, burst: true, fullBleed: true,
      list: [S(circle(414.5, 217.5, 21.5)), S(circle(1223.5, 482.5, 132.5)),
             S(circle(17.5, 243.5, 132.5)), S(circle(911.5, 256.5, 60.5)),
             S(circle(222.5, 712.5, 60.5)),
             /* 外側いっぱいまで広がる分。上下左右の縁に掛かる位置へ */
             S(circle(1372.5, 96.5, 96.5)), S(circle(596.5, 528.5, 40.5)),
             S(circle(742.5, 748.5, 74.5)), S(circle(1108.5, 44.5, 34.5))] },
    /* S13b 弾んだ円が描いた軌跡。中心(1160,456)を巡る弧が数本と、
       その上を走る大小2つの円。ここから S14 の二重リングへ吸い込まれる。
       弧は「太さのあるリボン」として持つ(外周→内周でひと繋ぎ)ので、
       次のリングとも同じ 64 点で自然に補間できる。 */
    /* S13b ひとつの円が巡り、その軌跡が円のラインになる。
       描き切ると波紋になって広がり、そのまま次の二重リングへ。
       到達形は同心の2本なので S14 へ素直に変形できる。 */
    { id: 's13b', t: 560, e: 'soft', h: 860, ripple: true,
      /* 輪郭は単純な円。stroke すると線は1本になる(リボンだと外周と
         内周の2本が描かれて二重線に見えるため使わない)。
         次の S14 は同じ円が2つなので、そのまま素直に変形できる。 */
      list: [S(circle(1160, 456, 246)), S(circle(1160, 456, 150))] },
    /* S14 リング2 (外r113.5 / 内r98.64) */ { id: 's14', t: 448, e: 'soft', h: 460, resonate: true,
      list: [S(circle(1044.5, 314.5, 113.5), circle(1044.5, 314.5, 98.64)),
             S(circle(1179.5, 314.5, 113.5), circle(1179.5, 314.5, 98.64))] },
    /* S15 ブロブ */ { id: 's15', t: 448, e: 'soft', h: 380, jelly: true,
      list: SHAPES.blob.map((p) => S(p)) },
    /* S16 H形 */ { id: 's16', t: 416, e: 'soft', h: 380, jelly: true,
      list: SHAPES.hshape.map((p) => S(p)) },
    /* S17 サウンドメーター。Figma の7要素(x/幅/角丸は不変)。
       高さだけが「ひとつの波が通過する」ように連続して伸縮し続ける。
       list は補間の対応付け用の基準形で、実際の描画は meterList() が
       毎フレーム作り直す(下の renderAt を参照)。 */
    { id: 's17', t: 448, e: 'soft', h: 760, meter: true,
      list: [S(circle(888.39, EQY, 23.3)),
             S(capsule(963.22, EQY - 25.4, 963.22, EQY + 25.4, 23.7)),
             S(capsule(1037.72, EQY - 62.66, 1037.72, EQY + 62.66, 23.7)),
             S(capsule(1112.22, EQY - 100, 1112.22, EQY + 100, 23.7)),
             S(capsule(1186.74, EQY - 62.66, 1186.74, EQY + 62.66, 23.7)),
             S(capsule(1261.24, EQY - 25.4, 1261.24, EQY + 25.4, 23.7)),
             S(circle(1335.43, EQY, 23.3))] },
    /* S18a 中円 */ { id: 's18a', t: 384, e: 'soft', h: 112, list: [S(circle(720.5, 355.5, 117.5))] },
    /* S18b 巨大円 */ { id: 's18b', t: 496, e: 'bold', h: 208, list: [S(circle(1139.5, 355.5, 546.5))] },
    /* S19 N形 */ { id: 's19', t: 496, e: 'soft', h: 760, stroke: true, list: SHAPES.nshape.map((p) => S(p)) },
    /* S20 最終モチーフ = Figma FV 完成形 */ { id: 's20', t: 480, e: 'soft', h: 700,
      list: [S(capsule(909.53, 521.37, 1053.51, 304.53, 44.3885)),
             S(capsule(1097.53, 521.37, 1241.51, 304.53, 44.3885)),
             S(circle(1285.5, 522.0, 44.5))] }
  ];

  /* FV 表示後の配置(指示: 見出し・リードに重ねない)。
     テキストは x72..853 を占めるので、x>=880 の右ゾーンに収まるよう
     各状態を水平シフト(fdx)する。S13 だけは専用レイアウト(fvL)。
     S12/S14/S15/S16/S19/S20 は元々右ゾーンなのでそのまま。
     スプラッシュ中(文字が無い間)は Figma の原座標で動く。 */
  /* 小さめの状態(ドット・格子・バー・中円)は右ゾーンの視覚中心
     (約1155,385)あたりへ。大きな円(S11/S18b)と全面に散る S13、
     元々バランスの取れている S12/S14/S17/S20 は指示どおり現状のまま。 */
  /* FV 表示後の配置。テキスト(x72..853)を避けた右の余白
     x880..1440 / y152..760 の「中心」に、形の外接矩形の中心を合わせる。
     大きく画面いっぱいに広がる状態(S11/S13/S18b)は構図が意図なので
     そのまま。縮小はせず平行移動だけ(形は不変)。 */
  /* 縦の基準は「ヘッダー下端(152) 〜 リード下端(477)+余白」。
     FV の主役であるタイトル(283..361)とリード(395..477)の帯の中心
     およそ 380 に合わせると、文字と水平に釣り合って見える。
     ヒーローの箱の中心(460)だと下に沈んで見えるため使わない。 */
  /* 右に寄り過ぎて見えるため、ゾーンごと 60px 左へ(中心 1160→1100)。
     幅は変えない(fit 縮小を発生させない)。文字への接近は TEXT_R が守る。
     全画面に広がる演出(S13)は KEEP_WIDE でこの影響を受けない。 */
  const ZONE = { x0: 820, x1: 1380, y0: 152, y1: 608 };
  const ZONE_C = [(ZONE.x0 + ZONE.x1) / 2, (ZONE.y0 + ZONE.y1) / 2];   /* 1100, 380 */
  /* 画面いっぱいに広がる構図はそのまま。ただし FV 表示後にテキスト
     (x72..853)へ掛かるものは、左端が 880 に来るまで右へ逃がす。 */
  /* 画面いっぱいの構図を保つのは、外へ飛び出す演出(S13)だけ。
     大円(S11)と巨大円(S18b)は FV では可視域に収める。 */
  const KEEP_WIDE = { s13: 1 };
  const TEXT_R = 910;      /* 文字の右端853 + 呼吸/伸縮の余裕(接近しすぎ防止) */
  STATES.forEach((st) => {
    if (st.fvL) { st.fvList = st.fvL; return; }
    if (KEEP_WIDE[st.id]) {
      /* 画面いっぱいに広がる構図はそのまま。
         S13(円がたくさん出て外へ飛び出す演出)は画面全体を使うことが
         意図なので、文字を避ける移動もしない。 */
      if (st.fullBleed) { st.fvList = st.list; return; }
      let lx = Infinity;
      st.list.forEach((sh) => sh.p.forEach(([x]) => { if (x < lx) lx = x; }));
      const push = lx < TEXT_R ? TEXT_R - lx : 0;
      st.fvList = push
        ? st.list.map((sh) => ({
            p: sh.p.map(([x, y]) => [x + push, y]),
            hole: sh.hole ? sh.hole.map(([x, y]) => [x + push, y]) : null
          }))
        : st.list;
      if (push) st.fdx = push;
      return;
    }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    st.list.forEach((sh) => sh.p.forEach(([x, y]) => {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }));
    /* 可視域(右ゾーン 880..1440 / 152..762)に収まらない大きさなら、
       中心基準で縮めてから置く。形の比率は変えない。 */
    const w = x1 - x0, h = y1 - y0;
    const fit = Math.min(1, (ZONE.x1 - ZONE.x0 - 24) / Math.max(1, w),
                            (ZONE.y1 - ZONE.y0 - 24) / Math.max(1, h));
    const cx0 = (x0 + x1) / 2, cy0 = (y0 + y1) / 2;
    const dx = ZONE_C[0] - cx0;
    const dy = ZONE_C[1] - cy0;
    const map = ([x, y]) => [ZONE_C[0] + (x - cx0) * fit, ZONE_C[1] + (y - cy0) * fit];
    st.fvList = st.list.map((sh) => ({
      p: sh.p.map(map),
      hole: sh.hole ? sh.hole.map(map) : null
    }));
    st.fvFit = fit;
    st.fdx = dx; st.fdy = dy;        /* caps / メーター等にも同じ量を使う */
  });

  /* FV 表示後は、グロナビ(高さ137)の背面に潜って見切れないようにする。
     形の上端が SAFE_TOP より上に出ていたら、その分だけ下へ平行移動する。
     縮小はしない(形を変えない)ため、テキスト帯 x72..853 を侵さない
     右ゾーン配置と両立する。 */
  /* 152 はヘッダー下端(137)+15。さらに 8px は呼吸/弾みの余裕として足す
     (大きい形ほど呼吸の絶対量が大きいので、半径に比例した余裕も見る)。 */
  const SAFE_TOP = 152;
  /* 中心へ寄せたあと、文字帯(x<878)へ掛かるものは右へ逃がす。
     形は変えず平行移動だけ。 */
  STATES.forEach((st) => {
    if (st.fullBleed) return;                 /* 全画面の演出はそのまま */
    let lx = Infinity;
    st.fvList.forEach((sh) => sh.p.forEach(([x]) => { if (x < lx) lx = x; }));
    const push = lx < TEXT_R ? TEXT_R - lx : 0;
    if (!push) return;
    st.fvList = st.fvList.map((sh) => ({
      p: sh.p.map(([x, y]) => [x + push, y]),
      hole: sh.hole ? sh.hole.map(([x, y]) => [x + push, y]) : null
    }));
    st.fdx = (st.fdx || 0) + push;
  });
  STATES.forEach((st) => {
    const src = st.fvList;
    let top = Infinity;
    src.forEach((sh) => sh.p.forEach(([, y]) => { if (y < top) top = y; }));
    let bottom = -Infinity;
    src.forEach((sh) => sh.p.forEach(([, y]) => { if (y > bottom) bottom = y; }));
    const margin = 14 + Math.min(24, (bottom - top) * 0.02);   /* 呼吸/伸縮の余裕 */
    /* 上はヘッダーの下、下は FV の下端(760) の内側に収める。
       両方に掛かる大きさなら、収まる範囲で天地中央へ置く。 */
    const SAFE_BOT = 762;
    let shift = 0;
    if (!st.fullBleed) {
      const h = bottom - top;
      if (h >= SAFE_BOT - SAFE_TOP - margin * 2) {
        shift = (SAFE_TOP + SAFE_BOT) / 2 - (top + bottom) / 2;   /* 収まらない: 天地中央 */
      } else if (top < SAFE_TOP + margin) {
        shift = SAFE_TOP + margin - top;
      } else if (bottom > SAFE_BOT - margin) {
        shift = SAFE_BOT - margin - bottom;
      }
    }
    st.fvShift = shift;
    if (st.dots) st.fvDots = st.dots.map((c) =>
      [c[0] + (st.fdx || 0), c[1] + (st.fdy || 0) + st.fvShift, c[2]]);
    if (st.caps) st.fvCaps = st.caps.map((c) =>
      [c[0] + (st.fdx || 0), c[1] + (st.fdy || 0) + st.fvShift, c[2], c[3]]);
    if (!st.fvShift) return;
    st.fvList = src.map((sh) => ({
      p: sh.p.map(([x, y]) => [x, y + st.fvShift]),
      hole: sh.hole ? sh.hole.map(([x, y]) => [x, y + st.fvShift]) : null
    }));
  });

  /* ---------- サウンドメーター ----------
     7本の x と半径は Figma のまま。半長(=カプセルの中心線の半分)だけを
     時間の関数で作る。
       ・位相差 62ms/本 → ひとつの波がバーを通過して見える
       ・周期の異なる3つの正弦を重ねる(1.35s / 2.15s / 3.7s)ので
         同じ形が繰り返さず、常に次の変化へ流れ込む
       ・中央ほど大きい包絡(env)は維持しつつ、左右で微妙に非対称
       ・目標値へ毎フレーム lerp(一次ローパス)で追従するため、
         方向転換でも折れない
     縦だけ伸縮し、横幅と角丸は不変(丸端カプセルなので端は常に半円)。 */
  const MX = [888.39, 963.22, 1037.72, 1112.22, 1186.74, 1261.24, 1335.43];
  const MR = [23.3, 23.7, 23.7, 23.7, 23.7, 23.7, 23.3];
  const MENV = [0.10, 0.36, 0.74, 1.00, 0.78, 0.40, 0.12];   /* 中央が最大 */
  const MSKW = [0.00, 0.06, -0.05, 0.00, 0.07, -0.04, 0.03]; /* 左右の非対称 */
  const MH_MAX = 100;                                        /* Figma の中央半長 */
  /* ホールド中は点列ではなく厳密なパス(直線+円弧)を直接組む。
     64点アウトラインは点密度が一定でないと Catmull-Rom が膨らむため、
     縦に大きく伸びたとき幅が崩れる。ここは形が最重要なので厳密解にする。
     (状態間の遷移では従来どおり capsuleOutline の点列で補間する) */
  const meterPath = (x, cy, h, r) => {
    const L = (x - r).toFixed(2), R = (x + r).toFixed(2);
    const T = (cy - h).toFixed(2), B = (cy + h).toFixed(2);
    const a = r.toFixed(2) + ' ' + r.toFixed(2) + ' 0 0 1 ';
    /* 上下が半円(直径=2r)、左右が直線。幅は常に厳密に 2r で、
       h(半長)だけが伸縮する。 */
    return 'M' + L + ' ' + T + 'A' + a + R + ' ' + T +
           'L' + R + ' ' + B + 'A' + a + L + ' ' + B + 'Z';
  };
  const mHalf = MENV.map((e) => e * MH_MAX);                 /* 現在値(平滑後) */
  let mInit = false;
  const meterList = (now, dx, dy, k) => {
    const t = now / 1000;
    const out = [];
    for (let i = 0; i < 7; i++) {
      const ph = i * 0.062 * Math.PI * 2;                    /* 62ms 相当の位相差 */
      const w = 0.5 + 0.5 * Math.sin(t * 4.65 - ph)          /* 1.35s */
              + 0.34 * Math.sin(t * 2.92 - ph * 1.7 + 1.1)   /* 2.15s */
              + 0.22 * Math.sin(t * 1.70 - ph * 0.6 + 2.3);  /* 3.70s */
      const norm = clamp01((w + 0.56) / 1.62);               /* 0..1 へ */
      const shaped = 0.34 + 0.66 * norm;                     /* 完全には潰さない */
      const target = MH_MAX * (MENV[i] + MSKW[i] * (norm - 0.5)) * shaped * k;
      if (!mInit) mHalf[i] = target;
      /* 一次ローパス: 伸びは速く、縮みは柔らかく */
      const rate = target > mHalf[i] ? 0.165 : 0.115;
      mHalf[i] += (target - mHalf[i]) * rate;
      const h = Math.max(0, mHalf[i]);
      const x = MX[i] + dx, cy = EQY + dy;
      out.push({ p: capsule(x, cy - h, x, cy + h, MR[i]), hole: null,
                 d: meterPath(x, cy, h, MR[i]) });
    }
    mInit = true;
    return out;
  };

  /* ---------- 回転する円環(S12) ----------
     ・全体が 5.2s で1周(ぐるぐる)
     ・進行方向に走る位相で各点が脈打つ。明滅は不透明度ではなく半径だけで
       表す(0.47〜1.53倍)。オレンジは常に原色のまま薄くしない。
     ・中心(1125,377.5)と半径196はそのまま。角度だけを回す。 */
  const RING_C = [1125, 377.5], RING_R = 196, RING_DOT = 21.5;
  const ringList = (now, k, dy, dx) => {
    const sy = dy || 0, sx = dx || 0;
    const t = now / 1000;
    /* 回転は一定速度にしない。低周波を重ねて、速い区間と静かな区間をつくる */
    const spin = (now / 5200) * 360
               + Math.sin(t * 0.37) * 26 + Math.sin(t * 0.83 + 1.7) * 11;
    const wave = (now / 1450) * Math.PI * 2;
    /* 円環自体が数%だけ呼吸し、軌道はわずかに楕円 */
    const breathe = 1 + Math.sin(t * 0.52) * 0.035 * k;
    const ex = 1 + Math.sin(t * 0.29 + 0.6) * 0.055 * k;
    const ey = 1 - Math.sin(t * 0.29 + 0.6) * 0.045 * k;
    const n = RING_A.length;
    const out = [];
    for (let i = 0; i < n; i++) {
      const w = 0.5 + 0.5 * Math.sin(wave - (i / n) * Math.PI * 2 * 2);
      /* 大きい点(w が大)は少し先導し、小さい点は遅れて追従する */
      const lead = (w - 0.5) * 7 * k;
      const d = (RING_A[i] + spin + lead) * Math.PI / 180;
      /* 点同士の距離もわずかに伸縮する */
      const rr = RING_R * breathe * (1 + Math.sin(t * 0.71 + i * 1.9) * 0.022 * k);
      out.push({ p: circle(RING_C[0] + sx + Math.cos(d) * rr * ex,
                           RING_C[1] + sy + Math.sin(d) * rr * ey,
                           RING_DOT * (1 + (w - 0.5) * 1.05 * k)),
                 hole: null,
                 a: 1 });
    }
    return out;
  };

  /* ---------- バウンド + 軌跡(S13) ----------
     ■ 前半(0〜1500ms): 円が「垂直に」バスケットボールのように2回弾む
       水平位置は一切動かさず、y だけが放物線で落ちて跳ね返る。
       1バウンド目の高さを 1、2バウンド目を 0.42 として、接地の瞬間だけ
       わずかに縦を潰す(スカッシュ)。跳ねる先は各円の最終 x 上。
     ■ 後半(1500ms〜): 弾み終わった円が最終位置へ向かい、
       通った軌跡が薄い円のグラデーション(3段)となって重なり合う。
       残像は本体より十分薄く、動きの向きだけを感じさせる。 */
  const BURST_O = [720, 400];
  const GROUND = 690;                 /* 接地線 */
  /* 弾みは1回だけ。以前は「落下 → 高く1回 → 低く1回」の2バウンドで、
     同じ動きが繰り返されるぶん冗長だった。落ちて1度だけ跳ね、そのまま
     広がりへ移る方が歯切れがよい。 */
  const D0 = 300;                     /* 画面上から接地までの落下 */
  const B1 = 460;                     /* 唯一のバウンド */
  const BOUNCE_END = D0 + B1;         /* 760ms */
  /* 垂直バウンド。x は一切動かさない。
     各区間は放物線で、接地の瞬間に速度が最大になる。 */
  const bounceY = (t, topY) => {
    const H = GROUND - topY;                       /* 落下高さ */
    if (t < D0) {                                  /* 落ちてくる(加速) */
      const u = clamp01(t / D0);
      return topY + H * u * u;
    }
    const u = clamp01((t - D0) / B1);              /* 跳ねて戻る */
    return GROUND - H * 0.5 * (1 - Math.pow(2 * u - 1, 2));
  };
  /* 接地の瞬間(D0 / BOUNCE_END)だけ縦を潰す */
  const squash = (t) => {
    const near = Math.min(Math.abs(t - D0), Math.abs(t - BOUNCE_END));
    return near < 85 ? 1 - 0.17 * (1 - near / 85) : 1;
  };
  const burstDelay = (i, n) => (i / Math.max(1, n - 1)) * 90;
  const burstList = (st, elapsed, k, ghosts) => {
    const n = st.list.length;
    const out = [];
    for (let i = 0; i < n; i++) {
      const src = (geomFV && st.fvList ? st.fvList : st.list)[i];
      const c = src.c || (src.c = centroid(src.p));
      const r = src.r !== undefined ? src.r : (src.r = (() => {
        let m = 0; for (const q of src.p) m = Math.max(m, Math.hypot(q[0] - c[0], q[1] - c[1])); return m;
      })());
      const te = elapsed - burstDelay(i, n);
      const topY = -r - 60;                        /* 画面の上から落ちてくる */
      if (te <= 0) { out.push(S(circle(c[0], topY, r))); continue; }
      if (te < BOUNCE_END) {
        /* 垂直バウンド。x は最終位置のまま一切動かさない(斜めにしない) */
        const y = bounceY(te, topY);
        const sq = squash(te);
        const p0 = circle(c[0], y, r);
        out.push(S(p0.map(([x, yy]) => [c[0] + (x - c[0]) / Math.max(0.7, sq), y + (yy - y) * sq])));
      } else {
        /* 弾み終わり → 最終位置へ寄りつつ、そこから外へ広がり続ける。
           中心(720,400)からの外向きに一定の速さで流れ、止まらない。
           軌跡は進行方向の後ろに3段だけ薄く残す。 */
        const te2 = te - BOUNCE_END;
        const e = 1 - Math.pow(1 - clamp01(te2 / 620), 3);
        const fromY = bounceY(BOUNCE_END, topY);
        const baseY = lerp(fromY, c[1], e);
        let dx = c[0] - BURST_O[0], dy = c[1] - BURST_O[1];
        const L = Math.hypot(dx, dy) || 1;
        dx /= L; dy /= L;
        /* 円ごとに速さを変える(大きいものはゆっくり)。300ms 後から効き始める */
        /* 接地の反動をそのまま外向きの初速に変える。
           前半は勢いよく飛び出し、後半は一定の速さで流れ続ける。
           指数減衰だけだと終盤で止まって見えるので、下限の等速成分
           (vMin)を必ず足して「絶えず動いている」状態にする。 */
        const tv = Math.max(0, te2 - 100) / 1000;
        const v0 = (980 - Math.min(430, r * 2.2)) * k;         /* 初速 px/s */
        const vMin = (215 - Math.min(95, r * 0.5)) * k;        /* 途切れない等速 */
        const burstPart = (v0 - vMin) * (1 - Math.exp(-tv * 1.6)) / 1.6;
        const sp = burstPart + vMin * tv;
        const x = c[0] + dx * sp, y = baseY + dy * sp;
        out.push(S(circle(x, y, r * (1 + sp / 2600))));
        /* 通った軌跡が薄い円のグラデーションとなって重なり合う。
           5段、後ろほど薄く小さく。本体の邪魔をしない濃度に抑える。 */
        if (ghosts) {
          const step = Math.max(14, sp * 0.09);
          for (let g = 1; g <= 5; g++) {
            const back = sp - g * step;
            if (back <= 0) continue;
            ghosts.push({ p: circle(c[0] + dx * back, baseY + dy * back, r * (1 - g * 0.035)),
                          a: (0.15 - g * 0.026) * k });
          }
        }
      }
    }
    return out;
  };

  /* ---------- 対応付け(最近傍 + 余剰は合流) ---------- */
  const centroid = (p) => {
    let x = 0, y = 0;
    for (const q of p) { x += q[0]; y += q[1]; }
    return [x / p.length, y / p.length];
  };
  const buildPairs = (src, dst) => {
    const sc = src.map((s) => centroid(s.p));
    const dc = dst.map((s) => centroid(s.p));
    const used = new Array(src.length).fill(false);
    const pairs = [];
    dst.forEach((d, di) => {
      let best = 0, bd = Infinity;
      sc.forEach((c, si) => {
        const v = Math.hypot(c[0] - dc[di][0], c[1] - dc[di][1]);
        if (v < bd) { bd = v; best = si; }
      });
      used[best] = true;
      pairs.push([best, di, false]);
    });
    src.forEach((s, si) => {
      if (used[si]) return;
      let best = 0, bd = Infinity;
      dc.forEach((c, di) => {
        const v = Math.hypot(c[0] - sc[si][0], c[1] - sc[si][1]);
        if (v < bd) { bd = v; best = di; }
      });
      pairs.push([si, best, true]);        /* 合流(到達時に消える) */
    });
    return pairs.map(([si, di, merge]) => {
      const a = src[si], b = dst[di];
      let bestK = 0, bestE = Infinity;
      for (let k = 0; k < N; k += 2) {
        let e = 0;
        for (let i = 0; i < N; i += 4) {
          const p = a.p[(i + k) % N], q = b.p[i];
          e += (p[0] - q[0]) * (p[0] - q[0]) + (p[1] - q[1]) * (p[1] - q[1]);
        }
        if (e < bestE) { bestE = e; bestK = k; }
      }
      /* 穴: どちらかにあれば、無い側は中心の微小円から生える/へ消える */
      let hA = a.hole, hB = b.hole;
      if (hA || hB) {
        if (!hA) hA = circle(centroid(a.p)[0], centroid(a.p)[1], 0.6);
        if (!hB) hB = circle(centroid(b.p)[0], centroid(b.p)[1], 0.6);
      }
      /* 移動の弧: 重心の移動量に応じて直交方向へ膨らむ。
         図形ごとに交互の向きで、流れに渦のような有機性を出す */
      const ca = centroid(a.p), cb = centroid(b.p);
      const mvx = cb[0] - ca[0], mvy = cb[1] - ca[1];
      const dist = Math.hypot(mvx, mvy);
      let nx = 0, ny = 0;
      if (dist > 1) { nx = -mvy / dist; ny = mvx / dist; }
      const bulge = Math.min(64, dist * 0.13);
      return { a: a.p, b: b.p, k: bestK, hA, hB, merge, nx, ny, bulge, cb,
               alphaA: a.a !== undefined ? a.a : 1,
               alphaB: merge ? 0 : (b.a !== undefined ? b.a : 1) };
    });
  };

  /* ---------- 描画 ---------- */
  const NSVG = 'http://www.w3.org/2000/svg';
  const pool = [];
  const needActors = (n) => {
    while (pool.length < n) {
      const el = document.createElementNS(NSVG, 'path');
      el.setAttribute('fill', COLOR);
      el.setAttribute('fill-rule', 'evenodd');
      liveG.appendChild(el);
      pool.push(el);
    }
    for (let i = 0; i < pool.length; i++) pool[i].style.display = i < n ? '' : 'none';
  };
  const ringOf = (pts) => {
    let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[(i - 1 + pts.length) % pts.length], p1 = pts[i],
            p2 = pts[(i + 1) % pts.length], p3 = pts[(i + 2) % pts.length];
      d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)
         + ',' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)
         + ',' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d + 'Z';
  };
  const drawShape = (el, pts, hole) => {
    el.setAttribute('d', ringOf(pts) + (hole ? ringOf(hole) : ''));
    if (el.__stroked) {                 /* 線描画の後始末 */
      el.removeAttribute('stroke');
      el.removeAttribute('stroke-width');
      el.removeAttribute('fill-opacity');
      el.style.strokeDasharray = '';
      el.style.strokeDashoffset = '';
      el.__stroked = false;
    }
  };

  /* ---------- タイムライン ---------- */
  /* ease: ジオメトリのみオーバーシュート付き。u=1 で厳密に 1 */
  /* soft: 速く出て長い尾で絹のように収まる(sun-asterisk 参考)。
     bold/over: 山なりに加速し、わずかに行き過ぎて戻る。
     いずれも u=1 で厳密に 1(最終形は崩れない)。 */
  /* 変形のイージング。両端で速度 0 になる smootherstep を土台にする。
     'soft' を ease-out(1-(1-u)^3.2)にしていた頃は、静止したホールドから
     いきなり最高速で走り出すので出だしが弾かれて見えた。
     溜め(overshoot)は残すが、uu を掛けて u=0 側の速度も 0 に落とす。 */
  const geoEase = (u, kind, strength) => {
    const uu = clamp01(u);
    const base = smooth(uu);
    const s = (kind === 'bold' ? 1.5 : kind === 'over' ? 2.1 : 0.7) * strength;
    const v = uu - 1;
    return base + s * 0.045 * (v * v * v + v * v) * 6.75 * uu;
  };

  const total = STATES.reduce((a, s) => a + s.t + s.h, 0);
  let strength = 1;                 /* Splash 100% → FV idle 75% */
  let firstPassDone = false;
  let fvFired = false;

  let pairCache = null, pairKey = '';
  let geomFV = false;              /* fv 以後は fvList で描く */
  let switchSrcOnce = false;       /* s11→s12 の初回だけ出発点を原座標に */
  const pick = (st) => (geomFV ? st.fvList : st.list);
  const tmp = new Array(N), tmpH = new Array(N);

  let nowRef = 0;
  /* 描いた全図形の重心から、共有の運動エネルギーを更新する。
     これが次の状態へそのまま引き継がれる(動きのリセットをしない) */
  const updateFlow = (n) => {
    let cx = 0, cy = 0, c = 0;
    for (let i = 0; i < n && i < pool.length; i++) {
      const el = pool[i];
      if (el.style.display === 'none') continue;
      const b = el.getBBox();
      cx += b.x + b.width / 2; cy += b.y + b.height / 2; c++;
    }
    if (!c) return;
    cx /= c; cy /= c;
    if (lastCentre) {
      flow.x = flow.x * 0.88 + (cx - lastCentre[0]) * 0.12;
      flow.y = flow.y * 0.88 + (cy - lastCentre[1]) * 0.12;
    }
    lastCentre = [cx, cy];
  };
  let updateFlowSkip = false;
  const renderAt = (cycleT) => {
    updateFlowSkip = false;
    /* cycleT(0..total) から現在の区間を決める */
    let acc = 0, idx = 0, into = 0;
    for (let i = 0; i < STATES.length; i++) {
      const seg = STATES[i].t + STATES[i].h;
      if (cycleT < acc + seg) { idx = i; into = cycleT - acc; break; }
      acc += seg;
      if (i === STATES.length - 1) { idx = 0; into = 0; }
    }
    const st = STATES[idx];
    const prev = STATES[(idx - 1 + STATES.length) % STATES.length];
    /* 遷移の 12%〜88% の間だけ融合させる(着地の瞬間は必ず素の形) */
    const inTrans = into < st.t;
    const tp = inTrans ? into / st.t : 1;
    setGoo(inTrans && tp > 0.12 && tp < 0.88 && !st.stroke && !prev.stroke);

    if (st.fv && !fvFired && into >= st.t * 0.62) {
      fvFired = true;
      document.dispatchEvent(new CustomEvent('miai:morph-fv'));
    }

    if (into >= st.t) {
      /* ホールド中も完全静止させない(sun-asterisk 参考)。
         各図形が位相をずらした呼吸(半径±1.2% + 2〜4pxのドリフト)を
         続ける。振幅は strength に従い、FV では一段静かになる */
      /* ■ 揺らぎは「素の形」から立ち上げ、次の遷移前に必ず 0 へ戻す。
         遷移の着地点は素の形(fvList)なのに、ホールドの揺らぎは自由な
         時計で走っているため、そのまま繋ぐとホールドに入った1フレームで
         揺らぎの分(バーなら長さ±14%、二重リングなら±15px)だけ図形が
         飛ぶ。これが「変形とは別にかくっと位置がずれる」正体。
         なお spin/meter/burst/swap は遷移側も実値で作り直しているので
         連続しており、ここで絞ると逆にズレるため素の strength のまま。 */
      const hs = into - st.t;                       /* ホールド内の経過 */
      const RAMP = 300;
      const liveSt = st.spin || st.meter || st.burst || st.swap;
      const wob = liveSt ? strength : strength
        * Math.min(1, hs / RAMP)
        * Math.min(1, Math.max(0, st.h - hs) / RAMP);
      /* --- 点の群れ: それぞれが小さな軌道を巡り、位相差で脈動する --- */
      /* --- 点の群れ ---
         真円のまま扱う(輪郭点を個別に動かすと円が歪むため、中心と半径
         だけを変える)。dotsFill のときは、ひとつずつ順に
         「線の輪」→「塗りの円」へ変わり、最後は4つとも塗りになる。 */
      /* --- 2つの円が交互に弾んで上下が入れ替わる --- */
      if (st.swap) {
        const ds = (geomFV && st.fvDots) ? st.fvDots : st.dots;
        needActors(ds.length);
        const ht4 = into - st.t;
        const midY = (ds[0][1] + ds[1][1]) / 2;
        const amp = Math.abs(ds[1][1] - ds[0][1]) / 2;    /* 入れ替わりの振幅 */
        const PERIOD = 760;                                /* 1往復 */
        const u = (ht4 % PERIOD) / PERIOD;
        /* 放物線の弾み。0→1→0 を繰り返す */
        const hop = 1 - Math.pow(2 * u - 1, 2);
        ds.forEach((d, i) => {
          /* 符号だけを反転させるので、片方が上がれば必ずもう片方は下がる */
          const sign = i ? 1 : -1;
          const y = midY + sign * amp * (1 - 2 * hop);
          /* 到達点(hop=0 / 1)の前後だけ、着地らしく横に潰す */
          const near = Math.min(hop, 1 - hop);
          const sq = near < 0.10 ? 1 - 0.14 * (1 - near / 0.10) : 1;
          const el = pool[i];
          drawShape(el, circle(d[0], y, d[2]).map(([x, yy]) =>
            [d[0] + (x - d[0]) / sq, y + (yy - y) * sq]), null);
          el.style.opacity = '1';
        });
        return;
      }
      if (st.orbit || st.dotsFill) {
        const ds = (geomFV && st.fvDots) ? st.fvDots : st.dots;
        needActors(ds.length);
        const bt0 = nowRef / 1000;
        const ht0 = into - st.t;
        ds.forEach((d, i) => {
          /* 4点は同位相で揃って呼吸する(バラバラに漂わせない=規則的) */
          const ox = Math.cos(bt0 * 1.3) * 3 * wob;
          const oy = Math.sin(bt0 * 1.3) * 3 * wob;
          const g = 1 + Math.sin(bt0 * 2.0) * 0.05 * wob;
          const el = pool[i];
          drawShape(el, circle(d[0] + ox, d[1] + oy, d[2] * g), null);
          el.style.opacity = '1';
          if (!st.dotsFill) return;
          /* 左上→右上→左下→右下 の順に、線が描かれてから塗りが差す */
          const t0 = i * 100;
          const len = el.getTotalLength ? el.getTotalLength() : 170;
          const dr = 1 - Math.pow(1 - clamp01((ht0 - t0) / 220), 2.4);
          el.__stroked = true;
          el.setAttribute('stroke', COLOR);
          el.setAttribute('stroke-width', '2.4');
          el.style.strokeDasharray = len;
          el.style.strokeDashoffset = (len * (1 - dr)).toFixed(1);
          /* 塗りは短く差し込む。半透明のオレンジを見せる間をつくらない */
          el.setAttribute('fill-opacity',
            smooth(clamp01((ht0 - t0 - 170) / 110)).toFixed(3));
        });
        return;
      }
      /* --- バー(Figma 397:61953 ほか): 液状にしなやかに伸縮する ---
         輪郭の64点を拡大縮小すると角アールまで歪んで波打つので、
         中心線の長さ(半長)だけを変え、半径は固定したまま厳密な弧で
         描き直す。端は常に真円のまま、縦だけが滑らかに伸び縮みする。 */
      if (st.elastic && st.caps) {
        const cps = (geomFV && st.fvCaps) ? st.fvCaps : st.caps;
        needActors(cps.length);
        const bt1 = nowRef / 1000;
        cps.forEach((cp, i) => {
          const x = cp[0], cy = cp[1], h0 = cp[2], r = cp[3];
          const ph = i * 1.15;
          const w = Math.sin(bt1 * 1.55 + ph);
          const h = h0 * (1 + w * 0.14 * wob);
          const dy = Math.sin(bt1 * 0.95 + ph * 1.4) * 5 * wob;
          pool[i].setAttribute('d', meterPath(x, cy + dy, Math.max(r * 0.2, h), r));
          pool[i].style.opacity = '1';
        });
        return;
      }
      /* --- 斜めのバー: 形は変えず、軸に沿って滑らせる --- */
      if (st.glide) {
        const hl1 = pick(st);
        needActors(hl1.length);
        const bt1 = nowRef / 1000;
        hl1.forEach((sh, i) => {
          const g = Math.sin(bt1 * 1.25 + i * 1.6) * 12 * wob;
          drawShape(pool[i], sh.p.map(([x, y]) => [x + g * 0.707, y - g * 0.707]), null);
          pool[i].style.opacity = '1';
        });
        return;
      }
      /* --- 重なるリング: 引き合い、共鳴して近づいたり離れたりする --- */
      if (st.resonate) {
        const hl2 = pick(st);
        needActors(hl2.length);
        const bt2r = nowRef / 1000;
        const pull = Math.sin(bt2r * 0.78) * 15 * wob;
        const mid = hl2.reduce((a2, sh) => a2 + centroid(sh.p)[0], 0) / hl2.length;
        hl2.forEach((sh, i) => {
          const c = sh.c || (sh.c = centroid(sh.p));
          const dir = c[0] < mid ? 1 : -1;                 /* 内側へ引き合う */
          const g = 1 + Math.sin(bt2r * 1.05 + i * Math.PI) * 0.035 * wob;
          const rot = Math.sin(bt2r * 0.52 + i) * 0.05 * wob;
          const cs = Math.cos(rot), sn = Math.sin(rot);
          drawShape(pool[i], sh.p.map(([x, y]) => {
            const dx0 = (x - c[0]) * g, dy0 = (y - c[1]) * g;
            return [c[0] + dx0 * cs - dy0 * sn + pull * dir, c[1] + dx0 * sn + dy0 * cs];
          }), sh.hole ? sh.hole.map(([x, y]) => {
            const dx0 = (x - c[0]) * g, dy0 = (y - c[1]) * g;
            return [c[0] + dx0 * cs - dy0 * sn + pull * dir, c[1] + dx0 * sn + dy0 * cs];
          }) : null);
          pool[i].style.opacity = '1';
        });
        return;
      }
      /* --- N形(Figma 277:37247): 輪郭を線で描いていき、描き切った
         直後だけベタ塗りを一瞬見せて、また線に戻る ---
           0- 620ms  外形を stroke で描く(dashoffset を詰める)
         620- 900ms  塗りが差し、ピークで一瞬だけベタ(280ms)
         900-1150ms  塗りが引いて線だけが残り、静かに息づく */
      if (st.stroke) {
        const hl4 = pick(st);
        needActors(hl4.length);
        const ht = into - st.t;          /* ホールド内の経過(0..st.h) */
        hl4.forEach((sh, i) => {
          const e = pool[i];
          drawShape(e, sh.p, sh.hole);
          const len = e.getTotalLength ? e.getTotalLength() : 2600;
          const draw = clamp01(ht / 620);
          const dr = 1 - Math.pow(1 - draw, 3);
          e.style.strokeDasharray = len;
          e.style.strokeDashoffset = (len * (1 - dr)).toFixed(1);
          e.__stroked = true;
          e.setAttribute('stroke', COLOR);
          e.setAttribute('stroke-width', '6');
          e.setAttribute('stroke-linejoin', 'round');
          /* 塗りは描き切ってから差し、ピークで一瞬だけベタ */
          const fu = clamp01((ht - 620) / 110);
          const fd = clamp01((ht - 900) / 110);
          e.setAttribute('fill-opacity', (smooth(fu) * (1 - smooth(fd))).toFixed(3));
          e.style.opacity = '1';
        });
        return;
      }
      /* --- 液状: 輪郭が波打ち、ゼリーのように柔らかく揺れる --- */
      if (st.jelly) {
        const hl3 = pick(st);
        needActors(hl3.length);
        const bt3 = nowRef / 1000;
        hl3.forEach((sh, i) => {
          const c = sh.c || (sh.c = centroid(sh.p));
          const ph = i * 2.1;
          const pts = sh.p.map(([x, y], j) => {
            const ang = (j / N) * Math.PI * 2;
            /* 輪郭に沿って進む2つの波。法線方向へごく浅く出入りする */
            const w = Math.sin(ang * 2 - bt3 * 1.25 + ph) * 0.030
                    + Math.sin(ang * 3 + bt3 * 0.85 + ph * 1.7) * 0.018;
            const g = 1 + w * wob;
            return [c[0] + (x - c[0]) * g, c[1] + (y - c[1]) * g];
          });
          drawShape(pool[i], pts, sh.hole);
          pool[i].style.opacity = '1';
        });
        return;
      }
      /* --- ひとつの円が描く軌跡 → 波紋 ---
           0- 760ms  丸が円周を1周し、通った後がラインになる
         760-1050ms  丸が溶け、描かれた円が波紋として外へ広がり始める
        1050-1450ms  内側にもう一本の波紋が湧き、二重の輪になって次へ */
      if (st.ripple) {
        const hl6 = pick(st);
        const ht3 = into - st.t;
        const c = geomFV ? [1160 + (st.fdx || 0), 456 + (st.fdy || 0) + (st.fvShift || 0)]
                         : [1160, 456];
        needActors(3);
        const draw = clamp01(ht3 / 760);
        const dr = 1 - Math.pow(1 - draw, 2.2);
        /* 外側の輪。描き切ってから波紋として少し外へ開く */
        const g0 = 1 + smooth(clamp01((ht3 - 760) / 690)) * 0.075 * wob;
        const e0 = pool[0];
        drawShape(e0, hl6[0].p.map(([x, y]) =>
          [c[0] + (x - c[0]) * g0, c[1] + (y - c[1]) * g0]), null);
        const len0 = e0.getTotalLength ? e0.getTotalLength() : 3000;
        e0.__stroked = true;
        e0.setAttribute('stroke', COLOR);
        e0.setAttribute('stroke-width', '2.4');
        e0.style.strokeDasharray = len0;
        e0.style.strokeDashoffset = (len0 * (1 - dr)).toFixed(1);
        e0.setAttribute('fill-opacity', '0');
        e0.style.opacity = '1';
        /* 内側の波紋。中心から湧いて広がる */
        /* 内側の波紋。中心から湧いて広がるが、外側(246)には届かない
           大きさ(150)で止まるので線同士が重ならない */
        const ri = clamp01((ht3 - 980) / 470);
        const e1 = pool[1];
        const gi = 0.05 + smooth(ri) * 0.95;
        drawShape(e1, hl6[1].p.map(([x, y]) =>
          [c[0] + (x - c[0]) * gi, c[1] + (y - c[1]) * gi]), null);
        e1.__stroked = true;
        e1.setAttribute('stroke', COLOR);
        e1.setAttribute('stroke-width', '2.0');
        e1.style.strokeDasharray = '';
        e1.style.strokeDashoffset = '';
        e1.setAttribute('fill-opacity', '0');
        /* 薄いオレンジは使わない。出ている間は原色のまま、
           大きさ(gi)だけで湧き上がりを見せる */
        e1.style.opacity = ri > 0 ? '1' : '0';
        /* 描いている丸。1周したら溶ける */
        const e2 = pool[2];
        /* 丸は描画の先端に居る。丸が通った後だけ線が残るので、
           軌跡がそのまま円になっていくように見える */
        const th = (-90 + dr * 360) * Math.PI / 180;
        const R0 = 246 * g0;
        const fade = 1 - smooth(clamp01((ht3 - 700) / 260));
        drawShape(e2, circle(c[0] + Math.cos(th) * R0, c[1] + Math.sin(th) * R0,
                             Math.max(0.5, 13 * fade)), null);
        /* 溶けるのは半径だけ。色は最後まで原色 */
        e2.style.opacity = fade > 0.05 ? '1' : '0';
        return;
      }
      /* --- 円の軌跡 ---
           0- 640ms  走る円が残した軌跡が「線」として描かれていく
         640- 940ms  線に塗りが差して、太さのあるリングになる
         940-1250ms  そのまま回りながら次の形へ渡す
         走る円は最初から実体で、弧の上を巡り続ける。 */
      if (st.orbitTrail) {
        const hlo = pick(st);
        needActors(hlo.length);
        const ht2 = into - st.t;
        const bt5 = nowRef / 1000;
        const SPD = [0.12, -0.08, 0.46, -0.33];
        const c = geomFV ? [1160 + (st.fdx || 0), 456 + (st.fdy || 0) + (st.fvShift || 0)]
                         : [1160, 456];
        hlo.forEach((sh, i) => {
          const el = pool[i];
          const rot = bt5 * SPD[i % SPD.length] * wob;
          const cs = Math.cos(rot), sn = Math.sin(rot);
          drawShape(el, sh.p.map(([x, y]) => {
            const dx0 = x - c[0], dy0 = y - c[1];
            return [c[0] + dx0 * cs - dy0 * sn, c[1] + dx0 * sn + dy0 * cs];
          }), null);
          el.style.opacity = '1';
          if (i >= 2) return;                     /* 走る円はそのまま実体 */
          /* リングは 線 → 塗り の順で立ち上がる */
          const len = el.getTotalLength ? el.getTotalLength() : 3000;
          const dr = 1 - Math.pow(1 - clamp01((ht2 - i * 140) / 640), 3);
          el.__stroked = true;
          el.setAttribute('stroke', COLOR);
          el.setAttribute('stroke-width', '2.4');
          el.setAttribute('stroke-linejoin', 'round');
          el.style.strokeDasharray = len;
          el.style.strokeDashoffset = (len * (1 - dr)).toFixed(1);
          /* 塗りは一気に差す。半透明のオレンジを見せる時間をつくらない */
          el.setAttribute('fill-opacity', smooth(clamp01((ht2 - 640 - i * 90) / 120)).toFixed(3));
        });
        return;
      }
      if (st.spin) {
        const rl = ringList(nowRef, strength, geomFV ? (st.fdy || 0) + (st.fvShift || 0) : 0,
                            geomFV ? (st.fdx || 0) : 0);
        needActors(rl.length);
        rl.forEach((sh, i) => { drawShape(pool[i], sh.p, null); pool[i].style.opacity = sh.a.toFixed(3); });
        return;
      }
      if (st.burst) {
        /* バウンド中は共有の慣性を効かせない(垂直を保つため) */
        flow.x *= 0.55; flow.y *= 0.55;
        /* 残像(薄いオレンジ)は使わない。原色の円だけで動きを見せる */
        /* 遷移側は burstList(st, into, ...) で駆動している。ホールドで
           st.t を足すと、遷移からホールドへ移った1フレームで弾みの時計が
           st.t(2100ms)ぶん飛び、円がまとめて瞬間移動していた。 */
        const bl = burstList(st, into, strength, null);
        needActors(bl.length);
        const bt2 = nowRef / 1000;
        bl.forEach((sh, i) => {
          const c = centroid(sh.p);
          const w = Math.sin(bt2 * 1.9 + i * 1.3) * 0.008 * wob;
          drawShape(pool[i], sh.p.map(([x, y]) =>
            [c[0] + (x - c[0]) * (1 + w), c[1] + (y - c[1]) * (1 + w)]), null);
          pool[i].style.opacity = '1';
        });
        updateFlowSkip = true;
        return;
      }
      if (st.meter) {
        /* サウンドメーターは常時生きている。呼吸は掛けない */
        const ml = meterList(nowRef, geomFV ? (st.fdx || 0) : 0,
                             geomFV ? ((st.fdy || 0) + (st.fvShift || 0)) : 0, wob);
        needActors(ml.length);
        ml.forEach((sh, i) => { pool[i].setAttribute('d', sh.d); pool[i].style.opacity = '1'; });
        return;
      }
      const hl = pick(st);
      needActors(hl.length);
      const bt = nowRef / 1000;
      /* 次の変形の予兆: 260ms 前から進行方向と逆へ溜める */
      const toGo = st.t + st.h - into;
      const antic = toGo < 260 ? smooth(1 - toGo / 260) : 0;
      hl.forEach((s, i) => {
        const cx = s.cx !== undefined ? s.cx : (s.cx = centroid(s.p)[0]);
        const cy = s.cy !== undefined ? s.cy : (s.cy = centroid(s.p)[1]);
        const ph = i * 1.7;
        const w1 = 0.5 + 0.5 * LFN(bt, ph);
        const w2 = 0.5 + 0.5 * LFN(bt * 0.62, ph * 2.3 + 4.1);
        const grow = 1 + (w1 - 0.5) * 0.026 * wob;
        /* 質量: 大きいものほど遅れて動く */
        let rad = 0;
        for (const q of s.p) rad = Math.max(rad, Math.hypot(q[0] - cx, q[1] - cy));
        const lag = lagOf(rad);
        const dx = (w2 - 0.5) * 6 * wob + flow.x * (1.1 - lag) * 2.4
                 - antic * flow.x * 3.2;
        const dy = (w1 - 0.5) * 4 * wob + flow.y * (1.1 - lag) * 2.4
                 - antic * flow.y * 3.2;
        /* 運動方向へわずかに引き伸ばす(後端が遅れて追いつく) */
        const sp = Math.hypot(flow.x, flow.y);
        const ux = sp > 0.01 ? flow.x / sp : 0, uy = sp > 0.01 ? flow.y / sp : 0;
        const st2 = Math.min(0.10, sp * 0.014) * wob;
        for (let j = 0; j < N; j++) {
          let px = (s.p[j][0] - cx) * grow, py = (s.p[j][1] - cy) * grow;
          const along = px * ux + py * uy;
          px += ux * along * st2; py += uy * along * st2;
          tmp[j] = [cx + px + dx, cy + py + dy];
        }
        let hole = null;
        if (s.hole) {
          for (let j = 0; j < N; j++) {
            tmpH[j] = [cx + (s.hole[j][0] - cx) * grow + dx, cy + (s.hole[j][1] - cy) * grow + dy];
          }
          hole = tmpH;
        }
        drawShape(pool[i], tmp, hole);
        pool[i].style.opacity = '1';
      });
      return;
    }
    /* バーストへの遷移は buildPairs を使わない。
       前の形が中心へ吸い込まれながら、入れ替わりに円が外へ弾け出る。 */
    if (st.burst) {
      flow.x *= 0.55; flow.y *= 0.55;      /* 垂直を保つ */
      const prevList = pick(prev);
      const bl = burstList(st, into, strength, null);
      needActors(prevList.length + bl.length);
      const collapse = smooth(clamp01(into / (st.t * 0.42)));
      prevList.forEach((sh, i) => {
        const c = sh.c || (sh.c = centroid(sh.p));
        const sc = 1 - collapse;
        const pts = sh.p.map(([x, y]) => [
          lerp(BURST_O[0], c[0] + (x - c[0]) * sc, 1 - collapse * 0.85),
          lerp(BURST_O[1], c[1] + (y - c[1]) * sc, 1 - collapse * 0.85)
        ]);
        drawShape(pool[i], pts, null);
        /* sc→0 で大きさ自体が消えるので、色は原色のまま保つ */
        pool[i].style.opacity = collapse < 0.995 ? '1' : '0';
      });
      bl.forEach((sh, i) => {
        const el = pool[prevList.length + i];
        drawShape(el, sh.p, null);
        el.style.opacity = '1';
      });
      pairKey = '';                 /* 次の遷移で必ず作り直す */
      return;
    }

    /* fv への切替: 最初の s11→s12 遷移で発動。出発点だけ原座標の S11 を
       使うので画面上の形はスナップしない(S12 以降は両変種で同一) */
    if (!geomFV && fvFired && st.id === 's12') { geomFV = true; switchSrcOnce = true; }
    /* S12 は spin(実値で毎フレーム対応付けを作り直す)状態なので、出発点の
       固定を「1回だけ」にすると2フレーム目から pick(prev) = FV 座標の
       S11 に戻ってしまい、円が 421px 瞬間移動していた。
       s11→s12 の遷移が終わるまで固定を保つ。 */
    if (switchSrcOnce && !(st.id === 's12' && into < st.t)) switchSrcOnce = false;
    /* メーターへ入る/出る遷移は、到達側/出発側を毎フレームのライブ値に
       するため対応付けを作り直す(高さが飛ばない) */
    const liveMeter = st.meter || prev.meter || st.spin || prev.spin || prev.burst
                    || prev.swap;
    const key = prev.id + '>' + st.id + (geomFV ? '/fv' : '') + (liveMeter ? '/' + Math.round(into) : '');
    if (pairKey !== key) {
      let srcList = (switchSrcOnce && st.id === 's12') ? prev.list : pick(prev);
      let dstList = pick(st);
      /* メーターの遷移は、ホールドと「同じ」オフセットで作る。
         ここが固定値(15,0)だったため、着地した次のフレームで
         fdx/fdy/fvShift の差だけメーターが横飛びしていた。 */
      const mOff = (s) => (geomFV
        ? [(s.fdx || 0), (s.fdy || 0) + (s.fvShift || 0)]
        : [0, 0]);
      if (st.meter) { const o = mOff(st); dstList = meterList(nowRef, o[0], o[1], strength); }
      if (prev.meter) { const o = mOff(prev); srcList = meterList(nowRef, o[0], o[1], strength); }
      if (prev.burst) srcList = burstList(prev, prev.t + prev.h + into * 0.75, strength, null);
      if (st.spin) dstList = ringList(nowRef, strength, geomFV ? (st.fdy || 0) + (st.fvShift || 0) : 0,
                                     geomFV ? (st.fdx || 0) : 0);
      if (prev.spin) srcList = ringList(nowRef, strength, geomFV ? (prev.fdy || 0) + (prev.fvShift || 0) : 0,
                                       geomFV ? (prev.fdx || 0) : 0);
      pairCache = buildPairs(srcList, dstList);
      pairKey = key;
    }
    const nPairs = pairCache.length;
    const stag = nPairs > 1 ? Math.min(64, (st.t * 0.18) / (nPairs - 1)) : 0;
    const actDur = st.t - stag * (nPairs - 1);
    needActors(nPairs);
    pairCache.forEach((pr, i) => {
      const local = clamp01((into - stag * i) / actDur);
      const ug = geoEase(local, st.e, strength);
      /* 弧: 中間で最大、両端で0。u=1 では必ず消える。
         回転で寄せる遷移(spinIn)では回転が曲線を担うので弧は掛けない */
      const arc = st.spinIn ? 0
        : pr.bulge * 4 * ug * (1 - ug) * (i % 2 ? -1 : 1) * strength;
      const ax = pr.nx * arc, ay = pr.ny * arc;
      for (let j = 0; j < N; j++) {
        const p = pr.a[(j + pr.k) % N], q = pr.b[j];
        tmp[j] = [lerp(p[0], q[0], ug) + ax, lerp(p[1], q[1], ug) + ay];
      }
      let hole = null;
      if (pr.hA) {
        for (let j = 0; j < N; j++) {
          const p = pr.hA[j], q = pr.hB[j];
          tmpH[j] = [lerp(p[0], q[0], ug), lerp(p[1], q[1], ug)];
        }
        hole = tmpH;
      }
      /* 到達形の中心まわりに時計回り(SVG は y 下向きなので正が時計回り)。
         角度は 0 → spinIn。着地時は全員が同じ円なので回転は見えなくなる。 */
      if (st.spinIn) {
        const ang = st.spinIn * ug;
        const cs = Math.cos(ang), sn = Math.sin(ang);
        const bx = pr.cb[0], by = pr.cb[1];
        const rot = (pt) => {
          const dx0 = pt[0] - bx, dy0 = pt[1] - by;
          return [bx + dx0 * cs - dy0 * sn, by + dx0 * sn + dy0 * cs];
        };
        for (let j = 0; j < N; j++) tmp[j] = rot(tmp[j]);
        if (hole) for (let j = 0; j < N; j++) tmpH[j] = rot(tmpH[j]);
      }
      drawShape(pool[i], tmp, hole);
      /* 合流組も色は原色のまま。相手の輪郭にぴたりと重なって畳まれるので、
         半透明にしなくても版ズレにならない(同じ色が重なるだけ)。 */
      pool[i].style.opacity = '1';
    });
  };

  /* ---------- ひとつの生命体としての「場」 ----------
     状態が変わっても動きをリセットしない。全ての形が共有する
     速度ベクトル(FLOW)と、次の変形の予兆(ANTICIPATION)を持つ。

     ・FLOW: 遷移で生まれた重心の移動が慣性として残り、指数減衰しながら
       次の状態へ持ち越される。形はこの速度の向きへわずかに引き伸ばされ、
       後端が遅れて追いつく(質量に応じて遅れ量が変わる)。
     ・ANTICIPATION: 次の遷移が始まる 260ms 前から内部のエネルギーが
       動き出し、進行方向と逆へ小さく「溜める」。
     ・LFN: 位相の異なる低周波を重ねた擬似ノイズ。sin 一本の往復に
       見えないようにする。周期そのものもゆっくり揺れる。 */
  const flow = { x: 0, y: 0 };          /* 共有の運動エネルギー(px/frame) */
  let lastCentre = null;
  const LFN = (t, seed) => Math.sin(t * 0.41 + seed) * 0.55
                         + Math.sin(t * 0.97 + seed * 2.3) * 0.30
                         + Math.sin(t * 1.63 + seed * 3.7) * 0.15;
  /* 質量に応じた遅れ。半径が大きいほど鈍い */
  const lagOf = (r) => clamp01(0.18 + Math.min(0.62, r / 260));

  /* ---------- マイクロモーション / 奥行き / スクロール ---------- */
  const sample2 = (states, u) => {
    const n = states.length - 1;
    const p = clamp01(u) * n;
    const i = Math.min(Math.floor(p), n - 1);
    const f = smooth(p - i);
    return [states[i][0] + (states[i + 1][0] - states[i][0]) * f,
            states[i][1] + (states[i + 1][1] - states[i][1]) * f];
  };
  const DRIFT_A = [[0, 0], [3.6, -2.2], [-2.8, 3.4], [1.8, -3.0], [0, 0]];   /* 7.3s */
  const DRIFT_B = [[0.5, -0.4], [-0.35, 0.3], [0.25, 0.45], [0.5, -0.4]];    /* 11.7s 回転/スケール */
  let tiltX = 0, tiltY = 0, tiltTX = 0, tiltTY = 0;
  const hero = document.querySelector('.hero--brushup') || svg.parentElement;
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const nx = clamp01((e.clientX - r.left) / r.width);
      const ny = clamp01((e.clientY - r.top) / r.height);
      tiltTY = (nx - 0.5) * 6;        /* rotateY ±3deg */
      tiltTX = (0.5 - ny) * 4;        /* rotateX ±2deg */
    });
    hero.addEventListener('pointerleave', () => { tiltTX = 0; tiltTY = 0; });
  }

  const applyStage = (now) => {
    /* ポインタへ遅れて追従(約180ms) */
    tiltX += (tiltTX - tiltX) * 0.055;
    tiltY += (tiltTY - tiltY) * 0.055;
    const a = sample2(DRIFT_A, (now % 7300) / 7300);
    const b = sample2(DRIFT_B, (now % 11700) / 11700);
    const k = strength;
    /* スクロール 0〜15vh: 次のセクションへ静かに接続 */
    const sv = clamp01(scrollY / (innerHeight * 0.15));
    const sc = (1 + b[1] * 0.006 * k) * (1 - 0.03 * sv);
    svg.style.transform =
      'perspective(1200px)' +
      ' rotateX(' + (tiltX + b[0] * 0.6 * k).toFixed(3) + 'deg)' +
      ' rotateY(' + (tiltY).toFixed(3) + 'deg)' +
      ' translate3d(' + (a[0] * k).toFixed(2) + 'px,' + (a[1] * k + 14 * sv).toFixed(2) + 'px,0)' +
      ' rotate(' + (b[0] * 0.5 * k).toFixed(3) + 'deg)' +
      ' scale(' + sc.toFixed(4) + ')';
    svg.style.opacity = String(1 - 0.08 * sv);
  };

  /* ---------- メインループ ---------- */
  let t0 = null, raf = 0, running = false;
  let pausedByVisibility = false;
  /* 開始位相: 1周目は S04 のホールドから始める(ラップ遷移 20→04 は
     2周目以降にだけ現れる)。スプラッシュのドットが既に S04 に居るため */
  const START_OFFSET = STATES[0].t;
  let lastPhase = START_OFFSET;      /* 一時停止(画面外)からの復帰用 */
  const frame = (now) => {
    if (t0 === null) t0 = now - (lastPhase - START_OFFSET);
    let t = now - t0 + START_OFFSET;
    lastPhase = t;
    const cycleT = t % total;
    if (t >= total + START_OFFSET && !firstPassDone) { firstPassDone = true; strength = 0.75; }
    nowRef = now;
    renderAt(cycleT);
    if (!updateFlowSkip) updateFlow(pool.length);
    applyStage(now);
    raf = requestAnimationFrame(frame);
  };

  /* 画面外では止める(ループは戻ったときに続きから) */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      const vis = es[0].isIntersecting;
      if (!vis && raf) { cancelAnimationFrame(raf); raf = 0; pausedByVisibility = true; }
      else if (vis && running && pausedByVisibility && !raf) {
        pausedByVisibility = false;
        t0 = null;                     /* 復帰時は続きの位相から */
        raf = requestAnimationFrame(frame);
      }
    }, { threshold: 0 }).observe(svg);
  }

  /* 円が複数あって互いに近づく状態では、メタボールで融合させる。
     ひとつの形しかない状態や、既に有機的な塊(ブロブ/N形)では掛けない。 */
  /* 融合は「形から形へ移る途中」だけ。静止(ホールド)では必ず外し、
     Figma どおりの綺麗な輪郭に戻す。遷移の入りと出でも掛け外しを
     なめらかにするため、中盤だけ有効にする。 */
  let gooOn = null;
  const setGoo = (on) => {
    if (gooOn === on) return;
    gooOn = on;
    if (on) liveG.setAttribute('filter', 'url(#hm-goo)');
    else liveG.removeAttribute('filter');
  };

  const showStatic = () => {
    staticG.style.display = '';
    liveG.style.display = 'none';
  };

  const api = {
    /* スプラッシュのドットが着地する S04 の画面座標 */
    pointScreen(x, y) {
      const m = svg.getScreenCTM();
      if (!m) return null;
      const p = svg.createSVGPoint(); p.x = x; p.y = y;
      const s = p.matrixTransform(m);
      return { x: s.x, y: s.y, scale: m.a };
    },
    start() {
      if (running) return;
      running = true;
      if (REDUCED) { showStatic(); document.dispatchEvent(new CustomEvent('miai:morph-fv')); return; }
      staticG.style.display = 'none';
      liveG.style.display = '';
      raf = requestAnimationFrame(frame);
    }
  };
  window.__miaiHeroMorph = api;

  /* 初期状態: 静的グループ(= Figma 最終形)は JS 到達時点で隠し、
     スプラッシュからの start() を待つ。幕が無い環境では自走。 */
  if (REDUCED) { showStatic(); return; }
  staticG.style.display = 'none';
  if (!document.getElementById('intro-overlay')) {
    document.body.classList.contains('fv-in')
      ? api.start()
      : document.addEventListener('miai:fv-in', () => api.start(), { once: true });
  }
})();
