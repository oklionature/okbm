import math
from collections import OrderedDict
from pathlib import Path

import numpy as np

DEM_DIR = Path(__file__).resolve().parent / "data" / "dem"


def tile_key(lat, lng):
    return int(math.floor(lat - 1e-8)), int(math.floor(lng - 1e-8))


class Dem:
    def __init__(self, folder=DEM_DIR, limit=8):
        self.folder = Path(folder)
        self.cache = OrderedDict()
        self.limit = limit

    def array(self, sw_lat, sw_lng):
        key = (sw_lat, sw_lng)
        if key in self.cache:
            self.cache.move_to_end(key)
            return self.cache[key]
        name = f"N{sw_lat:02d}E{sw_lng:03d}.hgt"
        path = self.folder / name
        if not path.exists() or path.stat().st_size != 3601 * 3601 * 2:
            arr = None
        else:
            arr = np.fromfile(path, dtype=">i2").reshape(3601, 3601)
        self.cache[key] = arr
        while len(self.cache) > self.limit:
            self.cache.popitem(last=False)
        return arr

    def grid(self, lats, lngs):
        lats = np.asarray(lats, dtype=np.float64)
        lngs = np.asarray(lngs, dtype=np.float64)
        out = np.full(lats.shape, np.nan, dtype=np.float32)
        sw_lat = np.floor(lats - 1e-8).astype(np.int32)
        sw_lng = np.floor(lngs - 1e-8).astype(np.int32)
        for la, lo in zip(*np.unique(np.stack([sw_lat.ravel(), sw_lng.ravel()], axis=1), axis=0).T):
            mask = (sw_lat == la) & (sw_lng == lo)
            arr = self.array(int(la), int(lo))
            if arr is None:
                continue
            rows = (la + 1 - lats[mask]) * 3600.0
            cols = (lngs[mask] - lo) * 3600.0
            rows = np.clip(rows, 0, 3600)
            cols = np.clip(cols, 0, 3600)
            r0 = np.floor(rows).astype(np.int32)
            c0 = np.floor(cols).astype(np.int32)
            r1 = np.minimum(r0 + 1, 3600)
            c1 = np.minimum(c0 + 1, 3600)
            dr = (rows - r0).astype(np.float32)
            dc = (cols - c0).astype(np.float32)
            v00 = arr[r0, c0].astype(np.float32)
            v01 = arr[r0, c1].astype(np.float32)
            v10 = arr[r1, c0].astype(np.float32)
            v11 = arr[r1, c1].astype(np.float32)
            bad = (v00 < -500) | (v01 < -500) | (v10 < -500) | (v11 < -500)
            vals = v00 * (1 - dr) * (1 - dc) + v01 * (1 - dr) * dc + v10 * dr * (1 - dc) + v11 * dr * dc
            vals[bad] = np.nan
            out[mask] = vals
        return out

    def point(self, lat, lng):
        value = self.grid(np.array([lat]), np.array([lng]))[0]
        if not np.isfinite(value):
            return None
        return float(value)
