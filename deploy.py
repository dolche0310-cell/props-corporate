#!/usr/bin/env python3
"""Netlify へデプロイする(CLI不要・保存済みトークンを使用)

  python3 deploy.py            # 本番デプロイ
  python3 deploy.py --draft    # ドラフト(プレビューURLのみ)
"""
import hashlib, json, os, sys, time, urllib.error, urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE_NAME = "miai-corporate"
EXCLUDE_DIRS = {".claude", ".git", "__pycache__", "node_modules",
                # 作業用の素材フォルダは配信しない
                "LOGOMARK"}
EXCLUDE_FILES = {"deploy.py", ".DS_Store",
                 # hub から参照していない旧ページは配信しない
                 "fire.html", "old-index.html", "v2.html",
                 "icon-layer-animation.html", "logo-animation.html"}

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


def collect():
    files = {}
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fn in filenames:
            if fn in EXCLUDE_FILES:
                continue
            full = os.path.join(dirpath, fn)
            rel = "/" + os.path.relpath(full, ROOT).replace(os.sep, "/")
            with open(full, "rb") as f:
                blob = f.read()
            files[rel] = (hashlib.sha1(blob).hexdigest(), full, len(blob))
    return files


def main():
    draft = "--draft" in sys.argv
    sites = req("GET", "/sites")
    site = next((s for s in sites if s["name"] == SITE_NAME), None)
    if site is None:
        print("サイトを新規作成:", SITE_NAME)
        site = req("POST", "/sites", {"name": SITE_NAME})
    sid = site["id"]

    files = collect()
    total_mb = sum(v[2] for v in files.values()) / 1024 / 1024
    print(f"対象 {len(files)} ファイル / {total_mb:.1f} MB")

    payload = {"files": {k: v[0] for k, v in files.items()}, "draft": draft}
    dep = req("POST", f"/sites/{sid}/deploys", payload)
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

    for _ in range(120):
        d = req("GET", f"/deploys/{dep['id']}")
        if d["state"] in ("ready", "error"):
            break
        time.sleep(2)
    print("state:", d["state"])
    print("URL  :", d.get("deploy_ssl_url") or d.get("ssl_url"))
    if not draft:
        print("本番 :", site.get("ssl_url") or f"https://{SITE_NAME}.netlify.app")


if __name__ == "__main__":
    main()
