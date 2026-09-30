const UA = "romanticroute-park-finder/0.1 (location-less photo to a bounded satellite check)";

export async function geocodePeaks(label) {
  const url = "https://nominatim.openstreetmap.org/search?format=json&limit=4&accept-language=ko&q=" + encodeURIComponent(label);
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "ko" } });
  if (!res.ok) return [];
  const rows = await res.json();
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row && row.lat && row.lon && String(row.display_name || "").includes("대한민국"))
    .filter((row) => row.class === "natural" || row.type === "peak" || row.addresstype === "peak")
    .map((row) => ({
      name: row.name || label,
      displayName: row.display_name || "",
      lat: Number(row.lat),
      lng: Number(row.lon),
    }))
    .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng));
}

export async function highestNearby(lat, lng) {
  const step = 0.0014;
  const lats = [];
  const lngs = [];
  for (let y = -2; y <= 2; y += 1) lats.push((lat + y * step).toFixed(5));
  for (let x = -2; x <= 2; x += 1) lngs.push((lng + x * step * Math.cos(lat * Math.PI / 180)).toFixed(5));
  const latList = [];
  const lngList = [];
  for (const la of lats) {
    for (const ln of lngs) {
      latList.push(la);
      lngList.push(ln);
    }
  }
  const url = "https://api.open-meteo.com/v1/elevation?latitude=" + latList.join(",") + "&longitude=" + lngList.join(",");
  const res = await fetch(url);
  if (!res.ok) return { lat, lng, elevation: null };
  const data = await res.json();
  const heights = data.elevation || [];
  let best = 0;
  for (let i = 1; i < heights.length; i += 1) {
    if (Number(heights[i]) > Number(heights[best])) best = i;
  }
  return {
    lat: Number(latList[best]),
    lng: Number(lngList[best]),
    elevation: Number(heights[best]),
  };
}
