#!/usr/bin/env python3
"""Split gears_master.json into compact per-category files under gears/."""
from __future__ import annotations

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / "gears_master.json"
OUT_DIR = ROOT / "gears"
KEEP = (
    "id",
    "category_id",
    "item_name",
    "weight_g",
    "brand",
    "specs_detail",
    "verified",
    "weight_type",
    "evidence",
)
VALID_CATS = (
    "shelter",
    "sleep",
    "pack",
    "food",
    "kitchen",
    "wear",
    "electronics",
    "camp",
    "other",
)


def slim_row(row: dict) -> dict:
    out = {}
    for key in KEEP:
        if key == "id":
            out[key] = row.get("id") or row.get("gear_id")
            continue
        if key == "weight_g":
            val = row.get("weight_g", row.get("weight"))
            try:
                out[key] = int(val)
            except (TypeError, ValueError):
                out[key] = val
            continue
        if key in row and row[key] is not None:
            out[key] = row[key]
    return out


def main() -> int:
    if not SRC.exists():
        print("missing gears_master.json", file=sys.stderr)
        return 1
    rows = json.loads(SRC.read_text(encoding="utf-8"))
    if not isinstance(rows, list):
        print("gears_master.json must be an array", file=sys.stderr)
        return 1

    buckets = {cat: [] for cat in VALID_CATS}
    skipped = 0
    for row in rows:
        if not isinstance(row, dict):
            skipped += 1
            continue
        cat = str(row.get("category_id") or "other").strip() or "other"
        if cat not in buckets:
            cat = "other"
        buckets[cat].append(slim_row(row))

    OUT_DIR.mkdir(exist_ok=True)
    manifest = {"version_file": "gears_master.json", "categories": {}}
    for cat in VALID_CATS:
        payload = buckets[cat]
        dest = OUT_DIR / f"{cat}.json"
        dest.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        manifest["categories"][cat] = {"count": len(payload), "file": f"gears/{cat}.json"}
        print(f"  {cat}: {len(payload)} items, {dest.stat().st_size} bytes")

    (OUT_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT_DIR} ({len(rows)} source rows, skipped {skipped})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
