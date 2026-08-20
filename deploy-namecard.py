#!/usr/bin/env python3
"""名刺データ作成ツールだけを単独サイトとして Netlify へデプロイする

  python3 deploy-namecard.py            # 本番デプロイ
  python3 deploy-namecard.py --draft    # ドラフト(プレビューURLのみ)

コーポレートサイト本体(deploy.py / miai-corporate)とは別サイト・別アカウント。
namecard-create/ の中身をサイト直下に置くだけ。既定のロゴマークは app.js に
埋め込んであるので、外部アセットへの依存はない。
"""
import hashlib, json, os, sys, urllib.error, urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE_NAME = "miai-namecard-create"

# 配信するファイル: 配信パス → ローカルの相対パス
FILES = {
    "/index.html": "namecard-create/index.html",
    "/style.css":  "namecard-create/style.css",
    "/app.js":     "namecard-create/app.js",
}

CFG = json.load(open(os.path.expanduser("~/Library/Preferences/netlify/config.json")))
TOKEN = CFG["users"][CFG["userId"]]["auth"]["token"]
API = "https://api.netlify.com/api/v1"


def req(method, path, data=None, raw=None, ctype="application/json"):
    url = path if path.startswith("http") else API + path
    body = raw if raw is not None else (json.dumps(data).encode() if data is not None else None)
    r = urllib.request.Request(url, data=body, method=method)
    r.add_header("Authorization", "Bearer " + TOKEN)
    if body is not None:
        r.add_header("Content-Type", ctype)
    try:
        with urllib.request.urlopen(r) as res:
            t = res.read().decode()
            return json.loads(t) if t else None
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, e.read().decode()[:400], file=sys.stderr)
        raise


def main():
    draft = "--draft" in sys.argv

    files = {}
    for rel, local in FILES.items():
        full = os.path.join(ROOT, local)
        if not os.path.exists(full):
            sys.exit("見つからない: " + local)
        with open(full, "rb") as f:
            blob = f.read()
        files[rel] = (hashlib.sha1(blob).hexdigest(), full, len(blob))

    sites = req("GET", "/sites?per_page=100")
    site = next((s for s in sites if s["name"] == SITE_NAME), None)
    if site is None:
        print("サイトを新規作成:", SITE_NAME)
        site = req("POST", "/sites", {"name": SITE_NAME})
    sid = site["id"]

    kb = sum(v[2] for v in files.values()) / 1024
    print(f"対象 {len(files)} ファイル / {kb:.0f} KB")

    dep = req("POST", f"/sites/{sid}/deploys",
              {"files": {k: v[0] for k, v in files.items()}, "draft": draft})
    need = dep.get("required", [])
    print("アップロード対象:", len(need), "件")

    by_sha = {}
    for rel, (sha, full, _) in files.items():
        by_sha.setdefault(sha, []).append((rel, full))
    for i, sha in enumerate(need, 1):
        for rel, full in by_sha.get(sha, []):
            with open(full, "rb") as f:
                req("PUT", f"/deploys/{dep['id']}/files{rel}",
                    raw=f.read(), ctype="application/octet-stream")
            print(f"  [{i}/{len(need)}] {rel}")

    print("\n" + ("ドラフトURL: " + dep.get("deploy_ssl_url", "")
                  if draft else "公開URL: " + (site.get("ssl_url") or site.get("url"))))


if __name__ == "__main__":
    main()
