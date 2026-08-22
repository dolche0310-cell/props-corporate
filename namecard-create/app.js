/* ============================================================
   名刺データ作成ツール
   デザインベース：Figma props_Rebranding
     おもて 526:23433 / うら 526:23452（縦 55 × 91 mm）
   入力 → SVG(実寸mm)で組版 → プレビュー / PDF・SVG・PNG 書き出し
   ・座標系は「mm」。viewBox も mm 単位で持たせ、そのまま入稿サイズになる
   ・Figma のアートボードは 251 × 415px。px÷4.5636 で mm に読み替えている
   ・ロゴ・配色・組み方・裏面はデザイン固定。切り替えられるのは記載内容だけ
   ============================================================ */
(() => {
'use strict';

/* ---------- 用紙（向きは縦で固定） ---------- */
const SIZES = {
  jp91: { w: 55, h: 91 },
  us89: { w: 51, h: 89 },
  jp85: { w: 49, h: 85 },
};
const BLEED = 3;      // 塗り足し（書き出しには含めるが、プレビューには表記しない）
const MARKM = 5;      // トンボを描くための追加マージン

const GOTHIC = "'Albert Sans','Noto Sans JP','Hiragino Kaku Gothic ProN','Hiragino Sans','Yu Gothic',sans-serif";
const MINCHO = "'Hiragino Mincho ProN','Yu Mincho','YuMincho','Noto Serif JP',serif";

/* Figma px → mm（251px = 55mm） */
const PX = 55 / 251;

/* 版面。用紙サイズが変わっても同じ見えになるよう比率で持つ */
const LY = {
  padL:   28 / 251,   // 左マージン
  padR:   25 / 251,   // 右マージン（罫線の右端に合わせる）
  logoT:  24 / 415,   // ロゴ上端
  logoR:  24 / 251,   // ロゴ右マージン
  nameT: 163 / 415,   // 氏名ブロックの上端
  footB:  18 / 415,   // 会社情報ブロックの下端
};
const LOGO_W = 43 / 251;   // おもてのロゴマーク幅（カード幅に対する比）

/* 裏面（Figma うら 526:23452 の実測。すべてカード寸法に対する比） */
const BACK = {
  markX: 44.536 / 251, markY: 105.014 / 415, markW:  39.051 / 251,
  typeX: 93.472 / 251, typeY: 105.391 / 415, typeW: 104.720 / 251,
  tagY:    171 / 415,
  tagSize:  12 * PX,     // 2.63mm
  tagLH:    22 / 12,     // 行送り 22px / 級数 12px
  tagLS:  0.48 * PX,     // 字送り 0.48px
  qrX:      95 / 251, qrY: 286 / 415, qrW: 62 / 251,
};
const TAGLINE = ['“うちに合う人”を逃さない。', '採用を加速する', 'カスタムAI面接'];

/* 配色（Figma 実測。デザイン固定） */
const C = {
  name:  '#000000',
  label: '#5C5C5C',
  meta:  '#8A8A8A',
  rule:  '#D8D8D8',
  tag:   '#000000',   // 裏面タグライン
  bg:    '#FFFFFF',
  trim:  '#B4B4B4',   // 仕上がり線（プレビュー用・書き出しには含めない）
};

/* 級数（Figma px → mm） */
const FS = {
  name:  20 * PX,   // 4.38mm
  label: 10 * PX,   // 2.19mm
  meta:  10 * PX,
  small:  8 * PX,   // 1.75mm
};

/* 行間・アキ（Figma 実測 px → mm） */
const LH = { label: 1.2, name: 1.5, meta: 1.6, small: 1.25 };
const GAP = {
  titleName: 16 * PX,   // 役職 → 氏名
  contact:   16 * PX,   // ローマ字 → 連絡先
  compRule:   7 * PX,   // 会社名 → 罫線
  ruleAddr:   7 * PX,   // 罫線 → 住所
  item:       4 * PX,   // 小さい行どうし
  logo:       8 * PX,   // ロゴ下端との最低アキ
  icon:       1.2,      // アイコン → 値
};
const RULE_W = 1 * PX;  // 罫線の太さ

/* 連絡先アイコン（24 × 24 グリッドの線画） */
const ICONS = {
  tel:    '<path d="M5.4 3.5h3.1l1.6 4-2.2 1.6a12.6 12.6 0 0 0 6.8 6.8l1.6-2.2 4 1.6v3.1a1.6 1.6 0 0 1-1.7 1.6C10.5 19.4 4.6 13.5 3.8 5.2A1.6 1.6 0 0 1 5.4 3.5z"/>',
  mobile: '<rect x="6.8" y="2.6" width="10.4" height="18.8" rx="1.8"/><path d="M10.6 18.6h2.8"/>',
  email:  '<rect x="2.4" y="5.2" width="19.2" height="13.6" rx="1.6"/><path d="M3 6.4 12 13l9-6.6"/>',
};
const ICON_STROKE = 2;   // 24 グリッド上の線幅

/* 要素の定義。type: bi=日英2値 / single=1値
   group: lead=氏名の上 / body=氏名まわり / contact=連絡先 / org=会社名 / addr=住所
   on: 初期状態で表示するか（Figma おもて 526:23433 の構成） */
const DEFS = {
  dept:    { label: '部署',           type: 'bi',     group: 'lead', on: false, ja: '事業開発部',   en: 'Business Development' },
  title:   { label: '役職',           type: 'bi',     group: 'lead', on: true,  ja: 'マネージャー', en: 'Manager' },
  name:    { label: '氏名',           type: 'bi',     group: 'body', on: true,  ja: '山田 太郎',    en: 'Taro Yamada', sei: '山田', mei: '太郎' },
  reading: { label: 'ローマ字表記',   type: 'single', group: 'body', on: true,  v: 'Taro Yamada' },
  tel:     { label: '電話番号',       type: 'single', group: 'contact', on: true,  icon: 'tel',    v: '03-1234-5678' },
  mobile:  { label: '携帯番号',       type: 'single', group: 'contact', on: false, icon: 'mobile', v: '090-1234-5678' },
  email:   { label: 'メールアドレス', type: 'single', group: 'contact', on: true,  icon: 'email',  v: 'taro.yamada@example.co.jp' },
  company: { label: '会社名',         type: 'bi',     group: 'org',  on: true,  ja: '株式会社サンプル', en: 'Sample Inc.' },
  postal:  { label: '郵便番号',       type: 'single', group: 'addr', on: true,  v: '〒150-0001' },
  address: { label: '会社住所',       type: 'bi',     group: 'addr', on: true,
             ja: '東京都渋谷区神宮前1-2-3 サンプルビル5F',
             en: '5F Sample Bldg, 1-2-3 Jingumae, Shibuya-ku, Tokyo' },
  web:     { label: 'Webサイト',      type: 'single', group: 'addr', on: true,  v: 'https://example.co.jp' },
};
const KEYS = Object.keys(DEFS);

/* ---------- 状態 ---------- */
const state = {
  size: 'jp91', lang: 'ja', font: 'gothic',
  showIcons: false, back: true, side: 'front',
  guides: true, marks: false, zoom: 1.4,
  fields: {},           // key → { enabled, ja, en, v }
};

function resetFields() {
  state.fields = {};
  for (const k of KEYS) {
    const d = DEFS[k];
    state.fields[k] = { enabled: d.on, ja: d.ja || '', en: d.en || '', v: d.v || '' };
    if (k === 'name') { state.fields[k].sei = d.sei || ''; state.fields[k].mei = d.mei || ''; }
  }
}

/* 図版（デザイン固定・app.js に内蔵） */
const ART = { mark: null, type: null, qr: null };

/* ---------- ちいさな道具 ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = v => Math.round(v * 1000) / 1000;

/* ---------- ひらがな → ローマ字（ヘボン式・簡易） ----------
   氏名（姓・名）をIME入力した際、変換前のひらがなをローマ字表記へ
   自動反映するために使う。カタカナはひらがなへ寄せてから変換する。 */
const KANA_MAP = {
  'あ':'a','い':'i','う':'u','え':'e','お':'o',
  'か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko',
  'が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go',
  'さ':'sa','し':'shi','す':'su','せ':'se','そ':'so',
  'ざ':'za','じ':'ji','ず':'zu','ぜ':'ze','ぞ':'zo',
  'た':'ta','ち':'chi','つ':'tsu','て':'te','と':'to',
  'だ':'da','ぢ':'ji','づ':'zu','で':'de','ど':'do',
  'な':'na','に':'ni','ぬ':'nu','ね':'ne','の':'no',
  'は':'ha','ひ':'hi','ふ':'fu','へ':'he','ほ':'ho',
  'ば':'ba','び':'bi','ぶ':'bu','べ':'be','ぼ':'bo',
  'ぱ':'pa','ぴ':'pi','ぷ':'pu','ぺ':'pe','ぽ':'po',
  'ま':'ma','み':'mi','む':'mu','め':'me','も':'mo',
  'や':'ya','ゆ':'yu','よ':'yo',
  'ら':'ra','り':'ri','る':'ru','れ':'re','ろ':'ro',
  'わ':'wa','ゐ':'i','ゑ':'e','を':'o','ん':'n',
};
const KANA_YOON = {
  'きゃ':'kya','きゅ':'kyu','きょ':'kyo', 'ぎゃ':'gya','ぎゅ':'gyu','ぎょ':'gyo',
  'しゃ':'sha','しゅ':'shu','しょ':'sho', 'じゃ':'ja','じゅ':'ju','じょ':'jo',
  'ちゃ':'cha','ちゅ':'chu','ちょ':'cho', 'にゃ':'nya','にゅ':'nyu','にょ':'nyo',
  'ひゃ':'hya','ひゅ':'hyu','ひょ':'hyo', 'びゃ':'bya','びゅ':'byu','びょ':'byo',
  'ぴゃ':'pya','ぴゅ':'pyu','ぴょ':'pyo', 'みゃ':'mya','みゅ':'myu','みょ':'myo',
  'りゃ':'rya','りゅ':'ryu','りょ':'ryo',
};
function kataToHira(s) {
  return s.replace(/[\u30a1-\u30f6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
}
function kanaToRomaji(raw) {
  const s = kataToHira(String(raw || ''));
  let out = '', i = 0, lastVowel = '';
  while (i < s.length) {
    const two = s.slice(i, i + 2);
    if (KANA_YOON[two]) { out += KANA_YOON[two]; lastVowel = KANA_YOON[two].slice(-1); i += 2; continue; }
    const c = s[i];
    if (c === 'っ') {                       // 促音：次の子音を重ねる
      const next = KANA_YOON[s.slice(i + 1, i + 3)] || KANA_MAP[s[i + 1]] || '';
      out += next.slice(0, 1); i += 1; continue;
    }
    if (c === 'ー') { out += lastVowel; i += 1; continue; }  // 長音符
    if (KANA_MAP[c]) { out += KANA_MAP[c]; lastVowel = KANA_MAP[c].slice(-1); i += 1; continue; }
    out += c; i += 1;                       // 未対応文字はそのまま（英数字など）
  }
  return out;
}
const capitalize = s => (s ? s[0].toUpperCase() + s.slice(1) : s);

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
  if (o.anchor) a.push(`text-anchor="${o.anchor}"`);
  a.push('xml:space="preserve"');
  return `<text ${a.join(' ')}>${esc(t)}</text>`;
}
const svgImage = (art, x, y, w) =>
  `<image href="${art.href}" x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(w / art.aspect)}"` +
  ` preserveAspectRatio="xMidYMid meet"/>`;

/** 24×24 のアイコンを size(mm) で描く */
function svgIcon(name, x, y, size) {
  const s = size / 24;
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})" fill="none" stroke="${C.meta}"` +
    ` stroke-width="${ICON_STROKE}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</g>`;
}

/* ============================================================
   1. 入力値 → 表示文字列（表記パターンを反映）
   ============================================================ */
function valueOf(key, lang) {
  const d = DEFS[key], f = state.fields[key];
  if (!f || !f.enabled) return '';
  if (d.type === 'single') return f.v.trim();
  const ja = f.ja.trim(), en = f.en.trim();
  return lang === 'en' ? (en || ja) : (ja || en);
}
const iconOf = key => (state.showIcons && DEFS[key].icon ? DEFS[key].icon : '');
const group = g => KEYS.filter(k => DEFS[k].group === g && state.fields[k].enabled);

/* ============================================================
   2. 組版：行を積み上げる
   行 = { t, size, weight, fill, ls, lh, gap, ind, icon, iconSize }
       gap … 直前に空けるアキ(mm) / ind … 値の字下げ(mm)
       { rule:true } は罫線
   ============================================================ */
const lineH = l => (l.rule ? 0 : l.size * l.lh);
const stackH = ls => ls.reduce((s, l) => s + (l.gap || 0) + lineH(l), 0);

function drawLines(ls, x, y, boxW) {
  let cy = y, out = '';
  for (const l of ls) {
    cy += l.gap || 0;
    if (l.rule) {
      out += `<rect x="${n(x)}" y="${n(cy)}" width="${n(boxW)}" height="${n(RULE_W)}" fill="${C.rule}"/>`;
      continue;
    }
    const by = cy + l.size * 0.78;
    if (l.icon) {
      // 文字の視覚的な中心（ベースラインの少し上）にアイコンの中心を合わせる
      out += svgIcon(l.icon, x, by - l.size * 0.30 - l.iconSize / 2, l.iconSize);
    }
    out += svgText(l.t, x + (l.ind || 0), by, { size: l.size, weight: l.weight, fill: l.fill, ls: l.ls });
    cy += lineH(l);
  }
  return out;
}

/**
 * 1要素を行配列に展開する
 * @param {object} st { size, weight, fill, ls, lh, min }
 */
function pushField(out, key, lang, st, gap, boxW, ind = 0) {
  const val = valueOf(key, lang);
  if (!val) return out;
  const avail = boxW - ind;
  const size = st.min ? fit(val, avail, st.size, st.weight, st.ls, st.min) : st.size;
  let first = true;
  for (const t of wrap(val, avail, size, st.weight, st.ls)) {
    out.push({ t, size, weight: st.weight, fill: st.fill, ls: st.ls, lh: st.lh, ind, gap: first ? gap : 0 });
    first = false;
  }
  return out;
}

/* --- 氏名の上（部署・役職） --- */
function leadLines(lang, sc, boxW) {
  const out = [];
  const st = { size: FS.label * sc, weight: 500, fill: C.label, ls: 0.05, lh: LH.label, min: 1.5 };
  for (const k of group('lead')) pushField(out, k, lang, st, out.length ? GAP.item : 0, boxW);
  return out;
}

/* --- 氏名・ローマ字・連絡先 --- */
function bodyLines(lang, sc, boxW) {
  const out = [];
  pushField(out, 'name', lang, {
    size: FS.name * sc, weight: 700, fill: C.name, ls: 2 * PX * sc, lh: LH.name, min: 2.6,
  }, 0, boxW);
  pushField(out, 'reading', lang, {
    size: FS.label * sc, weight: 500, fill: C.label, ls: 0.02, lh: LH.label, min: 1.5,
  }, 0, boxW);

  const cf = group('contact');
  if (cf.length) {
    const size = FS.meta * sc;
    const iconSize = size * 1.15;
    const ind = cf.some(k => iconOf(k)) ? iconSize + GAP.icon : 0;
    const st = { size, weight: 500, fill: C.meta, ls: 0.02, lh: LH.meta };
    cf.forEach((k, i) => {
      const at = out.length;
      pushField(out, k, lang, st, (i === 0 && at) ? GAP.contact : 0, boxW, ind);
      if (out[at] && iconOf(k)) { out[at].icon = iconOf(k); out[at].iconSize = iconSize; }
    });
  }
  return out;
}

/* --- 会社名 → 罫線 → 住所（下端そろえ） --- */
function footLines(lang, sc, boxW) {
  const out = [];
  const stC = { size: FS.label * sc, weight: 900, fill: C.label, ls: 0.04, lh: LH.label, min: 1.5 };
  for (const k of group('org')) pushField(out, k, lang, stC, out.length ? GAP.item : 0, boxW);
  if (out.length) out.push({ rule: true, gap: GAP.compRule });

  const stA = { size: FS.small * sc, weight: 500, fill: C.meta, ls: 0.02, lh: LH.small };
  group('addr').forEach((k, i) => {
    pushField(out, k, lang, stA, i === 0 ? (out.length ? GAP.ruleAddr : 0) : GAP.item, boxW);
  });
  return out;
}

/* ============================================================
   3. カード1面を SVG 文字列にする
   ============================================================ */
let overflow = false;

/* --- 裏面（Figma うら 526:23452・デザイン固定） --- */
function renderBack(g) {
  let out = '';
  // ロゴマーク + ロゴタイプ
  out += svgImage(ART.mark, g.w * BACK.markX, g.h * BACK.markY, g.w * BACK.markW);
  out += svgImage(ART.type, g.w * BACK.typeX, g.h * BACK.typeY, g.w * BACK.typeW);

  // タグライン（3行・中央ぞろえ）
  const k = g.w / SIZES.jp91.w;
  const size = BACK.tagSize * k, ls = BACK.tagLS * k;
  const lh = size * BACK.tagLH;
  const lead = (lh - size) / 2 + size * 0.78;   // 行ボックス上端 → ベースライン
  TAGLINE.forEach((t, i) => {
    // 字送りは最後の1文字ぶんも進むので、中央ぞろえの基準を半分だけ戻す
    out += svgText(t, g.w / 2 + ls / 2, g.h * BACK.tagY + i * lh + lead,
      { size, weight: 500, fill: C.tag, ls, anchor: 'middle' });
  });

  // QRコード
  out += svgImage(ART.qr, g.w * BACK.qrX, g.h * BACK.qrY, g.w * BACK.qrW);
  return out;
}

function renderFace(lang, side) {
  const g = geom();
  overflow = false;

  let out = `<rect x="${-g.bleed}" y="${-g.bleed}" width="${g.w + g.bleed * 2}" height="${g.h + g.bleed * 2}" fill="${C.bg}"/>`;
  if (side === 'back') return out + renderBack(g);

  const padL = g.w * LY.padL, padR = g.w * LY.padR;
  const boxW = g.w - padL - padR;

  /* --- ロゴ（右上・固定） --- */
  const lw = g.w * LOGO_W, lh = lw / ART.mark.aspect;
  out += svgImage(ART.mark, g.w - g.w * LY.logoR - lw, g.h * LY.logoT, lw);
  const logoBottom = g.h * LY.logoT + lh;

  /* --- 収まるまで自動で詰める（重なり防止） --- */
  const footBottom = g.h - g.h * LY.footB;
  let sc = 1, lead, body, foot, nameTop = 0, leadTop = 0, footTop = 0, fits = false;

  for (let k = 0; k < 18; k++) {
    lead = leadLines(lang, sc, boxW);
    body = bodyLines(lang, sc, boxW);
    foot = footLines(lang, sc, boxW);

    nameTop = g.h * LY.nameT;
    leadTop = nameTop - (lead.length ? stackH(lead) + GAP.titleName : 0);

    // 上に伸びすぎたら氏名ブロックごと下へ逃がす
    const minTop = logoBottom + GAP.logo;
    if (leadTop < minTop) { const d = minTop - leadTop; leadTop += d; nameTop += d; }

    footTop = footBottom - stackH(foot);
    if (nameTop + stackH(body) <= footTop - 2.5) { fits = true; break; }
    sc *= 0.96;
  }
  overflow = !fits;

  out += drawLines(lead, padL, leadTop, boxW);
  out += drawLines(body, padL, nameTop, boxW);
  out += drawLines(foot, padL, footTop, boxW);
  return out;
}

function geom() {
  const s = SIZES[state.size];
  return { w: s.w, h: s.h, bleed: BLEED };
}

function trimMarks(g, m) {
  const L = m * 0.8, o = g.bleed, sw = 0.1, c = '#000';
  const ln = (x1, y1, x2, y2) =>
    `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${c}" stroke-width="${sw}"/>`;
  let s = '';
  const corners = [[0, 0, -1, -1], [g.w, 0, 1, -1], [0, g.h, -1, 1], [g.w, g.h, 1, 1]];
  for (const [x, y, dx, dy] of corners) {
    s += ln(x, y + dy * o, x, y + dy * (o + L));
    s += ln(x + dx * o, y, x + dx * (o + L), y);
    s += ln(x + dx * o, y + dy * o, x + dx * o, y + dy * (o + L));
    s += ln(x + dx * o, y + dy * o, x + dx * (o + L), y + dy * o);
  }
  return s;
}

/* 仕上がりサイズだけを示す枠（プレビュー専用） */
const trimLine = g =>
  `<rect x="0" y="0" width="${g.w}" height="${g.h}" fill="none" stroke="${C.trim}" stroke-width="0.15"/>`;

/**
 * @param {'front'|'back'} side
 * @param {{guides:boolean, marks:boolean}} opt
 */
function buildSVG(side, opt = {}) {
  const g = geom();
  const m = opt.marks ? MARKM : 0;
  const pad = g.bleed + m;
  const W = g.w + pad * 2, H = g.h + pad * 2;

  const defs = `<defs><clipPath id="nc-clip"><rect x="${-g.bleed}" y="${-g.bleed}"` +
    ` width="${g.w + g.bleed * 2}" height="${g.h + g.bleed * 2}"/></clipPath></defs>`;

  const content = renderFace(state.lang, side);
  const marks = opt.marks ? trimMarks(g, m) : '';
  const guides = opt.guides ? trimLine(g) : '';

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
  ['fields', 'size', 'font', 'card-wrap', 'guides', 'marks',
   'zoom-in', 'zoom-out', 'zoom-out-label', 'side-back', 'warn', 'export-modal',
   'print-root', 'print-page', 'btn-export', 'btn-save', 'btn-list', 'list-modal', 'card-list',
   'confirm-modal',
   'stage', 'show-icons', 'use-back', 'btn-settings', 'settings-pop'].forEach(id => el[id] = $('#' + id));
}

/* --- 要素リスト（表示/非表示のみ） --- */
function fieldRow(key) {
  const d = DEFS[key], f = state.fields[key];
  const li = document.createElement('li');
  li.className = 'fi' + (f.enabled ? '' : ' is-off');
  li.dataset.key = key;

  li.innerHTML = `
    <div class="fi__head">
      <label class="sw"><input type="checkbox" ${f.enabled ? 'checked' : ''} data-act="toggle"><span></span></label>
      <span class="fi__label">${esc(d.label)}</span>
    </div>
    <div class="fi__body"></div>`;

  const bodyEl = $('.fi__body', li);
  // 項目名はトグル横に出ているので、入力欄の上には出さない（読み上げ用に aria-label だけ持たせる）
  const input = (label, k, val, type = 'text') => {
    const w = document.createElement('div');
    w.className = 'field';
    w.innerHTML = `<input type="${type}" data-k="${k}" value="${esc(val)}" aria-label="${esc(label)}">`;
    bodyEl.appendChild(w);
  };

  if (d.type === 'single') {
    input(d.label, 'v', f.v, key === 'email' ? 'email' : (/^(tel|mobile)$/.test(key) ? 'tel' : 'text'));
  } else if (key === 'name' && state.lang !== 'en') {
    // 氏名（日本語）だけは姓・名を分けて入力し、間の半角スペースは自動で入れる
    const row = document.createElement('div');
    row.className = 'field field--pair';
    row.innerHTML =
      `<input type="text" data-k="sei" value="${esc(f.sei)}" aria-label="姓" placeholder="姓">` +
      `<input type="text" data-k="mei" value="${esc(f.mei)}" aria-label="名" placeholder="名">`;
    bodyEl.appendChild(row);
  } else {
    // 日英2値のうち、いま選んでいる表記の側だけを編集させる
    const k = state.lang === 'en' ? 'en' : 'ja';
    input(d.label, k, f[k]);
  }
  return li;
}

function renderFields() {
  el.fields.innerHTML = '';
  KEYS.forEach(k => el.fields.appendChild(fieldRow(k)));
}

/**
 * 姓・名のひらがな読みから、ローマ字表記を自動で埋める。
 * ユーザーがローマ字表記欄を直接編集した後は上書きしない。
 */
function autoFillReading(nameField) {
  const reading = state.fields.reading;
  if (!reading || reading.enabled === false || reading._auto === false) return;
  const seiR = nameField.seiKana ? kanaToRomaji(nameField.seiKana) : '';
  const meiR = nameField.meiKana ? kanaToRomaji(nameField.meiKana) : '';
  if (!seiR && !meiR) return;
  reading.v = [capitalize(meiR), capitalize(seiR)].filter(Boolean).join(' ');
  reading._auto = true;
  // .fi__head 内のトグルも input なので、値欄(.fi__body内)だけを狙って直接書き換える
  // （renderFields()で全体を作り直すと、姓・名の入力中のフォーカスが切れてしまうため）
  const input = $('.fi[data-key="reading"] .fi__body input');
  if (input) input.value = reading.v;
}

function bindFields() {
  el.fields.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.act !== 'toggle') return;
    const li = t.closest('.fi');
    state.fields[li.dataset.key].enabled = t.checked;
    li.classList.toggle('is-off', !t.checked);
    update();
  });
  el.fields.addEventListener('input', e => {
    const t = e.target;
    if (!t.dataset.k) return;
    const li = t.closest('.fi');
    const key = li.dataset.key;
    const f = state.fields[key];
    f[t.dataset.k] = t.value;
    if (key === 'name' && (t.dataset.k === 'sei' || t.dataset.k === 'mei')) {
      // 姓・名の間は半角スペースを自動で入れる
      f.ja = [f.sei, f.mei].filter(Boolean).join(' ');
    }
    if (key === 'reading' && t.dataset.k === 'v') {
      state.fields.reading._auto = false;   // 手で編集したら自動入力を止める
    }
    update();
  });
  // IME変換前のひらがなを捕まえて、確定時にローマ字表記へ反映する
  el.fields.addEventListener('compositionupdate', e => {
    const t = e.target;
    if (t.dataset.k !== 'sei' && t.dataset.k !== 'mei') return;
    if (/^[\u3040-\u309F\u30FCー]*$/.test(e.data || '')) t._lastKana = e.data;
  });
  el.fields.addEventListener('compositionend', e => {
    const t = e.target;
    if (t.dataset.k !== 'sei' && t.dataset.k !== 'mei') return;
    const kana = t._lastKana || ''; t._lastKana = '';
    if (!kana) return;
    const f = state.fields[t.closest('.fi').dataset.key];
    f[t.dataset.k === 'sei' ? 'seiKana' : 'meiKana'] = kana;
    autoFillReading(f);
    update();
  });
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

  el['side-back'].disabled = !state.back;
  if (!state.back && state.side === 'back') { state.side = 'front'; syncSeg('#seg-side', 'side', 'front'); return update(); }

  el.warn.hidden = !overflow;
  if (overflow) el.warn.textContent = '文字量がカードに収まりきっていません。表示する要素を減らしてください。';
  save();
}
function syncSeg(sel, key, val) {
  $$(sel + ' [data-' + key + ']').forEach(b => b.classList.toggle('is-active', b.dataset[key] === val));
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
const baseName = () => 'namecard_' + (valueOf('name', state.lang) || 'untitled').replace(/\s+/g, '');
const sides = () => (state.back ? ['front', 'back'] : ['front']);

function exportSVG() {
  sides().forEach(s => {
    const svg = buildSVG(s, { guides: false, marks: state.marks });
    download(new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + svg], { type: 'image/svg+xml' }),
      `${baseName()}_${s === 'front' ? 'omote' : 'ura'}.svg`);
  });
}

