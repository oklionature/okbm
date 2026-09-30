import json
from pathlib import Path

import osmium

SRC = Path("/tmp/south-korea.osm.pbf")
OUT = Path(__file__).resolve().parent / "data" / "peaks.json"


class Peaks(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.seen = set()

    def node(self, node):
        if not node.location.valid():
            return
        natural = node.tags.get("natural")
        tourism = node.tags.get("tourism")
        name = node.tags.get("name:ko") or node.tags.get("name")
        if not name:
            return
        if natural == "peak":
            kind = "peak"
        elif tourism == "viewpoint" and node.tags.get("ele"):
            kind = "viewpoint"
        else:
            return
        lat = float(node.location.lat)
        lng = float(node.location.lon)
        if not (33.0 <= lat <= 38.8 and 124.5 <= lng <= 132.0):
            return
        key = (round(lat, 4), round(lng, 4), name)
        if key in self.seen:
            return
        self.seen.add(key)
        raw = node.tags.get("ele")
        ele = None
        if raw:
            try:
                ele = float(str(raw).split()[0])
            except ValueError:
                ele = None
        self.rows.append({"name": name, "lat": lat, "lng": lng, "ele": ele, "kind": kind})


def main():
    handler = Peaks()
    handler.apply_file(str(SRC), locations=True)
    OUT.write_text(json.dumps(handler.rows, ensure_ascii=False), encoding="utf-8")
    print("peaks", len(handler.rows), OUT)


if __name__ == "__main__":
    main()
