/* ============================================================
   名刺データ作成ツール
   入力 → SVG(実寸mm)で組版 → プレビュー / PDF・SVG・PNG 書き出し
   ・座標系は「mm」。viewBox も mm 単位で持たせ、そのまま入稿サイズになる
   ・文字幅の実測は canvas.measureText。px を mm と読み替えても比率は同じ
   ============================================================ */
(() => {
'use strict';

/* ---------- 定数 ---------- */
const SIZES = {
  jp91: { w: 91, h: 55 },
  us89: { w: 89, h: 51 },
  jp85: { w: 85, h: 49 },
};
const BLEED = 3;      // 塗り足し
const SAFE  = 4;      // 文字安全エリア（仕上がりからの内側）
const MARKM = 5;      // トンボを描くための追加マージン

const GOTHIC = "'Noto Sans JP','Hiragino Kaku Gothic ProN','Hiragino Sans','Yu Gothic',sans-serif";
const MINCHO = "'Hiragino Mincho ProN','Yu Mincho','YuMincho','Noto Serif JP',serif";

/* 要素の定義。type: bi=日英2値 / single=1値 / custom=自由項目 */
const DEFS = {
  logo:    { label: '会社ロゴ',            type: 'image',  group: 'head' },
  company: { label: '会社名',              type: 'bi',     group: 'head', ja: '株式会社サンプル', en: 'Sample Inc.' },
  dept:    { label: '部署',                type: 'bi',     group: 'head', ja: '事業開発部',       en: 'Business Development' },
  title:   { label: '役職',                type: 'bi',     group: 'body', ja: 'マネージャー',     en: 'Manager' },
  name:    { label: '氏名',                type: 'bi',     group: 'body', ja: '山田 太郎',        en: 'Taro Yamada' },
  reading: { label: 'ふりがな（ローマ字）', type: 'single', group: 'body', v: 'TARO YAMADA' },
  address: { label: '会社住所',            type: 'bi',     group: 'foot', tag: 'ADDRESS',
             ja: '〒150-0001 東京都渋谷区神宮前1-2-3 サンプルビル5F',
             en: '5F Sample Bldg, 1-2-3 Jingumae, Shibuya-ku, Tokyo 150-0001' },
  tel:     { label: '電話番号',            type: 'single', group: 'foot', tag: 'TEL',    v: '03-1234-5678' },
  mobile:  { label: '携帯番号',            type: 'single', group: 'foot', tag: 'MOBILE', v: '090-1234-5678' },
  fax:     { label: 'FAX',                 type: 'single', group: 'foot', tag: 'FAX',    v: '03-1234-5679' },
  email:   { label: 'メールアドレス',      type: 'single', group: 'foot', tag: 'MAIL',   v: 'taro.yamada@example.co.jp' },
  web:     { label: 'Webサイト',           type: 'single', group: 'foot', tag: 'WEB',    v: 'www.example.co.jp' },
  custom:  { label: '自由項目',            type: 'custom', group: 'foot', tag: '', v: '' },
};

/* 初期表示する要素（ご指定の7項目 + 会社名） */
const DEFAULT_ORDER = ['logo', 'company', 'title', 'name', 'reading', 'address', 'tel', 'email'];

const TEMPLATES = [
  { id: 'standard', name: '左揃え' },
  { id: 'centered', name: '中央' },
  { id: 'band',     name: '帯' },
  { id: 'minimal',  name: '2分割' },
];

/* ---------- 状態 ---------- */
let uid = 0;
const state = {
  size: 'jp91', orientation: 'landscape', template: 'standard',
  lang: 'ja', font: 'gothic', scale: 1,
  accent: '#ED551B', ink: '#111111', bg: '#FFFFFF',
  logoW: 22, logoWhite: false, showTags: true,
  back: 'none', side: 'front',
  guides: true, marks: false, zoom: 1,
  logo: null,           // { href, aspect }
  fields: [],           // [{ id, key, enabled, label, ja, en, v, tag }]
};

function makeField(key) {
  const d = DEFS[key];
  return {
    id: 'f' + (++uid), key, enabled: true,
    label: d.label, tag: d.tag || '',
    ja: d.ja || '', en: d.en || '', v: d.v || '',
  };
}
function resetFields() { state.fields = DEFAULT_ORDER.map(makeField); }

/* ---------- ちいさな道具 ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = v => Math.round(v * 1000) / 1000;

function mix(a, b, t) { // a,b: #rrggbb
  const p = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  const c = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return '#' + c(r1, r2) + c(g1, g2) + c(b1, b2);
}
const subColor = () => mix(state.ink, state.bg, 0.42);

/* ---------- 文字の実測 ---------- */
const _mc = document.createElement('canvas').getContext('2d');
const family = () => (state.font === 'mincho' ? MINCHO : GOTHIC);

function textW(str, size, weight = 400, ls = 0) {
  if (!str) return 0;
  _mc.font = `${weight} ${size}px ${family()}`;
  return _mc.measureText(str).width + ls * Math.max(0, [...str].length - 1);
}
/** maxW に収まるまで縮める */
function fit(str, maxW, size, weight, ls, min = 1.4) {
  let s = size;
  while (s > min && textW(str, s, weight, ls) > maxW) s -= 0.04;
  return s;
}
function tokenize(s) {
  const out = []; let buf = '';
  for (const ch of s) {
    if (/[A-Za-z0-9@._\-+/&'"()]/.test(ch)) buf += ch;
    else { if (buf) { out.push(buf); buf = ''; } out.push(ch); }
  }
  if (buf) out.push(buf);
  return out;
}
function wrap(str, maxW, size, weight, ls) {
  if (!str) return [];
  if (textW(str, size, weight, ls) <= maxW) return [str];
  const lines = []; let cur = '';
  for (const t of tokenize(str)) {
    if (t === ' ' && !cur) continue;
    const next = cur + t;
    if (cur && textW(next, size, weight, ls) > maxW) { lines.push(cur.trimEnd()); cur = t === ' ' ? '' : t; }
    else cur = next;
  }
  if (cur.trim()) lines.push(cur.trimEnd());
  return lines;
}

/* ---------- SVG 断片 ---------- */
function svgText(t, x, y, o = {}) {
  const a = [];
  a.push(`x="${n(x)}" y="${n(y)}"`);
  a.push(`font-family="${esc(family())}"`);
  a.push(`font-size="${n(o.size)}"`);
  if (o.weight && o.weight !== 400) a.push(`font-weight="${o.weight}"`);
  if (o.ls) a.push(`letter-spacing="${n(o.ls)}"`);
  a.push(`fill="${o.fill}"`);
  if (o.anchor && o.anchor !== 'start') a.push(`text-anchor="${o.anchor}"`);
  a.push('xml:space="preserve"');
  return `<text ${a.join(' ')}>${esc(t)}</text>`;
}

/* ============================================================
   1. 入力値 → 行データ（表記パターンを反映）
   ============================================================ */
function valueLines(f, lang) {
  const d = DEFS[f.key];
  if (d.type === 'single') return f.v ? [{ t: f.v }] : [];
  if (d.type === 'custom') return f.v ? [{ t: f.v }] : [];
  const ja = f.ja.trim(), en = f.en.trim();
  if (lang === 'ja')  return ja ? [{ t: ja }] : (en ? [{ t: en }] : []);
  if (lang === 'en')  return en ? [{ t: en }] : (ja ? [{ t: ja }] : []);
  const out = [];
  if (ja) out.push({ t: ja });
  if (en && en !== ja) out.push({ t: en, sub: true });
  return out;
}
const tagOf = f => (state.showTags && f.tag ? f.tag : '');
const active = g => state.fields.filter(f => f.enabled && DEFS[f.key].group === g);
const byKey  = k => state.fields.find(f => f.key === k && f.enabled);

/* ============================================================
   2. 組版：ブロックを積み上げる
   各ブロックは { h, w, render(x, y, align) } を返す
   ============================================================ */
function blockText(rows, maxW, align) {
  // rows: [{ t, size, weight, fill, ls, lh }]
  const items = rows.filter(r => r.t !== '');
  const h = items.reduce((s, r) => s + r.size * (r.lh || 1.35), 0);
  const w = Math.max(0, ...items.map(r => textW(r.t, r.size, r.weight, r.ls)));
  return {
    h, w,
    render(x, y) {
      let cy = y, out = '';
      for (const r of items) {
        const lh = r.size * (r.lh || 1.35);
        const ax = align === 'middle' ? x + maxW / 2 : (align === 'end' ? x + maxW : x);
        out += svgText(r.t, ax, cy + r.size * 0.78, {
          size: r.size, weight: r.weight, fill: r.fill, ls: r.ls,
          anchor: align === 'middle' ? 'middle' : (align === 'end' ? 'end' : 'start'),
        });
        cy += lh;
      }
      return out;
    },
  };
}

function blockLogo(maxW, align, white) {
  if (!state.logo) return null;
  const w = Math.min(state.logoW, maxW);
  const h = w / state.logo.aspect;
  return {
    h, w,
    render(x, y) {
      const ax = align === 'middle' ? x + (maxW - w) / 2 : (align === 'end' ? x + maxW - w : x);
      const f = white ? ' filter="url(#nc-white)"' : '';
      return `<image href="${state.logo.href}" x="${n(ax)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"` +
             ` preserveAspectRatio="xMidYMid meet"${f}/>`;
    },
  };
}

/* 連絡先（foot）の1行：ラベル列 + 値 */
function blockContact(fields, maxW, align, lang, sc) {
  const size = 2.15 * sc;
  const tagSize = size * 0.8;
  const rows = [];   // [{tag, t, sub}]
  for (const f of fields) {
    const ls = valueLines(f, lang);
    ls.forEach((l, i) => rows.push({ tag: i === 0 ? (f.key === 'custom' ? f.tag : tagOf(f)) : '', t: l.t, sub: !!l.sub }));
  }
  if (!rows.length) return null;

  const tagW = Math.max(0, ...rows.map(r => textW(r.tag, tagSize, 700, 0.08)));
  const colW = tagW ? tagW + 1.6 : 0;
  const valMax = align === 'start' ? maxW - colW : maxW;

  // 折り返し込みで行を展開
  const out = [];
  for (const r of rows) {
    const s0 = r.sub ? size * 0.86 : size;
    const parts = wrap(r.t, valMax, s0, 400, 0.02);
    parts.forEach((p, i) => out.push({ tag: i === 0 ? r.tag : '', t: p, sub: r.sub, size: s0 }));
  }
  const lh = size * 1.5;
  const h = out.length * lh;
  const w = Math.max(0, ...out.map(r => (align === 'start' ? colW : (r.tag ? textW(r.tag + ' ', tagSize, 700, 0.08) : 0)) + textW(r.t, r.size, 400, 0.02)));

  return {
    h, w,
    render(x, y) {
      let cy = y, s = '';
      for (const r of out) {
        const by = cy + r.size * 0.8;
        if (align === 'start') {
          if (r.tag) s += svgText(r.tag, x, by, { size: tagSize, weight: 700, fill: state.accent, ls: 0.08 });
          s += svgText(r.t, x + colW, by, { size: r.size, fill: r.sub ? subColor() : state.ink, ls: 0.02 });
        } else {
          const label = r.tag ? r.tag + '  ' : '';
          const full = label + r.t;
          const anchor = align === 'middle' ? 'middle' : 'end';
          const ax = align === 'middle' ? x + maxW / 2 : x + maxW;
          const fw = textW(label, tagSize, 700, 0.08) + textW(r.t, r.size, 400, 0.02);
          let sx = anchor === 'middle' ? ax - fw / 2 : ax - fw;
          if (label) {
            s += svgText(r.tag, sx, by, { size: tagSize, weight: 700, fill: state.accent, ls: 0.08 });
            sx += textW(label, tagSize, 700, 0.08);
          }
          s += svgText(r.t, sx, by, { size: r.size, fill: r.sub ? subColor() : state.ink, ls: 0.02 });
        }
        cy += lh;
      }
      return s;
    },
  };
}

/* head / body / foot をまとめて作る */
function composeBlocks(boxW, align, lang, sc, opts = {}) {
  const sub = subColor();
  const head = [], body = [], foot = [];

  /* --- head：ロゴ + 会社名 + 部署 --- */
  const logoF = byKey('logo');
  if (logoF && state.logo && !opts.skipLogo) {
    const lb = blockLogo(boxW, align, opts.whiteLogo);
    if (lb) head.push({ b: lb, gap: 2.2 });
  }
  const comp = byKey('company'), dept = byKey('dept');
  const compRows = [];
  if (comp) {
    valueLines(comp, lang).forEach(l => compRows.push({
      t: l.t, size: (l.sub ? 1.95 : 2.9) * sc, weight: l.sub ? 400 : 700,
      fill: l.sub ? sub : state.ink, ls: l.sub ? 0.04 : 0.06, lh: l.sub ? 1.4 : 1.3,
    }));
  }
  if (dept) {
    valueLines(dept, lang).forEach(l => compRows.push({
      t: l.t, size: 2.05 * sc, weight: 400, fill: sub, ls: 0.04, lh: 1.45,
    }));
  }
  if (compRows.length) {
    compRows.forEach(r => { r.size = fit(r.t, boxW, r.size, r.weight, r.ls, 1.5); });
    head.push({ b: blockText(compRows, boxW, align), gap: 0 });
  }

  /* --- body：役職 → 氏名 → ローマ字 --- */
  const title = byKey('title'), name = byKey('name'), reading = byKey('reading');
  if (title) {
    const rows = valueLines(title, lang).map(l => ({
      t: l.t, size: (l.sub ? 1.85 : 2.2) * sc, weight: 400,
      fill: sub, ls: 0.14, lh: 1.35,
    }));
    if (rows.length) body.push({ b: blockText(rows, boxW, align), gap: 1.0 });
  }
  if (name) {
    const rows = valueLines(name, lang).map(l => ({
      t: l.t, size: (l.sub ? 2.3 : 5.2) * sc, weight: l.sub ? 400 : 700,
      fill: l.sub ? sub : state.ink, ls: l.sub ? 0.06 : 0.35, lh: l.sub ? 1.55 : 1.22,
    }));
    rows.forEach(r => { r.size = fit(r.t, boxW, r.size, r.weight, r.ls, 2.2); });
    if (rows.length) body.push({ b: blockText(rows, boxW, align), gap: 0.8 });
  }
  if (reading && reading.v) {
    const s0 = fit(reading.v, boxW, 1.85 * sc, 400, 0.28, 1.3);
    body.push({ b: blockText([{ t: reading.v, size: s0, weight: 400, fill: sub, ls: 0.28, lh: 1.3 }], boxW, align), gap: 0 });
  }

  /* --- foot：連絡先 --- */
  const fb = blockContact(active('foot'), boxW, align, lang, sc);
  if (fb) foot.push({ b: fb, gap: 0 });

  return { head, body, foot };
}

const stackH = arr => arr.reduce((s, it, i) => s + it.b.h + (i < arr.length - 1 ? it.gap : 0), 0);
function drawStack(arr, x, y) {
  let cy = y, out = '';
  arr.forEach((it, i) => { out += it.b.render(x, cy); cy += it.b.h + (i < arr.length - 1 ? it.gap : 0); });
  return out;
}

/* ============================================================
   3. カード1面を SVG 文字列にする
   ============================================================ */
let overflow = false;

function renderFace(lang, mode) {
  const g = geom();
  const tpl = state.template;
  overflow = false;

  let body = '';
  // 背景（塗り足しまで塗る）
  body += `<rect x="${-g.bleed}" y="${-g.bleed}" width="${g.w + g.bleed * 2}" height="${g.h + g.bleed * 2}" fill="${state.bg}"/>`;

  /* --- 裏面：ロゴのみ --- */
  if (mode === 'logo') {
    if (state.logo) {
      const w = Math.min(state.logoW * 1.6, g.w * 0.55);
      const h = w / state.logo.aspect;
      body += `<image href="${state.logo.href}" x="${n((g.w - w) / 2)}" y="${n((g.h - h) / 2)}" width="${n(w)}" height="${n(h)}" preserveAspectRatio="xMidYMid meet"/>`;
    }
    const comp = byKey('company');
    if (comp) {
      const l = valueLines(comp, lang)[0];
      if (l) body += svgText(l.t, g.w / 2, g.h - 6, { size: 2.4, weight: 500, fill: subColor(), ls: 0.1, anchor: 'middle' });
    }
    return body;
  }

  const padX = state.orientation === 'portrait' ? 5.5 : 6.5;
  const padY = state.orientation === 'portrait' ? 6.5 : 5.5;

  /* --- 帯レイアウト：アクセントの面を先に敷く --- */
  let box = { x: padX, y: padY, w: g.w - padX * 2, h: g.h - padY * 2 };
  let align = 'start';
  let whiteLogo = state.logoWhite;

  if (tpl === 'centered') align = 'middle';

  if (tpl === 'band') {
    if (state.orientation === 'portrait') {
      const bh = g.h * 0.3;
      body += `<rect x="${-g.bleed}" y="${-g.bleed}" width="${g.w + g.bleed * 2}" height="${bh + g.bleed}" fill="${state.accent}"/>`;
      box = { x: padX, y: bh + padY, w: g.w - padX * 2, h: g.h - bh - padY * 2 };
      if (state.logo) {
        const lw = Math.min(state.logoW, g.w * 0.5), lh = lw / state.logo.aspect;
        const f = state.logoWhite ? ' filter="url(#nc-white)"' : '';
        body += `<image href="${state.logo.href}" x="${n((g.w - lw) / 2)}" y="${n((bh - lh) / 2)}" width="${n(lw)}" height="${n(lh)}" preserveAspectRatio="xMidYMid meet"${f}/>`;
      }
    } else {
      const bw = g.w * 0.3;
      body += `<rect x="${-g.bleed}" y="${-g.bleed}" width="${bw + g.bleed}" height="${g.h + g.bleed * 2}" fill="${state.accent}"/>`;
      box = { x: bw + padX, y: padY, w: g.w - bw - padX * 1.8, h: g.h - padY * 2 };
      if (state.logo) {
        const lw = Math.min(state.logoW, bw - 6), lh = lw / state.logo.aspect;
        const f = state.logoWhite ? ' filter="url(#nc-white)"' : '';
        body += `<image href="${state.logo.href}" x="${n((bw - lw) / 2)}" y="${n((g.h - lh) / 2)}" width="${n(lw)}" height="${n(lh)}" preserveAspectRatio="xMidYMid meet"${f}/>`;
      }
    }
  }

  // 収まるまで自動で詰める（重なり防止）。詰めきれない場合だけ警告する
  const extra = tpl === 'minimal' ? 6.4 : 0;
  let sc = state.scale, b, hH, bH, fH;
  let fits = false;
  for (let k = 0; k < 14; k++) {
    // 帯レイアウトではロゴを帯の中に置いたので、本文側では描かない
    b = composeBlocks(box.w, align, lang, sc, { whiteLogo, skipLogo: tpl === 'band' });
    hH = stackH(b.head); bH = stackH(b.body); fH = stackH(b.foot);
    const gaps = (hH ? 3.0 : 0) + (fH ? 2.6 : 0) + extra;
    if (hH + bH + fH + gaps <= box.h) { fits = true; break; }
    sc *= 0.95;
  }
  overflow = !fits;

  if (tpl === 'minimal') {
    // 上下2分割：上に会社まわり＋氏名、アクセント罫をはさんで下に連絡先
    let y = box.y;
    body += drawStack(b.head, box.x, y);
    y += hH + (hH ? 3.5 : 0);
    body += drawStack(b.body, box.x, y);
    const ruleY = box.y + box.h - fH - 3.2;
    body += `<rect x="${n(box.x)}" y="${n(ruleY)}" width="${n(box.w)}" height="0.25" fill="${state.accent}"/>`;
    body += drawStack(b.foot, box.x, box.y + box.h - fH);
  } else {
    // 上=会社 / 下=連絡先 / 余った領域の中央に氏名ブロック
    body += drawStack(b.head, box.x, box.y);
    body += drawStack(b.foot, box.x, box.y + box.h - fH);
    const top = box.y + hH + (hH ? 3.0 : 0);
    const bottom = box.y + box.h - fH - (fH ? 2.6 : 0);
    const free = bottom - top;
    body += drawStack(b.body, box.x, free > bH ? top + (free - bH) / 2 : top);
  }
  return body;
}

function geom() {
  const s = SIZES[state.size];
  let w = s.w, h = s.h;
  if (state.orientation === 'portrait') [w, h] = [h, w];
  return { w, h, bleed: BLEED, safe: SAFE };
}

function trimMarks(g, m) {
  const L = m * 0.8, o = g.bleed, sw = 0.1, c = '#000';
  const ln = (x1, y1, x2, y2) =>
    `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${c}" stroke-width="${sw}"/>`;
  let s = '';
  const corners = [[0, 0, -1, -1], [g.w, 0, 1, -1], [0, g.h, -1, 1], [g.w, g.h, 1, 1]];
  for (const [x, y, dx, dy] of corners) {
    s += ln(x, y + dy * o, x, y + dy * (o + L));   // 縦
    s += ln(x + dx * o, y, x + dx * (o + L), y);   // 横
    s += ln(x + dx * o, y + dy * o, x + dx * o, y + dy * (o + L));
    s += ln(x + dx * o, y + dy * o, x + dx * (o + L), y + dy * o);
  }
  return s;
}

function guideLayer(g) {
  const d = (x, y, w, h, col) =>
    `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="none" stroke="${col}" stroke-width="0.15" stroke-dasharray="0.8 0.6"/>`;
  return d(-g.bleed, -g.bleed, g.w + g.bleed * 2, g.h + g.bleed * 2, '#E11D48')
    + `<rect x="0" y="0" width="${g.w}" height="${g.h}" fill="none" stroke="#94A3B8" stroke-width="0.15"/>`
    + d(g.safe, g.safe, g.w - g.safe * 2, g.h - g.safe * 2, '#2563EB');
}

/**
 * @param {'front'|'back'} side
 * @param {{guides:boolean, marks:boolean}} opt
 */
function buildSVG(side, opt = {}) {
  const g = geom();
  const m = opt.marks ? MARKM : 0;
  const pad = g.bleed + m;
  const W = g.w + pad * 2, H = g.h + pad * 2;

  let lang = state.lang, mode = 'full';
  if (side === 'back') {
    if (state.back === 'logo') mode = 'logo';
    else lang = state.lang === 'ja' ? 'en' : 'ja';
  }

  const defs = `<defs><filter id="nc-white" color-interpolation-filters="sRGB">` +
    `<feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>` +
    `<clipPath id="nc-clip"><rect x="${-g.bleed}" y="${-g.bleed}" width="${g.w + g.bleed * 2}" height="${g.h + g.bleed * 2}"/></clipPath></defs>`;

  const content = renderFace(lang, mode);
  const marks = opt.marks ? trimMarks(g, m) : '';
  const guides = opt.guides ? guideLayer(g) : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${n(W)}mm" height="${n(H)}mm" viewBox="${n(-pad)} ${n(-pad)} ${n(W)} ${n(H)}">` +
    defs +
    `<rect x="${n(-pad)}" y="${n(-pad)}" width="${n(W)}" height="${n(H)}" fill="#ffffff"/>` +
    `<g clip-path="url(#nc-clip)">${content}</g>` + marks + guides +
    `</svg>`;
}

/* ============================================================
   4. UI
   ============================================================ */
const el = {};
function cacheEls() {
  ['fields', 'add-select', 'btn-add', 'logo-drop', 'logo-file', 'logo-preview', 'btn-logo-pick',
   'btn-logo-clear', 'logo-w', 'logo-w-out', 'logo-white', 'tpl', 'size', 'orientation', 'font',
   'scale', 'scale-out', 'c-accent', 'c-ink', 'c-bg', 'card-wrap', 'guides', 'marks', 'zoom-in',
   'zoom-out', 'zoom-out-label', 'side-back', 'warn', 'export-modal', 'print-root', 'print-page',
   'btn-export', 'btn-save', 'btn-load', 'file-load', 'stage', 'show-tags'].forEach(id => el[id] = $('#' + id));
}

/* --- 要素リスト --- */
function fieldRow(f, i) {
  const d = DEFS[f.key];
  const li = document.createElement('li');
  li.className = 'fi' + (f.enabled ? '' : ' is-off');
  li.dataset.id = f.id;

  const last = state.fields.length - 1;
  li.innerHTML = `
    <div class="fi__head">
      <label class="sw"><input type="checkbox" ${f.enabled ? 'checked' : ''} data-act="toggle"><span></span></label>
      <span class="fi__label">${esc(f.key === 'custom' ? (f.tag || '自由項目') : d.label)}</span>
      <span class="fi__ord">
        <button type="button" data-act="up" ${i === 0 ? 'disabled' : ''} aria-label="上へ">▲</button>
        <button type="button" data-act="down" ${i === last ? 'disabled' : ''} aria-label="下へ">▼</button>
      </span>
      <button type="button" class="fi__del" data-act="del" aria-label="削除">✕</button>
    </div>
    <div class="fi__body"></div>`;

  const bodyEl = $('.fi__body', li);
  const input = (label, key, val, type = 'text') => {
    const w = document.createElement('label');
    w.className = 'field';
    w.innerHTML = `<span class="inline-label">${esc(label)}</span><input type="${type}" data-k="${key}" value="${esc(val)}">`;
    bodyEl.appendChild(w);
  };

  if (d.type === 'image') {
    bodyEl.innerHTML = '<p class="hint" style="margin:0">「会社ロゴ」ブロックで画像を設定します。</p>';
  } else if (d.type === 'custom') {
    input('項目名（TEL / SNS など）', 'tag', f.tag);
    input('内容', 'v', f.v);
  } else if (d.type === 'single') {
    input(d.label, 'v', f.v, f.key === 'email' ? 'email' : (f.key === 'tel' || f.key === 'mobile' || f.key === 'fax' ? 'tel' : 'text'));
  } else {
    input('日本語', 'ja', f.ja);
    input('English', 'en', f.en);
  }
  return li;
}

function renderFields() {
  el.fields.innerHTML = '';
  state.fields.forEach((f, i) => el.fields.appendChild(fieldRow(f, i)));

  // 追加できる要素（未追加のもの + 自由項目）
  const used = new Set(state.fields.map(f => f.key));
  el['add-select'].innerHTML = Object.entries(DEFS)
    .filter(([k]) => k === 'custom' || !used.has(k))
    .map(([k, d]) => `<option value="${k}">${esc(d.label)}</option>`).join('');
  el['btn-add'].disabled = !el['add-select'].options.length;
}

function bindFields() {
  el.fields.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn || btn.tagName !== 'BUTTON') return;
    const id = btn.closest('.fi').dataset.id;
    const i = state.fields.findIndex(f => f.id === id);
    const act = btn.dataset.act;
    if (act === 'up' && i > 0) state.fields.splice(i - 1, 0, state.fields.splice(i, 1)[0]);
    if (act === 'down' && i < state.fields.length - 1) state.fields.splice(i + 1, 0, state.fields.splice(i, 1)[0]);
    if (act === 'del') state.fields.splice(i, 1);
    renderFields(); update();
  });
  el.fields.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.act !== 'toggle') return;
    const f = state.fields.find(x => x.id === t.closest('.fi').dataset.id);
    f.enabled = t.checked;
    t.closest('.fi').classList.toggle('is-off', !f.enabled);
    update();
  });
  el.fields.addEventListener('input', e => {
    const t = e.target;
    if (!t.dataset.k) return;
    const li = t.closest('.fi');
    const f = state.fields.find(x => x.id === li.dataset.id);
    f[t.dataset.k] = t.value;
    if (t.dataset.k === 'tag' && f.key === 'custom') $('.fi__label', li).textContent = f.tag || '自由項目';
    update();
  });
  el['btn-add'].addEventListener('click', () => {
    const k = el['add-select'].value;
    if (!k) return;
    state.fields.push(makeField(k));
    renderFields(); update();
  });
}

