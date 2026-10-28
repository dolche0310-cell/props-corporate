// お問い合わせフォーム → SES で CONTACT_TO 宛にメール送信（DBなし）
// 環境変数: CONTACT_TO(カンマ区切り) / CONTACT_FROM / ALLOWED_ORIGINS(カンマ区切り)
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const ses = new SESv2Client({});

const reply = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const oneLine = (s) => String(s).replace(/[\r\n]+/g, ' ');
const clip = (v, n) => String(v ?? '').trim().slice(0, n);
const list = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);

export const handler = async (event) => {
  const origin = event.headers?.origin || '';
  const allowed = list(process.env.ALLOWED_ORIGINS);
  if (allowed.length && !allowed.includes(origin)) return reply(403, { ok: false, error: 'forbidden' });

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch {
    return reply(400, { ok: false, error: 'invalid_request' });
  }

  // ハニーポット: bot が埋める欄。成功を装って破棄する
  if (data.website) return reply(200, { ok: true });

  const name = clip(data.name, 100);
  const company = clip(data.company, 100);
  const email = clip(data.email, 200);
  const tel = clip(data.tel, 50);
  const message = clip(data.message, 5000);

  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return reply(422, { ok: false, error: 'validation' });
  }

  const to = list(process.env.CONTACT_TO);
  if (!to.length || !process.env.CONTACT_FROM) return reply(500, { ok: false, error: 'not_configured' });

  const rows = [
    ['お名前', name],
    ['会社名', company || '（未入力）'],
    ['メールアドレス', email],
    ['電話番号', tel || '（未入力）'],
  ];
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\n【お問い合わせ内容】\n${message}\n`;
  const html =
    `<table style="border-collapse:collapse">` +
    rows.map(([k, v]) => `<tr><th align="left" style="padding:4px 12px 4px 0">${k}</th><td>${esc(v)}</td></tr>`).join('') +
    `</table><h3>お問い合わせ内容</h3><p style="white-space:pre-wrap">${esc(message)}</p>`;

  try {
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: process.env.CONTACT_FROM,
        Destination: { ToAddresses: to },
        ReplyToAddresses: [oneLine(email)],
        Content: {
          Simple: {
            Subject: { Data: oneLine(`【お問い合わせ】${name} 様${company ? `（${company}）` : ''}`), Charset: 'UTF-8' },
            Body: { Text: { Data: text, Charset: 'UTF-8' }, Html: { Data: html, Charset: 'UTF-8' } },
          },
        },
      })
    );
  } catch (e) {
    console.error('ses_send_failed', e.name);
    return reply(502, { ok: false, error: 'send_failed' });
  }
  return reply(200, { ok: true });
};