/** PNG / JPEG 共通のラスター書き出し */
function exportRaster(mime, ext, quality) {
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
      cv.toBlob(b => download(b, `${baseName()}_${side === 'front' ? 'omote' : 'ura'}_350dpi.${ext}`), mime, quality);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { URL.revokeObjectURL(url); alert(ext.toUpperCase() + 'の書き出しに失敗しました。'); };
    img.src = url;
  });
}
const exportPNG = () => exportRaster('image/png', 'png');
const exportJPG = () => exportRaster('image/jpeg', 'jpg', 0.95);

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

/* ---------- 編集中の状態（リロードしても続きから） ---------- */
const KEY = 'nc-builder-v4';
function snapshot() {
  const { size, lang, font, showIcons, back, fields } = state;
  return { size, lang, font, showIcons, back, fields };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(snapshot())); } catch (e) {} }
function restore(data) {
  const fields = data.fields;
  Object.assign(state, data);
  resetFields();
  if (fields) {
    for (const k of KEYS) {
      const s = fields[k];
      if (!s) continue;
      const f = state.fields[k];
      f.enabled = !!s.enabled;
      if (typeof s.ja === 'string') f.ja = s.ja;
      if (typeof s.en === 'string') f.en = s.en;
      if (typeof s.v  === 'string') f.v  = s.v;
      if (typeof s.sei === 'string') f.sei = s.sei;
      if (typeof s.mei === 'string') f.mei = s.mei;
    }
  }
  if (state.lang !== 'en') state.lang = 'ja';
  if (!SIZES[state.size]) state.size = 'jp91';

  el.size.value = state.size; el.font.value = state.font;
  el['show-icons'].checked = !!state.showIcons;
  el['use-back'].checked = !!state.back;
  syncSeg('#seg-lang', 'lang', state.lang);
  renderFields();
}

