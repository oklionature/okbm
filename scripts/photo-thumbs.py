#!/usr/bin/env python3
"""피드 사진의 작은 사본을 R2에 만든다(사진 지도용).

원본  https://pub-….r2.dev/<key>
사본  https://pub-….r2.dev/thumb/s/<key>  (긴 변 256px, 전국·시군 칸)
      https://pub-….r2.dev/thumb/m/<key>  (긴 변 640px, 박지 칸)
사본은 확장자와 상관없이 JPEG이다. 이미 있는 사본은 건너뛴다(공개 주소로 HEAD).
photo-map.js는 사본을 먼저 쓰고, 없으면 기기에서 원본을 줄여 쓴다.

사용(이 Mac, wrangler 로그인 필요):
  python3 -I scripts/photo-thumbs.py            # 없는 사본만 만든다
  python3 -I scripts/photo-thumbs.py --dry-run  # 만들 개수만 센다

wrangler는 저장소 밖(/tmp)에서, 만료된 CLOUDFLARE_API_TOKEN을 뺀 채로 돌린다(.env.local 때문).
"""
import concurrent.futures as cf
import json
import os
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request

SUPABASE_URL = "https://qnumfecythtqtrxeasys.supabase.co"
ANON_KEY = "sb_publishable_PKEidTwAKB7cuXReKSEnKw_VgNvSojA"
PUBLIC_BASE = "https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev"
BUCKET = "romanticroute"
SIZES = {"s": 256, "m": 640}
UA = {"User-Agent": "okbm-photo-thumbs/1"}


def feed_photo_urls():
    q = SUPABASE_URL + "/rest/v1/feeds?select=photos&is_published=eq.true&feed_type=neq.snap&limit=5000"
    req = urllib.request.Request(q, headers={"apikey": ANON_KEY, "Authorization": "Bearer " + ANON_KEY})
    rows = json.load(urllib.request.urlopen(req, timeout=30))
    urls = []
    for r in rows:
        for u in r.get("photos") or []:
            if isinstance(u, str) and u.startswith(PUBLIC_BASE + "/") and "/thumb/" not in u:
                urls.append(u.split("?")[0])
    return sorted(set(urls))


def exists(url):
    try:
        req = urllib.request.Request(url, method="HEAD", headers=UA)
        return urllib.request.urlopen(req, timeout=20).status == 200
    except Exception:
        return False


def wrangler_put(key, path):
    env = {k: v for k, v in os.environ.items() if k != "CLOUDFLARE_API_TOKEN"}
    cmd = ["npx", "-y", "wrangler@4", "r2", "object", "put", f"{BUCKET}/{key}", "--file", path,
           "--content-type", "image/jpeg", "--cache-control", "public, max-age=31536000, immutable", "--remote"]
    res = subprocess.run(cmd, cwd="/tmp", env=env, capture_output=True, text=True, timeout=180)
    if res.returncode != 0:
        raise RuntimeError(res.stderr[-300:] or res.stdout[-300:])


def make(url, work):
    key = urllib.parse.unquote(url[len(PUBLIC_BASE) + 1:])
    todo = [s for s in SIZES if not exists(f"{PUBLIC_BASE}/thumb/{s}/{key}")]
    if not todo:
        return "skip"
    d = tempfile.mkdtemp(dir=work)
    src = os.path.join(d, "src")
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r, open(src, "wb") as f:
        f.write(r.read())
    for s in todo:
        out = os.path.join(d, s + ".jpg")
        subprocess.run(["sips", "-Z", str(SIZES[s]), "-s", "format", "jpeg", "-s", "formatOptions", "72", src, "--out", out],
                       check=True, capture_output=True, timeout=60)
        wrangler_put(f"thumb/{s}/{key}", out)
    return "made " + ",".join(todo)


def main():
    dry = "--dry-run" in sys.argv
    urls = feed_photo_urls()
    print(f"피드 사진 {len(urls)}장")
    if dry:
        missing = [u for u in urls if not exists(f"{PUBLIC_BASE}/thumb/s/{urllib.parse.unquote(u[len(PUBLIC_BASE) + 1:])}")]
        print(f"사본 없는 사진 {len(missing)}장")
        return
    work = tempfile.mkdtemp(prefix="okbm-thumbs-")
    done = {"skip": 0, "made": 0, "fail": 0}
    with cf.ThreadPoolExecutor(max_workers=6) as ex:
        futs = {ex.submit(make, u, work): u for u in urls}
        for i, fu in enumerate(cf.as_completed(futs), 1):
            try:
                r = fu.result()
                done["skip" if r == "skip" else "made"] += 1
            except Exception as e:
                done["fail"] += 1
                print("실패", futs[fu][-60:], str(e)[:160])
            if i % 25 == 0:
                print(f"{i}/{len(urls)}", done, flush=True)
    print("끝", done)


if __name__ == "__main__":
    main()
