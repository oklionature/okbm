#!/usr/bin/env python3
"""박지 좌표가 산불조심기간 입산통제구역에 걸리는지 본다(대표님 11-05, TASK_FIRE_CLOSURE.md).

산림청 '입산 가능 지역 안내'(https://hiking.kworks.co.kr/) 지도의 입산통제구역 그림(타일)을 받아
박지 좌표 둘레를 본다. 결과는 spot_fire_closures(SUPABASE_I1)에 넣는 SQL로 찍는다.
  in   통제구역 안 (박지 둘레 10m가 90% 넘게 덮임)
  edge 경계선 걸침 (둘레 10m 일부가 덮임)
  near 통제구역까지 200m 안
  -    해당 없음

쓰는 법
  새 박지 하나:  python3 scripts/fire-closure-check.py --point 590 37.1885 128.8375 --sql
  철마다 전체:   python3 scripts/fire-closure-check.py --json spots.json --sql > out.sql
                 (spots.json은 [{"id":..,"campsite_lat":..,"campsite_lng":..}, ...])

철이 바뀌면(봄·가을 산림청 공고) 아래 SEASON을 고치고 --json으로 전체를 다시 돈다.
산림청이 지도를 새 철 자료로 바꾼 뒤에 돌려야 한다(지도 첫 화면의 기간 문구로 확인).
파이썬 urllib는 이 서버와 SSL이 안 맞아 curl로 받는다. 바깥 패키지 없이 돈다.
"""
import argparse
import concurrent.futures as cf
import json
import math
import struct
import subprocess
import sys
import zlib
from datetime import datetime, timedelta, timezone

# 지금 철. 산림청·지자체 입산통제 기간(국립공원 탐방로 통제와 다르다)
SEASON = {"name": "2026-가을", "starts_on": "2026-11-01", "ends_on": "2026-12-15"}
SKIP_IDS = {"19"}  # 간월재: 이미 야영금지

TILE_URL = "https://new_timg3.kworks.co.kr:8443/05_overlay/04_crtlmtn/v_fix/L{lv:02d}/R{r:08x}/C{c:08x}.png"
RES = {10: 2.0108373550080434, 12: 0.5027093387520108}  # m/px (지도 SDK lvResolution)
X0, Y0, TILE = 254440.0, 2827543.0, 256  # 타일 원점(UTM-K)과 크기
NEAR_M, EDGE_M = 200, 10


def to_utmk(lat, lng):
    """WGS84 → UTM-K(EPSG:5179). GRS80 횡메르카토르, 원점 38N 127.5E, 축척 0.9996, 가산 (1000000, 2000000)."""
    a, f = 6378137.0, 1 / 298.257222101
    e2 = f * (2 - f)
    ep2 = e2 / (1 - e2)
    k0, lat0, lon0 = 0.9996, math.radians(38), math.radians(127.5)

    def meridian(p):
        return a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * p
                    - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * math.sin(2 * p)
                    + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * math.sin(4 * p)
                    - (35 * e2 ** 3 / 3072) * math.sin(6 * p))

    p, l = math.radians(lat), math.radians(lng)
    n = a / math.sqrt(1 - e2 * math.sin(p) ** 2)
    t = math.tan(p) ** 2
    c = ep2 * math.cos(p) ** 2
    aa = (l - lon0) * math.cos(p)
    x = k0 * n * (aa + (1 - t + c) * aa ** 3 / 6 + (5 - 18 * t + t * t + 72 * c - 58 * ep2) * aa ** 5 / 120)
    y = k0 * (meridian(p) - meridian(lat0) + n * math.tan(p) * (
        aa ** 2 / 2 + (5 - t + 9 * c + 4 * c * c) * aa ** 4 / 24
        + (61 - 58 * t + t * t + 600 * c - 330 * ep2) * aa ** 6 / 720))
    return 1000000.0 + x, 2000000.0 + y


