/* proto-review(Cuolega)の js/logo-guide-v2.js をそのまま採用。
   参考ページと同じレイアウト・同じ描画順にするため、ロジックは未改変。
   props側は .lg2-mount の data-* で素材とラベルを渡すだけ
   (斜めガイドは props のマークが傾いていないため data-angle を省略している)。 */
/* ============ ブランドガイドライン アイソレーション図解 v2 ============
   Figma「LOGOMARK / LOGOTYPE」ページ(584:11768 ほか)のレイアウトを再現する。
   構成は3ブロック:
     a) マーク単体カード      … 正方形の破線ボックス + 右にX(高さ)/下にX(幅)の矢印
     b) フルロックアップカード … 内側=ロゴ実寸の破線ボックス、外側=クリアスペース
                                境界。四辺に「1X」矢印(1X = マークの1辺 = マーク高)
     c) 最小サイズ行          … マーク単体(1.6X)/ ワードマーク(11.8X)/
                                印刷最小(8mm)/ デジタル最小(24px)の4点

   モーションは v1(js/logo-detail-guide.js)の技法を踏襲する:
     - 破線は「可視要素のdasharrayは静的なまま、重ねたmask内の実線を
       stroke-dashoffsetで送る」reveal方式(armDraw)
     - ワードマークは1文字ずつ アウトライン描画 → 塗りが入って完成
     - O/A のような穴あき文字は複合パスをサブパスごとに分割してstroke用に使い、
       塗りは未分割のdで別pathにする(分割しないと穴が塗り潰される)
     - 描画順は左→右。ローカルbboxではなく画面座標(getBoundingClientRect)で
       判定する(親のtransform/入れ子svgのオフセットを取り込むため)
     - IntersectionObserver(threshold .3)で一度だけ再生
     - ガイド線がすべて完了してから、最後にワードマークが書き込まれる
     - prefers-reduced-motion では最初から完成状態を静的表示                     */
