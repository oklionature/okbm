import json
from pathlib import Path

import numpy as np

from dem import Dem
from match import locate_rows
from skyline import skyline

ROOT = Path(__file__).resolve().parent
PEAKS = ROOT / "data" / "peaks.json"
OUT = ROOT / "data" / "skylines.npz"


def main():
    peaks = json.loads(PEAKS.read_text(encoding="utf-8"))
    peaks.sort(key=lambda row: (round(row["lat"], 1), row["lng"]))
    dem = Dem()
    decks_path = ROOT / "data" / "decks.json"
    if decks_path.exists():
        for deck in json.loads(decks_path.read_text(encoding="utf-8")):
            peaks.append({"name": deck["name"], "lat": deck["lat"], "lng": deck["lng"], "ele": deck.get("ele"), "deck": True})
    profiles = []
    waters = []
    names = []
    lats = []
    lngs = []
    eles = []
    reliefs = []
    roughs = []
    kept = set()
    for index, peak in enumerate(peaks):
        place = (round(peak["lat"], 3), round(peak["lng"], 3))
        if place in kept:
            continue
        found = skyline(dem, peak["lat"], peak["lng"], peak.get("ele"))
        if found is None:
            continue
        profile, water, relief, rough = found
        if float(profile.std()) < 0.6:
            continue
        kept.add(place)
        profiles.append(profile)
        waters.append(water)
        names.append(peak["name"])
        lats.append(peak["lat"])
        lngs.append(peak["lng"])
        eles.append(np.nan if peak.get("ele") is None else peak["ele"])
        reliefs.append(relief)
        roughs.append(rough)
        if index % 200 == 0:
            print(f"{index}/{len(peaks)} {peak['name']}", flush=True)
    stack = np.stack(profiles).astype(np.float16)
    np.savez_compressed(
        OUT,
        profiles=stack,
        water=np.stack(waters).astype(np.float16),
        name=np.array(names),
        lat=np.array(lats, dtype=np.float64),
        lng=np.array(lngs, dtype=np.float64),
        ele=np.array(eles, dtype=np.float32),
        relief=np.array(reliefs, dtype=np.float32),
        rough=np.array(roughs, dtype=np.float32),
    )
    print("saved", stack.shape, OUT)
    meta = {
        "name": np.array(names),
        "lat": np.array(lats),
        "lng": np.array(lngs),
        "ele": np.array(eles, dtype=np.float32),
        "relief": np.array(reliefs, dtype=np.float32),
        "rough": np.array(roughs, dtype=np.float32),
    }
    jagged = int(np.argmax(stack.astype(np.float32).std(axis=1)))
    window = stack[jagged].astype(np.float32)
    shift, width, vfov = 30, 70, 60
    piece = np.take(window, np.arange(shift, shift + width) % 360)
    rows = np.interp(np.linspace(0, 1, 160), np.linspace(0, 1, width), 0.5 - piece / vfov).astype(np.float32)
    found = locate_rows(stack.astype(np.float32), meta, rows)
    print("selfcheck", found.get("ok"), found.get("judged", {}).get("name"), names[jagged])


if __name__ == "__main__":
    main()
