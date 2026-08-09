/* ============ ロゴ アイソレーション図解 ============
   .lg-mount の data-* からSVGの図解を組み立てる。

   構成(参考: proto-review の logo-detail v2):
     - マーク実寸の破線ボックス(内側)
     - クリアスペース境界の破線ボックス(外側)
     - 上下左右の余白に寸法線 + ラベル
     - 右にX(マーク高)、下にマーク幅の寸法線

   X の定義はマークの高さ。クリアスペースは data-clear で
   Xに対する比率を渡す(既定 0.5X)。案ごとに縦横比が違うので、
   幅は viewBox から読んで自動で追従させる。

   モーション: IntersectionObserver で一度だけ再生。線は
   stroke-dashoffset を送って引き、面は線の後にフェードで入れる。
   prefers-reduced-motion では最初から完成状態(CSS側で処理)。   */
(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    return n;
  };

  /* マークSVGを読み、viewBoxと中身(子ノード)を取り出す */
  const loadMark = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
    const doc = new DOMParser().parseFromString(await res.text(), "image/svg+xml");
    const root = doc.documentElement;
    if (!root || root.nodeName === "parsererror") throw new Error(`parse ${url}`);
    const vb = (root.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
    if (vb.length < 4 || !vb[2] || !vb[3]) throw new Error(`viewBox ${url}`);
    return { root, w: vb[2], h: vb[3] };
  };

  /* 同一ページに複数の図解を置いたとき clipPath 等の id が衝突して
     片方が消えるので、取り込んだ側の id を一意化する。 */
  const namespaceIds = (node, prefix) => {
    const map = {};
    node.querySelectorAll("[id]").forEach((n) => {
      const old = n.getAttribute("id");
      const next = `${prefix}-${old}`;
      map[old] = next;
      n.setAttribute("id", next);
    });
    const attrs = ["clip-path", "mask", "fill", "stroke", "filter"];
    node.querySelectorAll("*").forEach((n) => {
      attrs.forEach((a) => {
        const v = n.getAttribute(a);
        if (!v) return;
        const m = v.match(/url\(#([^)]+)\)/);
        if (m && map[m[1]]) n.setAttribute(a, v.replace(`#${m[1]}`, `#${map[m[1]]}`));
      });
    });
  };

  /* 寸法線(両端に矢羽) + ラベル。縦横どちらにも使う */
  const dimension = (g, o) => {
    const { x1, y1, x2, y2, label, delay, flip } = o;
    const line = el("line", { x1, y1, x2, y2, class: "lg-dim" });
    line.dataset.lgDraw = "";
    line.style.setProperty("--lg-len", Math.hypot(x2 - x1, y2 - y1).toFixed(1));
    line.style.setProperty("--lg-delay", `${delay}s`);
    g.appendChild(line);

    const head = (px, py, rot) => {
      const h = el("path", { d: "M0 0 L6 3 L6 -3 Z", transform: `translate(${px} ${py}) rotate(${rot})`, class: "lg-head" });
      h.dataset.lgFade = "";
      h.style.setProperty("--lg-delay", `${delay + 0.5}s`);
      g.appendChild(h);
    };
    const vertical = x1 === x2;
    if (vertical) { head(x1, y1, 90); head(x2, y2, -90); }
    else { head(x1, y1, 180); head(x2, y2, 0); }

    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const t = el("text", {
      x: vertical ? mx + (flip ? -8 : 8) : mx,
      y: vertical ? my : my + (flip ? -8 : 16),
      class: "lg-label",
      "text-anchor": vertical ? (flip ? "end" : "start") : "middle",
      "dominant-baseline": vertical ? "middle" : "auto",
    });
    t.textContent = label;
    t.dataset.lgFade = "";
    t.style.setProperty("--lg-delay", `${delay + 0.5}s`);
    g.appendChild(t);
  };

  /* 破線ボックス。引かれる演出のため実線(下)+破線(上)の2枚重ね */
  const box = (g, o) => {
    const { x, y, w, h, delay, strong } = o;
    const cls = `lg-box${strong ? " lg-box--clear" : ""}`;
    /* 下: 実線。引き切ったら消える(CSSの .lg-box--draw が2段アニメを持つ) */
    const solid = el("rect", { x, y, width: w, height: h, class: `${cls} lg-box--draw`, "stroke-dasharray": "none" });
    solid.dataset.lgDraw = "";
    solid.style.setProperty("--lg-len", (2 * (w + h)).toFixed(1));
    solid.style.setProperty("--lg-delay", `${delay}s`);
    g.appendChild(solid);

    /* 上: 実線が消えるのと入れ替わりで出る破線(これが完成形) */
    const dashed = el("rect", { x, y, width: w, height: h, class: `${cls} lg-box--dashed-final` });
    dashed.style.setProperty("--lg-delay", `${delay + 0.9}s`);
    g.appendChild(dashed);
    return { solid, dashed };
  };

  const build = async (mount) => {
    const markSrc = mount.dataset.markSrc;
    const clearRatio = parseFloat(mount.dataset.clear || "0.5");
    const art = await loadMark(markSrc);

    /* 図解の座標系。マーク高を X = 120 として組む(実寸ではなく作図用) */
    const X = 120;
    const mw = (art.w / art.h) * X;
    const mh = X;
    const pad = X * clearRatio;      // クリアスペース
    const margin = 92;               // 寸法線とラベルのための外周
    const W = mw + pad * 2 + margin * 2;
    const H = mh + pad * 2 + margin * 2;

    const svg = el("svg", {
      viewBox: `0 0 ${W.toFixed(1)} ${H.toFixed(1)}`,
      class: "ld-guide",
      role: "img",
      "aria-label": `アイソレーション(クリアスペース ${clearRatio}X)の図解`,
    });

    const ox = margin + pad; // マーク左上
    const oy = margin + pad;

    /* --- マーク本体。線が引かれた後に入る --- */
    const markG = el("g", { transform: `translate(${ox} ${oy}) scale(${(mw / art.w).toFixed(5)})` });
    Array.from(art.root.childNodes).forEach((n) => markG.appendChild(n.cloneNode(true)));
    namespaceIds(markG, `lg${Math.random().toString(36).slice(2, 7)}`);
    markG.dataset.lgFade = "";
    markG.style.setProperty("--lg-delay", "1.5s");

    /* --- ボックス --- */
    const boxes = el("g");
    box(boxes, { x: ox, y: oy, w: mw, h: mh, delay: 0 });                                  // マーク実寸
    box(boxes, { x: ox - pad, y: oy - pad, w: mw + pad * 2, h: mh + pad * 2, delay: 0.5, strong: true }); // クリアスペース

    /* --- 寸法線 --- */
    const dims = el("g");
    const cy = oy + mh / 2;
    const cx = ox + mw / 2;
    const clearLabel = `${clearRatio}X`;
    // 左右のクリアスペース
    dimension(dims, { x1: ox - pad, y1: cy, x2: ox, y2: cy, label: clearLabel, delay: 1.0 });
    dimension(dims, { x1: ox + mw, y1: cy, x2: ox + mw + pad, y2: cy, label: clearLabel, delay: 1.0 });
    // 上下のクリアスペース
    dimension(dims, { x1: cx, y1: oy - pad, x2: cx, y2: oy, label: clearLabel, delay: 1.1 });
    dimension(dims, { x1: cx, y1: oy + mh, x2: cx, y2: oy + mh + pad, label: clearLabel, delay: 1.1 });
    // 右にX(マーク高)、下にマーク幅
    const rx = ox + mw + pad + 40;
    dimension(dims, { x1: rx, y1: oy, x2: rx, y2: oy + mh, label: "X", delay: 1.2 });
    const by = oy + mh + pad + 40;
    dimension(dims, { x1: ox, y1: by, x2: ox + mw, y2: by, label: `${(mw / mh).toFixed(2)}X`, delay: 1.2 });

    svg.appendChild(boxes);
    svg.appendChild(dims);
    svg.appendChild(markG);
    mount.textContent = "";
    mount.appendChild(svg);

    /* 表示領域に入ったら一度だけ再生 */
    if (!("IntersectionObserver" in window)) { mount.classList.add("is-play"); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        mount.classList.add("is-play");
        io.disconnect();
      });
    }, { threshold: 0.25 });
    io.observe(mount);
  };

  document.querySelectorAll(".lg-mount").forEach((m) => {
    build(m).catch((err) => {
      /* 図解が組めなくてもページは壊さない。マークだけ出す */
      console.error("[logo-guide]", err);
      const img = document.createElement("img");
      img.src = m.dataset.markSrc;
      img.alt = "";
      img.style.cssText = "display:block;margin:0 auto;width:160px;height:auto";
      m.textContent = "";
      m.appendChild(img);
    });
  });
})();