/* --- テンプレートのサムネイル --- */
function tplThumb(id) {
  const c = '#CBD5E1', a = 'var(--nc-primary)';
  const bar = (x, y, w, h, f) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(h / 2, 1)}" fill="${f}"/>`;
  const s = { standard: '', centered: '', band: '', minimal: '' };
  s.standard = bar(6, 6, 14, 4, a) + bar(6, 17, 26, 5, '#94A3B8') + bar(6, 25, 16, 2.5, c) + bar(6, 33, 32, 2, c) + bar(6, 37, 26, 2, c);
  s.centered = bar(26, 6, 14, 4, a) + bar(18, 17, 30, 5, '#94A3B8') + bar(24, 25, 18, 2.5, c) + bar(17, 33, 32, 2, c) + bar(22, 37, 22, 2, c);
  s.band = `<rect x="0" y="0" width="20" height="46" fill="${a}"/>` + bar(26, 8, 14, 3, c) + bar(26, 17, 28, 5, '#94A3B8') + bar(26, 26, 16, 2.5, c) + bar(26, 33, 30, 2, c) + bar(26, 37, 24, 2, c);
  s.minimal = bar(6, 6, 12, 3, a) + bar(6, 14, 30, 6, '#94A3B8') + bar(6, 23, 18, 2.5, c) + `<rect x="6" y="30" width="54" height="0.8" fill="${a}"/>` + bar(6, 34, 32, 2, c) + bar(6, 38, 26, 2, c);
  return `<svg viewBox="0 0 66 46" xmlns="http://www.w3.org/2000/svg"><rect width="66" height="46" fill="#fff" stroke="#E2E8F0" stroke-width="0.6"/>${s[id]}</svg>`;
}
function renderTpl() {
  el.tpl.innerHTML = TEMPLATES.map(t =>
    `<button type="button" class="tpl__item${state.template === t.id ? ' is-active' : ''}" data-tpl="${t.id}">${tplThumb(t.id)}<span>${t.name}</span></button>`
  ).join('');
}

