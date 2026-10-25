/* ============================================================
   名刺データ作成ツール
   デザインベース：Figma props_Rebranding
     おもて 526:23433 / うら 526:23452（縦 55 × 91 mm）
   入力 → SVG(実寸mm)で組版 → プレビュー / PDF・PNG 書き出し
   ・座標系は「mm」。viewBox も mm 単位で持たせ、そのまま入稿サイズになる
   ・Figma のアートボードは 251 × 415px。px÷4.5636 で mm に読み替えている
   ・ロゴ・配色・組み方・裏面はデザイン固定。切り替えられるのは記載内容だけ
   ============================================================ */
(() => {
'use strict';

/* ---------- 用紙（向きは横で固定） ---------- */
const SIZES = {
  jp91: { w: 91, h: 55 },
  us89: { w: 89, h: 51 },
  jp85: { w: 85, h: 49 },
};
const BLEED = 3;      // 塗り足し（書き出しには含めるが、プレビューには表記しない）
const MARKM = 5;      // トンボを描くための追加マージン
/* 書体（デザイン指定。いずれも macOS 標準のシステムフォント。入っていない端末では代替の書体になる） */
const FONT = {
  front:   "'Hiragino Kaku Gothic ProN','ヒラギノ角ゴ ProN','Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif",   // おもて
  backHead:"'Futura','Futura Medium','Jost','Albert Sans',sans-serif",                                              // うらの見出し
  backBody:"'Yu Gothic','YuGothic','游ゴシック体','Yu Gothic Medium','Hiragino Sans','Noto Sans JP',sans-serif",    // うらの本文
};

/* デザイン入稿データ（meishi_yoko_A.pdf）の実測。座標・寸法はすべて mm（仕上がり左上が原点）。
   組版は 91 × 55mm の「デザイン座標」で行い、用紙サイズが違うときは全体を拡縮して中央に置く */
const DW = 91, DH = 55;
const PT = 25.4 / 72;   // 1pt = 0.3528mm
/* 文字の下限。入稿データの文字は 5pt（ラクスルの規定は 6pt 以上。デザイン優先で入稿データどおりにしている） */
const PT_MIN = 5 * PT;

/* おもての版面（mm） */
const LY = {
  topX: 44.65,    // 役職・氏名・ローマ字の左端
  contactDX: 0.53, // 連絡先は上の左端より少し内側から始まる
  topY: 10.22,    // 役職の行の上端（行が増えたら上へ伸ばす）
  topYMin: 5.3,   // 上段の上端の限界（仕上がりから 3mm 以上内側）
  topRight: 9,    // 上段の右マージン
  topMax: 31.4,   // 上段の下端の限界（赤地の終わり 32.2mm の手前）
  footX: 45.5,    // 会社情報の左端
  footRight: 9,
  footBottom: 51.77, // 会社情報の最終行の下端（Web サイトの行）
  footMin: 33.0,  // 下段の上端の限界（白地の始まりより下）
};
/* 写真（白いリング + 円形の写真） */
const PHOTO = { cx: 24.15, cy: 22.72, ring: 15.48, r: 13.35 };

/* うらの版面（mm） */
const BACK_CIRCLE = { cx: 68.46, cy: 27.5, ring: 27.86, inner: 26.47 };   // 文字の背景の円（仕上がりの右端で切れる）
const BACK = {
  mark: { x: 14.05, y: 24.88, w: 14.31 },                       // MiAI ロゴタイプ
  head: { x: 54.81, y: 22.47, pt: 8, w: 28.31 },                // 見出し（左端・ベースライン・幅）
  body: [ { x: 53.74, y: 27.4,  w: 30.31 },                     // 本文3行（左端・ベースライン・幅）
          { x: 58.09, y: 30.9,  w: 20.95 },
          { x: 56.63, y: 34.4,  w: 24.53 } ],
  bodyPt: 5,
  qr: { cx: 68.46, cy: 45.71, w: 7.19 },                        // QR（中心・一辺）
};
/* 裏面の文言（固定） */
const BACK_HEAD = 'Meet AI, Focus on "I".';
const BACK_BODY = ['AIが答えをくれる時代だからこそ、', '私たちは「あなた」という', '一人ひとりに向き合いたい。'];

/* 配色（デザイン固定） */
const C = {
  onRed:  '#FFFFFF',
  org:    '#5F5F5F',   // 会社名
  foot:   '#5F5F5F',   // 住所など
  backTx: '#595757',   // 裏面の文字
  qr:     '#5C5A59',   // 裏面の QR
  backMark: '#F5F5F5', // 裏面のロゴ
  photoBg:'#DEDEDF',
  circle: '#EFEFEF',   // 裏面のグレーの円（写真あり）
  bg:     '#FFFFFF',
  trim:   '#B4B4B4',   // 仕上がり線（プレビュー用・書き出しには含めない）
};

/* 級数（mm）。入稿データの pt 指定 */
const FS = {
  lead:  5.5 * PT,
  name:  11 * PT,
  label: 5 * PT,   // ローマ字
  meta:  5 * PT,   // 連絡先
  small: 5 * PT,   // 会社情報
};
/* 字送り（級数に対する割合）。入稿データの文字幅から逆算 */
const TRK = { lead: 0.11, name: 0.11, label: 0.055, meta: 0.05, org: 0.08, foot: 0.10 };
/* 行間（行の高さ = 級数 × lh）とアキ。入稿データのベースライン間隔に合わせてある */
const LH = { lead: 1.0, name: 1.0, label: 1.0, meta: 1.383, small: 1.10 };
const GAP = {
  titleName: 1.247,    // 役職 → 氏名
  nameLabel: 0.99,     // 氏名 → ローマ字
  contact:   3.086,    // ローマ字 → 連絡先
  item:      0.5,      // 会社名 → 郵便番号
  web:       0.44,     // 住所 → Webサイト
  icon:      1.2,      // アイコン → 値
  addrLine:  0,        // 住所が2行以上になったときの行間の追加アキ
};

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
  postal:  { label: '郵便番号',       type: 'single', group: 'addr', on: true,  v: '150-0001' },
  address: { label: '会社住所',       type: 'bi',     group: 'addr', on: true,
             ja: '東京都渋谷区神宮前1-2-3 サンプルビル5F',
             en: '5F Sample Bldg, 1-2-3 Jingumae, Shibuya-ku, Tokyo' },
  web:     { label: 'Webサイト',      type: 'single', group: 'addr', on: true,  v: 'https://example.co.jp' },
};
const KEYS = Object.keys(DEFS);

/* ---------- 状態 ---------- */
const state = {
  size: 'jp91', lang: 'ja',
  showIcons: false, side: 'front', usePhoto: true, photo: '', photoAspect: 1, photoW: 0, photoPos: { x: 0.5, y: 0, z: 1 },
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

function textW(str, size, weight = 400, ls = 0, fam = FONT.front) {
  if (!str) return 0;
  _mc.font = `${weight} ${size}px ${fam}`;
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
/* 禁則処理：住所などが2行になったとき、中途半端な位置（行頭禁則文字が
   行頭に来る／行末禁則文字が行末に来る）で改行されないようにする */
const KINSOKU_NO_START = '、。，．・：；？！ー々〆〇’”）〉》」』】〕｝］!?)]}' +
  'っゃゅょぁぃぅぇぉゕゖゎゝゞ' +           // ひらがな小書き
  'ッャュョァィゥェォヵヶヮヽヾ';           // カタカナ小書き
const KINSOKU_NO_END   = '（〈《「『【〔｛［‘“([{';

/* 住所欄専用：入力に「/」（全角「／」も可）が含まれる場合は、そこを
   改行位置の指定とみなして必ずそこで改行する（例：番地とビル名の間に
   「/」を入れておくと、その位置で自動改行される）。「/」自体は印字しない。
   ※他の項目（Webサイトの URL 等）には適用しない。 */
const ADDR_HINT = /[\/／]/;

/* 住所欄専用：1行に収まらず自動折返しが必要になった場合、番地
   （数字がハイフンでつながる区画表記／「丁目・番地・番・号」）の直後で
   改行する。該当パターンが無いフリーテキストはこの限りではなく、
   通常の折返し（禁則処理つき）にフォールバックする。 */
const ADDR_BANCHI = /[0-9０-９]+(?:[-－‐‑‒–—―ー][0-9０-９]+)+|[0-9０-９]+(?:丁目|番地|番|号)/;

function wrap(str, maxW, size, weight, ls, useAddrHint = false) {
  if (!str) return [];
  if (useAddrHint) {
    if (ADDR_HINT.test(str)) {
      const parts = str.split(ADDR_HINT).map(s => s.trim()).filter(Boolean);
      if (parts.length > 1) return parts.flatMap(p => wrapSegment(p, maxW, size, weight, ls));
    } else if (textW(str, size, weight, ls) > maxW) {
      const m = ADDR_BANCHI.exec(str);
      if (m) {
        const cut = m.index + m[0].length;
        const head = str.slice(0, cut).trim();
        const tail = str.slice(cut).trim();
        if (head && tail) {
          return [...wrapSegment(head, maxW, size, weight, ls), ...wrapSegment(tail, maxW, size, weight, ls)];
        }
      }
    }
  }
  return wrapSegment(str, maxW, size, weight, ls);
}

function wrapSegment(str, maxW, size, weight, ls) {
  if (!str) return [];
  if (textW(str, size, weight, ls) <= maxW) return [str];
  const lines = []; let cur = '';
  for (const t of tokenize(str)) {
    if (t === ' ' && !cur) continue;
    const next = cur + t;
    if (cur && textW(next, size, weight, ls) > maxW) {
      // 行頭禁則：区切った先頭が行頭禁止文字なら、まだ改行せずいまの行に含める
      if (t.length === 1 && KINSOKU_NO_START.includes(t)) { cur = next; continue; }
      // 行末禁則：区切った行の末尾が行末禁止文字なら、その文字を次行側へ送る
      const lastCh = cur[cur.length - 1];
      if (lastCh && KINSOKU_NO_END.includes(lastCh)) {
        lines.push(cur.slice(0, -1).trimEnd());
        cur = lastCh + t;
        continue;
      }
      lines.push(cur.trimEnd()); cur = t === ' ' ? '' : t;
    } else cur = next;
  }
  if (cur.trim()) lines.push(cur.trimEnd());
  return lines;
}

/* ---------- SVG 断片 ---------- */
function svgText(t, x, y, o = {}) {
  const a = [];
  a.push(`x="${n(x)}" y="${n(y)}"`);
  a.push(`font-family="${esc(o.family || FONT.front)}"`);
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
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})" fill="none" stroke="${C.onRed}"` +
    ` stroke-width="${ICON_STROKE}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</g>`;
}

/* ============================================================
   1. 入力値 → 表示文字列（表記パターンを反映）
   ============================================================ */
function valueOf(key, lang) {
  const d = DEFS[key], f = state.fields[key];
  if (!f || !f.enabled) return '';
  if (key === 'reading' && lang === 'en') return '';   // 英語表記ではローマ字表記は不要
  if (d.type === 'single') {
    const v = f.v.trim();
    if (key === 'postal' && v) return v.startsWith('〒') ? v : '〒' + v;   // 「〒」は必須表示
    return v;
  }
  const ja = f.ja.trim(), en = f.en.trim();
  return lang === 'en' ? (en || ja) : (ja || en);
}
const iconOf = key => (state.showIcons && DEFS[key].icon ? DEFS[key].icon : '');
const group = g => KEYS.filter(k => DEFS[k].group === g && state.fields[k].enabled);

/* ============================================================
   2. 組版：行を積み上げる
   行 = { t, size, weight, fill, ls, lh, gap, ind, icon, iconSize }
       gap … 直前に空けるアキ(mm) / ind … 値の字下げ(mm)
   ============================================================ */
const lineH = l => l.size * l.lh;
const stackH = ls => ls.reduce((s, l) => s + (l.gap || 0) + lineH(l), 0);

function drawLines(ls, x, y, boxW) {
  let cy = y, out = '';
  for (const l of ls) {
    cy += l.gap || 0;
    const by = cy + l.size * 0.78;
    if (l.icon) {
      // 文字の視覚的な中心（ベースラインの少し上）にアイコンの中心を合わせる
      out += svgIcon(l.icon, x + (l.dx || 0), by - l.size * 0.30 - l.iconSize / 2, l.iconSize);
    }
    out += svgText(l.t, x + (l.dx || 0) + (l.ind || 0), by, { size: l.size, weight: l.weight, fill: l.fill, ls: l.ls });
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
  for (const t of wrap(val, avail, size, st.weight, st.ls, key === 'address')) {
    out.push({ t, size, weight: st.weight, fill: st.fill, ls: st.ls, lh: st.lh, ind, gap: first ? gap : (key === 'address' ? GAP.addrLine : 0) });
    first = false;
  }
  return out;
}

/* --- 氏名の上（部署・役職） --- */
function leadLines(lang, sc, boxW) {
  const out = [];
  const size = Math.max(PT_MIN, FS.lead * sc);
  const st = { size, weight: 700, fill: C.onRed, ls: size * TRK.lead, lh: LH.lead, min: PT_MIN };
  // 部署と役職は「部署　役職」と1行に並べるのが基本。幅に収まらないときだけ2行（部署 → 役職）にする
  const keys = group('lead');
  if (keys.length === 2) {
    const sep = lang === 'en' ? '  ' : '　';
    const joined = keys.map(k => valueOf(k, lang)).filter(Boolean).join(sep);
    if (joined && textW(joined, st.size, st.weight, st.ls) <= boxW) {
      out.push({ t: joined, size: st.size, weight: st.weight, fill: st.fill, ls: st.ls, lh: st.lh, ind: 0, gap: 0 });
      return out;
    }
  }
  for (const k of keys) pushField(out, k, lang, st, out.length ? GAP.item : 0, boxW);
  return out;
}

/* --- 氏名・ローマ字・連絡先 --- */
function bodyLines(lang, sc, boxW) {
  const out = [];
  pushField(out, 'name', lang, {
    size: FS.name, weight: 700, fill: C.onRed, ls: FS.name * TRK.name, lh: LH.name, min: 2.6,   // 氏名の級数は行数が増えても変えない
  }, GAP.titleName, boxW);
  const rs = Math.max(PT_MIN, FS.label * sc);
  pushField(out, 'reading', lang, {
    size: rs, weight: 700, fill: C.onRed, ls: rs * TRK.label, lh: LH.label, min: PT_MIN,
  }, GAP.nameLabel, boxW);

  const cf = group('contact');
  if (cf.length) {
    const size = Math.max(PT_MIN, FS.meta * sc);
    const iconSize = size * 1.15;
    const ind = cf.some(k => iconOf(k)) ? iconSize + GAP.icon : 0;
    const st = { size, weight: 700, fill: C.onRed, ls: size * TRK.meta, lh: LH.meta, min: PT_MIN };
    cf.forEach((k, i) => {
      const at = out.length;
      pushField(out, k, lang, st, (i === 0 && at) ? GAP.contact : 0, boxW - LY.contactDX, ind);
      for (let j = at; j < out.length; j++) out[j].dx = LY.contactDX;
      if (out[at] && iconOf(k)) { out[at].icon = iconOf(k); out[at].iconSize = iconSize; }
    });
  }
  return out;
}

/* --- 会社名 → 住所（下端そろえ・白地に載せる） --- */
function footLines(lang, sc, boxW) {
  const out = [];
  const size = Math.max(PT_MIN, FS.small * sc);
  const stC = { size, weight: 700, fill: C.org, ls: size * TRK.org, lh: LH.small, min: PT_MIN };
  for (const k of group('org')) pushField(out, k, lang, stC, out.length ? GAP.item : 0, boxW);
  const stA = { size, weight: 400, fill: C.foot, ls: size * TRK.foot, lh: LH.small };
  // 郵便番号の前だけアキを空け、住所は郵便番号の直下、Webサイトの前に小さなアキ
  const gapOf = { postal: out.length ? GAP.item : 0, address: 0, web: GAP.web };
  group('addr').forEach(k => pushField(out, k, lang, stA, out.length ? (gapOf[k] ?? 0) : 0, boxW));
  return out;
}

/* ============================================================
   3. カード1面を SVG 文字列にする
   ============================================================ */
let overflow = false;

/* 背景のグラデーション（入稿データ meishi_yoko_A.pdf を 20px/mm で描き、濃淡を実測して色を #FF2400 ベースに置き換えたもの）。
   座標は塗り足しの左上を原点とする px（1mm = 20px）。描くときに mm へ縮めて -3mm ずらす */
const FRONT_BG = {
  defs: '<defs><radialGradient id="pf1"><stop offset="0.00" stop-color="#fe8672" stop-opacity="1.000"/><stop offset="0.17" stop-color="#fe8672" stop-opacity="0.878"/><stop offset="0.33" stop-color="#fe8672" stop-opacity="0.613"/><stop offset="0.50" stop-color="#fe8672" stop-opacity="0.325"/><stop offset="0.67" stop-color="#fe8672" stop-opacity="0.133"/><stop offset="0.83" stop-color="#fe8672" stop-opacity="0.045"/><stop offset="1.00" stop-color="#fe8672" stop-opacity="0.011"/></radialGradient><radialGradient id="pf2"><stop offset="0.00" stop-color="#fe2400" stop-opacity="1.000"/><stop offset="0.17" stop-color="#fe2400" stop-opacity="0.878"/><stop offset="0.33" stop-color="#fe2400" stop-opacity="0.613"/><stop offset="0.50" stop-color="#fe2400" stop-opacity="0.325"/><stop offset="0.67" stop-color="#fe2400" stop-opacity="0.133"/><stop offset="0.83" stop-color="#fe2400" stop-opacity="0.045"/><stop offset="1.00" stop-color="#fe2400" stop-opacity="0.011"/></radialGradient><radialGradient id="pf3"><stop offset="0.00" stop-color="#ff8672" stop-opacity="0.771"/><stop offset="0.17" stop-color="#ff8672" stop-opacity="0.677"/><stop offset="0.33" stop-color="#ff8672" stop-opacity="0.472"/><stop offset="0.50" stop-color="#ff8672" stop-opacity="0.250"/><stop offset="0.67" stop-color="#ff8672" stop-opacity="0.102"/><stop offset="0.83" stop-color="#ff8672" stop-opacity="0.035"/><stop offset="1.00" stop-color="#ff8672" stop-opacity="0.009"/></radialGradient><radialGradient id="pf4"><stop offset="0.00" stop-color="#ff8a77" stop-opacity="1.000"/><stop offset="0.17" stop-color="#ff8a77" stop-opacity="0.878"/><stop offset="0.33" stop-color="#ff8a77" stop-opacity="0.613"/><stop offset="0.50" stop-color="#ff8a77" stop-opacity="0.325"/><stop offset="0.67" stop-color="#ff8a77" stop-opacity="0.133"/><stop offset="0.83" stop-color="#ff8a77" stop-opacity="0.045"/><stop offset="1.00" stop-color="#ff8a77" stop-opacity="0.011"/></radialGradient><radialGradient id="pf5"><stop offset="0.00" stop-color="#fb5237" stop-opacity="1.000"/><stop offset="0.17" stop-color="#fb5237" stop-opacity="0.878"/><stop offset="0.33" stop-color="#fb5237" stop-opacity="0.613"/><stop offset="0.50" stop-color="#fb5237" stop-opacity="0.325"/><stop offset="0.67" stop-color="#fb5237" stop-opacity="0.133"/><stop offset="0.83" stop-color="#fb5237" stop-opacity="0.045"/><stop offset="1.00" stop-color="#fb5237" stop-opacity="0.011"/></radialGradient><radialGradient id="pf6"><stop offset="0.00" stop-color="#e32000" stop-opacity="0.656"/><stop offset="0.17" stop-color="#e32000" stop-opacity="0.576"/><stop offset="0.33" stop-color="#e32000" stop-opacity="0.402"/><stop offset="0.50" stop-color="#e32000" stop-opacity="0.213"/><stop offset="0.67" stop-color="#e32000" stop-opacity="0.087"/><stop offset="0.83" stop-color="#e32000" stop-opacity="0.030"/><stop offset="1.00" stop-color="#e32000" stop-opacity="0.007"/></radialGradient><radialGradient id="pf7"><stop offset="0.00" stop-color="#f12200" stop-opacity="1.000"/><stop offset="0.17" stop-color="#f12200" stop-opacity="0.878"/><stop offset="0.33" stop-color="#f12200" stop-opacity="0.613"/><stop offset="0.50" stop-color="#f12200" stop-opacity="0.325"/><stop offset="0.67" stop-color="#f12200" stop-opacity="0.133"/><stop offset="0.83" stop-color="#f12200" stop-opacity="0.045"/><stop offset="1.00" stop-color="#f12200" stop-opacity="0.011"/></radialGradient><radialGradient id="pf8"><stop offset="0.00" stop-color="#ff664d" stop-opacity="0.844"/><stop offset="0.17" stop-color="#ff664d" stop-opacity="0.741"/><stop offset="0.33" stop-color="#ff664d" stop-opacity="0.517"/><stop offset="0.50" stop-color="#ff664d" stop-opacity="0.274"/><stop offset="0.67" stop-color="#ff664d" stop-opacity="0.112"/><stop offset="0.83" stop-color="#ff664d" stop-opacity="0.038"/><stop offset="1.00" stop-color="#ff664d" stop-opacity="0.009"/></radialGradient><radialGradient id="pf9"><stop offset="0.00" stop-color="#ff9b8b" stop-opacity="0.430"/><stop offset="0.17" stop-color="#ff9b8b" stop-opacity="0.377"/><stop offset="0.33" stop-color="#ff9b8b" stop-opacity="0.263"/><stop offset="0.50" stop-color="#ff9b8b" stop-opacity="0.140"/><stop offset="0.67" stop-color="#ff9b8b" stop-opacity="0.057"/><stop offset="0.83" stop-color="#ff9b8b" stop-opacity="0.019"/><stop offset="1.00" stop-color="#ff9b8b" stop-opacity="0.005"/></radialGradient><radialGradient id="pf10"><stop offset="0.00" stop-color="#ff583c" stop-opacity="0.344"/><stop offset="0.17" stop-color="#ff583c" stop-opacity="0.302"/><stop offset="0.33" stop-color="#ff583c" stop-opacity="0.210"/><stop offset="0.50" stop-color="#ff583c" stop-opacity="0.112"/><stop offset="0.67" stop-color="#ff583c" stop-opacity="0.046"/><stop offset="0.83" stop-color="#ff583c" stop-opacity="0.015"/><stop offset="1.00" stop-color="#ff583c" stop-opacity="0.004"/></radialGradient><radialGradient id="pf11"><stop offset="0.00" stop-color="#ff7c66" stop-opacity="0.771"/><stop offset="0.17" stop-color="#ff7c66" stop-opacity="0.677"/><stop offset="0.33" stop-color="#ff7c66" stop-opacity="0.472"/><stop offset="0.50" stop-color="#ff7c66" stop-opacity="0.250"/><stop offset="0.67" stop-color="#ff7c66" stop-opacity="0.102"/><stop offset="0.83" stop-color="#ff7c66" stop-opacity="0.035"/><stop offset="1.00" stop-color="#ff7c66" stop-opacity="0.009"/></radialGradient><radialGradient id="pf12"><stop offset="0.00" stop-color="#f12200" stop-opacity="0.864"/><stop offset="0.17" stop-color="#f12200" stop-opacity="0.758"/><stop offset="0.33" stop-color="#f12200" stop-opacity="0.529"/><stop offset="0.50" stop-color="#f12200" stop-opacity="0.280"/><stop offset="0.67" stop-color="#f12200" stop-opacity="0.115"/><stop offset="0.83" stop-color="#f12200" stop-opacity="0.039"/><stop offset="1.00" stop-color="#f12200" stop-opacity="0.010"/></radialGradient><radialGradient id="pf13"><stop offset="0.00" stop-color="#ff8c79" stop-opacity="1.000"/><stop offset="0.17" stop-color="#ff8c79" stop-opacity="0.878"/><stop offset="0.33" stop-color="#ff8c79" stop-opacity="0.613"/><stop offset="0.50" stop-color="#ff8c79" stop-opacity="0.325"/><stop offset="0.67" stop-color="#ff8c79" stop-opacity="0.133"/><stop offset="0.83" stop-color="#ff8c79" stop-opacity="0.045"/><stop offset="1.00" stop-color="#ff8c79" stop-opacity="0.011"/></radialGradient><radialGradient id="pf14"><stop offset="0.00" stop-color="#f32200" stop-opacity="1.000"/><stop offset="0.17" stop-color="#f32200" stop-opacity="0.878"/><stop offset="0.33" stop-color="#f32200" stop-opacity="0.613"/><stop offset="0.50" stop-color="#f32200" stop-opacity="0.325"/><stop offset="0.67" stop-color="#f32200" stop-opacity="0.133"/><stop offset="0.83" stop-color="#f32200" stop-opacity="0.045"/><stop offset="1.00" stop-color="#f32200" stop-opacity="0.011"/></radialGradient><radialGradient id="pf15"><stop offset="0.00" stop-color="#fca192" stop-opacity="0.375"/><stop offset="0.17" stop-color="#fca192" stop-opacity="0.329"/><stop offset="0.33" stop-color="#fca192" stop-opacity="0.230"/><stop offset="0.50" stop-color="#fca192" stop-opacity="0.122"/><stop offset="0.67" stop-color="#fca192" stop-opacity="0.050"/><stop offset="0.83" stop-color="#fca192" stop-opacity="0.017"/><stop offset="1.00" stop-color="#fca192" stop-opacity="0.004"/></radialGradient></defs>',
  red: '<clipPath id="pf-red"><rect x="-400" y="-400" width="2800" height="1104.3"/></clipPath><g clip-path="url(#pf-red)"><rect x="-400" y="-400" width="2800" height="1104.3" fill="#ff2400"/><ellipse cx="885" cy="105" rx="749" ry="528" fill="url(#pf1)"/><ellipse cx="389" cy="74" rx="239" ry="577" fill="url(#pf2)"/><ellipse cx="1994" cy="108" rx="1663" ry="995" fill="url(#pf3)"/><ellipse cx="607" cy="9" rx="552" ry="235" fill="url(#pf4)"/><ellipse cx="867" cy="595" rx="645" ry="1151" fill="url(#pf5)"/><ellipse cx="1017" cy="257" rx="557" ry="1110" fill="url(#pf6)"/></g>',
  circles: '<clipPath id="pfcTR"><circle cx="1803.4" cy="176.5" r="263.4"/></clipPath><g clip-path="url(#pfcTR)"><rect x="1540.0" y="-86.89999999999998" width="526.8" height="526.8" fill="#fe4324"/><ellipse cx="1890" cy="221" rx="781" ry="725" fill="url(#pf7)"/><ellipse cx="1909" cy="116" rx="191" ry="410" fill="url(#pf8)"/><ellipse cx="1710" cy="295" rx="390" ry="285" fill="url(#pf9)"/></g><clipPath id="pfcMR"><circle cx="1643.3" cy="783.5" r="140.6"/></clipPath><g clip-path="url(#pfcMR)"><rect x="1502.7" y="642.9" width="281.2" height="281.2" fill="#ff4728"/><ellipse cx="932" cy="130" rx="129" ry="141" fill="url(#pf10)"/><ellipse cx="1681" cy="734" rx="218" ry="157" fill="url(#pf11)"/><ellipse cx="1596" cy="733" rx="207" ry="139" fill="url(#pf12)"/></g><clipPath id="pfcBL"><circle cx="218.5" cy="1181.5" r="287.9"/></clipPath><g clip-path="url(#pfcBL)"><rect x="-69.39999999999998" y="893.6" width="575.8" height="575.8" fill="#fe4526"/><ellipse cx="266" cy="1090" rx="387" ry="426" fill="url(#pf13)"/><ellipse cx="130" cy="1154" rx="511" ry="615" fill="url(#pf14)"/><ellipse cx="10" cy="1311" rx="1061" ry="384" fill="url(#pf15)"/></g>',
};
const BACK_BG = {
  defs: '<defs><radialGradient id="pb1"><stop offset="0.00" stop-color="#ff7f6a" stop-opacity="1.000"/><stop offset="0.17" stop-color="#ff7f6a" stop-opacity="0.878"/><stop offset="0.33" stop-color="#ff7f6a" stop-opacity="0.613"/><stop offset="0.50" stop-color="#ff7f6a" stop-opacity="0.325"/><stop offset="0.67" stop-color="#ff7f6a" stop-opacity="0.133"/><stop offset="0.83" stop-color="#ff7f6a" stop-opacity="0.045"/><stop offset="1.00" stop-color="#ff7f6a" stop-opacity="0.011"/></radialGradient><radialGradient id="pb2"><stop offset="0.00" stop-color="#ef2200" stop-opacity="1.000"/><stop offset="0.17" stop-color="#ef2200" stop-opacity="0.878"/><stop offset="0.33" stop-color="#ef2200" stop-opacity="0.613"/><stop offset="0.50" stop-color="#ef2200" stop-opacity="0.325"/><stop offset="0.67" stop-color="#ef2200" stop-opacity="0.133"/><stop offset="0.83" stop-color="#ef2200" stop-opacity="0.045"/><stop offset="1.00" stop-color="#ef2200" stop-opacity="0.011"/></radialGradient><radialGradient id="pb3"><stop offset="0.00" stop-color="#ff4f32" stop-opacity="1.000"/><stop offset="0.17" stop-color="#ff4f32" stop-opacity="0.878"/><stop offset="0.33" stop-color="#ff4f32" stop-opacity="0.613"/><stop offset="0.50" stop-color="#ff4f32" stop-opacity="0.325"/><stop offset="0.67" stop-color="#ff4f32" stop-opacity="0.133"/><stop offset="0.83" stop-color="#ff4f32" stop-opacity="0.045"/><stop offset="1.00" stop-color="#ff4f32" stop-opacity="0.011"/></radialGradient><radialGradient id="pb4"><stop offset="0.00" stop-color="#ff9c8c" stop-opacity="0.673"/><stop offset="0.17" stop-color="#ff9c8c" stop-opacity="0.591"/><stop offset="0.33" stop-color="#ff9c8c" stop-opacity="0.412"/><stop offset="0.50" stop-color="#ff9c8c" stop-opacity="0.218"/><stop offset="0.67" stop-color="#ff9c8c" stop-opacity="0.089"/><stop offset="0.83" stop-color="#ff9c8c" stop-opacity="0.030"/><stop offset="1.00" stop-color="#ff9c8c" stop-opacity="0.007"/></radialGradient><radialGradient id="pb5"><stop offset="0.00" stop-color="#ff8b78" stop-opacity="0.528"/><stop offset="0.17" stop-color="#ff8b78" stop-opacity="0.463"/><stop offset="0.33" stop-color="#ff8b78" stop-opacity="0.323"/><stop offset="0.50" stop-color="#ff8b78" stop-opacity="0.171"/><stop offset="0.67" stop-color="#ff8b78" stop-opacity="0.070"/><stop offset="0.83" stop-color="#ff8b78" stop-opacity="0.024"/><stop offset="1.00" stop-color="#ff8b78" stop-opacity="0.006"/></radialGradient><radialGradient id="pb6"><stop offset="0.00" stop-color="#ff4a2c" stop-opacity="0.198"/><stop offset="0.17" stop-color="#ff4a2c" stop-opacity="0.173"/><stop offset="0.33" stop-color="#ff4a2c" stop-opacity="0.121"/><stop offset="0.50" stop-color="#ff4a2c" stop-opacity="0.064"/><stop offset="0.67" stop-color="#ff4a2c" stop-opacity="0.026"/><stop offset="0.83" stop-color="#ff4a2c" stop-opacity="0.009"/><stop offset="1.00" stop-color="#ff4a2c" stop-opacity="0.002"/></radialGradient><radialGradient id="pb7"><stop offset="0.00" stop-color="#ff8672" stop-opacity="0.184"/><stop offset="0.17" stop-color="#ff8672" stop-opacity="0.161"/><stop offset="0.33" stop-color="#ff8672" stop-opacity="0.113"/><stop offset="0.50" stop-color="#ff8672" stop-opacity="0.060"/><stop offset="0.67" stop-color="#ff8672" stop-opacity="0.024"/><stop offset="0.83" stop-color="#ff8672" stop-opacity="0.008"/><stop offset="1.00" stop-color="#ff8672" stop-opacity="0.002"/></radialGradient><radialGradient id="pb8"><stop offset="0.00" stop-color="#e22000" stop-opacity="0.556"/><stop offset="0.17" stop-color="#e22000" stop-opacity="0.488"/><stop offset="0.33" stop-color="#e22000" stop-opacity="0.340"/><stop offset="0.50" stop-color="#e22000" stop-opacity="0.180"/><stop offset="0.67" stop-color="#e22000" stop-opacity="0.074"/><stop offset="0.83" stop-color="#e22000" stop-opacity="0.025"/><stop offset="1.00" stop-color="#e22000" stop-opacity="0.006"/></radialGradient><radialGradient id="pb9"><stop offset="0.00" stop-color="#fe2400" stop-opacity="1.000"/><stop offset="0.17" stop-color="#fe2400" stop-opacity="0.878"/><stop offset="0.33" stop-color="#fe2400" stop-opacity="0.613"/><stop offset="0.50" stop-color="#fe2400" stop-opacity="0.325"/><stop offset="0.67" stop-color="#fe2400" stop-opacity="0.133"/><stop offset="0.83" stop-color="#fe2400" stop-opacity="0.045"/><stop offset="1.00" stop-color="#fe2400" stop-opacity="0.011"/></radialGradient><radialGradient id="pb10"><stop offset="0.00" stop-color="#ff836e" stop-opacity="0.491"/><stop offset="0.17" stop-color="#ff836e" stop-opacity="0.431"/><stop offset="0.33" stop-color="#ff836e" stop-opacity="0.301"/><stop offset="0.50" stop-color="#ff836e" stop-opacity="0.159"/><stop offset="0.67" stop-color="#ff836e" stop-opacity="0.065"/><stop offset="0.83" stop-color="#ff836e" stop-opacity="0.022"/><stop offset="1.00" stop-color="#ff836e" stop-opacity="0.005"/></radialGradient><radialGradient id="pb11"><stop offset="0.00" stop-color="#fd2400" stop-opacity="0.673"/><stop offset="0.17" stop-color="#fd2400" stop-opacity="0.591"/><stop offset="0.33" stop-color="#fd2400" stop-opacity="0.412"/><stop offset="0.50" stop-color="#fd2400" stop-opacity="0.218"/><stop offset="0.67" stop-color="#fd2400" stop-opacity="0.089"/><stop offset="0.83" stop-color="#fd2400" stop-opacity="0.030"/><stop offset="1.00" stop-color="#fd2400" stop-opacity="0.007"/></radialGradient><radialGradient id="pb12"><stop offset="0.00" stop-color="#e12000" stop-opacity="0.740"/><stop offset="0.17" stop-color="#e12000" stop-opacity="0.650"/><stop offset="0.33" stop-color="#e12000" stop-opacity="0.454"/><stop offset="0.50" stop-color="#e12000" stop-opacity="0.240"/><stop offset="0.67" stop-color="#e12000" stop-opacity="0.098"/><stop offset="0.83" stop-color="#e12000" stop-opacity="0.033"/><stop offset="1.00" stop-color="#e12000" stop-opacity="0.008"/></radialGradient></defs>',
  body: '<rect x="-400" y="-400" width="2800" height="2000" fill="#ff2400"/><ellipse cx="2041" cy="609" rx="3518" ry="706" fill="url(#pb1)"/><ellipse cx="922" cy="431" rx="1306" ry="2152" fill="url(#pb2)"/><ellipse cx="503" cy="880" rx="416" ry="723" fill="url(#pb3)"/><ellipse cx="875" cy="1321" rx="677" ry="1240" fill="url(#pb4)"/><ellipse cx="1658" cy="47" rx="1505" ry="716" fill="url(#pb5)"/><ellipse cx="323" cy="-100" rx="435" ry="2766" fill="url(#pb6)"/><clipPath id="pbcTL"><circle cx="-31.7" cy="173.2" r="274.8"/></clipPath><g clip-path="url(#pbcTL)"><rect x="-306.5" y="-101.60000000000002" width="549.6" height="549.6" fill="#ff5134"/><ellipse cx="158" cy="190" rx="581" ry="508" fill="url(#pb7)"/><ellipse cx="-19" cy="112" rx="120" ry="289" fill="url(#pb8)"/><ellipse cx="152" cy="398" rx="326" ry="241" fill="url(#pb9)"/></g><clipPath id="pbcBOT"><circle cx="958.6" cy="1129.2" r="332.6"/></clipPath><g clip-path="url(#pbcBOT)"><rect x="626.0" y="796.6" width="665.2" height="665.2" fill="#fc3d1e"/><ellipse cx="1098" cy="1032" rx="848" ry="717" fill="url(#pb10)"/><ellipse cx="791" cy="935" rx="479" ry="374" fill="url(#pb11)"/><ellipse cx="911" cy="1065" rx="231" ry="227" fill="url(#pb12)"/></g>',
};
const BG_PX = 1 / 20, BLEED_SHIFT = -3;

/* 写真なしバージョンの背景（同じ手順でデザイン画像から実測。円の位置・大きさ・赤地の高さが写真ありと異なる） */
const FRONT_BG_NP = {
  defs: '<defs><radialGradient id="nq1"><stop offset="0.00" stop-color="#ff5a3f" stop-opacity="0.584"/><stop offset="0.17" stop-color="#ff5a3f" stop-opacity="0.513"/><stop offset="0.33" stop-color="#ff5a3f" stop-opacity="0.358"/><stop offset="0.50" stop-color="#ff5a3f" stop-opacity="0.190"/><stop offset="0.67" stop-color="#ff5a3f" stop-opacity="0.077"/><stop offset="0.83" stop-color="#ff5a3f" stop-opacity="0.026"/><stop offset="1.00" stop-color="#ff5a3f" stop-opacity="0.006"/></radialGradient><radialGradient id="nq2"><stop offset="0.00" stop-color="#ff664d" stop-opacity="0.453"/><stop offset="0.17" stop-color="#ff664d" stop-opacity="0.398"/><stop offset="0.33" stop-color="#ff664d" stop-opacity="0.278"/><stop offset="0.50" stop-color="#ff664d" stop-opacity="0.147"/><stop offset="0.67" stop-color="#ff664d" stop-opacity="0.060"/><stop offset="0.83" stop-color="#ff664d" stop-opacity="0.020"/><stop offset="1.00" stop-color="#ff664d" stop-opacity="0.005"/></radialGradient><radialGradient id="nq3"><stop offset="0.00" stop-color="#ff7d67" stop-opacity="0.754"/><stop offset="0.17" stop-color="#ff7d67" stop-opacity="0.662"/><stop offset="0.33" stop-color="#ff7d67" stop-opacity="0.462"/><stop offset="0.50" stop-color="#ff7d67" stop-opacity="0.245"/><stop offset="0.67" stop-color="#ff7d67" stop-opacity="0.100"/><stop offset="0.83" stop-color="#ff7d67" stop-opacity="0.034"/><stop offset="1.00" stop-color="#ff7d67" stop-opacity="0.008"/></radialGradient><radialGradient id="nq4"><stop offset="0.00" stop-color="#ff4425" stop-opacity="0.752"/><stop offset="0.17" stop-color="#ff4425" stop-opacity="0.660"/><stop offset="0.33" stop-color="#ff4425" stop-opacity="0.461"/><stop offset="0.50" stop-color="#ff4425" stop-opacity="0.244"/><stop offset="0.67" stop-color="#ff4425" stop-opacity="0.100"/><stop offset="0.83" stop-color="#ff4425" stop-opacity="0.034"/><stop offset="1.00" stop-color="#ff4425" stop-opacity="0.008"/></radialGradient><radialGradient id="nq5"><stop offset="0.00" stop-color="#da1f00" stop-opacity="0.714"/><stop offset="0.17" stop-color="#da1f00" stop-opacity="0.627"/><stop offset="0.33" stop-color="#da1f00" stop-opacity="0.437"/><stop offset="0.50" stop-color="#da1f00" stop-opacity="0.232"/><stop offset="0.67" stop-color="#da1f00" stop-opacity="0.095"/><stop offset="0.83" stop-color="#da1f00" stop-opacity="0.032"/><stop offset="1.00" stop-color="#da1f00" stop-opacity="0.008"/></radialGradient><radialGradient id="nq6"><stop offset="0.00" stop-color="#ff7e68" stop-opacity="0.423"/><stop offset="0.17" stop-color="#ff7e68" stop-opacity="0.371"/><stop offset="0.33" stop-color="#ff7e68" stop-opacity="0.259"/><stop offset="0.50" stop-color="#ff7e68" stop-opacity="0.137"/><stop offset="0.67" stop-color="#ff7e68" stop-opacity="0.056"/><stop offset="0.83" stop-color="#ff7e68" stop-opacity="0.019"/><stop offset="1.00" stop-color="#ff7e68" stop-opacity="0.005"/></radialGradient><radialGradient id="nq7"><stop offset="0.00" stop-color="#e22000" stop-opacity="1.000"/><stop offset="0.17" stop-color="#e22000" stop-opacity="0.878"/><stop offset="0.33" stop-color="#e22000" stop-opacity="0.613"/><stop offset="0.50" stop-color="#e22000" stop-opacity="0.325"/><stop offset="0.67" stop-color="#e22000" stop-opacity="0.133"/><stop offset="0.83" stop-color="#e22000" stop-opacity="0.045"/><stop offset="1.00" stop-color="#e22000" stop-opacity="0.011"/></radialGradient><radialGradient id="nq8"><stop offset="0.00" stop-color="#ff674e" stop-opacity="0.623"/><stop offset="0.17" stop-color="#ff674e" stop-opacity="0.547"/><stop offset="0.33" stop-color="#ff674e" stop-opacity="0.382"/><stop offset="0.50" stop-color="#ff674e" stop-opacity="0.202"/><stop offset="0.67" stop-color="#ff674e" stop-opacity="0.083"/><stop offset="0.83" stop-color="#ff674e" stop-opacity="0.028"/><stop offset="1.00" stop-color="#ff674e" stop-opacity="0.007"/></radialGradient><radialGradient id="nq9"><stop offset="0.00" stop-color="#ff836f" stop-opacity="0.336"/><stop offset="0.17" stop-color="#ff836f" stop-opacity="0.295"/><stop offset="0.33" stop-color="#ff836f" stop-opacity="0.206"/><stop offset="0.50" stop-color="#ff836f" stop-opacity="0.109"/><stop offset="0.67" stop-color="#ff836f" stop-opacity="0.045"/><stop offset="0.83" stop-color="#ff836f" stop-opacity="0.015"/><stop offset="1.00" stop-color="#ff836f" stop-opacity="0.004"/></radialGradient><radialGradient id="nq10"><stop offset="0.00" stop-color="#c71c00" stop-opacity="1.000"/><stop offset="0.17" stop-color="#c71c00" stop-opacity="0.878"/><stop offset="0.33" stop-color="#c71c00" stop-opacity="0.613"/><stop offset="0.50" stop-color="#c71c00" stop-opacity="0.325"/><stop offset="0.67" stop-color="#c71c00" stop-opacity="0.133"/><stop offset="0.83" stop-color="#c71c00" stop-opacity="0.045"/><stop offset="1.00" stop-color="#c71c00" stop-opacity="0.011"/></radialGradient><radialGradient id="nq11"><stop offset="0.00" stop-color="#f92300" stop-opacity="0.469"/><stop offset="0.17" stop-color="#f92300" stop-opacity="0.412"/><stop offset="0.33" stop-color="#f92300" stop-opacity="0.287"/><stop offset="0.50" stop-color="#f92300" stop-opacity="0.152"/><stop offset="0.67" stop-color="#f92300" stop-opacity="0.062"/><stop offset="0.83" stop-color="#f92300" stop-opacity="0.021"/><stop offset="1.00" stop-color="#f92300" stop-opacity="0.005"/></radialGradient><radialGradient id="nq12"><stop offset="0.00" stop-color="#ff8a76" stop-opacity="0.337"/><stop offset="0.17" stop-color="#ff8a76" stop-opacity="0.296"/><stop offset="0.33" stop-color="#ff8a76" stop-opacity="0.207"/><stop offset="0.50" stop-color="#ff8a76" stop-opacity="0.109"/><stop offset="0.67" stop-color="#ff8a76" stop-opacity="0.045"/><stop offset="0.83" stop-color="#ff8a76" stop-opacity="0.015"/><stop offset="1.00" stop-color="#ff8a76" stop-opacity="0.004"/></radialGradient><radialGradient id="nq13"><stop offset="0.00" stop-color="#ff6c53" stop-opacity="1.000"/><stop offset="0.17" stop-color="#ff6c53" stop-opacity="0.878"/><stop offset="0.33" stop-color="#ff6c53" stop-opacity="0.613"/><stop offset="0.50" stop-color="#ff6c53" stop-opacity="0.325"/><stop offset="0.67" stop-color="#ff6c53" stop-opacity="0.133"/><stop offset="0.83" stop-color="#ff6c53" stop-opacity="0.045"/><stop offset="1.00" stop-color="#ff6c53" stop-opacity="0.011"/></radialGradient><radialGradient id="nq14"><stop offset="0.00" stop-color="#e82100" stop-opacity="0.842"/><stop offset="0.17" stop-color="#e82100" stop-opacity="0.739"/><stop offset="0.33" stop-color="#e82100" stop-opacity="0.516"/><stop offset="0.50" stop-color="#e82100" stop-opacity="0.273"/><stop offset="0.67" stop-color="#e82100" stop-opacity="0.112"/><stop offset="0.83" stop-color="#e82100" stop-opacity="0.038"/><stop offset="1.00" stop-color="#e82100" stop-opacity="0.009"/></radialGradient><radialGradient id="nq15"><stop offset="0.00" stop-color="#ea3618" stop-opacity="0.856"/><stop offset="0.17" stop-color="#ea3618" stop-opacity="0.752"/><stop offset="0.33" stop-color="#ea3618" stop-opacity="0.525"/><stop offset="0.50" stop-color="#ea3618" stop-opacity="0.278"/><stop offset="0.67" stop-color="#ea3618" stop-opacity="0.114"/><stop offset="0.83" stop-color="#ea3618" stop-opacity="0.039"/><stop offset="1.00" stop-color="#ea3618" stop-opacity="0.010"/></radialGradient><radialGradient id="nq16"><stop offset="0.00" stop-color="#d21e00" stop-opacity="1.000"/><stop offset="0.17" stop-color="#d21e00" stop-opacity="0.878"/><stop offset="0.33" stop-color="#d21e00" stop-opacity="0.613"/><stop offset="0.50" stop-color="#d21e00" stop-opacity="0.325"/><stop offset="0.67" stop-color="#d21e00" stop-opacity="0.133"/><stop offset="0.83" stop-color="#d21e00" stop-opacity="0.045"/><stop offset="1.00" stop-color="#d21e00" stop-opacity="0.011"/></radialGradient><radialGradient id="nq17"><stop offset="0.00" stop-color="#ff816d" stop-opacity="0.275"/><stop offset="0.17" stop-color="#ff816d" stop-opacity="0.242"/><stop offset="0.33" stop-color="#ff816d" stop-opacity="0.169"/><stop offset="0.50" stop-color="#ff816d" stop-opacity="0.089"/><stop offset="0.67" stop-color="#ff816d" stop-opacity="0.037"/><stop offset="0.83" stop-color="#ff816d" stop-opacity="0.012"/><stop offset="1.00" stop-color="#ff816d" stop-opacity="0.003"/></radialGradient><radialGradient id="nq18"><stop offset="0.00" stop-color="#fd2400" stop-opacity="0.514"/><stop offset="0.17" stop-color="#fd2400" stop-opacity="0.451"/><stop offset="0.33" stop-color="#fd2400" stop-opacity="0.315"/><stop offset="0.50" stop-color="#fd2400" stop-opacity="0.167"/><stop offset="0.67" stop-color="#fd2400" stop-opacity="0.068"/><stop offset="0.83" stop-color="#fd2400" stop-opacity="0.023"/><stop offset="1.00" stop-color="#fd2400" stop-opacity="0.006"/></radialGradient></defs>',
  red: '<clipPath id="nq-red"><rect x="-400" y="-400" width="2800" height="1133"/></clipPath><g clip-path="url(#nq-red)"><rect x="-400" y="-400" width="2800" height="1133" fill="#ff2400"/><ellipse cx="462" cy="624" rx="414" ry="554" fill="url(#nq1)"/><ellipse cx="715" cy="669" rx="616" ry="1384" fill="url(#nq2)"/><ellipse cx="734" cy="7" rx="752" ry="483" fill="url(#nq3)"/><ellipse cx="1869" cy="332" rx="448" ry="891" fill="url(#nq4)"/><ellipse cx="974" cy="210" rx="699" ry="1253" fill="url(#nq5)"/><ellipse cx="1574" cy="112" rx="871" ry="716" fill="url(#nq6)"/></g>',
  circles: '<clipPath id="nqcbig"><circle cx="463.6" cy="169.9" r="279.6"/></clipPath><g clip-path="url(#nqcbig)"><rect x="184.0" y="-109.70000000000002" width="559.2" height="559.2" fill="#ff3a1a"/><ellipse cx="508" cy="366" rx="300" ry="896" fill="url(#nq7)"/><ellipse cx="543" cy="369" rx="265" ry="278" fill="url(#nq8)"/><ellipse cx="553" cy="225" rx="502" ry="203" fill="url(#nq9)"/></g><clipPath id="nqcTR"><circle cx="1853.8" cy="95.2" r="279.9"/></clipPath><g clip-path="url(#nqcTR)"><rect x="1573.9" y="-184.7" width="559.8" height="559.8" fill="#ff3716"/><ellipse cx="1787" cy="86" rx="171" ry="244" fill="url(#nq10)"/><ellipse cx="1703" cy="0" rx="375" ry="3000" fill="url(#nq11)"/><ellipse cx="1766" cy="190" rx="309" ry="317" fill="url(#nq12)"/></g><clipPath id="nqcMR"><circle cx="1680.6" cy="795.4" r="147.4"/></clipPath><g clip-path="url(#nqcMR)"><rect x="1533.1999999999998" y="648.0" width="294.8" height="294.8" fill="#ff3817"/><ellipse cx="1700" cy="759" rx="228" ry="159" fill="url(#nq13)"/><ellipse cx="1650" cy="749" rx="212" ry="167" fill="url(#nq14)"/><ellipse cx="579" cy="786" rx="324" ry="858" fill="url(#nq15)"/></g><clipPath id="nqcBL"><circle cx="223.1" cy="1146.9" r="335.0"/></clipPath><g clip-path="url(#nqcBL)"><rect x="-111.9" y="811.9000000000001" width="670.0" height="670.0" fill="#ff3716"/><ellipse cx="186" cy="1069" rx="226" ry="248" fill="url(#nq16)"/><ellipse cx="392" cy="1050" rx="598" ry="775" fill="url(#nq17)"/><ellipse cx="70" cy="917" rx="448" ry="451" fill="url(#nq18)"/></g>',
  w: 1938, split: 733,
};
const BACK_BG_NP = {
  defs: '<defs><radialGradient id="nr1"><stop offset="0.00" stop-color="#ff755f" stop-opacity="0.751"/><stop offset="0.17" stop-color="#ff755f" stop-opacity="0.659"/><stop offset="0.33" stop-color="#ff755f" stop-opacity="0.460"/><stop offset="0.50" stop-color="#ff755f" stop-opacity="0.244"/><stop offset="0.67" stop-color="#ff755f" stop-opacity="0.100"/><stop offset="0.83" stop-color="#ff755f" stop-opacity="0.034"/><stop offset="1.00" stop-color="#ff755f" stop-opacity="0.008"/></radialGradient><radialGradient id="nr2"><stop offset="0.00" stop-color="#ff5033" stop-opacity="0.497"/><stop offset="0.17" stop-color="#ff5033" stop-opacity="0.436"/><stop offset="0.33" stop-color="#ff5033" stop-opacity="0.304"/><stop offset="0.50" stop-color="#ff5033" stop-opacity="0.161"/><stop offset="0.67" stop-color="#ff5033" stop-opacity="0.066"/><stop offset="0.83" stop-color="#ff5033" stop-opacity="0.022"/><stop offset="1.00" stop-color="#ff5033" stop-opacity="0.006"/></radialGradient><radialGradient id="nr3"><stop offset="0.00" stop-color="#ff806b" stop-opacity="0.682"/><stop offset="0.17" stop-color="#ff806b" stop-opacity="0.599"/><stop offset="0.33" stop-color="#ff806b" stop-opacity="0.418"/><stop offset="0.50" stop-color="#ff806b" stop-opacity="0.221"/><stop offset="0.67" stop-color="#ff806b" stop-opacity="0.090"/><stop offset="0.83" stop-color="#ff806b" stop-opacity="0.031"/><stop offset="1.00" stop-color="#ff806b" stop-opacity="0.008"/></radialGradient><radialGradient id="nr4"><stop offset="0.00" stop-color="#ff7d68" stop-opacity="0.430"/><stop offset="0.17" stop-color="#ff7d68" stop-opacity="0.377"/><stop offset="0.33" stop-color="#ff7d68" stop-opacity="0.263"/><stop offset="0.50" stop-color="#ff7d68" stop-opacity="0.140"/><stop offset="0.67" stop-color="#ff7d68" stop-opacity="0.057"/><stop offset="0.83" stop-color="#ff7d68" stop-opacity="0.019"/><stop offset="1.00" stop-color="#ff7d68" stop-opacity="0.005"/></radialGradient><radialGradient id="nr5"><stop offset="0.00" stop-color="#ff2400" stop-opacity="0.479"/><stop offset="0.17" stop-color="#ff2400" stop-opacity="0.421"/><stop offset="0.33" stop-color="#ff2400" stop-opacity="0.293"/><stop offset="0.50" stop-color="#ff2400" stop-opacity="0.155"/><stop offset="0.67" stop-color="#ff2400" stop-opacity="0.064"/><stop offset="0.83" stop-color="#ff2400" stop-opacity="0.022"/><stop offset="1.00" stop-color="#ff2400" stop-opacity="0.005"/></radialGradient><radialGradient id="nr6"><stop offset="0.00" stop-color="#c61d01" stop-opacity="0.435"/><stop offset="0.17" stop-color="#c61d01" stop-opacity="0.382"/><stop offset="0.33" stop-color="#c61d01" stop-opacity="0.266"/><stop offset="0.50" stop-color="#c61d01" stop-opacity="0.141"/><stop offset="0.67" stop-color="#c61d01" stop-opacity="0.058"/><stop offset="0.83" stop-color="#c61d01" stop-opacity="0.020"/><stop offset="1.00" stop-color="#c61d01" stop-opacity="0.005"/></radialGradient><radialGradient id="nr7"><stop offset="0.00" stop-color="#ff2a07" stop-opacity="0.637"/><stop offset="0.17" stop-color="#ff2a07" stop-opacity="0.560"/><stop offset="0.33" stop-color="#ff2a07" stop-opacity="0.390"/><stop offset="0.50" stop-color="#ff2a07" stop-opacity="0.207"/><stop offset="0.67" stop-color="#ff2a07" stop-opacity="0.085"/><stop offset="0.83" stop-color="#ff2a07" stop-opacity="0.029"/><stop offset="1.00" stop-color="#ff2a07" stop-opacity="0.007"/></radialGradient><radialGradient id="nr8"><stop offset="0.00" stop-color="#fe2400" stop-opacity="0.760"/><stop offset="0.17" stop-color="#fe2400" stop-opacity="0.667"/><stop offset="0.33" stop-color="#fe2400" stop-opacity="0.466"/><stop offset="0.50" stop-color="#fe2400" stop-opacity="0.247"/><stop offset="0.67" stop-color="#fe2400" stop-opacity="0.101"/><stop offset="0.83" stop-color="#fe2400" stop-opacity="0.034"/><stop offset="1.00" stop-color="#fe2400" stop-opacity="0.008"/></radialGradient><radialGradient id="nr9"><stop offset="0.00" stop-color="#ff5c42" stop-opacity="0.717"/><stop offset="0.17" stop-color="#ff5c42" stop-opacity="0.630"/><stop offset="0.33" stop-color="#ff5c42" stop-opacity="0.439"/><stop offset="0.50" stop-color="#ff5c42" stop-opacity="0.233"/><stop offset="0.67" stop-color="#ff5c42" stop-opacity="0.095"/><stop offset="0.83" stop-color="#ff5c42" stop-opacity="0.032"/><stop offset="1.00" stop-color="#ff5c42" stop-opacity="0.008"/></radialGradient><radialGradient id="nr10"><stop offset="0.00" stop-color="#ff2805" stop-opacity="1.000"/><stop offset="0.17" stop-color="#ff2805" stop-opacity="0.878"/><stop offset="0.33" stop-color="#ff2805" stop-opacity="0.613"/><stop offset="0.50" stop-color="#ff2805" stop-opacity="0.325"/><stop offset="0.67" stop-color="#ff2805" stop-opacity="0.133"/><stop offset="0.83" stop-color="#ff2805" stop-opacity="0.045"/><stop offset="1.00" stop-color="#ff2805" stop-opacity="0.011"/></radialGradient><radialGradient id="nr11"><stop offset="0.00" stop-color="#d91f00" stop-opacity="0.734"/><stop offset="0.17" stop-color="#d91f00" stop-opacity="0.645"/><stop offset="0.33" stop-color="#d91f00" stop-opacity="0.450"/><stop offset="0.50" stop-color="#d91f00" stop-opacity="0.238"/><stop offset="0.67" stop-color="#d91f00" stop-opacity="0.097"/><stop offset="0.83" stop-color="#d91f00" stop-opacity="0.033"/><stop offset="1.00" stop-color="#d91f00" stop-opacity="0.008"/></radialGradient></defs>',
  body: '<rect x="-400" y="-400" width="2800" height="2000" fill="#ff2400"/><ellipse cx="848" cy="338" rx="624" ry="2090" fill="url(#nr1)"/><ellipse cx="510" cy="517" rx="854" ry="548" fill="url(#nr2)"/><ellipse cx="625" cy="275" rx="552" ry="686" fill="url(#nr3)"/><ellipse cx="1766" cy="1152" rx="1385" ry="1867" fill="url(#nr4)"/><ellipse cx="1071" cy="298" rx="1868" ry="1524" fill="url(#nr5)"/><ellipse cx="997" cy="193" rx="906" ry="1242" fill="url(#nr6)"/><clipPath id="nrcTL"><circle cx="-78.8" cy="123.5" r="274.0"/></clipPath><g clip-path="url(#nrcTL)"><rect x="-352.8" y="-150.5" width="548.0" height="548.0" fill="#ff4729"/><ellipse cx="89" cy="270" rx="248" ry="127" fill="url(#nr7)"/><ellipse cx="105" cy="353" rx="372" ry="185" fill="url(#nr8)"/></g><clipPath id="nrcBOT"><circle cx="956.7" cy="1138.0" r="356.6"/></clipPath><g clip-path="url(#nrcBOT)"><rect x="600.1" y="781.4" width="713.2" height="713.2" fill="#fd2d0b"/><ellipse cx="1057" cy="1097" rx="641" ry="522" fill="url(#nr9)"/><ellipse cx="773" cy="919" rx="412" ry="323" fill="url(#nr10)"/><ellipse cx="909" cy="1067" rx="285" ry="272" fill="url(#nr11)"/></g>',
  w: 1936,
};

/** 写真の表示サイズ(mm)と位置(0〜1)。円を必ず覆う（object-fit: cover 相当 × 拡大率） */
function photoBox() {
  const r = PHOTO.r, a = state.photoAspect || 1, z = state.photoPos.z || 1;
  const w = (a >= 1 ? r * 2 * a : r * 2) * z, h = (a >= 1 ? r * 2 : r * 2 / a) * z;
  const cl = v => Math.min(1, Math.max(0, v));
  return { w, h, r, px: cl(state.photoPos.x), py: cl(state.photoPos.y) };
}

/* --- 写真（白いリング + 円形の写真。未設定のときは人型のプレースホルダー） --- */
function photoSVG() {
  const cx = PHOTO.cx, cy = PHOTO.cy, R = PHOTO.ring, r = PHOTO.r;
  let o = `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(R)}" fill="#FFFFFF"/>` +
    `<clipPath id="nc-ph"><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"/></clipPath>` +
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${C.photoBg}"/>`;
  if (state.photo) {
    const d = photoBox();
    o += `<image href="${state.photo}" x="${n(cx - r - d.px * (d.w - 2 * r))}" y="${n(cy - r - d.py * (d.h - 2 * r))}"` +
      ` width="${n(d.w)}" height="${n(d.h)}" preserveAspectRatio="none" clip-path="url(#nc-ph)"/>`;
  } else {
    o += `<g clip-path="url(#nc-ph)" fill="#C3C5C9">` +
      `<circle cx="${n(cx)}" cy="${n(cy - r * 0.18)}" r="${n(r * 0.34)}"/>` +
      `<ellipse cx="${n(cx)}" cy="${n(cy + r * 0.98)}" rx="${n(r * 0.66)}" ry="${n(r * 0.6)}"/></g>`;
  }
  return o;
}

/** 指定の幅(mm)にぴったり収まる級数を求める（字送りは級数の割合 lsEm） */
function sizeForWidth(str, w, weight, lsEm, fam) {
  const perEm = textW(str, 100, weight, 100 * lsEm, fam) / 100;
  return w / perEm;
}

/* --- 裏面（デザイン固定。位置・寸法は入稿データの実測） --- */
function renderBack() {
  const bc = BACK_CIRCLE;
  let o;
  if (state.usePhoto) {
    o = BACK_BG.defs + `<g transform="translate(${BLEED_SHIFT} ${BLEED_SHIFT}) scale(${BG_PX})">${BACK_BG.body}</g>` +
      `<circle cx="${bc.cx}" cy="${bc.cy}" r="${bc.ring}" fill="#FFFFFF"/>` +
      `<circle cx="${bc.cx}" cy="${bc.cy}" r="${bc.inner}" fill="${C.circle}"/>`;
  } else {
    const S = DW / BACK_BG_NP.w;
    o = BACK_BG_NP.defs + `<g transform="scale(${n(S * 1000) / 1000})">${BACK_BG_NP.body}</g>` +
      `<circle cx="${bc.cx}" cy="${bc.cy}" r="${bc.ring}" fill="#FFFFFF"/>`;
  }
  o += svgImage(ART.type, BACK.mark.x, BACK.mark.y, BACK.mark.w);
  // 見出し・本文は左端とベースラインを入稿データの位置に置き、幅が入稿データと同じになるよう字送りを決める
  const fitLS = (str, w, size, weight, fam) => (w - textW(str, size, weight, 0, fam)) / [...str].length;
  const hs = BACK.head.pt * PT;
  o += svgText(BACK_HEAD, BACK.head.x, BACK.head.y,
    { size: hs, weight: 500, fill: C.backTx, ls: fitLS(BACK_HEAD, BACK.head.w, hs, 500, FONT.backHead), family: FONT.backHead });
  const bs = BACK.bodyPt * PT;
  BACK_BODY.forEach((t, i) => {
    const b = BACK.body[i];
    o += svgText(t, b.x, b.y, { size: bs, weight: 700, fill: C.backTx, ls: fitLS(t, b.w, bs, 700, FONT.backBody), family: FONT.backBody });
  });
  const q = BACK.qr;
  o += svgImage(ART.qr, q.cx - q.w / 2, q.cy - q.w / 2, q.w);
  return o;
}

/* --- おもて --- */
function renderFront(lang) {
  let o;
  if (state.usePhoto) {
    o = FRONT_BG.defs +
      `<rect x="-20" y="-20" width="${DW + 40}" height="${DH + 40}" fill="${C.bg}"/>` +
      `<g transform="translate(${BLEED_SHIFT} ${BLEED_SHIFT}) scale(${BG_PX})">${FRONT_BG.red}${FRONT_BG.circles}</g>` +
      photoSVG();
  } else {
    const fs = DW / FRONT_BG_NP.w;
    o = FRONT_BG_NP.defs +
      `<rect x="-20" y="-20" width="${DW + 40}" height="${DH + 40}" fill="${C.bg}"/>` +
      `<g transform="scale(${n(fs * 1000) / 1000})">${FRONT_BG_NP.red}${FRONT_BG_NP.circles}</g>`;
  }

  const topX = LY.topX, topW = DW - topX - LY.topRight;
  const footX = LY.footX, footW = DW - footX - LY.footRight;
  let topY = LY.topY;

  /* 収まるまで自動で詰める（重なり防止） */
  let sc = 1, lead, body, foot, fits = false;
  for (let k = 0; k < 18; k++) {
    lead = leadLines(lang, sc, topW);
    body = bodyLines(lang, sc, topW);
    foot = footLines(lang, sc, footW);
    // 行が増えたら上段ごと上へ伸ばす（氏名は縮めない）。限界を超えるときだけ他の文字を詰める
    const h = stackH(lead) + stackH(body);
    topY = Math.min(LY.topY, LY.topMax - h);
    if (topY >= LY.topYMin && LY.footBottom - stackH(foot) >= LY.footMin) { fits = true; break; }
    sc *= 0.96;
  }
  overflow = !fits;
  o += drawLines(lead, topX, topY, topW);
  o += drawLines(body, topX, topY + stackH(lead), topW);
  o += drawLines(foot, footX, LY.footBottom - stackH(foot), footW);
  return o;
}

function designXform() {
  const g = geom();
  const s = Math.max(g.w / DW, g.h / DH);
  return { s, ox: (g.w - DW * s) / 2, oy: (g.h - DH * s) / 2 };
}

function renderFace(lang, side) {
  const g = geom();
  overflow = false;
  const inner = side === 'back' ? renderBack() : renderFront(lang);
  // 用紙が 91 × 55mm 以外のときは、デザインを拡縮して中央に置く（はみ出しは裁ち落とし）
  const { s, ox, oy } = designXform();
  return `<g transform="translate(${n(ox)} ${n(oy)}) scale(${n(s)})">${inner}</g>`;
}

function geom() {
  const s = SIZES[state.size] || SIZES.jp91;
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
  ['fields', 'size', 'card-wrap', 'guides', 'marks',
   'zoom-in', 'zoom-out', 'zoom-out-label', 'side-back', 'warn', 'export-modal',
   'btn-export', 'btn-save', 'btn-list', 'list-modal', 'card-list',
   'confirm-modal',
   'stage', 'btn-settings', 'settings-pop'].forEach(id => el[id] = $('#' + id));
}

/* --- 要素リスト（表示/非表示のみ） --- */
function fieldRow(key) {
  const d = DEFS[key], f = state.fields[key];
  const li = document.createElement('li');
  li.className = 'fi' + (f.enabled ? '' : ' is-off') + (key === 'tel' ? ' fi--border-top' : '');
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
    input(d.label, 'v', f.v, key === 'email' ? 'email' : (/^(tel|mobile|postal)$/.test(key) ? 'tel' : 'text'));
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
  if (key === 'address') {
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = '「/」を入れると、その位置で改行されます。「/」自体は印字されません。';
    bodyEl.appendChild(hint);
  }
  return li;
}

/* 写真の行（アップロード / 外す）。長辺 1600px に縮小して保持する（拡大しても 350ppi を保ちやすくする） */
function photoRow() {
  const li = document.createElement('li');
  li.className = 'fi fi-photo';
  li.innerHTML = `
    <div class="fi__head">
      <label class="sw"><input type="checkbox" id="photo-on" ${state.usePhoto ? 'checked' : ''}><span></span></label>
      <span class="fi__label">写真</span>
    </div>
    <div class="fi__body"${state.usePhoto ? '' : ' hidden'}><div class="photo-row">
      <button type="button" class="btn btn--ghost btn--sm" id="photo-pick">${state.photo ? '写真を差し替える' : '写真を選ぶ'}</button>
      <input type="file" id="photo-file" accept="image/*" hidden>
    </div>${state.photo ? `
    <div class="photo-adj">
      <label><span>拡大</span><input type="range" data-pp="z" min="1" max="3" step="0.01" value="${state.photoPos.z}" aria-label="写真の拡大"></label>
      <label><span>左右</span><input type="range" data-pp="x" min="0" max="1" step="0.01" value="${state.photoPos.x}" aria-label="写真の左右位置"></label>
      <label><span>上下</span><input type="range" data-pp="y" min="0" max="1" step="0.01" value="${state.photoPos.y}" aria-label="写真の上下位置"></label>
      <p class="hint">プレビュー上の写真をドラッグしても動かせます。</p>
    </div>` : ''}</div>`;
  return li;
}
function loadPhoto(file) {
  const rd = new FileReader();
  rd.onload = () => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1600 / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      state.photo = cv.toDataURL('image/jpeg', 0.9);
      state.photoAspect = cv.width / cv.height;
      state.photoPos = { x: 0.5, y: 0, z: 1 };
      renderFields(); update();
    };
    img.src = rd.result;
  };
  rd.readAsDataURL(file);
}
function renderFields() {
  el.fields.innerHTML = '';
  el.fields.appendChild(photoRow());
  for (const k of KEYS) {
    if (k === 'reading' && state.lang === 'en') continue;   // 英語表記ではローマ字表記欄は不要
    el.fields.appendChild(fieldRow(k));
    if (k === 'email') el.fields.appendChild(iconsToggleRow());   // 電話番号上〜メール下の枠内、下線の上に配置
  }
}