def png_alpha(data):
    """PNG를 풀어 칸마다 불투명도(0~255) 2차원 배열로 돌려준다. 이 타일들(팔레트·RGB·RGBA, 비월 없음)만 다룬다."""
    pos, idat, plte_a = 8, b"", None
    w = h = depth = ctype = 0
    while pos < len(data):
        ln, kind = struct.unpack(">I4s", data[pos:pos + 8])
        chunk = data[pos + 8:pos + 8 + ln]
        if kind == b"IHDR":
            w, h, depth, ctype = struct.unpack(">IIBB", chunk[:10])
        elif kind == b"tRNS":
            plte_a = chunk
        elif kind == b"IDAT":
            idat += chunk
        pos += 12 + ln
    raw = zlib.decompress(idat)
    chans = {3: 1, 2: 3, 6: 4, 0: 1, 4: 2}[ctype]
    bpp = max(1, chans * depth // 8)
    stride = (w * chans * depth + 7) // 8
    rows, prev, i = [], bytearray(stride), 0
    for _ in range(h):
        ft, line = raw[i], bytearray(raw[i + 1:i + 1 + stride])
        i += 1 + stride
        for k in range(stride):
            left = line[k - bpp] if k >= bpp else 0
            up, ul = prev[k], (prev[k - bpp] if k >= bpp else 0)
            if ft == 1:
                line[k] = (line[k] + left) & 255
            elif ft == 2:
                line[k] = (line[k] + up) & 255
            elif ft == 3:
                line[k] = (line[k] + (left + up) // 2) & 255
            elif ft == 4:
                pa, pb, pc = abs(up - ul), abs(left - ul), abs(left + up - 2 * ul)
                line[k] = (line[k] + (left if pa <= pb and pa <= pc else up if pb <= pc else ul)) & 255
        rows.append(line)
        prev = line
    out = []
    for line in rows:
        if ctype == 3:
            per = 8 // depth
            idx = [(line[x // per] >> (8 - depth * (x % per + 1))) & ((1 << depth) - 1) for x in range(w)]
            out.append([plte_a[v] if plte_a and v < len(plte_a) else 255 for v in idx])
        elif ctype == 6:
            out.append(list(line[3::4]))
        elif ctype == 4:
            out.append(list(line[1::2]))
        else:
            out.append([255] * w)
    return out


_tiles = {}


def tile(lv, r, c):
    key = (lv, r, c)
    if key not in _tiles:
        url = TILE_URL.format(lv=lv, r=r, c=c)
        body = subprocess.run(["curl", "-sf", "--max-time", "20", url], capture_output=True).stdout
        _tiles[key] = png_alpha(body) if body else None
    return _tiles[key]


def covered(lv, gx, gy):
    t = tile(lv, int(gy // TILE), int(gx // TILE))
    return bool(t) and t[int(gy) % TILE][int(gx) % TILE] > 40


def check(lat, lng):
    """(level, 통제구역까지 거리 m)"""
    x, y = to_utmk(lat, lng)
    res = RES[10]
    gx, gy, rad = (x - X0) / res, (Y0 - y) / res, NEAR_M / res
    best = None
    for py in range(int(gy - rad), int(gy + rad) + 1):
        for px in range(int(gx - rad), int(gx + rad) + 1):
            d = math.hypot(px + 0.5 - gx, py + 0.5 - gy) * res
            if d <= NEAR_M and (best is None or d < best) and covered(10, px, py):
                best = d
    if best is None:
        return "-", None
    res = RES[12]
    gx, gy, rad = (x - X0) / res, (Y0 - y) / res, EDGE_M / res
    tot = hit = 0
    for py in range(int(gy - rad), int(gy + rad) + 1):
        for px in range(int(gx - rad), int(gx + rad) + 1):
            if (px - gx) ** 2 + (py - gy) ** 2 > rad * rad:
                continue
            tot += 1
            hit += covered(12, px, py)
    share = hit / tot if tot else 0
    return ("in" if share >= 0.9 else "edge" if share > 0.05 else "near"), round(best)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--point", nargs=3, action="append", metavar=("ID", "LAT", "LNG"), default=[])
    ap.add_argument("--json", help="박지 목록 JSON 파일")
    ap.add_argument("--sql", action="store_true", help="spot_fire_closures에 넣는 SQL을 찍는다")
    args = ap.parse_args()

    today = datetime.now(timezone(timedelta(hours=9))).date().isoformat()
    if not (SEASON["starts_on"] <= today <= SEASON["ends_on"]):
        print(f"-- 지금({today})은 {SEASON['name']} 산불조심기간({SEASON['starts_on']} ~ {SEASON['ends_on']})이 아니에요. "
              "새 철 공고가 나왔으면 SEASON을 고치고 다시 돌려요.", file=sys.stderr)
        return 1

    spots = [(str(i).strip(), float(a), float(b)) for i, a, b in args.point]
    if args.json:
        for s in json.load(open(args.json, encoding="utf-8")):
            if s.get("campsite_lat") is not None and s.get("campsite_lng") is not None:
                spots.append((str(s["id"]).strip(), float(s["campsite_lat"]), float(s["campsite_lng"])))
    spots = [s for s in spots if s[0] not in SKIP_IDS]
    if not spots:
        ap.error("--point 또는 --json으로 박지를 주세요")

    with cf.ThreadPoolExecutor(8) as ex:
        results = list(ex.map(lambda s: (s[0], *check(s[1], s[2])), spots))

    for sid, level, dist in results:
        print(f"-- {sid}\t{level}\t{'' if dist is None else str(dist) + 'm'}", file=sys.stderr)
    if not args.sql:
        return 0
    name, start, end = SEASON["name"], SEASON["starts_on"], SEASON["ends_on"]
    hits = [r for r in results if r[1] != "-"]
    clean = [r[0] for r in results if r[1] == "-"]
    if hits:
        rows = ",\n".join(f"  ('{sid}', '{lv}', {dist})" for sid, lv, dist in hits)
        print("INSERT INTO public.spot_fire_closures (spot_id, season, starts_on, ends_on, level, distance_m)\n"
              f"SELECT v.spot_id, '{name}', DATE '{start}', DATE '{end}', v.level, v.distance_m\nFROM (VALUES\n{rows}\n"
              ") AS v(spot_id, level, distance_m)\nWHERE EXISTS (SELECT 1 FROM public.spots s WHERE s.id = v.spot_id)\n"
              "ON CONFLICT (spot_id, season) DO UPDATE SET level = EXCLUDED.level, distance_m = EXCLUDED.distance_m, "
              "starts_on = EXCLUDED.starts_on, ends_on = EXCLUDED.ends_on, checked_at = now();")
    if clean:
        ids = ", ".join(f"'{sid}'" for sid in clean)
        print(f"DELETE FROM public.spot_fire_closures WHERE season = '{name}' AND spot_id IN ({ids});")
    return 0


if __name__ == "__main__":
    sys.exit(main())