/* --- ロゴ --- */
function setLogoFromFile(file) {
  if (!file) return;
  const rd = new FileReader();
  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
    rd.onload = () => {
      const txt = rd.result;
      const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
      const svg = doc.documentElement;
      let ar = 1;
      const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
      if (vb.length === 4 && vb[2] && vb[3]) ar = vb[2] / vb[3];
      else {
        const w = parseFloat(svg.getAttribute('width')), h = parseFloat(svg.getAttribute('height'));
        if (w && h) ar = w / h;
      }
      applyLogo('data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(txt))), ar);
    };
    rd.readAsText(file);
  } else {
    rd.onload = () => {
      const img = new Image();
      img.onload = () => applyLogo(rd.result, img.naturalWidth / img.naturalHeight);
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  }
}
function applyLogo(href, aspect) {
  state.logo = { href, aspect: aspect || 1 };
  el['logo-preview'].innerHTML = `<img src="${href}" alt="">`;
  if (!state.fields.some(f => f.key === 'logo')) { state.fields.unshift(makeField('logo')); renderFields(); }
  update();
}
async function loadPresetLogo(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(res.status);
    const txt = await res.text();
    const vb = (txt.match(/viewBox="([^"]+)"/) || [])[1];
    let ar = 1;
    if (vb) { const p = vb.split(/[\s,]+/).map(Number); if (p[2] && p[3]) ar = p[2] / p[3]; }
    applyLogo('data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(txt))), ar);
  } catch (e) {
    alert('プリセットロゴを読み込めませんでした。ローカルサーバー経由で開いてください。\n(' + path + ')');
  }
}

/* --- プレビュー更新 --- */
function update() {
  const svg = buildSVG(state.side, { guides: state.guides, marks: state.marks });
  el['card-wrap'].innerHTML = svg;
  const g = geom();
  const pad = g.bleed + (state.marks ? MARKM : 0);
  const px = (g.w + pad * 2) * 3.7795 * state.zoom;   // mm → px（96dpi基準）
  const node = el['card-wrap'].firstElementChild;
  node.setAttribute('width', Math.round(px));
  node.setAttribute('height', Math.round(px * (g.h + pad * 2) / (g.w + pad * 2)));

  el['side-back'].disabled = state.back === 'none';
  if (state.back === 'none' && state.side === 'back') { state.side = 'front'; syncSeg('#seg-side', 'side', 'front'); return update(); }

  el.warn.hidden = !overflow;
  if (overflow) el.warn.textContent = '文字量がカードに収まりきっていません。要素を減らすか、文字サイズ調整を小さくしてください。';
  save();
}
function syncSeg(sel, key, val) {
  $$(sel + ' .seg__item').forEach(b => b.classList.toggle('is-active', b.dataset[key] === val));
}

/* ============================================================
   5. 書き出し
   ============================================================ */
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const baseName = () => {
  const f = byKey('name');
  const s = f ? (f.ja || f.en) : 'namecard';
  return 'namecard_' + s.replace(/\s+/g, '') ;
};
const sides = () => (state.back === 'none' ? ['front'] : ['front', 'back']);

function exportSVG() {
  sides().forEach((s, i) => {
    const svg = buildSVG(s, { guides: false, marks: state.marks });
    download(new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + svg], { type: 'image/svg+xml' }),
      `${baseName()}_${s === 'front' ? 'omote' : 'ura'}.svg`);
  });
}

