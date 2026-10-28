variable "region" {
  type    = string
  default = "ap-northeast-1"
}

variable "name" {
  type    = string
  default = "miai-corporate-contact"
}

variable "mail_domain" {
  description = "SES で認証する送信元ドメイン"
  type        = string
  default     = "props-inc.com"
}

variable "contact_from" {
  description = "送信元アドレス（mail_domain のアドレス）"
  type        = string
  default     = "noreply@props-inc.com"
}

variable "contact_to" {
  description = "問い合わせの送信先（複数可）。後から差し替える場合はここを変更して apply"
  type        = list(string)
  default     = ["corp@props-inc.com"]
}

variable "allowed_origins" {
  description = "フォームを置くサイトのオリジン（CORS / Origin 検証）"
  type        = list(string)
  default     = ["https://props-inc.com"]
}
