output "contact_endpoint" {
  description = "main.js / フォームの data-endpoint に設定する URL"
  value       = "${aws_apigatewayv2_api.api.api_endpoint}/contact"
}

output "ses_dkim_cname_tokens" {
  description = "DNS に CNAME 登録する DKIM トークン: <token>._domainkey.<mail_domain> → <token>.dkim.amazonses.com"
  value       = aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens
}
