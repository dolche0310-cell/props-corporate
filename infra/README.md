# お問い合わせフォーム送信基盤（API Gateway + Lambda + SES）

フォーム → API Gateway(`POST /contact`) → Lambda(`lambda/index.mjs`) → SES → `contact_to` 宛メール。DBなし。

## 初回セットアップ
1. `cp terraform.tfvars.example terraform.tfvars` で `contact_to`（送信先）と `allowed_origins` を編集
2. `terraform init && terraform apply`
3. 出力 `ses_dkim_cname_tokens` を DNS に CNAME 登録（`<token>._domainkey.props-inc.com` → `<token>.dkim.amazonses.com`）。SES が Verified になるまで待つ
4. SES はサンドボックス初期状態。本番送信には AWS コンソールで「本番アクセス」を申請（サンドボックス中は検証済みアドレス宛のみ送信可）
5. 出力 `contact_endpoint` を、HTML の `<form id="contact-form" data-endpoint="…">` に設定

## 運用
- 送信先の変更: `contact_to` を編集して `terraform apply`（サイト側の変更は不要）
- コード修正: `lambda/index.mjs` を編集して `terraform apply`
