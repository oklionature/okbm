import numpy as np
from PIL import Image


def photo_only(image):
    rgb = np.asarray(image.convert("RGB"))
    height, width, _ = rgb.shape
    if height < width * 1.35:
        return image
    brightness = rgb.mean(axis=2).mean(axis=1)
    content = brightness > 28
    best = (0, 0)
    start = None
    for index, on in enumerate(content):
        if on and start is None:
            start = index
        if not on and start is not None:
            if index - start > best[1] - best[0]:
                best = (start, index)
            start = None
    if start is not None and height - start > best[1] - best[0]:
        best = (start, height)
    top, bottom = best
    if bottom - top < height * 0.25:
        return image
    return image.crop((0, top, width, bottom))


def horizon_rows(path):
    rows, _features = measure(path)
    return rows


def measure(path):
    image = photo_only(Image.open(path))
    image.thumbnail((420, 420))
    rgb = np.asarray(image)
    height, width, _ = rgb.shape
    red = rgb[:, :, 0].astype(np.int16)
    green = rgb[:, :, 1].astype(np.int16)
    blue = rgb[:, :, 2].astype(np.int16)
    high = np.maximum(np.maximum(red, green), blue)
    low = np.minimum(np.minimum(red, green), blue)
    sat = (high - low) / np.maximum(high, 1)
    green_land = (green > red + 12) & (green > blue + 8)
    sky = (~green_land) & (((blue > 120) & (blue > red + 8) & (blue + 15 > green)) | ((high > 165) & (sat < 0.35) & (blue + 25 > green)))
    columns = np.linspace(0, width - 1, 160).astype(int)
    rows = np.full(columns.shape, np.nan, dtype=np.float32)
    for index, x in enumerate(columns):
        column = sky[:, x]
        if column[:4].mean() < 0.5:
            continue
        y = 0
        while y < height - 3 and column[y : y + 3].mean() > 0.34:
            y += 1
        if y < 4 or y > height * 0.92:
            continue
        rows[index] = y / height
    known = np.isfinite(rows)
    if known.mean() < 0.65:
        return None, {}
    xs = np.arange(rows.size)
    filled = rows.copy()
    filled[~known] = np.interp(xs[~known], xs[known], rows[known])
    if float(np.std(filled)) < 0.008:
        return None, {}
    horizon = np.clip((filled * height).astype(int), 1, height - 2)
    columns = np.linspace(0, width - 1, 160).astype(int)
    below = []
    band = []
    lower = []
    for index, x in enumerate(columns):
        y = int(horizon[index])
        below.append(rgb[min(height - 1, y + 4) :, x])
        band.append(rgb[min(height - 1, y + height // 10) : min(height, y + int(height * 0.38)), x])
        lower.append(rgb[int(height * 0.55) :, x])
    below = np.concatenate(below, axis=0).astype(np.int16)
    band = np.concatenate(band, axis=0).astype(np.int16)
    lower = np.concatenate(lower, axis=0).astype(np.int16)

    def parts(pixels):
        red, green, blue = pixels[:, 0], pixels[:, 1], pixels[:, 2]
        high = np.maximum(np.maximum(red, green), blue)
        low = np.minimum(np.minimum(red, green), blue)
        sat = (high - low) / np.maximum(high, 1)
        return red, green, blue, high, sat

    red, green, blue, high, sat = parts(below)
    sea = (blue > 140) & (blue > green + 28) & (blue > red + 22) & (sat > 0.38) & (sat < 0.72)
    middle = rgb[int(height * 0.40) : int(height * 0.70)]
    edge = float(np.abs(middle[:, 1:].astype(np.int16) - middle[:, :-1].astype(np.int16)).mean()) if middle.size else 99
    green_mid = (middle[:, :, 1] > middle[:, :, 0] + 4) & (middle[:, :, 1] + 6 > middle[:, :, 2]) & (middle[:, :, 1] > 55)
    forest_value = float(green_mid.mean()) if middle.size else 0
    cloud_value = 1.0 if edge < 9 and forest_value < 0.1 else 0.0
    red_l, green_l, blue_l, high_l, sat_l = parts(lower)
    rock = (sat_l < 0.28) & (high_l > 70) & (high_l < 190) & (green_l < red_l + 18) & (blue_l < red_l + 25)
    forest = forest_value
    features = {
        "sea": round(float(sea.mean()), 3),
        "cloud": cloud_value,
        "forest": round(forest, 3),
        "rock": round(float(rock.mean()), 3),
        "jagged": round(float(np.std(filled)), 4),
    }
    return filled, features
