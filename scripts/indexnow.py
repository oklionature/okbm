#!/usr/bin/env python3
"""바뀐 검색용 페이지 주소를 IndexNow로 네이버에 알린다.

    python3 scripts/indexnow.py <git 범위>     # 예: HEAD~1..HEAD
    python3 scripts/indexnow.py --all          # 사이트맵의 주소 전부

열쇠는 저장소 맨 위의 <32자리>.txt 파일(내용 = 파일 이름). 구글은 IndexNow를 받지 않아 사이트맵으로만 찾는다.
"""
import glob
import json
import os
import re
import subprocess
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://romanticroute.kr"
ENDPOINT = "https://searchadvisor.naver.com/indexnow"
PAGE_RE = re.compile(r"^(spot|theme|region|city|stats|guide)/(?:[^/]+/)?index\.html$")


def key():
    for p in glob.glob(os.path.join(ROOT, "*.txt")):
        name = os.path.basename(p)[:-4]
        if re.fullmatch(r"[0-9a-f]{32}", name) and open(p).read().strip() == name:
            return name
    sys.exit("IndexNow 열쇠 파일이 없어요")


def urls_from_range(rng):
    out = subprocess.run(["git", "diff", "--name-only", "--diff-filter=AM", rng],
                         cwd=ROOT, capture_output=True, text=True, check=True).stdout.split()
    urls = [f"{SITE}/{p[:-len('index.html')]}" for p in out if PAGE_RE.match(p)]
    if "sitemap.xml" in out:
        urls.append(f"{SITE}/sitemap.xml")
    return urls


def urls_all():
    xml = open(os.path.join(ROOT, "sitemap.xml"), encoding="utf-8").read()
    return re.findall(r"<loc>([^<]+)</loc>", xml)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    urls = urls_all() if sys.argv[1] == "--all" else urls_from_range(sys.argv[1])
    if not urls:
        print("알릴 주소 없음")
        return
    k = key()
    for i in range(0, len(urls), 10000):
        body = json.dumps({"host": "romanticroute.kr", "key": k, "keyLocation": f"{SITE}/{k}.txt",
                           "urlList": urls[i:i + 10000]}).encode()
        req = urllib.request.Request(ENDPOINT, data=body, headers={"Content-Type": "application/json; charset=utf-8"})
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                print(f"IndexNow {res.status}: {len(urls[i:i + 10000])}개")
        except urllib.error.HTTPError as e:
            print(f"IndexNow 실패 {e.code}: {e.read()[:200]!r}")


if __name__ == "__main__":
    main()
