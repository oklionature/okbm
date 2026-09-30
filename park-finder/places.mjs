const STOP = new Set([
  "위치", "위치한", "있는", "사진", "이번", "코스", "등산", "정리", "완벽",
  "출발", "하산", "지도", "최단", "황금", "명산", "바위", "정상", "산행",
  "후기", "코스", "근처", "쪽", "방향",
]);

const NOT_MOUNTAIN = new Set([
  "등산", "계산", "생산", "재산", "임산", "분산", "예산", "유산", "부동산",
  "개선", "화산재", "연산", "가산", "감산",
]);

function cleanToken(raw) {
  return String(raw || "").replace(/(에서|에게|으로|로는|에는|에|의|은|는|이|가|을|를)$/g, "");
}

function mountainsIn(line) {
  const found = [];
  const re = /[가-힣]{2,8}산/g;
  let match;
  while ((match = re.exec(line))) {
    const word = match[0];
    const prev = line[match.index - 1] || "";
    if (/[0-9]/.test(prev)) continue;
    if (word === "대명산" || word === "명산") continue;
    if (NOT_MOUNTAIN.has(word)) continue;
    if (word.length < 3) continue;
    found.push(word);
  }
  return found;
}

function regionsIn(line, mountain) {
  const regions = [];
  const admin = /[가-힣]{2,8}(?:특별자치도|특별시|광역시|도|시|군|구|면|읍)/g;
  let match;
  while ((match = admin.exec(line))) regions.push(match[0]);
  const idx = line.indexOf(mountain);
  if (idx > 0) {
    const before = line.slice(Math.max(0, idx - 12), idx);
    const token = cleanToken((before.match(/([가-힣]{2,6})\s*$/) || [])[1] || "");
    if (token && !STOP.has(token) && !token.endsWith("산") && token.length <= 4) regions.push(token);
  }
  return [...new Set(regions)];
}

export function candidatesFromLines(lines) {
  const counts = new Map();
  for (const rawLine of lines) {
    const line = String(rawLine || "").replace(/\s+/g, " ").trim();
    if (!line || line.length > 120) continue;
    if (/광고|구매|스토어/.test(line)) continue;
    for (const mountain of mountainsIn(line)) {
      const regions = regionsIn(line, mountain);
      if (!regions.length) {
        const key = mountain;
        const prev = counts.get(key) || { region: "", mountain, label: mountain, mentions: 0 };
        prev.mentions += 1;
        counts.set(key, prev);
        continue;
      }
      for (const region of regions) {
        const label = `${region} ${mountain}`;
        const prev = counts.get(label) || { region, mountain, label, mentions: 0 };
        prev.mentions += 1;
        counts.set(label, prev);
      }
    }
  }
  const rows = [...counts.values()];
  const qualified = new Set(rows.filter((row) => row.region).map((row) => row.mountain));
  return rows
    .filter((row) => row.region || !qualified.has(row.mountain))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 4);
}

export function photoRockFraction(rgba, width, height) {
  const total = width * height;
  if (!total) return 0;
  let rock = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (sat < 0.28 && max > 120 && max < 230 && Math.abs(r - b) < 30) rock += 1;
  }
  return rock / total;
}

export function satelliteScores(rgba) {
  const n = rgba.length / 4;
  if (!n) return { rock: 0, water: 0, green: 0 };
  let rock = 0;
  let water = 0;
  let green = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (b > r + 12 && b > g + 5 && b > 60) water += 1;
    else if (g > r + 8 && g >= b - 5) green += 1;
    else if (sat < 0.25 && max > 90 && max < 210 && Math.abs(r - g) < 18 && Math.abs(g - b) < 18) rock += 1;
  }
  return { rock: rock / n, water: water / n, green: green / n };
}
