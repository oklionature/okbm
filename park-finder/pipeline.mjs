import jpeg from "jpeg-js";
import { candidatesFromLines, photoRockFraction } from "./places.mjs";
import { visualSearch } from "./search.mjs";
import { geocodePeaks, highestNearby } from "./geo.mjs";
import { satellitePatch } from "./satellite.mjs";

function primaryMountain(query, candidates) {
  const named = (String(query || "").match(/[가-힣]{2,8}산/g) || []).find((word) => word !== "대명산" && word !== "명산");
  if (named && candidates.some((row) => row.mountain === named)) return named;
  const tally = new Map();
  for (const row of candidates) tally.set(row.mountain, (tally.get(row.mountain) || 0) + row.mentions);
  return [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function locatePhoto(imageBuffer, filename) {
  const decoded = jpeg.decode(imageBuffer, { useTArray: true, maxMemoryUsageInMB: 128 });
  const photoRock = photoRockFraction(decoded.data, decoded.width, decoded.height);
  const search = await visualSearch(imageBuffer, filename);
  const candidates = candidatesFromLines(search.query ? [search.query, ...search.lines] : search.lines);
  const primary = primaryMountain(search.query, candidates);
  const focused = primary ? candidates.filter((row) => row.mountain === primary) : candidates;
  if (!focused.length) {
    return { ok: false, error: "no_region", query: search.query, lines: search.lines.slice(0, 12) };
  }

  const inspected = [];
  for (const candidate of focused.slice(0, 8)) {
    const peaks = await geocodePeaks(candidate.label);
    await sleep(1100);
    for (const peak of peaks.slice(0, 3)) {
      if (candidate.mountain && !String(peak.name || "").includes(candidate.mountain)) continue;
      if (candidate.region && !peak.displayName.includes(candidate.region.replace(/특별자치도|광역시|특별시|도|시|군|구|면|읍/g, ""))) {
        const stem = candidate.region.replace(/(특별자치도|광역시|특별시|도|시|군|구|면|읍)$/g, "");
        if (stem && !peak.displayName.includes(stem)) continue;
      }
      const sat = await satellitePatch(peak.lat, peak.lng);
      const rockSignal = sat.rock > 0.18 ? 0.02 : sat.rock;
      const score = rockSignal * Math.max(sat.green, 0.05) + candidate.mentions * 0.001;
      inspected.push({
        label: candidate.label,
        mentions: candidate.mentions,
        name: peak.name,
        displayName: peak.displayName,
        lat: peak.lat,
        lng: peak.lng,
        rock: Number(sat.rock.toFixed(3)),
        water: Number(sat.water.toFixed(3)),
        green: Number(sat.green.toFixed(3)),
        score: Number(score.toFixed(4)),
        satelliteJpeg: sat.jpeg,
      });
    }
  }

  if (!inspected.length) {
    return { ok: false, error: "no_region", query: search.query, lines: search.lines.slice(0, 12), candidates };
  }

  inspected.sort((a, b) => b.score - a.score);
  const best = inspected[0];
  const pin = await highestNearby(best.lat, best.lng);
  return {
    ok: true,
    guarantee: false,
    query: search.query,
    photoRock: Number(photoRock.toFixed(3)),
    lines: search.lines.filter((line) => /산|시|군|도/.test(line)).slice(0, 8),
    judged: {
      label: best.label,
      name: best.name,
      displayName: best.displayName,
      lat: pin.lat,
      lng: pin.lng,
      elevation: pin.elevation,
      rock: best.rock,
      score: best.score,
      satelliteJpeg: best.satelliteJpeg,
    },
    compared: inspected.map(({ satelliteJpeg, ...rest }) => rest),
  };
}