(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let uid = 0;
  /* ガイド線フェーズの「最後の1本が終わる時刻」。ワードマークは必ずこの後に
     始める必要があるため、各arm*が実測で更新する(手打ちの定数だと
     タイミングを1つ調整するたびにズレて順序が崩れる)。 */
  let seqEnd = 0;
  const track = (delay, dur) => { seqEnd = Math.max(seqEnd, delay + dur); };

  const el = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  /* fill="var(--fill-0, #111112)" 形式からフォールバック色を取り出す */
  const resolveFill = (v) => {
    if (!v) return null;
    const m = v.match(/var\(\s*--[\w-]+\s*,\s*([^)]+)\)/);
    return (m ? m[1] : v).trim();
  };

  const loadArt = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
    const doc = new DOMParser().parseFromString(await res.text(), "image/svg+xml");
    const root = doc.documentElement;
    if (!root || root.nodeName === "parsererror") throw new Error(`parse ${url}`);
    const vb = (root.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
    if (vb.length < 4 || !vb[2] || !vb[3]) throw new Error(`viewBox ${url}`);
    /* 原点(vb[0], vb[1])も持ち回る。ロックアップ1枚を切り出して作った素材は
       原点が 0 0 にならないので、捨てるとその分アートがずれて配置される。 */
    return { root, x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
  };

  /* 取り込んだSVGの id / url(#id) を一意化する。同一ページに同じアートを
     複数回置くとclipPath等のidが衝突して片方が消えるため。 */
  const namespaceIds = (node, prefix) => {
    const map = {};
    node.querySelectorAll("[id]").forEach((n) => {
      const old = n.getAttribute("id");
      const neu = `${prefix}${old}`;
      map[old] = neu;
      n.setAttribute("id", neu);
    });
    const fix = (n) => {
      for (const attr of Array.from(n.attributes || [])) {
        const m = attr.value.match(/^url\(#(.+)\)$/);
        if (m && map[m[1]]) n.setAttribute(attr.name, `url(#${map[m[1]]})`);
      }
      Array.from(n.children).forEach(fix);
    };
    fix(node);
  };

  /* アートを入れ子<svg>として配置。Figma書き出し末尾の白背景rectは除去する
     (残すと図解の線やロゴを白で覆い隠してしまう)。 */
  const placeArt = (parent, art, x, y, w, h) => {
    const box = el("svg", {
      x, y, width: w, height: h,
      viewBox: `${art.x} ${art.y} ${art.w} ${art.h}`,
      preserveAspectRatio: "xMidYMid meet",
      overflow: "visible",
    });
    Array.from(art.root.childNodes).forEach((n) => {
      if (n.nodeType === 1) box.appendChild(document.importNode(n, true));
    });
    namespaceIds(box, `a${uid++}-`);
    /* Figma書き出し末尾の白背景rectを除去する。ただし <clipPath> の中の
       矩形も fill="white" なので、それを消すとクリップ形状が空になり
       アート全体がクリップアウトされて消える。defs/clipPath配下は除外する。 */
    box.querySelectorAll("rect").forEach((r) => {
      if (r.closest("clipPath") || r.closest("defs") || r.closest("mask")) return;
      if ((resolveFill(r.getAttribute("fill")) || "").toLowerCase() === "white") r.remove();
    });
    box.querySelectorAll("path").forEach((p) => {
      const f = resolveFill(p.getAttribute("fill"));
      if (f) p.setAttribute("fill", f);
    });
    parent.appendChild(box);
    return box;
  };

  /* ---------- モーション仕込み(v1と同じ考え方) ---------- */

  /* 破線をdasharrayを保ったまま「描く」: 同座標の実線をmaskに入れて
     stroke-dashoffsetを送る。maskUnitsは明示指定が必須(省略するとビューポート
     基準の既定値になり、原点から離れた図形が欠ける)。 */
  const armDraw = (defs, node, delay, dur) => {
    track(delay, dur);
    if (reduced) return;
    const tag = node.tagName.toLowerCase();
    let reveal, minX, minY, maxX, maxY, len;
    const SW = 24, PAD = 20;
    if (tag === "line") {
      const x1 = +node.getAttribute("x1"), y1 = +node.getAttribute("y1");
      const x2 = +node.getAttribute("x2"), y2 = +node.getAttribute("y2");
      reveal = el("line", { x1, y1, x2, y2, stroke: "#fff", "stroke-width": SW, "stroke-linecap": "round" });
      len = Math.hypot(x2 - x1, y2 - y1);
      minX = Math.min(x1, x2); maxX = Math.max(x1, x2);
      minY = Math.min(y1, y2); maxY = Math.max(y1, y2);
    } else {
      const x = +node.getAttribute("x"), y = +node.getAttribute("y");
      const w = +node.getAttribute("width"), h = +node.getAttribute("height");
      reveal = el("rect", { x, y, width: w, height: h, fill: "none", stroke: "#fff", "stroke-width": SW });
      len = 2 * (w + h);
      minX = x; maxX = x + w; minY = y; maxY = y + h;
    }
    reveal.style.strokeDasharray = `${len} ${len}`;
    reveal.style.strokeDashoffset = String(len);
    reveal.style.setProperty("--d", `${delay}s`);
    reveal.style.setProperty("--dur", `${dur}s`);
    reveal.setAttribute("data-lg2-draw", "");
    const id = `lg2m${uid++}`;
    const mask = el("mask", {
      id, maskUnits: "userSpaceOnUse",
      x: minX - PAD, y: minY - PAD,
      width: (maxX - minX) + PAD * 2, height: (maxY - minY) + PAD * 2,
    });
    mask.appendChild(reveal);
    defs.appendChild(mask);
    node.setAttribute("mask", `url(#${id})`);
  };

  const armFade = (node, delay, dur) => {
    track(delay, dur);
    if (reduced) return;
    node.style.opacity = "0";
    node.style.setProperty("--d", `${delay}s`);
    node.style.setProperty("--dur", `${dur}s`);
    node.setAttribute("data-lg2-fade", "");
  };

  /* ---------- 部品 ---------- */

  const dashBox = (g, defs, x, y, w, h, delay, dur, cls) => {
    const r = el("rect", { x, y, width: w, height: h, class: cls || "lg2-box" });
    g.appendChild(r);
    armDraw(defs, r, delay, dur);
    return r;
  };

  /* 両端に矢羽根の付いた寸法線 */
  const dimArrow = (g, defs, x1, y1, x2, y2, delay, dur, cls) => {
    const line = el("line", { x1, y1, x2, y2, class: cls || "lg2-dim" });
    g.appendChild(line);
    armDraw(defs, line, delay, dur);
    const len = Math.hypot(x2 - x1, y2 - y1);
    const dx = (x2 - x1) / len, dy = (y2 - y1) / len;
    const S = 7;
    const head = (tx, ty, ux, uy) => {
      const bx = tx - ux * S, by = ty - uy * S;
      const px = -uy * S * 0.5, py = ux * S * 0.5;
      const p = el("polygon", {
        points: `${tx},${ty} ${bx + px},${by + py} ${bx - px},${by - py}`,
        class: (cls || "lg2-dim") + "-head",
      });
      g.appendChild(p);
      armFade(p, delay + dur * 0.6, 0.4);
    };
    head(x1, y1, -dx, -dy);
    head(x2, y2, dx, dy);
  };

  /* 8mm / 24px 用の角括弧(端が内向きに折れた寸法記号) */
  const bracket = (g, defs, x1, x2, y, delay, dur) => {
    const T = 9;
    const p = el("path", { d: `M${x1} ${y - T}V${y}H${x2}V${y - T}`, class: "lg2-bracket" });
    g.appendChild(p);
    track(delay, dur);
    if (!reduced) {
      const len = p.getTotalLength();
      p.style.strokeDasharray = `${len} ${len}`;
      p.style.strokeDashoffset = String(len);
      p.style.setProperty("--d", `${delay}s`);
      p.style.setProperty("--dur", `${dur}s`);
      p.setAttribute("data-lg2-draw", "");
    }
    return p;
  };

  const label = (g, x, y, text, delay, cls) => {
    const t = el("text", { x, y, class: cls || "lg2-label", "text-anchor": "middle" });
    t.textContent = text;
    g.appendChild(t);
    armFade(t, delay, 0.45);
    return t;
  };

  /* 複合パス(穴あき文字)をサブパスごとに分割する。stroke用にはこの分割版を
     使い、塗りは未分割のdのままにする。 */
  const splitSubpaths = (d) => (d.match(/[Mm][^Mm]*/g) || [d]).map((s) => s.trim()).filter(Boolean);

  async function build(mount) {
    const d = mount.dataset;
    const markSrc = d.markSrc, wordSrc = d.wordSrc;
    const gapRatio = parseFloat(d.gapRatio);
    const minPrintLabel = d.minPrintLabel || "8mm";
    const minDigitalLabel = d.minDigitalLabel || "24px";
    const markLabel = d.markLabel || "1.6X";
    const wordLabel = d.wordLabel || "11.8X";

    const [mark, word] = await Promise.all([loadArt(markSrc), loadArt(wordSrc)]);
    seqEnd = 0;

    /* 基準単位。X = マークの1辺(=マーク高)。クリアスペースの1Xもこれ。 */
    const X = mark.h;
    const markW = mark.w * (X / mark.h);       // = mark.w
    /* ワードマークはマークと同じ高さとは限らない(Figma の各案で比率が違う)。
       data-word-scale = ワードマーク高 ÷ マーク高。 */
    const wordScale = parseFloat(d.wordScale) || 1;
    const wordH = X * wordScale;
    const wordW = word.w * (wordH / word.h);
    const gap = X * gapRatio;
    const lockW = markW + gap + wordW;

    const svg = el("svg", {});
    const defs = el("defs", {});
    svg.appendChild(defs);
    mount.appendChild(svg);                     // getBBox/getTotalLength用に先に接続

    /* ===== ブロックa) マーク単体カード ===== */
    const gA = el("g", {});
    svg.appendChild(gA);
    const S = X * 2.15;                         // 破線正方形の一辺(Figma実測比)
    const aMarkX = (S - markW) / 2, aMarkY = (S - X) / 2;
    const aVertX = S + X * 0.75;
    const aHorzY = S + X * 0.40;
    dashBox(gA, defs, 0, 0, S, S, 0, 0.9);
    placeArt(gA, mark, aMarkX, aMarkY, markW, X);

    /* X寸法線への引き出し線(ティールの点線・Figma 585:12333)。
       破線ボックスの辺からではなく「マーク自体の外形」から引く延長線。
       A(斜線2本・横長)/B(円)/C(リング)でシルエットが異なるため、
       実際に配置したマークの寸法(markW × X)から算出して形に追従させる
       — 固定の相対座標を3案で使い回すと意匠とズレて浮いて見える。 */
    const mL = aMarkX, mR = aMarkX + markW, mT = aMarkY, mB = aMarkY + X;
    const leader = (x1, y1, x2, y2, t) => {
      const ln = el("line", { x1, y1, x2, y2, class: "lg2-leader" });
      gA.appendChild(ln);
      armDraw(defs, ln, t, 0.45);
    };
    leader(mR, mT, aVertX, mT, 0.30);          // 上端 → 右の高さ寸法線へ
    leader(mR, mB, aVertX, mB, 0.38);          // 下端 → 右の高さ寸法線へ
    leader(mL, mB, mL, aHorzY, 0.55);          // 左端 → 下の幅寸法線へ
    leader(mR, mB, mR, aHorzY, 0.63);          // 右端 → 下の幅寸法線へ

    dimArrow(gA, defs, aVertX, aMarkY, aVertX, aMarkY + X, 0.45, 0.7);
    label(gA, aVertX + X * 0.42, aMarkY + X / 2 + 6, "X", 1.15);
    dimArrow(gA, defs, aMarkX, aHorzY, aMarkX + markW, aHorzY, 0.7, 0.7);
    label(gA, aMarkX + markW / 2, aHorzY + X * 0.42, "X", 1.4);
    const aW = aVertX + X * 0.8, aH = aHorzY + X * 0.55;

    /* ===== ブロックb) フルロックアップ + クリアスペース ===== */
    const gB = el("g", {});
    svg.appendChild(gB);
    /* ロックアップの高さはマーク高と一致しない(案によりワードマークが高い)。
       クリアスペースの 1X はマーク高基準のまま、囲みだけ実際の高さに合わせる。 */
    const lockH = Math.max(X, wordH);
    const outW = lockW + 2 * X, outH = lockH + 2 * X;
    dashBox(gB, defs, 0, 0, outW, outH, 1.05, 1.1, "lg2-box lg2-box-outer");
    dashBox(gB, defs, X, X, lockW, lockH, 1.35, 0.95);
    placeArt(gB, mark, X, X + (lockH - X) / 2, markW, X);
    /* ワードマークは最後に描くので、器だけ先に作って参照を持っておく */
    const wordHost = el("g", {});
    gB.appendChild(wordHost);
    const cx = X + lockW / 2, cy = X + lockH / 2;
    dimArrow(gB, defs, cx, 0, cx, X, 1.75, 0.6);
    label(gB, cx + X * 0.30, X * 0.5 + 5, "1X", 2.2, "lg2-label lg2-label-sm");
    dimArrow(gB, defs, X + lockW, cy, outW, cy, 1.9, 0.6);
    label(gB, X + lockW + X * 0.5, cy - X * 0.22, "1X", 2.35, "lg2-label lg2-label-sm");
    dimArrow(gB, defs, cx, X + lockH, cx, outH, 2.05, 0.6);
    label(gB, cx + X * 0.30, X + lockH + X * 0.5 + 5, "1X", 2.5, "lg2-label lg2-label-sm");
    dimArrow(gB, defs, 0, cy, X, cy, 2.2, 0.6);
    label(gB, X * 0.5, cy - X * 0.22, "1X", 2.65, "lg2-label lg2-label-sm");

    /* ===== d) 斜めガイド十字線(Figma仕様外・現行サイトの見た目を踏襲した追加要素) =====
       マーク中心を通る直交2本 + 角度ラベル。基準線(baseline)機構とは別物で、
       こちらは残す。描画はガイド線と同じ armDraw(mask reveal)を使う。 */
    const angle = parseFloat(d.angle);
    if (!Number.isNaN(angle)) {
      const mcx = X + markW / 2, mcy = X + X / 2, DL = X * 0.95;
      const DIAG_T = 2.9, DIAG_STAG = 0.16;
      let tip = null;
      [angle, angle + 90].forEach((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const ux = Math.cos(rad), uy = -Math.sin(rad);
        const x1 = mcx - ux * DL, y1 = mcy - uy * DL;
        const x2 = mcx + ux * DL, y2 = mcy + uy * DL;
        const ln = el("line", { x1, y1, x2, y2, class: "lg2-diag" });
        gB.appendChild(ln);
        armDraw(defs, ln, DIAG_T + i * DIAG_STAG, 0.7);
        if (i === 0) tip = y1 < y2 ? { x: x1, y: y1 } : { x: x2, y: y2 };
      });
      label(gB, tip.x + X * 0.16, tip.y - X * 0.10, `${Math.round(angle)}\u00B0`,
            DIAG_T + 0.7, "lg2-label lg2-label-sm");
    }

    /* ===== ブロックc) 最小サイズ行 ===== */
    const gC = el("g", {});
    svg.appendChild(gC);
    const cH = X * 0.8;                          // 1・2番目の中身の高さ
    const cPad = X * 0.2;
    const mH = X * 0.30;                         // ミニロゴの高さ
    const mPad = X * 0.14;
    const cMarkW = markW * (cH / X), cWordW = wordW * (cH / X);
    const mLockW = lockW * (mH / X);
    const boxH = cH + cPad * 2, mBoxH = mH + mPad * 2;
    const b1W = cMarkW + cPad * 2, b2W = cWordW + cPad * 2, b3W = mLockW + mPad * 2;
    const g1 = X * 0.55, g2 = X * 0.95, g3 = X * 0.55;
    const x1 = 0, x2 = x1 + b1W + g1, x3 = x2 + b2W + g2, x4 = x3 + b3W + g3;
    const rowTop = 0, arrowY = boxH + X * 0.32, labelY = arrowY + X * 0.40;
    const mTop = (boxH - mBoxH) / 2;

    dashBox(gC, defs, x1, rowTop, b1W, boxH, 3.5, 0.7);
    placeArt(gC, mark, x1 + cPad, rowTop + cPad, cMarkW, cH);
    dimArrow(gC, defs, x1, arrowY, x1 + b1W, arrowY, 3.8, 0.55);
    label(gC, x1 + b1W / 2, labelY, markLabel, 4.15, "lg2-label lg2-label-sm");

    dashBox(gC, defs, x2, rowTop, b2W, boxH, 3.65, 0.9);
    const cWordBox = placeArt(gC, word, x2 + cPad, rowTop + cPad, cWordW, cH);
    armFade(cWordBox, 3.9, 0.5);
    dimArrow(gC, defs, x2, arrowY, x2 + b2W, arrowY, 3.95, 0.7);
    label(gC, x2 + b2W / 2, labelY, wordLabel, 4.3, "lg2-label lg2-label-sm");

    [[x3, minPrintLabel, 3.8], [x4, minDigitalLabel, 3.95]].forEach(([bx, txt, t]) => {
      dashBox(gC, defs, bx, rowTop + mTop, b3W, mBoxH, t, 0.6, "lg2-box lg2-box-faint");
      const mk = placeArt(gC, mark, bx + mPad, rowTop + mTop + mPad, markW * (mH / X), mH);
      armFade(mk, t + 0.25, 0.5);
      const wd = placeArt(gC, word, bx + mPad + markW * (mH / X) + gap * (mH / X),
        rowTop + mTop + mPad, wordW * (mH / X), mH);
      armFade(wd, t + 0.3, 0.5);
      bracket(gC, defs, bx, bx + b3W, arrowY, t + 0.35, 0.55);
      label(gC, bx + b3W / 2, labelY, txt, t + 0.7, "lg2-label lg2-label-sm");
    });
    const cW = x4 + b3W, cHtotal = labelY + X * 0.25;

    /* ===== ブロック配置 ===== */
    const colGap = X * 1.3, rowGap = X * 1.5;
    const topH = Math.max(aH, outH);
    const topW0 = aW + colGap + outW;
    /* 上段と下段の広い方に合わせて両方を中央へ。負のオフセットを作らない
       (以前は下段が広いと左へはみ出して viewBox の外に出ていた) */
    const rowW = Math.max(topW0, cW);
    const topOff = (rowW - topW0) / 2;
    gA.setAttribute("transform", `translate(${topOff}, ${(topH - aH) / 2})`);
    const bX = topOff + aW + colGap;
    gB.setAttribute("transform", `translate(${bX}, ${(topH - outH) / 2})`);
    const topW = rowW;
    const cY = topH + rowGap;
    gC.setAttribute("transform", `translate(${(rowW - cW) / 2}, ${cY})`);

    const PADV = X * 0.5;
    const totalW = Math.max(topW, cW);
    const totalH = cY + cHtotal;
    svg.setAttribute("viewBox", `${-PADV} ${-PADV} ${totalW + PADV * 2} ${totalH + PADV * 2}`);

    /* ===== 最後にロックアップのワードマークを1文字ずつ描く ===== */
    /* マークと天地中央を揃える */
    const wordBox = placeArt(wordHost, word, X + markW + gap, X + (lockH - wordH) / 2, wordW, wordH);
    /* 角丸矩形を path 化する。DESIGN D の "i"(点と軸)は <rect> なので、
       path だけを集めていると描画の対象から外れ、他の字を書いている間
       最初から出たままになってしまう(= i だけ先に見える)。 */
    const rectToPath = (r) => {
      const x = +r.getAttribute("x") || 0, y = +r.getAttribute("y") || 0;
      const w = +r.getAttribute("width") || 0, h = +r.getAttribute("height") || 0;
      let rx = r.getAttribute("rx") != null ? +r.getAttribute("rx") : 0;
      let ry = r.getAttribute("ry") != null ? +r.getAttribute("ry") : rx;
      rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
      if (!rx && !ry) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
      return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}` +
             `V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}` +
             `H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}` +
             `V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`;
    };

    const letters = [];
    Array.from(wordBox.querySelectorAll("path, rect")).forEach((p) => {
      const fill = resolveFill(p.getAttribute("fill"));
      if (!fill || fill === "none") return;
      const isRect = p.tagName.toLowerCase() === "rect";
      const d = isRect ? rectToPath(p) : p.getAttribute("d");
      if (!d) return;
      const box = p.getBBox();
      /* 白の下敷き矩形(字より広い)は字ではないので除く */
      if (isRect && box.width > wordW * 0.5) return;
      letters.push({ node: p, d, fill, x0: box.x, x1: box.x + box.width });
    });
    /* 画面座標で左→右に整列(入れ子svg/親transformのオフセットを含めるため) */
    letters.sort((a, b) => a.node.getBoundingClientRect().left - b.node.getBoundingClientRect().left);

    /* 同じ字を構成する図形(i の点と軸など)は横位置が重なる。重なるものは
       ひとまとまりにして、同じタイミングで書き出す。 */
    const groups = [];
    letters.forEach((L) => {
      const g = groups[groups.length - 1];
      if (g && L.x0 < g.x1 - 0.5) { g.items.push(L); g.x1 = Math.max(g.x1, L.x1); }
      else groups.push({ items: [L], x0: L.x0, x1: L.x1 });
    });

    /* ガイド線の終わりを待ち切らず、最後の要素が描かれている間に書き始める。
       1文字ごとの速さ(STAG/DRAW/FILL)は変えない。始まりだけを前へ出す。 */
    const STAG = 0.16, DRAW = 0.5, FILL = 0.4, LEAD = DRAW * 0.85;
    /* ロックアップの枠(1.35+0.95=2.3s)が引かれている最中に書き始める。
       ガイド全体(seqEnd≒5.1s)の終わりを待つと体感で遅い。 */
    const WORD_START = Math.max(0.35, Math.min(seqEnd - 1.35, 2.2));
    groups.forEach((G, i) => {
      const t0 = WORD_START + i * STAG;
      G.items.forEach((L) => armLetter(L, t0, DRAW, FILL, LEAD));
    });
    function armLetter(L, t0, DRAW, FILL, LEAD) {
      const parent = L.node.parentNode;
      /* 塗り: 未分割のdのまま(穴あきを維持) */
      const fillPath = el("path", { d: L.d, class: "lg2-word-fill", fill: L.fill });
      parent.insertBefore(fillPath, L.node);
      if (!reduced) {
        fillPath.style.setProperty("--d", `${t0 + LEAD}s`);
        fillPath.style.setProperty("--dur", `${FILL}s`);
        fillPath.setAttribute("data-lg2-word-fill", "");
      }
      /* アウトライン: サブパスごとに分割して個別にstroke。
         縮小モーション時はそもそも作らない(armしないまま残すと
         消えないティールの輪郭が完成状態に重なってしまうため)。 */
      if (!reduced) {
        splitSubpaths(L.d).forEach((sd) => {
          const sp = el("path", { d: sd, class: "lg2-word-stroke" });
          parent.insertBefore(sp, L.node);
          const len = sp.getTotalLength();
          sp.style.strokeDasharray = `${len} ${len}`;
          sp.style.strokeDashoffset = String(len);
          sp.style.setProperty("--d-draw", `${t0}s`);
          sp.style.setProperty("--dur-draw", `${DRAW}s`);
          sp.style.setProperty("--d-fade", `${t0 + LEAD}s`);
          sp.style.setProperty("--dur-fade", `${FILL}s`);
          sp.setAttribute("data-lg2-word-stroke", "");
        });
      }
      L.node.remove();
    }
  }

  async function init(mount) {
    try {
      await build(mount);
    } catch (err) {
      console.warn("[logo-guide-v2]", err.message);
      return;
    }
    if (reduced) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { mount.classList.add("is-play"); io.unobserve(mount); }
      });
      /* 図解が画面に入り切るのを待たず、下から覗いた時点で走り出す
         (threshold .3 + 余白なしだと再生開始が体感で遅い)。 */
    }, { threshold: 0.05, rootMargin: "0px 0px 12% 0px" });
    io.observe(mount);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".lg2-mount").forEach(init);
  });
})();