/* 「連絡先にアイコンを表示する」の行。#fields 内で毎回作り直されるため、
   チェック状態は state.showIcons から復元し、変更は #fields への委譲（bindFields）で拾う */
function iconsToggleRow() {
  const li = document.createElement('li');
  li.className = 'fi-icons-row';
  li.innerHTML = `<label class="check"><input type="checkbox" id="show-icons"${state.showIcons ? ' checked' : ''}><span>連絡先にアイコンを表示する</span></label>`;
  return li;
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

/**
 * 電話番号（数字だけの入力）に自動でハイフンを入れる（簡易版）。
 * 携帯電話・フリーダイヤル・市外局番2桁（03/06）・一般加入電話の代表的な
 * 桁区切りに対応する。既にハイフン等が含まれる入力には手を加えない。
 */
function formatPhoneJP(digits) {
  const d = digits.slice(0, 11);
  const join = (...parts) => parts.filter(Boolean).join('-');
  let m;
  if ((m = d.match(/^(0120)(\d{0,3})(\d{0,3})$/))) return join(m[1], m[2], m[3]);          // フリーダイヤル 0120-xxx-xxx
  if ((m = d.match(/^(0800)(\d{0,3})(\d{0,4})$/))) return join(m[1], m[2], m[3]);          // 0800-xxx-xxxx（11桁）
  if ((m = d.match(/^(0[5789]0)(\d{0,4})(\d{0,4})$/))) return join(m[1], m[2], m[3]);      // 携帯・PHS・IP電話 0x0-xxxx-xxxx（11桁）
  if ((m = d.match(/^(0[36])(\d{0,4})(\d{0,4})$/))) return join(m[1], m[2], m[3]);
  if ((m = d.match(/^(0\d{0,2})(\d{0,3})(\d{0,4})$/))) return join(m[1], m[2], m[3]);
  return d;
}

/** 郵便番号（数字だけの入力）に自動でハイフンを入れる（3桁-4桁）。 */
function formatPostalJP(digits) {
  const d = digits.slice(0, 7);
  return d.length > 3 ? d.slice(0, 3) + '-' + d.slice(3) : d;
}

function bindFields() {
  el.fields.addEventListener('click', e => {
    if (e.target.id === 'photo-pick') $('#photo-file').click();
  });
  el.fields.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'photo-on') { state.usePhoto = t.checked; renderFields(); update(); return; }
    if (t.dataset.pp) return;
    if (t.id === 'photo-file') { if (t.files[0]) loadPhoto(t.files[0]); return; }
    if (t.id === 'show-icons') { state.showIcons = t.checked; update(); return; }
    if (t.dataset.act !== 'toggle') return;
    const li = t.closest('.fi');
    state.fields[li.dataset.key].enabled = t.checked;
    li.classList.toggle('is-off', !t.checked);
    update();
  });
  el.fields.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.pp) { state.photoPos[t.dataset.pp] = parseFloat(t.value); update(); return; }
    if (!t.dataset.k) return;
    const li = t.closest('.fi');
    const key = li.dataset.key;
    const f = state.fields[key];
    let val = t.value;
    if (t.type === 'tel') {
      // 数字だけ入力した場合にも、自動でハイフンを入れて表示する（電話番号・郵便番号）
      const digits = val.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/[^\d]/g, '');   // 全角数字も受け付ける
      if (digits) {
        val = key === 'postal' ? formatPostalJP(digits) : formatPhoneJP(digits);
        if (val !== t.value) {
          t.value = val;
          t.setSelectionRange(val.length, val.length);   // カーソルを末尾に保つ
        }
      }
    }
    f[t.dataset.k] = val;
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
/* 写真の縦横比は保存値に頼らず、画像そのものから測り直す（古い保存データや差し替え後のずれ防止） */
let _aspectOf = '';
function syncPhotoAspect() {
  if (!state.photo || _aspectOf === state.photo) return;
  _aspectOf = state.photo;
  const src = state.photo, im = new Image();
  im.onload = () => {
    if (state.photo !== src || !im.height) return;
    state.photoAspect = im.width / im.height;
    state.photoW = im.width;
    update();
  };
  im.src = src;
}
function update() {
  syncPhotoAspect();
  const svg = buildSVG(state.side, { guides: state.guides, marks: state.marks });
  el['card-wrap'].innerHTML = svg;
  const g = geom();
  const pad = g.bleed + (state.marks ? MARKM : 0);
  const px = (g.w + pad * 2) * 3.7795 * state.zoom;   // mm → px（96dpi基準）
  const node = el['card-wrap'].firstElementChild;
  node.setAttribute('width', Math.round(px));
  node.setAttribute('height', Math.round(px * (g.h + pad * 2) / (g.w + pad * 2)));

  const msgs = [];
  if (overflow) msgs.push('文字量がカードに収まりきっていません（6pt 未満には縮めません）。表示する要素を減らしてください。');
  if (state.usePhoto && state.photo && state.photoW) {
    const ppi = state.photoW / (photoBox().w / 25.4);
    if (ppi < 300) msgs.push(`写真の解像度が低めです（原寸で約 ${Math.round(ppi)}ppi）。入稿規定は 350〜400ppi です。拡大を下げるか、より大きな写真を使ってください。`);
  }
  el.warn.hidden = !msgs.length;
  el.warn.textContent = msgs.join(' ');
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
const sides = () => ['front', 'back'];   // 常に両面を書き出す（「裏面も書き出す」の切替は廃止）

/**
 * 1面をキャンバスに描く（文字はキャンバスの fillText で描く）。
 * SVG を画像として読み込むと Webフォントが使えず別の書体に置き換わるため、
 * 文字だけ SVG から抜き出し、読み込み済みのフォントで直接描き込む。
 * @param {'front'|'back'} side
 * @param {{dpi:number, marks:boolean}} o
 */
async function renderCanvas(side, { dpi, marks }) {
  const g = geom();
  const pad = g.bleed + (marks ? MARKM : 0);
  const mmW = g.w + pad * 2, mmH = g.h + pad * 2;
  const ppm = dpi / 25.4;   // 1mm あたりのピクセル数
  const doc = new DOMParser().parseFromString(buildSVG(side, { guides: false, marks }), 'image/svg+xml');
  const texts = [...doc.querySelectorAll('text')].map(t => ({
    t: t.textContent, x: +t.getAttribute('x'), y: +t.getAttribute('y'),
    size: +t.getAttribute('font-size'), weight: +(t.getAttribute('font-weight') || 400),
    ls: +(t.getAttribute('letter-spacing') || 0), fill: t.getAttribute('fill'),
    anchor: t.getAttribute('text-anchor') || 'start',
    family: t.getAttribute('font-family') || FONT.front,
  }));
  doc.querySelectorAll('text').forEach(t => t.remove());
  const svgText = new XMLSerializer().serializeToString(doc.documentElement);
  // 使う書体を読み込んでおく
  await Promise.all([...new Set(texts.map(t => `${t.weight} 20px ${t.family}|${t.t}`))]
    .map(k => { const [f, txt] = k.split('|'); return document.fonts.load(f, txt).catch(() => {}); }));
  const img = await new Promise((ok, ng) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => ng(new Error('SVGの読み込みに失敗しました'));
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
  });
  const cv = document.createElement('canvas');
  cv.width = Math.round(mmW * ppm); cv.height = Math.round(mmH * ppm);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(img, 0, 0, cv.width, cv.height);
  const hasLS = 'letterSpacing' in ctx;
  for (const t of texts) {
    ctx.font = `${t.weight} ${t.size * ppm}px ${t.family}`;
    ctx.fillStyle = t.fill;
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    const ls = t.ls * ppm;
    let w;
    if (hasLS) { ctx.letterSpacing = ls + 'px'; w = ctx.measureText(t.t).width; }
    else w = ctx.measureText(t.t).width + ls * [...t.t].length;
    let x = (t.x + pad) * ppm;
    if (t.anchor === 'middle') x -= w / 2;
    const y = (t.y + pad) * ppm;
    if (hasLS) ctx.fillText(t.t, x, y);
    else { for (const ch of t.t) { ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + ls; } }
  }
  if (hasLS) ctx.letterSpacing = '0px';
  return { cv, mmW, mmH };
}

