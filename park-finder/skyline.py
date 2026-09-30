import numpy as np

AZIMUTHS = 360
DISTANCES = np.linspace(250, 18000, 48)


def skyline(dem, lat, lng, ele=None):
    ground = dem.point(lat, lng)
    if ground is None:
        return None
    eye = max(ground, float(ele) if ele else ground) + 1.7
    az = np.linspace(0, 2 * np.pi, AZIMUTHS, endpoint=False)
    dist = DISTANCES
    scale = 111320.0 * max(np.cos(np.radians(lat)), 0.2)
    lats = lat + (np.cos(az)[:, None] * dist[None, :]) / 111320.0
    lngs = lng + (np.sin(az)[:, None] * dist[None, :]) / scale
    elev = dem.grid(lats, lngs)
    angles = np.degrees(np.arctan2(elev - eye, dist[None, :]))
    profile = np.nanmax(angles, axis=1)
    if np.mean(~np.isfinite(profile)) > 0.15:
        return None
    fill = np.nanmin(profile[np.isfinite(profile)])
    profile = np.where(np.isfinite(profile), profile, fill)
    water = np.mean(np.nan_to_num(elev, nan=9999) <= 1, axis=1).astype(np.float32)
    finite = elev[np.isfinite(elev)]
    relief = float(eye - np.percentile(finite, 20)) if finite.size else 0.0
    near = elev[:, :10]
    near = near[np.isfinite(near)]
    rough = float(np.std(near)) if near.size else 0.0
    return profile.astype(np.float32), water, relief, rough


def heading_name(deg):
    names = ["북", "북동", "동", "남동", "남", "남서", "서", "북서"]
    return names[int(((deg % 360) + 22.5) // 45) % 8]
