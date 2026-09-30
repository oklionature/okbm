import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np

from match import locate_image

INDEX = Path(__file__).resolve().parent / "data" / "skylines.npz"


def load_index():
    data = np.load(INDEX, allow_pickle=False)
    meta = {
        "name": data["name"],
        "lat": data["lat"],
        "lng": data["lng"],
        "ele": data["ele"],
        "water": data["water"].astype(np.float32) if "water" in data.files else None,
        "relief": data["relief"] if "relief" in data.files else None,
        "rough": data["rough"] if "rough" in data.files else None,
    }
    return data["profiles"].astype(np.float32), meta


def place_label(lat, lng, name):
    query = urllib.parse.urlencode({
        "lat": f"{lat:.6f}",
        "lon": f"{lng:.6f}",
        "format": "jsonv2",
        "accept-language": "ko",
    })
    req = urllib.request.Request(
        "https://nominatim.openstreetmap.org/reverse?" + query,
        headers={"User-Agent": "romanticroute-park-finder/0.2"},
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as res:
            body = json.load(res)
    except Exception:
        return name
    address = body.get("display_name") or ""
    if "대한민국" not in address and "South Korea" not in address:
        return name
    return f"{name} · {address}"


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "image_required"}, ensure_ascii=False))
        return
    if not INDEX.exists():
        print(json.dumps({"ok": False, "error": "index_missing"}, ensure_ascii=False))
        return
    profiles, meta = load_index()
    result = locate_image(profiles, meta, sys.argv[1])
    result["method"] = "dem_skyline"
    result["dem"] = "낭만루트 데크 박지 좌표와 공개 30m 표고. 공공데이터포털 시설 목록은 쓰지 않는다."
    if result.get("ok") and result.get("judged"):
        judged = result["judged"]
        judged["displayName"] = place_label(judged["lat"], judged["lng"], judged["name"])
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