/** PNG / JPEG 共通のラスター書き出し */
async function exportRaster(mime, ext, quality) {
  try {
    for (const side of sides()) {
      const { cv } = await renderCanvas(side, { dpi: 350, marks: state.marks });
      const b = await new Promise(r => cv.toBlob(r, mime, quality));
      download(b, `${baseName()}_${side === 'front' ? 'omote' : 'ura'}_350dpi.${ext}`);
    }
  } catch (e) { alert(ext.toUpperCase() + 'の書き出しに失敗しました。'); }
}
const exportPNG = () => exportRaster('image/png', 'png');

/* ============================================================
   CMYK PDF（入稿用）
   各面を 600dpi の画像にして CMYK に変換し、PDF に埋め込む。
   ・ページは仕上がり + 塗り足し 3mm（91×55mm なら 97×61mm）。トンボは付けない
   ・TrimBox で仕上がり位置を示す
   ・文字は画像になるのでアウトライン化の必要がない
   ・RGB→CMYK は ICC プロファイルを使わない簡易変換（灰色・黒は K 版のみになる）
   ============================================================ */
function rgbaToCMYK(px) {
  const out = new Uint8Array((px.length / 4) * 4);
  for (let i = 0, o = 0; i < px.length; i += 4, o += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const mx = Math.max(r, g, b);
    if (mx === 0) { out[o + 3] = 255; continue; }       // 純黒は K のみ
    const k = 255 - mx, d = mx;                          // d = 255 - k
    out[o]     = Math.round(255 * (d - r) / d);
    out[o + 1] = Math.round(255 * (d - g) / d);
    out[o + 2] = Math.round(255 * (d - b) / d);
    out[o + 3] = k;
  }
  return out;
}
async function deflate(bytes) {
  if (typeof CompressionStream === 'undefined') return null;
  const cs = new CompressionStream('deflate');
  const w = cs.writable.getWriter();
  w.write(bytes); w.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}