/* ---------- 登録済の名刺データ（ツール内に保存） ---------- */
const LIST_KEY = 'nc-cards-v1';
const loadList = () => { try { return JSON.parse(localStorage.getItem(LIST_KEY) || '[]'); } catch (e) { return []; } };
function storeList(a) {
  try { localStorage.setItem(LIST_KEY, JSON.stringify(a)); return true; }
  catch (e) { alert('保存できませんでした。ブラウザの保存領域がいっぱいの可能性があります。'); return false; }
}
const fmtDate = ms => new Date(ms).toLocaleString('ja-JP',
  { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

function flashSaved() {
  const btn = el['btn-save'];
  if (btn.dataset.busy) return;
  btn.dataset.busy = '1';
  const label = btn.textContent;
  btn.textContent = '保存しました';
  setTimeout(() => { btn.textContent = label; delete btn.dataset.busy; }, 1400);
}

function commitEntry(list, rec, dupIndex) {
  if (dupIndex >= 0) { rec.id = list[dupIndex].id; list[dupIndex] = rec; }
  else list.push(rec);
  if (!storeList(list)) return;
  flashSaved();
}

/**
 * 重複時のみ確認モーダルを出し、「上書き保存する」を押した場合だけ保存する。
 * <dialog> の close イベントに頼らず、ボタンの click で直接判定する
 * （フォーム送信からの close はブラウザによって発火が不安定なため）。
 */
function saveEntry() {
  const title = valueOf('name', state.lang) || '（氏名未入力）';
  const list = loadList();
  const rec = {
    id: 'c' + Date.now(), title,
    company: valueOf('company', state.lang),
    lang: state.lang, updated: Date.now(), data: snapshot(),
  };
  const i = list.findIndex(e => e.title === title && e.lang === state.lang);

  if (i < 0) { commitEntry(list, rec, -1); return; }

  const modal = el['confirm-modal'];
  $('#confirm-msg', modal).textContent = `「${title}」はすでに登録されています。上書き保存しますか？`;

  const overwriteBtn = $('[value="overwrite"]', modal);
  const cancelBtn = $('[value="cancel"]', modal);
  const cleanup = () => {
    overwriteBtn.removeEventListener('click', onOverwrite);
    cancelBtn.removeEventListener('click', onCancel);
    if (modal.open) modal.close();
  };
  const onOverwrite = () => { cleanup(); commitEntry(list, rec, i); };
  const onCancel = () => { cleanup(); };   // 何もせず閉じるだけ
  overwriteBtn.addEventListener('click', onOverwrite);
  cancelBtn.addEventListener('click', onCancel);
  modal.showModal();
}

function renderList() {
  const list = loadList().sort((a, b) => b.updated - a.updated);
  if (!list.length) {
    el['card-list'].innerHTML = '<li class="cardlist__empty">保存された名刺データはありません。</li>';
    return;
  }
  el['card-list'].innerHTML = list.map(e => {
    const meta = [e.company, e.lang === 'en' ? '英語' : '日本語', fmtDate(e.updated)].filter(Boolean).join('／');
    return `<li data-id="${esc(e.id)}">
      <div class="cardlist__body">
        <b>${esc(e.title)}</b>
        <span class="cardlist__meta">${esc(meta)}</span>
      </div>
      <div class="cardlist__act">
        <button type="button" class="btn btn--ghost btn--sm" data-act="open">編集する</button>
        <button type="button" class="btn btn--ghost btn--sm" data-act="del">削除</button>
      </div>
    </li>`;
  }).join('');
}

function bindList() {
  el['btn-list'].addEventListener('click', () => { renderList(); el['list-modal'].showModal(); });
  el['card-list'].addEventListener('click', e => {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const id = btn.closest('li').dataset.id;
    const list = loadList();
    const i = list.findIndex(x => x.id === id);
    if (i < 0) return;
    if (btn.dataset.act === 'open') {
      restore(list[i].data); update(); el['list-modal'].close();
    } else if (confirm(`「${list[i].title}」を削除しますか？`)) {
      list.splice(i, 1); storeList(list); renderList();
    }
  });
}

/* ============================================================
   6. 初期化
   ============================================================ */
function svgArt(b64) {
  const art = { href: 'data:image/svg+xml;base64,' + b64, aspect: 1 };
  try {
    const svg = new DOMParser().parseFromString(atob(b64), 'image/svg+xml').documentElement;
    const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    if (vb.length === 4 && vb[2] && vb[3]) art.aspect = vb[2] / vb[3];
    else {
      const w = parseFloat(svg.getAttribute('width')), h = parseFloat(svg.getAttribute('height'));
      if (w && h) art.aspect = w / h;
    }
  } catch (e) {}
  return art;
}

function init() {
  cacheEls();
  resetFields();

  ART.mark = svgArt(MARK_B64);
  ART.type = svgArt(LOGOTYPE_B64);
  ART.qr   = { href: 'data:image/png;base64,' + QR_B64, aspect: 1 };

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (saved) restore(saved); else renderFields();

  bindFields();

  $('#seg-lang').addEventListener('click', e => {
    const b = e.target.closest('[data-lang]'); if (!b) return;
    state.lang = b.dataset.lang; syncSeg('#seg-lang', 'lang', state.lang);
    renderFields(); update();
  });
  $('#seg-side').addEventListener('click', e => {
    const b = e.target.closest('[data-side]'); if (!b || b.disabled) return;
    state.side = b.dataset.side; syncSeg('#seg-side', 'side', state.side); update();
  });

  el.size.addEventListener('change', () => { state.size = el.size.value; update(); });
  el.font.addEventListener('change', () => { state.font = el.font.value; update(); });
  el['show-icons'].addEventListener('change', () => { state.showIcons = el['show-icons'].checked; update(); });
  el['use-back'].addEventListener('change', () => { state.back = el['use-back'].checked; update(); });

  // 表示設定（歯車 → ポップオーバー）
  const pop = el['settings-pop'], popBtn = el['btn-settings'];
  const showPop = v => {
    pop.hidden = !v;
    popBtn.classList.toggle('is-open', v);
    popBtn.setAttribute('aria-expanded', v ? 'true' : 'false');
  };
  popBtn.addEventListener('click', e => { e.stopPropagation(); showPop(pop.hidden); });
  pop.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', () => showPop(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') showPop(false); });

  // プレビュー操作
  el.guides.addEventListener('change', () => { state.guides = el.guides.checked; update(); });
  el.marks.addEventListener('change', () => { state.marks = el.marks.checked; update(); });
  const setZoom = v => {
    state.zoom = Math.min(3, Math.max(0.6, Math.round(v * 100) / 100));
    el['zoom-out-label'].value = Math.round(state.zoom * 100) + '%';
    update();
  };
  el['zoom-in'].addEventListener('click', () => setZoom(state.zoom + 0.2));
  el['zoom-out'].addEventListener('click', () => setZoom(state.zoom - 0.2));

  // Webフォント読み込み後に実測がずれるので再描画
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);

  // 書き出し
  el['btn-export'].addEventListener('click', () => el['export-modal'].showModal());
  $('#ex-pdf').addEventListener('click', exportPDF);
  $('#ex-svg').addEventListener('click', exportSVG);
  $('#ex-png').addEventListener('click', exportPNG);
  $('#ex-jpg').addEventListener('click', exportJPG);

  // 保存（ツール内）と登録済一覧
  el['btn-save'].addEventListener('click', saveEntry);
  bindList();

  setZoom(state.zoom);
}

