import numpy as np

from horizon import horizon_rows
from skyline import heading_name

WIDTHS = (64, 88, 120)
VFOVS = (48, 68)


def best_window(profile, rows):
    best = None
    for vfov in VFOVS:
        angles = (0.5 - rows) * vfov
        for width in WIDTHS:
            sample_x = np.linspace(0, 1, width)
            source_x = np.linspace(0, 1, angles.size)
            signature = np.interp(sample_x, source_x, angles).astype(np.float32)
            signature = signature - signature.mean()
            std = float(signature.std())
            if std < 0.35:
                continue
            signature = signature / std
            shifts = np.arange(360)
            index = (shifts[:, None] + np.arange(width)[None, :]) % 360
            windows = profile[index]
            windows = windows - windows.mean(axis=1, keepdims=True)
            windows = windows / np.maximum(windows.std(axis=1, keepdims=True), 1e-3)
            scores = windows @ signature / width
            pick = int(scores.argmax())
            score = float(scores[pick])
            if best is None or score > best["score"]:
                center = (pick + width / 2.0) % 360
                best = {"score": score, "shift": pick, "width": int(width), "vfov": int(vfov), "heading": center}
    return best


def scores_at(profiles, rows, width, vfov):
    angles = (0.5 - rows) * vfov
    signature = np.interp(np.linspace(0, 1, width), np.linspace(0, 1, angles.size), angles).astype(np.float32)
    signature -= signature.mean()
    std = float(signature.std())
    if std < 0.35:
        return None
    signature /= std
    count = profiles.shape[0]
    scores = np.empty(count, dtype=np.float32)
    shifts = np.empty(count, dtype=np.int16)
    offsets = (np.arange(360)[:, None] + np.arange(width)[None, :]) % 360
    for start in range(0, count, 200):
        part = profiles[start:start + 200]
        windows = part[:, offsets]
        windows = windows - windows.mean(axis=2, keepdims=True)
        windows = windows / np.maximum(windows.std(axis=2, keepdims=True), 1e-3)
        corr = windows @ signature / width
        pick = corr.argmax(axis=1)
        scores[start:start + len(part)] = corr[np.arange(len(part)), pick]
        shifts[start:start + len(part)] = pick
    return scores, shifts


def apply_checks(scores, shifts, profiles, water, relief, rough, features, width, vfov):
    adjusted = scores.astype(np.float32).copy()
    if not features or water is None:
        return adjusted
    count = adjusted.shape[0]
    index = (shifts.astype(np.int32)[:, None] + np.arange(width)[None, :]) % 360
    rows = np.arange(count)[:, None]
    sea = water[rows, index].mean(axis=1)
    if features["sea"] < 0.03:
        adjusted[sea > 0.22] = -1
    elif features["sea"] > 0.08:
        adjusted[sea < 0.04] = -1
    if features["cloud"] >= 0.25 and relief is not None:
        adjusted[np.asarray(relief) < 80] = -1
    if features["rock"] >= 0.18 and rough is not None:
        adjusted[np.asarray(rough) < 12] *= 0.65
    if features["forest"] >= 0.15:
        adjusted[sea > 0.25] = -1
    photo_jag = max(features["jagged"] * vfov, 0.2)
    window_jag = profiles[rows, index].std(axis=1)
    ratio = np.maximum(photo_jag, window_jag) / np.maximum(np.minimum(photo_jag, window_jag), 0.2)
    adjusted[ratio > 3.5] *= 0.6
    return adjusted


def locate_rows(profiles, meta, rows, features=None, water=None, relief=None, rough=None):
    if rows is None:
        return {"ok": False, "error": "no_horizon", "guarantee": False, "checks": features or {}}
    ranked = []
    tables = {}
    for vfov in VFOVS:
        for width in WIDTHS:
            table = scores_at(profiles, rows, width, vfov)
            if table is None:
                continue
            scores, shifts = table
            scores = apply_checks(scores, shifts, profiles, water, relief, rough, features, width, vfov)
            pick = int(scores.argmax())
            tables[(width, vfov)] = (scores, shifts, pick)
            ranked.append({
                "score": float(scores[pick]),
                "shift": int(shifts[pick]),
                "width": width,
                "vfov": vfov,
                "heading": (int(shifts[pick]) + width / 2.0) % 360,
                "index": pick,
            })
    if len(ranked) < 1:
        return {"ok": False, "error": "no_match", "guarantee": False}

    def separation(item):
        table_scores = tables[(item["width"], item["vfov"])][0]
        ordered = np.sort(table_scores)
        return float(ordered[-1] - ordered[-2])

    eligible = [item for item in ranked if item["score"] >= 0.82]
    pool = eligible or ranked
    pool.sort(key=lambda item: (separation(item), item["score"]), reverse=True)
    top = pool[0]
    scores, shifts, pick = tables[(top["width"], top["vfov"])]
    order = np.argsort(scores)[::-1]
    alive = [int(index) for index in order if scores[index] > 0]
    if len(alive) < 2 or scores[pick] <= 0:
        return {"ok": False, "error": "no_match", "guarantee": False, "checks": features or {}}
    second = alive[1]
    gap = float(scores[pick] - scores[second])
    far = _km(meta["lat"][pick], meta["lng"][pick], meta["lat"][second], meta["lng"][second])
    if far > 30 and gap < 0.08:
        gap = 0.0
    compared_hits = []
    for index in order[:5]:
        compared_hits.append({
            "score": float(scores[index]),
            "shift": int(shifts[index]),
            "width": top["width"],
            "vfov": top["vfov"],
            "heading": (int(shifts[index]) + top["width"] / 2.0) % 360,
            "index": int(index),
        })
    if top["score"] < 0.9 or gap < 0.02:
        return {
            "ok": False,
            "error": "ambiguous",
            "guarantee": False,
            "score": round(top["score"], 3),
            "gap": round(gap, 3),
            "compared": [_public(hit, meta) for hit in compared_hits],
        }
    judged = _public(top, meta)
    judged["gap"] = round(gap, 3)
    judged["looks"] = heading_name(top["heading"])
    return {
        "ok": True,
        "guarantee": False,
        "method": "dem_skyline",
        "score": judged["score"],
        "gap": judged["gap"],
        "judged": judged,
        "compared": [_public(hit, meta) for hit in compared_hits],
    }


def _km(lat1, lng1, lat2, lng2):
    scale = 111.32
    dy = (lat1 - lat2) * scale
    dx = (lng1 - lng2) * scale * np.cos(np.radians((lat1 + lat2) / 2))
    return float(np.hypot(dx, dy))


def _public(hit, meta):
    index = hit["index"]
    return {
        "name": meta["name"][index],
        "lat": float(meta["lat"][index]),
        "lng": float(meta["lng"][index]),
        "elevation": None if meta["ele"][index] != meta["ele"][index] else round(float(meta["ele"][index])),
        "score": round(hit["score"], 3),
        "looks": heading_name(hit["heading"]),
    }


def locate_image(profiles, meta, path):
    from horizon import measure

    rows, features = measure(path)
    found = locate_rows(
        profiles,
        meta,
        rows,
        features=features,
        water=meta.get("water"),
        relief=meta.get("relief"),
        rough=meta.get("rough"),
    )
    found["checks"] = features
    return found