async function buildCMYKPdf(pages) {
  const enc = new TextEncoder();
  const chunks = []; let len = 0; const offs = [];
  const put = d => { const u = typeof d === 'string' ? enc.encode(d) : d; chunks.push(u); len += u.length; };
  const obj = (id, body) => { offs[id] = len; put(`${id} 0 obj\n${body}\nendobj\n`); };
  const MM = 72 / 25.4;
  put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  const bleed = BLEED * MM;
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i], id = 3 + i * 3;
    const W = p.mmW * MM, H = p.mmH * MM, f = v => v.toFixed(3);
    obj(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(W)} ${f(H)}] /BleedBox [0 0 ${f(W)} ${f(H)}]` +
      ` /TrimBox [${f(bleed)} ${f(bleed)} ${f(W - bleed)} ${f(H - bleed)}]` +
      ` /Resources << /XObject << /Im0 ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`);
    const body = p.data;
    offs[id + 1] = len;
    put(`${id + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceCMYK` +
      ` /BitsPerComponent 8${p.packed ? ' /Filter /FlateDecode' : ''} /Length ${body.length} >>\nstream\n`);
    put(body); put('\nendstream\nendobj\n');
    const cs = `q ${f(W)} 0 0 ${f(H)} 0 0 cm /Im0 Do Q`;
    obj(id + 2, `<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`);
  }
  const n = 3 + pages.length * 3;
  const xref = len;
  let x = `xref\n0 ${n}\n0000000000 65535 f \n`;
  for (let i = 1; i < n; i++) x += String(offs[i] ?? 0).padStart(10, '0') + ' 00000 n \n';
  put(x + `trailer\n<< /Size ${n} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks, { type: 'application/pdf' });
}
async function exportCMYKPDF() {
  const btn = $('#ex-cmyk'), label = btn.textContent;
  btn.disabled = true; btn.textContent = '作成中…';
  try {
    const pages = [];
    for (const side of sides()) {
      const { cv, mmW, mmH } = await renderCanvas(side, { dpi: 600, marks: false });
      const px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      const raw = rgbaToCMYK(px);
      const packed = await deflate(raw);
      pages.push({ w: cv.width, h: cv.height, mmW, mmH, data: packed || raw, packed: !!packed });
    }
    download(await buildCMYKPdf(pages), `${baseName()}_CMYK.pdf`);
  } catch (e) {
    console.error(e);
    alert('CMYK PDFの書き出しに失敗しました。');
  } finally { btn.disabled = false; btn.textContent = label; }
}