/* ---------- 内蔵する図版（Figma 書き出し） ---------- */
const MARK_B64     = 'PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjQ0LjY3OSIgaGVpZ2h0PSI0NC42NzkiIHZpZXdCb3g9IjAgMCA0NC42NzkgNDQuNjc5IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8ZyBpZD0ibG9nb18xIiBjbGlwLXBhdGg9InVybCgjY2xpcDBfMF85KSI+CjxwYXRoIGlkPSJWZWN0b3IiIGQ9Ik00My42NzM4IDYuMzE1NTVDNDIuOTIxMiA0LjU3NzEyIDQxLjc5NjggMy4xMDkzMSA0MC41MDY1IDIuMTgyNzVDMzguNjAwNiAwLjgxNDA1NSAzNi42MTg5IDAuMDgyMzc5MiAzNC42MTg0IDAuMDA2NjUwMkMzMy4wMDUzIC0wLjA1MzQ4NzYgMzEuMzk2NiAwLjMxMDY4IDI5LjgzNjkgMS4wOTEzNkMyNy40MzExIDIuMjk1MjMgMjUuOTM4MiA0LjA3NDg2IDI1LjY1MzIgNC40MzM0NkMyNS4zNDM3IDQuNzgyMDMgMjUuMTc3OCA1LjIyOTczIDI1LjE4NTYgNS42OTYzNUMyNS4xOTQ1IDYuMTkwODIgMjUuMzk0OSA2LjY1MTg3IDI1Ljc1IDYuOTk0ODhMMjcuODcxOSA5LjA0ODQ3QzI4LjIyNzEgOS4zOTE0OCAyOC42OTQ3IDkuNTc0MTIgMjkuMTkwMSA5LjU2NzQ0QzI5LjY4NDQgOS41NTg1MyAzMC4xNDY0IDkuMzU4MDcgMzAuNDg5MyA5LjAwMTdMMzAuNTg1IDguODg4MTFMMzAuNTkyOCA4Ljg3ODA4QzMwLjYwNzMgOC44NTgwNCAzMi4wODQ2IDYuOTE1ODEgMzQuMDU5NSA2Ljk4MTUySDM0LjA5NzRDMzYuMjI2IDYuOTgxNTIgMzcuOTU3MSA4LjcxNDM3IDM3Ljk1NzEgMTAuODQyNkMzNy45NTcxIDExLjc2MTQgMzcuNjI5OCAxMi42NTAxIDM3LjAyOTcgMTMuMzUyOEwzNi45ODUyIDEzLjQwODVDMzUuMjUxOCAxNS43MzE2IDMwLjYxNTEgMjAuNDk5MSAyOC4xMjM1IDIzLjA2MDZMMjguMTA2OCAyMy4wNzczQzI3LjgzNDEgMjMuMzU3OSAyNy41ODgxIDIzLjYxMDcgMjcuMzc2NSAyMy44MjlMMjYuNjUyOSAyNC41NzUxTDI2Ljc2NDIgMjQuNjgzMkwyNi42NTc0IDI0Ljc5MjNMMjcuMzg4OCAyNS41MTUxQzI3LjQwMjEgMjUuNTI4NCAyOC4yMTE1IDI2LjMyNDcgMjguOTg3NCAyNy4wODMxQzI5LjQ1MzkgMjcuNTM4NiAyOS44MjY5IDI3LjkwMTcgMzAuMDk2MyAyOC4xNjIzQzMwLjc2OTggMjguODEyNiAzMC45NTEzIDI4Ljk4NzUgMzEuNDQ1NiAyOC45ODc1TDMxLjk3MSAyOC45NzYzTDMzLjIzMjQgMjcuNjYyMkwzMy4yMjEyIDI3LjY1MzNDMzQuNjY1MSAyNi4xMjMxIDM2LjA0MjMgMjQuNzEzMiAzNy40OTczIDIzLjIyMjFMMzcuNTM3NCAyMy4xODA4QzM3Ljk3NzEgMjIuNzMwOSAzOC40MjI0IDIyLjI3MzIgMzguODc4OSAyMS44MDQ0TDM5LjIwMjggMjEuNDcyNUM0MS43MDIxIDE4LjkxMTEgNDQuMjg2MSAxNi4yNjM5IDQ0LjYzNjcgMTIuMDkzMkM0NC44MDA0IDEwLjE0NzcgNDQuNDY2NCA4LjE0ODYzIDQzLjY3MjYgNi4zMTIyTDQzLjY3MzggNi4zMTU1NVoiIGZpbGw9ImJsYWNrIi8+CjxwYXRoIGlkPSJWZWN0b3JfMiIgZD0iTTI4Ljk2OTYgMTIuODE1MkwyNy43Mjk0IDExLjYyMjRMMjcuNzM1NCAxMS42MjgyQzI2LjE3MjMgMTAuMTUzNyAyNC43MjAyIDguNzU0NzcgMjMuMTk2MiA3LjI2NThMMjMuMDQ1OSA3LjExODhDMjIuNjM4NCA2LjcyMDExIDIyLjIyNDMgNi4zMTU4NSAyMS44MDAxIDUuOTAyNjhMMjEuNDY4NCA1LjU3OTcyQzE4LjkwNzggMy4wODA2NiAxNi4yNjE2IDAuNDk1ODUgMTIuMDkyNCAwLjE0NTA0NkMxMC4xNDk3IC0wLjAxODY2MiA4LjE1MDI3IDAuMzE0MzIzIDYuMzEzMzcgMS4xMDk0OEM0LjU3NTU1IDEuODYyMzEgMy4xMDgyNiAyLjk4NzExIDIuMTgyMDEgNC4yNzc4NUMwLjgxMzc5OSA2LjE4NDQ0IDAuMDgyMzc4NSA4LjE2Njc2IDAuMDA2Njc1ODMgMTAuMTY4Qy0wLjA1MzQ0MSAxMS43ODE3IDAuMzEwNTk5IDEzLjM5MDkgMS4wOTEgMTQuOTUxMkMyLjI5MzM0IDE3LjM1NjcgNC4wNzM0NiAxOC44NTEyIDQuNDMxOTQgMTkuMTM2M0M0Ljc3MTQ5IDE5LjQzODEgNS4yMDc4OSAxOS42MDQxIDUuNjYzMjIgMTkuNjA0MUg1LjY5NTVDNi4xODk4IDE5LjU5NTIgNi42NTA2OSAxOS4zOTQ3IDYuOTkzNTggMTkuMDM5NEw5LjExOCAxNi45NzI0QzkuNDYyIDE2LjYxNzEgOS41NzQxNSAxNi4xNDQ3IDkuNTY1MjQgMTUuNjUwMkM5LjU1NjM0IDE1LjE1NTggOS4zNTU5NSAxNC42NzExIDguOTk5NyAxNC4zMjgxTDguODg2MTUgMTQuMjE4N0w4Ljg3NTAxIDE0LjIwOTZDOC44NTQ5OCAxNC4xOTUxIDYuOTEwMDkgMTIuNzA2IDYuOTgwMjIgMTAuNzI2VjEwLjY4N0M2Ljk4MDIyIDguNTU3NjUgOC43MTI0OCA2LjgyNTkxIDEwLjg0MTEgNi44MjU5MUMxMS43NTg0IDYuODI1OTEgMTIuNjQ3OSA3LjE1MzMyIDEzLjM1MDQgNy43NTM1OUwxMy40MDYgNy43OTgxM0MxNS43MjcyIDkuNTMwOTkgMjAuNDkzMSAxNC4xNzA1IDIzLjA1MzcgMTYuNjYyOUwyMy4wNzE1IDE2LjY3OTZDMjMuMzUyIDE2Ljk1MzYgMjMuNjA0NyAxNy4xOTg2IDIzLjgyMjkgMTcuNDEwMkwyNC41Njg4IDE4LjEzMjlMMjQuNjc2OCAxOC4wMjE2TDI0Ljc4NyAxOC4xMjg1TDI1LjUyNCAxNy4zODEyQzI1LjYyODcgMTcuMjc1NCAyNi4zNTY3IDE2LjUzMzcgMjcuMDc3IDE1Ljc5NzZDMjcuNTMyNCAxNS4zMzA5IDI3Ljg5NTMgMTQuOTU3OSAyOC4xNTU4IDE0LjY4ODRDMjguODEyNiAxNC4wMDY4IDI4Ljk4OTYgMTMuODI0MiAyOC45Nzk2IDEzLjMxMTlMMjguOTY4NSAxMi44MTQxTDI4Ljk2OTYgMTIuODE1MloiIGZpbGw9ImJsYWNrIi8+CjxwYXRoIGlkPSJWZWN0b3JfMyIgZD0iTTE4LjkyOSAzNy42ODE5TDE2LjgwODIgMzUuNjI4M0MxNi40NTc1IDM1LjI4OTcgMTUuOTkyMiAzNS4xMDkzIDE1LjQ5MDEgMzUuMTA5M0MxNC45OTU4IDM1LjExODIgMTQuNTMzOCAzNS4zMTg3IDE0LjE5MDkgMzUuNjc1TDE0LjA5NCAzNS43ODk3TDE0LjA4NjMgMzUuNzk5OEMxNC4wNzE4IDM1LjgxODcgMTIuNjQ5IDM3LjY5NzQgMTAuNzI5NyAzNy42OTc0QzEwLjY5NTIgMzcuNjk3NCAxMC42NTk2IDM3LjY5NzQgMTAuNjIxNyAzNy42OTUySDEwLjU4MjhDOC40NTQyIDM3LjY5NTIgNi43MjMwNiAzNS45NjI0IDYuNzIzMDYgMzMuODM0MkM2LjcyMzA2IDMyLjkxNTQgNy4wNTAzNyAzMi4wMjY3IDcuNjUwNDIgMzEuMzIyOEw3LjY5NDk1IDMxLjI2NzJDOS40MjcyMSAyOC45NDUyIDE0LjA2MjkgMjQuMTc4NyAxNi41NTU1IDIxLjYxNjJDMTYuODM2IDIxLjMyODggMTcuMDg3NiAyMS4wNjk0IDE3LjMwMzYgMjAuODQ2NkwxOC4wMjcyIDIwLjEwMDVMMTcuOTE3IDE5Ljk5MzZMMTguMDI1IDE5Ljg4MjJMMTcuMjM5IDE5LjExMDRDMTcuMDU1NCAxOC45Mjg5IDE2LjM3MTggMTguMjU3NCAxNS42OTE2IDE3LjU5MjVDMTUuMjI1MSAxNy4xMzcgMTQuODUyMiAxNi43NzQgMTQuNTc3MiAxNi41MDc4QzEzLjg5OTIgMTUuODUzIDEzLjcxODkgMTUuNjc3IDEzLjIwNDUgMTUuNjg4MUwxMi43MDggMTUuNjk4MkwxMS42ODcyIDE2Ljc2MjhMMTEuNTQ2OSAxNi45MjU0SDExLjU0OEMxMC4wNjYyIDE4LjQ5OSA4LjY1NTcxIDE5Ljk0MzQgNy4xNjE2OSAyMS40NzQ3QzYuNzE2MzggMjEuOTMxMyA2LjI2NDM5IDIyLjM5NDYgNS44MDAxNiAyMi44NzEzTDUuNDc3MzEgMjMuMjAzMUMyLjk3NTc4IDI1Ljc2MzQgMC4zOTE4NzYgMjguNDExNyAwLjA0MDA4MTEgMzIuNTgyNEMtMC4xMjM1NyAzNC41MjY5IDAuMjEwNDEyIDM2LjUyNyAxLjAwNDE4IDM4LjM2MzRDMS43NTY3NSA0MC4xMDE4IDIuODgxMTYgNDEuNTY5NiA0LjE3MTQ0IDQyLjQ5NjJDNi4wNzczNiA0My44NjQ5IDguMDU4OTkgNDQuNTk2NiAxMC4wNjA3IDQ0LjY3MjNDMTAuMTc1MyA0NC42NzY4IDEwLjI5IDQ0LjY3OSAxMC40MDQ3IDQ0LjY3OUMxMS45MDIgNDQuNjc5IDEzLjM5NDkgNDQuMzExNSAxNC44NDIyIDQzLjU4NzZDMTcuMjQ1NyA0Mi4zODQ5IDE4Ljc0MDkgNDAuNjA0MSAxOS4wMjU4IDQwLjI0NTVDMTkuNjc3MSAzOS41MTI3IDE5LjYzNDggMzguMzY0NSAxOC45MjkgMzcuNjgzVjM3LjY4MTlaIiBmaWxsPSJibGFjayIvPgo8cGF0aCBpZD0iVmVjdG9yXzQiIGQ9Ik00My41ODc5IDI5LjgzMDVDNDIuMzg2NyAyNy40MjczIDQwLjYwNTQgMjUuOTMxNiA0MC4yNDcgMjUuNjQ1NEMzOS45MDE5IDI1LjMzOCAzOS40NTc3IDI1LjE3NTQgMzguOTgzNCAyNS4xNzc3QzM4LjQ4OTEgMjUuMTg2NiAzOC4wMjgyIDI1LjM4NyAzNy42ODUzIDI1Ljc0MjNMMzUuNjMxMyAyNy44NjQ5QzM1LjI4ODUgMjguMjIxMyAzNS4xMDM2IDI4LjY4OSAzNS4xMTI2IDI5LjE4MzVDMzUuMTIxNSAyOS42NzggMzUuMzIxOSAzMC4xNDAxIDM1LjY3ODEgMzAuNDgzMkwzNS43OTI4IDMwLjU4TDM1LjgwMjggMzAuNTg3OEMzNS44MjI4IDMwLjYwMjMgMzcuNzY3NyAzMi4wNzY4IDM3LjY5NzYgMzQuMDU0N1YzNC4wOTI1QzM3LjY5NzYgMzYuMjIxOSAzNS45NjUzIDM3Ljk1MzYgMzMuODM2NyAzNy45NTM2QzMyLjkxOTQgMzcuOTUzNiAzMi4wMjk5IDM3LjYyNjIgMzEuMzI3NCAzNy4wMjU5TDMxLjI3MTggMzYuOTgxNEMyOC45NDk1IDM1LjI0NzQgMjQuMTg0NyAzMC42MDkgMjEuNjI0MSAyOC4xMTY2TDIxLjYwOTcgMjguMTAyMUMyMS4zMjggMjcuODI4MiAyMS4wNzUzIDI3LjU4MjEgMjAuODU2IDI3LjM2OTRMMjAuMTEwMSAyNi42NDU1TDIwLjAwMzIgMjYuNzU1N0wxOS44OTQxIDI2LjY0ODhMMTkuMTE3IDI3LjQzNjJDMTguOTMxMSAyNy42MjU1IDE4LjI2MzIgMjguMzA1OSAxNy42MDE5IDI4Ljk4MTlDMTcuMTQ2NSAyOS40NDg2IDE2Ljc4MzYgMjkuODIxNiAxNi41MjMxIDMwLjA5MTFDMTUuODY1MiAzMC43NzI3IDE1LjY4OTMgMzAuOTU2NSAxNS42OTkzIDMxLjQ2ODdMMTUuNzA5MyAzMS45NjY2TDE2Ljk2MTcgMzMuMTY4MkwxNi45NzA2IDMzLjE1ODJDMTguNTI3IDM0LjYyNzEgMTkuOTU3NiAzNi4wMjQ3IDIxLjQ3MDUgMzcuNTAxNUwyMS42Mzk3IDM3LjY2NjNDMjIuMDQ2MSAzOC4wNjI3IDIyLjQ1OCAzOC40NjQ4IDIyLjg3OTkgMzguODc2OEwyMy4yMTE3IDM5LjE5OThDMjUuNzcxMSA0MS43IDI4LjQxODQgNDQuMjg0OCAzMi41ODc3IDQ0LjYzNTZDMzIuOTA4MyA0NC42NjIzIDMzLjIzNDUgNDQuNjc2OCAzMy41NTg0IDQ0LjY3NjhDMzUuMTg0OSA0NC42NzY4IDM2Ljg0ODEgNDQuMzI5MyAzOC4zNjY3IDQzLjY3MTFDNDAuMTA0NSA0Mi45MTgzIDQxLjU3MTggNDEuNzkzNSA0Mi40OTggNDAuNTAyOEM0My44NjYyIDM4LjU5NTEgNDQuNTk3NiAzNi42MTM5IDQ0LjY3MzMgMzQuNjExNUM0NC43MzM1IDMyLjk5NzggNDQuMzY5NCAzMS4zODg2IDQzLjU4OSAyOS44MjgzTDQzLjU4NzkgMjkuODMwNVoiIGZpbGw9ImJsYWNrIi8+CjxwYXRoIGlkPSJWZWN0b3JfNSIgZD0iTTMwLjcyODMgMTQuNTAxTDI3LjY1NzkgMTEuNTM2NEwyMi44NzQxIDE2LjQ5MzNMMjUuOTQ0NiAxOS40NTc5QzI2LjI5MTkgMTkuNzkzMSAyNi43NDgzIDE5Ljk3OCAyNy4yMzE1IDE5Ljk3OEgyNy4yNjI3QzI3Ljc1NyAxOS45NjkxIDI4LjIxOSAxOS43Njg2IDI4LjU2MTkgMTkuNDEyMkwzMC43NzM5IDE3LjExOTJDMzEuNDgzMSAxNi4zODQyIDMxLjQ2MTkgMTUuMjA5MyAzMC43MjgzIDE0LjUwMVoiIGZpbGw9IiNGRjI0MDAiLz4KPHBhdGggaWQ9IlZlY3Rvcl82IiBkPSJNMjguMTkxNCAyMi45NzZMMjUuMjI3OCAyNi4wNDc1QzI0LjUxODcgMjYuNzgyNSAyNC41Mzk4IDI3Ljk1NjMgMjUuMjczNSAyOC42NjU3TDI3LjU2NTcgMzAuODc4NUMyNy45MTMxIDMxLjIxMzcgMjguMzY5NSAzMS4zOTg2IDI4Ljg1MjcgMzEuMzk4NkgyOC44ODM4QzI5LjM3ODEgMzEuMzg5NyAyOS44NDAxIDMxLjE4OTIgMzAuMTgzIDMwLjgzMjlMMzMuMTQ2NiAyNy43NjE0TDI4LjE5MTQgMjIuOTc2WiIgZmlsbD0iI0ZGMjQwMCIvPgo8cGF0aCBpZD0iVmVjdG9yXzciIGQ9Ik0xOS40MDU0IDE2LjAxMzRMMTcuMTEzMiAxMy43OTk0QzE2LjM3OTUgMTMuMDkgMTUuMjA1IDEzLjExMTIgMTQuNDk1OSAxMy44NDYyTDExLjUzMjMgMTYuOTE3NkwxNi40ODc1IDIxLjcwMzFMMTkuNDUxIDE4LjYzMTZDMTkuNzkzOSAxOC4yNzUyIDE5Ljk3ODcgMTcuODA3NSAxOS45Njk4IDE3LjMxM0MxOS45NjA5IDE2LjgxODUgMTkuNzYwNSAxNi4zNTc1IDE5LjQwNDMgMTYuMDEzNEgxOS40MDU0WiIgZmlsbD0iI0ZGMjQwMCIvPgo8cGF0aCBpZD0iVmVjdG9yXzgiIGQ9Ik0xOC42NDE3IDI1LjIyMTFDMTguMjg2NiAyNC44NzgxIDE3LjgxOSAyNC42OTU1IDE3LjMyMzYgMjQuNzAyMkMxNi44MjgyIDI0LjcxMTEgMTYuMzY3MyAyNC45MTE1IDE2LjAyNDQgMjUuMjY2OEwxMy44MTI0IDI3LjU1OThDMTMuNDY5NSAyNy45MTYyIDEzLjI4NDcgMjguMzgzOSAxMy4yOTM2IDI4Ljg3ODRDMTMuMzAyNSAyOS4zNzI5IDEzLjUwMjkgMjkuODM1IDEzLjg1OTEgMzAuMTc4TDE2LjkyOTUgMzMuMTQyNkwyMS43MTMzIDI4LjE4NTdMMTguNjQyOSAyNS4yMjExSDE4LjY0MTdaIiBmaWxsPSIjRkYyNDAwIi8+CjwvZz4KPGRlZnM+CjxjbGlwUGF0aCBpZD0iY2xpcDBfMF85Ij4KPHJlY3Qgd2lkdGg9IjQ0LjY3OSIgaGVpZ2h0PSI0NC42NzkiIGZpbGw9IndoaXRlIi8+CjwvY2xpcFBhdGg+CjwvZGVmcz4KPC9zdmc+Cg==';       // ロゴマーク（おもて右上 / うら）
const LOGOTYPE_B64 = 'PHN2ZyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9ImRpc3BsYXk6IGJsb2NrOyIgd2lkdGg9IjExOS44MTQiIGhlaWdodD0iNDMuODA4NiIgdmlld0JveD0iMCAwIDExOS44MTQgNDMuODA4NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgaWQ9Ikdyb3VwIDkiPgo8cGF0aCBpZD0iVmVjdG9yIiBkPSJNMTEyLjMyMSAxLjAwNzk4QzExMi4zMjEgMC4yNzkwNzggMTEyLjYgMCAxMTMuMzI5IDBIMTE4LjgwNkMxMTkuNTM1IDAgMTE5LjgxNCAwLjI3OTA3OCAxMTkuODE0IDEuMDA3OThDMTE5LjgxNCA0LjQ5MDEyIDExOS44MDQgNy45NzIyNiAxMTkuNzgzIDExLjQ1NDRDMTE5Ljc2MSAxNC45Mzc3IDExOS43NTEgMTguNDIxIDExOS43NTEgMjEuOTA0M0MxMTkuNzUxIDI1LjM4NzYgMTE5Ljc2MSAyOC44NzA5IDExOS43ODMgMzIuMzU0MkMxMTkuODA0IDM1LjgzNjQgMTE5LjgxNCAzOS4zMTg1IDExOS44MTQgNDIuODAwN0MxMTkuODE0IDQzLjUyOTYgMTE5LjUzNSA0My44MDg2IDExOC44MDYgNDMuODA4NkgxMTMuMzI5QzExMi42IDQzLjgwODYgMTEyLjMyMSA0My41Mjk2IDExMi4zMjEgNDIuODAwN0MxMTIuMzIxIDM5LjMxODUgMTEyLjMzMSAzNS44MzY0IDExMi4zNTMgMzIuMzU0MkMxMTIuMzc0IDI4Ljg3MDkgMTEyLjM4NCAyNS4zODc2IDExMi4zODQgMjEuOTA0M0MxMTIuMzg0IDE4LjQyMSAxMTIuMzc0IDE0LjkzNzcgMTEyLjM1MyAxMS40NTQ0QzExMi4zMzEgNy45NzIyNSAxMTIuMzIxIDQuNDkwMTIgMTEyLjMyMSAxLjAwNzk4WiIgZmlsbD0iYmxhY2siLz4KPHBhdGggaWQ9IlZlY3Rvcl8yIiBkPSJNNjYuODcxOCA0My42ODk4QzY2LjU5OTggNDMuNjg5OCA2Ni4yOTc1IDQzLjY2IDY1Ljk5MjcgNDMuNTc4M0M2NS43ODk1IDQzLjUyMzcgNjUuNjk4NyA0My40MTE5IDY1LjY5ODcgNDMuMTI5N0M2NS42OTg3IDQzLjAwNTkgNjUuNzIyNSA0Mi44ODEyIDY1Ljc3NDEgNDIuNzQ5OUM2NS44MzcgNDIuNTg5NiA2NS44OTY4IDQyLjQ0MTYgNjUuOTU3OCA0Mi4zMTFDNjcuNzY0MSAzOC40NDI0IDY5LjY1ODQgMzQuNjE3OCA3MS40OTE2IDMwLjc3MzhDNzMuMzI4MiAyNi45MjIzIDc1LjE1MTggMjMuMDU5MyA3Ni45MzI5IDE5LjE2OTVDNzguMzk3NCAxNS45NzEgNzkuODUzIDEyLjc3MjkgODEuMjkxNiA5LjU3MTcxQzgyLjczNjEgNi4zNTc1MiA4NC4xOTcyIDMuMTI4MzYgODUuNzY4OSAwLjAwNjQxMjY0Qzg1LjgzMDYgMC4wMDY0MTI2NCA4NS44NDgxIC0wLjAwMDU0NDM5NCA4NS44NTczIDAuMDE3NjgyQzg3LjQyOSAzLjEzOTYzIDg4Ljg2MDYgNi4zNTc1MiA5MC4zMDUxIDkuNTcxNzFDOTEuNzQzNyAxMi43NzI5IDkzLjE5OTQgMTUuOTcxIDk0LjY2MzggMTkuMTY5NUM5Ni40NDQxIDIzLjA1NzcgOTguMjQwMiAyNi45Mjk3IDEwMC4wNzMgMzAuNzczOEMxMDEuOTExIDM0LjYyNzQgMTAzLjgzMyAzOC40NDM0IDEwNS42MzkgNDIuMzExQzEwNS43IDQyLjQ0MTUgMTA1Ljc2IDQyLjU4OTYgMTA1LjgyMyA0Mi43NDk5QzEwNS44NzQgNDIuODgxMiAxMDUuODk4IDQzLjAwNTkgMTA1Ljg5OCA0My4xMjk3QzEwNS44OTggNDMuNDExOSAxMDUuODA3IDQzLjUyMzcgMTA1LjYwNCA0My41NzgzQzEwNS4yOTkgNDMuNjYgMTA0Ljk5NyA0My42ODk4IDEwNC43MjUgNDMuNjg5OEg5OC4yOTk0Qzk3Ljg3ODIgNDMuNjg5OCA5Ny41NzQ5IDQzLjUxMTYgOTcuMzQ2NiA0My4wODQxQzk3LjE4MDcgNDIuNzczNSA5Ny4wMjc3IDQyLjQzNjEgOTYuODgyMiA0Mi4wNzg4Qzk2LjczMjQgNDEuNzExMiA5Ni41ODI3IDQxLjM2MjkgOTYuNDMxOCA0MS4wMzQ3Qzk1Ljk2NyA0MC4wMjM0IDk1LjUwMjEgMzguOTk3NyA5NS4wNjg1IDM3Ljk0NzdDOTQuNjMwOSAzNi44ODc3IDk0LjE0NTggMzUuODY5NCA5My42OTg1IDM0Ljg0NDlDOTMuNTk1NSAzNC42MDkxIDkzLjM3MzQgMzQuNDI3OSA5My4wODI3IDM0LjQyNzlINzcuMzM3MUM3Ny4wNDQgMzQuNDI3OSA3Ni44MjU0IDM0LjYxMTggNzYuNzIyMyAzNC44NDI2Qzc2LjI2NjQgMzUuODYzMSA3NS43MjIyIDM2Ljg3MDUgNzUuMjU3NyAzNy45NDMxQzc0LjgwNCAzOC45OTA5IDc0LjM0MTkgNDAuMDMxIDczLjg2MTMgNDEuMDYzOEM3My43MTI3IDQxLjM4MzEgNzMuNTQ0OCA0MS43Mjc3IDczLjM4MTMgNDIuMTAyN0M3My4yMjU0IDQyLjQ2MDEgNzMuMDY4MyA0Mi43OTI2IDcyLjg4NzEgNDMuMTA1OUM3Mi42NDY0IDQzLjUyMjIgNzIuMzY2MyA0My42ODk4IDcxLjk2MTMgNDMuNjg5OEg2Ni44NzE4Wk03OS41Mjg0IDI4LjY2MTVIOTEuMDA1OUM4OS43NjQ5IDI1LjY5OTYgODkuMjM5OSAyNC40ODQ2IDg4LjI1OTYgMjIuMjEzNEM4Ny4yMTE3IDE5Ljc4NTYgODYuODcwNCAxOC45Nzg5IDg1LjM4OCAxNS41MjcyQzgzLjg3MjUgMTguOTcyIDgzLjUwMzQgMTkuNzc5OCA4Mi40MTYyIDIyLjIwOTlDODEuMzk5IDI0LjQ4MzQgODAuODY4OCAyNS42ODU2IDc5LjUyODQgMjguNjYxNVoiIGZpbGw9ImJsYWNrIi8+CjxwYXRoIGlkPSJWZWN0b3JfMyIgZD0iTTUxLjk3MzUgNC40NzEyNUM1MS45NzM1IDMuMzgyMTIgNTIuMzY5NyAyLjQ4NzI2IDUzLjE4MjggMS43MDQwNEM1NC4wMDkzIDAuOTA3Nzg3IDU0LjkyOTUgMC41MTg3ODEgNTYuMDIwOSAwLjUxODc4MUM1Ny4xMzc1IDAuNTE4NzgxIDU4LjA2NjYgMC45MjAxNCA1OC45MjM2IDEuNzM2NzlDNTkuNzc3MSAyLjU1MDE1IDYwLjE5NSAzLjQ2Mjk2IDYwLjE5NSA0LjU5Nzg5QzYwLjE5NSA1LjY4MjQ0IDU5Ljc5OTYgNi42MTQ1NSA1OC45ODE5IDcuNDMyMjFDNTguMTg3OSA4LjIyNjI2IDU3LjI1NjkgOC42MTM2OCA1Ni4xNDc2IDguNjEzNjhDNTUuMDIyNCA4LjYxMzY4IDU0LjA0NTQgOC4yMTc3MiA1My4yMTcgNy4zOTkzMkM1Mi4zNzgyIDYuNTcwNTEgNTEuOTczNSA1LjU5NDIzIDUxLjk3MzUgNC40NzEyNVpNNTIuNDQ4NCAyMy41NjI5VjE2LjU2NThDNTIuNDQ4NCAxNS44MzY5IDUyLjcyNzUgMTUuNTU3OCA1My40NTY0IDE1LjU1NzhINTguMzMyMkM1OS4wNjExIDE1LjU1NzggNTkuMzQwMiAxNS44MzY5IDU5LjM0MDIgMTYuNTY1OEM1OS4zNDAyIDIwLjkxNDQgNTkuMzUwNyAyNS4yNzM1IDU5LjM3MTkgMjkuNjQzMkM1OS4zOTI5IDMzLjk5MDkgNTkuNDAzNSAzOC4zMzg2IDU5LjQwMzUgNDIuNjg2MkM1OS40MDM1IDQzLjQxNTEgNTkuMTI0NCA0My42OTQyIDU4LjM5NTUgNDMuNjk0Mkg1My4zOTMxQzUyLjY2NDIgNDMuNjk0MiA1Mi4zODUxIDQzLjQxNTEgNTIuMzg1MSA0Mi42ODYyQzUyLjM4NTEgMzkuNDk5NiA1Mi4zOTU2IDM2LjMxMzEgNTIuNDE2NyAzMy4xMjY1QzUyLjQzNzkgMjkuOTM4NiA1Mi40NDg0IDI2Ljc1MDggNTIuNDQ4NCAyMy41NjI5WiIgZmlsbD0iYmxhY2siLz4KPHBhdGggaWQ9IlZlY3Rvcl80IiBkPSJNMS4wMDc5OCA0My42OTRDMC4yODQ1MSA0My42OTQgMCA0My40MDk4IDAgNDIuNjU0NEMwIDQxLjQ5NiAwLjAxMDYyNzUgNDAuMzM3NiAwLjA2MzAyMyAzOS4xODQ4QzAuMTE1ODY1IDM4LjAyMjIgMC4xNjQyMzggMzYuODYwNCAwLjE4OTg5NiAzNS42OTUzQzAuMjQzODI3IDMzLjI0NjMgMC4yOTU1NjEgMzAuODA3NyAwLjMxNjYgMjguMzc3N0MwLjMzNzgwNyAyNS45Mjg0IDAuMzQ4MjcyIDIzLjQ4OTcgMC4zNDgyNzIgMjEuMDYxNUMwLjM0ODI3MiAxNy45Nzg1IDAuMzI3MTU2IDE0Ljg5NTUgMC4yODQ5MjMgMTEuODEyNEMwLjI0MjY0NCA4LjcyNjEyIDAuMDk0OTgzNCA1LjY1Mjc5IDAuMDk0OTgzNCAyLjYwMzA0VjIuMjg2NDNDMC4wOTQ5ODM0IDIuMTMwNTEgMC4xMDUzMDcgMS43NTMzMiAwLjE1NzE1NyAxLjE3MjQyQzAuMjA3MjEyIDAuNjExNjIxIDAuMzc1NDk0IDAuNTUwMjM4IDAuNDY5NzQzIDAuNTUwMjM4QzAuNjIxMDM0IDAuNTUwMjM4IDAuODcyNzc3IDAuNjc0MjYgMS4xOTMwMyAxLjA3NDU4QzEuNTMwNzEgMS40OTY2NyAxLjc3NjU1IDEuODAxODIgMS45MTY0OCAxLjk4NjYzQzUuMjEzOTkgNi4zNDIwNCA4LjI5MDg1IDEwLjkxMDcgMTEuMzA4NCAxNS41MjEzQzE0LjMyMzIgMjAuMTI3OCAxNy40MTM1IDI0LjY3NDcgMjAuNTkxNCAyOS4xNDQ5QzIwLjcxNjQgMjkuMzIwNyAyMC44OTM1IDI5LjQ4ODUgMjEuMTQ0NSAyOS40ODg1QzIxLjM5NjkgMjkuNDg4NSAyMS41NzIzIDI5LjMxOTIgMjEuNjk2NyAyOS4xNDYxQzI0LjkzNjYgMjQuNjM3NiAyOC4xMDg5IDIwLjA4MjIgMzEuMjAwNSAxNS40NjA1QzM0LjI5MDUgMTAuODQxMyAzNy40Njc0IDYuMjgyMzIgNDAuODE1MSAxLjg5MjQ1QzQwLjk1NDEgMS43MTAxOSA0MS4xOTcgMS40MTU4NiA0MS41MzQxIDEuMDE3NEM0MS44NzcyIDAuNjExNzkxIDQyLjEzODQgMC40ODY5MTUgNDIuMjYyNCAwLjQ4NjkxNUM0Mi4zODgyIDAuNDg2OTE1IDQyLjUzNDQgMC41NDE5MSA0Mi41NzQ2IDEuMTAzOTdDNDIuNjE2NiAxLjY5MTQyIDQyLjYzNzIgMi4wNzM5MyA0Mi42MzcyIDIuMjIzMVYyLjUzOTcyQzQyLjYzNzIgNS42MTA2NSA0Mi40ODk3IDguNzA1MDkgNDIuNDQ3MiAxMS44MTI1QzQyLjQwNTEgMTQuODk1NSA0Mi4zODM5IDE3Ljk3ODUgNDIuMzgzOSAyMS4wNjE1QzQyLjM4MzkgMjMuNDg5NyA0Mi4zOTQ0IDI1LjkyODQgNDIuNDE1NiAyOC4zNzc3QzQyLjQzNjYgMzAuODA1MiA0Mi40NjYxIDMzLjI0NjYgNDIuNTQyMyAzNS42OTc5QzQyLjU3ODUgMzYuODYxIDQyLjYyNjkgMzguMDIyMyA0Mi42NjkgMzkuMTgyMkM0Mi43MTExIDQwLjMzOTYgNDIuNzMyMiA0MS40OTcgNDIuNzMyMiA0Mi42NTQ0QzQyLjczMjIgNDMuNDA5OCA0Mi40NDc3IDQzLjY5NCA0MS43MjQyIDQzLjY5NEgzNi4yNzg1QzM1Ljg1MjIgNDMuNjk0IDM1LjYxMTIgNDMuNTg5NCAzNS41MTgyIDQzLjQ3OThDMzUuNDA4OSA0My4zNTEgMzUuMzAyIDQzLjA3MzMgMzUuMjY5NCA0Mi42OTI5QzM1LjI0NTMgNDIuNDExNyAzNS4yMzg4IDQyLjEwMTMgMzUuMjM4OCA0MS43Njc4QzM1LjIzODggNDEuNDExNSAzNS4yNDMyIDQxLjA3MjcgMzUuMjM4OCA0MC43NTA3TDM1LjE3NTUgMzYuMTU5OEMzNS4xNDM3IDMzLjg1OCAzNS4xMDE2IDMxLjU1ODEgMzUuMDgwNSAyOS4yNTlDMzUuMDU5NCAyNi45NTkyIDM1LjA0ODkgMjQuNjU5NCAzNS4wNDg5IDIyLjM1OTZDMzUuMDQ4OSAyMi4yNTUgMzUuMDI3MiAyMi4xNzMyIDM1LjAxNjggMjEuOTY1MkMzNS4wMDg4IDIxLjgwMzUgMzQuOTkyNyAyMS4zNDEyIDM0LjU2ODggMjEuMzQxMkMzNC4yODIxIDIxLjM0MTIgMzQuMTQ2MyAyMS41Njg0IDM0LjA0MjYgMjEuNzIzNEMzMy45NTE3IDIxLjg1OTMgMzMuODg4MSAyMS45MjM2IDMzLjgzNjggMjEuOTg3QzMyLjI1OTggMjMuOTMzNSAzMS4wNDIgMjYuMzE3MiAyOS43MzE5IDI4LjQxMTNDMjguNDAwMSAzMC41NDAyIDI3LjA0NTUgMzIuNjY4MiAyNS42ODA4IDM0LjgwNDVDMjUuMTI3OSAzNS42NyAyNC41ODEyIDM2LjU0OTEgMjQuMDMyMiAzNy40MzU5QzIzLjQ4NTcgMzguMzE4NyAyMi45MzExIDM5LjE5MTEgMjIuMzM0MyA0MC4wMTQ1QzIyLjIxMzcgNDAuMTgwOSAyMi4wNzE2IDQwLjM2OTEgMjEuOTA0MiA0MC41Njc2QzIxLjc5OTggNDAuNjkxNCAyMS42Njc0IDQwLjc0OTUgMjEuNDkyNyA0MC43NDk1QzIxLjMzNzMgNDAuNzQ5NSAyMS4xNzY5IDQwLjY5MzUgMjEuMDY0NiA0MC41ODEyQzIwLjkwNjkgNDAuNDIzNCAyMC43NzE1IDQwLjI0MjMgMjAuNjUwNCA0MC4wNzY3QzIwLjExNzEgMzkuMzQ4MiAxOS41OTE0IDM4LjU5ODcgMTkuMDczMSAzNy44MzdDMTguNTYyMSAzNy4wODYxIDE4LjA2NzkgMzYuMzE4MSAxNy41NTM4IDM1LjU1OEMxNi4wODkgMzMuMzkyNSAxNC41ODUgMzEuMjQ3MyAxMy4xMjE4IDI5LjA2ODNDMTEuNjU0NSAyNi44ODMzIDkuOTg5OTUgMjQuNzkyNCA4LjY2NTMgMjIuNTlDOC42MTgyNyAyMi41MTE4IDguNTU5MTUgMjIuNDQyIDguNDU2MzYgMjIuMzA4OUM4LjM0ODc2IDIyLjE2OTYgOC4yMDc5MSAyMS45NzQ1IDcuOTQxNzcgMjEuOTc0NUM3LjU3MjA3IDIxLjk3NDUgNy40ODM2NSAyMi4zNDcgNy40NjMxMiAyMi41NTIzQzcuNDQxNDMgMjIuNzY5MiA3LjQzMDAyIDIyLjg4NTQgNy40MzAwMiAyMi45NjExQzcuNDMwMDIgMjUuMTk3NiA3LjQxOTU3IDI3LjQzNDEgNy4zOTgzNyAyOS42NzA1QzcuMzc3MzggMzEuODg1MSA3LjMzNTE1IDM0LjExMTIgNy4zMDM0IDM2LjM0OTdMNy4yNDAwOCA0MC44MTM5QzcuMjM1OTIgNDEuMTA3MSA3LjIyOTQgNDEuNDMxMSA3LjI0MDE5IDQxLjc3NjlDNy4yNTA1OSA0Mi4xMDk5IDcuMjQ0NDkgNDIuNDAyNyA3LjIxMDUgNDIuNjgyN0M3LjE2MTQxIDQzLjA4NzIgNy4wNzM4IDQzLjMzODIgNi45NTUzNSA0My40ODYzQzYuODc1MzQgNDMuNTg2MyA2LjY1NjQ5IDQzLjY5NCA2LjIwMDQxIDQzLjY5NEgxLjAwNzk4WiIgZmlsbD0iYmxhY2siLz4KPC9nPgo8L3N2Zz4K';   // MiAI ロゴタイプ（うら）
const QR_B64       = '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';         // QRコード（うら）

document.addEventListener('DOMContentLoaded', init);
})();