function exportPNG() {
  const dpi = 350;
  sides().forEach(side => {
    const g = geom();
    const pad = g.bleed + (state.marks ? MARKM : 0);
    const mmW = g.w + pad * 2, mmH = g.h + pad * 2;
    const svg = buildSVG(side, { guides: false, marks: state.marks });
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = Math.round(mmW / 25.4 * dpi);
      cv.height = Math.round(mmH / 25.4 * dpi);
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      cv.toBlob(b => download(b, `${baseName()}_${side === 'front' ? 'omote' : 'ura'}_350dpi.png`), 'image/png');
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { URL.revokeObjectURL(url); alert('PNGの書き出しに失敗しました。'); };
    img.src = url;
  });
}

function exportPDF() {
  const g = geom();
  const pad = g.bleed + (state.marks ? MARKM : 0);
  const W = g.w + pad * 2, H = g.h + pad * 2;
  el['print-page'].textContent = `@page { size: ${n(W)}mm ${n(H)}mm; margin: 0; }`;
  el['print-root'].innerHTML = sides()
    .map(s => buildSVG(s, { guides: false, marks: state.marks })).join('');
  el['export-modal'].close();
  setTimeout(() => window.print(), 120);
}

/* ---------- 保存・読み込み ---------- */
const KEY = 'nc-builder-v1';
function snapshot() {
  const { size, orientation, template, lang, font, scale, accent, ink, bg,
          logoW, logoWhite, showTags, back, fields, logo } = state;
  return { size, orientation, template, lang, font, scale, accent, ink, bg, logoW, logoWhite, showTags, back, fields, logo };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(snapshot())); } catch (e) {} }