/* ---------- 編集中の状態（リロードしても続きから） ---------- */
const KEY = 'nc-builder-v4';
function snapshot() {
  const { size, lang, showIcons, usePhoto, photo, photoAspect, photoPos, fields } = state;
  return { size, lang, showIcons, usePhoto, photo, photoAspect, photoPos, fields };
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

  el.size.value = state.size;
  syncSeg('#seg-lang', 'lang', state.lang);
  renderFields();   // #show-icons はここで再生成され、state.showIcons から復元される
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

/** 黒いQR画像を指定色に染め、白地を透明にする */
function tintQR(b64, hex) {
  const im = new Image();
  im.onload = () => {
    const cv = document.createElement('canvas');
    cv.width = im.width; cv.height = im.height;
    const cx = cv.getContext('2d');
    cx.drawImage(im, 0, 0);
    const d = cx.getImageData(0, 0, cv.width, cv.height), px = d.data;
    const t = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    for (let i = 0; i < px.length; i += 4) {
      const lum = (px[i] + px[i + 1] + px[i + 2]) / 765;
      // 明るい部分（QRの白地）は透明にして、背景の円の色をそのまま見せる
      for (let c = 0; c < 3; c++) px[i + c] = t[c];
      px[i + 3] = Math.round(px[i + 3] * (1 - lum));
    }
    cx.putImageData(d, 0, 0);
    ART.qr = { href: cv.toDataURL('image/png'), aspect: 1 };
    update();
  };
  im.src = 'data:image/png;base64,' + b64;
}

function init() {
  cacheEls();
  resetFields();
  el.size.value = state.size;

  ART.mark = svgArt(MARK_B64);
  ART.type = svgArt(btoa(atob(LOGOTYPE_B64).replace(/fill="black"/g, 'fill="'+C.backMark+'"')));   // 裏面は赤地なので白抜き
  ART.qr   = { href: 'data:image/png;base64,' + QR_B64, aspect: 1 };
  tintQR(QR_B64, C.qr);   // QR は入稿データのグレーに染める（読み込み後に再描画）

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

  // 「連絡先にアイコンを表示する」は #fields 内で再生成されるため、変更は bindFields() 側の委譲で拾う

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

  // 写真をプレビュー上でドラッグして位置を動かす
  let drag = null;
  el['card-wrap'].addEventListener('pointerdown', e => {
    if (state.side !== 'front' || !state.usePhoto || !state.photo) return;
    const svg = el['card-wrap'].firstElementChild, rc = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal, mm = vb.width / rc.width;
    const { s, ox, oy } = designXform();
    const dx = ((vb.x + (e.clientX - rc.left) * mm) - ox) / s - PHOTO.cx;
    const dy = ((vb.y + (e.clientY - rc.top) * mm) - oy) / s - PHOTO.cy;
    if (Math.hypot(dx, dy) > PHOTO.r) return;
    drag = { x: e.clientX, y: e.clientY, px: state.photoPos.x, py: state.photoPos.y, k: mm / s };
    el['card-wrap'].setPointerCapture(e.pointerId);
    el['card-wrap'].style.cursor = 'grabbing';
  });
  el['card-wrap'].addEventListener('pointermove', e => {
    if (!drag) return;
    const d = photoBox();
    // ドラッグした向きに写真が動く = 位置の割合は逆向きに増減
    if (d.w > 2 * d.r) state.photoPos.x = Math.min(1, Math.max(0, drag.px - (e.clientX - drag.x) * drag.k / (d.w - 2 * d.r)));
    if (d.h > 2 * d.r) state.photoPos.y = Math.min(1, Math.max(0, drag.py - (e.clientY - drag.y) * drag.k / (d.h - 2 * d.r)));
    $$('[data-pp="x"],[data-pp="y"]').forEach(i => { i.value = state.photoPos[i.dataset.pp]; });
    update();
  });
  const endDrag = () => { drag = null; el['card-wrap'].style.cursor = ''; };
  el['card-wrap'].addEventListener('pointerup', endDrag);
  el['card-wrap'].addEventListener('pointercancel', endDrag);
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
  $('#ex-cmyk').addEventListener('click', exportCMYKPDF);
  $('#ex-png').addEventListener('click', exportPNG);

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