function restore(data) {
  Object.assign(state, data);
  if (!Array.isArray(state.fields) || !state.fields.length) resetFields();
  uid = state.fields.length;
  state.fields.forEach((f, i) => { f.id = 'f' + (i + 1); uid = i + 1; });
  if (state.logo) el['logo-preview'].innerHTML = `<img src="${state.logo.href}" alt="">`;
  // UI へ反映
  el.size.value = state.size; el.orientation.value = state.orientation; el.font.value = state.font;
  el.scale.value = state.scale; el['scale-out'].value = Math.round(state.scale * 100) + '%';
  el['c-accent'].value = state.accent; el['c-ink'].value = state.ink; el['c-bg'].value = state.bg;
  el['logo-w'].value = state.logoW; el['logo-w-out'].value = Number(state.logoW).toFixed(1);
  el['logo-white'].checked = state.logoWhite;
  el['show-tags'].checked = state.showTags !== false;
  syncSeg('#seg-lang', 'lang', state.lang);
  syncSeg('#seg-back', 'back', state.back);
  renderTpl(); renderFields();
}

/* ============================================================
   6. 初期化
   ============================================================ */
function init() {
  cacheEls();
  resetFields();

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (saved) restore(saved); else { renderTpl(); renderFields(); }

  bindFields();

  // セグメント
  $('#seg-lang').addEventListener('click', e => {
    const b = e.target.closest('[data-lang]'); if (!b) return;
    state.lang = b.dataset.lang; syncSeg('#seg-lang', 'lang', state.lang); update();
  });
  $('#seg-back').addEventListener('click', e => {
    const b = e.target.closest('[data-back]'); if (!b) return;
    state.back = b.dataset.back; syncSeg('#seg-back', 'back', state.back); update();
  });
  $('#seg-side').addEventListener('click', e => {
    const b = e.target.closest('[data-side]'); if (!b || b.disabled) return;
    state.side = b.dataset.side; syncSeg('#seg-side', 'side', state.side); update();
  });
  el.tpl.addEventListener('click', e => {
    const b = e.target.closest('[data-tpl]'); if (!b) return;
    state.template = b.dataset.tpl; renderTpl(); update();
  });

  // 各種コントロール
  el.size.addEventListener('change', () => { state.size = el.size.value; update(); });
  el.orientation.addEventListener('change', () => { state.orientation = el.orientation.value; update(); });
  el.font.addEventListener('change', () => { state.font = el.font.value; update(); });
  el.scale.addEventListener('input', () => {
    state.scale = +el.scale.value; el['scale-out'].value = Math.round(state.scale * 100) + '%'; update();
  });
  ['accent', 'ink', 'bg'].forEach(k => {
    el['c-' + k].addEventListener('input', () => { state[k] = el['c-' + k].value; update(); });
  });
  el['logo-w'].addEventListener('input', () => {
    state.logoW = +el['logo-w'].value; el['logo-w-out'].value = state.logoW.toFixed(1); update();
  });
  el['logo-white'].addEventListener('change', () => { state.logoWhite = el['logo-white'].checked; update(); });
  el['show-tags'].addEventListener('change', () => { state.showTags = el['show-tags'].checked; update(); });

  // ロゴ入力
  el['btn-logo-pick'].addEventListener('click', () => el['logo-file'].click());
  el['logo-file'].addEventListener('change', e => setLogoFromFile(e.target.files[0]));
  el['btn-logo-clear'].addEventListener('click', () => {
    state.logo = null;
    el['logo-preview'].innerHTML = '<span>SVG / PNG をドラッグ&ドロップ</span>';
    update();
  });
  const drop = el['logo-drop'];
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('is-over'); }));
  drop.addEventListener('drop', e => setLogoFromFile(e.dataTransfer.files[0]));
  $$('[data-preset-logo]').forEach(b => b.addEventListener('click', () => loadPresetLogo(b.dataset.presetLogo)));

  // プレビュー操作
  el.guides.addEventListener('change', () => { state.guides = el.guides.checked; update(); });
  el.marks.addEventListener('change', () => { state.marks = el.marks.checked; update(); });
  const setZoom = v => {
    state.zoom = Math.min(3, Math.max(0.6, v));
    el['zoom-out-label'].value = Math.round(state.zoom * 100) + '%';
    update();
  };
  el['zoom-in'].addEventListener('click', () => setZoom(state.zoom + 0.2));
  el['zoom-out'].addEventListener('click', () => setZoom(state.zoom - 0.2));

  // 書き出し
  el['btn-export'].addEventListener('click', () => el['export-modal'].showModal());
  $('#ex-pdf').addEventListener('click', exportPDF);
  $('#ex-svg').addEventListener('click', exportSVG);
  $('#ex-png').addEventListener('click', exportPNG);

  // 保存・読み込み（JSON）
  el['btn-save'].addEventListener('click', () => {
    download(new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' }), baseName() + '.json');
  });
  el['btn-load'].addEventListener('click', () => el['file-load'].click());
  el['file-load'].addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { try { restore(JSON.parse(rd.result)); update(); } catch (err) { alert('読み込めませんでした。'); } };
    rd.readAsText(f);
    e.target.value = '';
  });

  // Webフォント読み込み後に実測がずれるので再描画
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);

  setZoom(state.zoom);
}

document.addEventListener('DOMContentLoaded', init);
})();
