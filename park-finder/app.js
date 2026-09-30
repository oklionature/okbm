const form = document.getElementById("form");
const fileInput = document.getElementById("file");
const go = document.getElementById("go");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const titleEl = document.getElementById("title");
const noteEl = document.getElementById("note");
const comparedEl = document.getElementById("compared");

let map;
let marker;
let circle;

function setStatus(text) {
  statusEl.textContent = text;
}

function showMap(lat, lng) {
  if (!window.L) return;
  if (!map) {
    map = L.map("map").setView([lat, lng], 14);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Esri",
      maxZoom: 19,
    }).addTo(map);
    marker = L.circleMarker([lat, lng], { radius: 8, color: "#f2d36b", fillColor: "#f2d36b", fillOpacity: 1 }).addTo(map);
    circle = L.circle([lat, lng], { radius: 2000, color: "#f2d36b", weight: 2, fillOpacity: 0.08 }).addTo(map);
    setTimeout(() => map.invalidateSize(), 50);
    return;
  }
  map.setView([lat, lng], 14);
  marker.setLatLng([lat, lng]);
  circle.setLatLng([lat, lng]);
}

function fillCompared(rows) {
  comparedEl.replaceChildren();
  for (const row of rows || []) {
    const li = document.createElement("li");
    const elev = row.elevation == null ? "" : ` · 약 ${row.elevation}m`;
    li.textContent = `${row.name} · ${row.looks}쪽 능선 · 유사도 ${row.score}${elev}`;
    comparedEl.appendChild(li);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = fileInput.files && fileInput.files[0];
  if (!file) {
    setStatus("사진을 선택해 주세요.");
    return;
  }
  go.disabled = true;
  resultEl.hidden = true;
  setStatus("능선, 바다, 구름, 숲을 전국 봉우리와 데크 위치에 대조하는 중입니다.");
  try {
    const body = new FormData();
    body.append("image", file, file.name);
    const res = await fetch("/api/find", { method: "POST", body });
    const data = await res.json();
    if (!data.ok) {
      resultEl.hidden = true;
      const checks = data.checks || {};
      const bits = [];
      if (checks.sea < 0.03) bits.push("바다는 없습니다");
      else if (checks.sea > 0.08) bits.push("바다가 보입니다");
      if (checks.cloud >= 1) bits.push("골짜기에 구름이 있습니다");
      if (checks.forest >= 0.15) bits.push("가까운 산은 숲입니다");
      if (checks.rock >= 0.18) bits.push("가까운 곳에 바위가 있습니다");
      const seen = bits.length ? `${bits.join(", ")}. ` : "";
      setStatus(data.error === "no_horizon"
        ? "하늘과 맞닿은 산줄기가 거의 없습니다. 멀리 주변이 보이게 찍어 주세요."
        : `${seen}비슷한 능선이 여러 곳이라 한 곳으로 정하지 않았습니다.`);
      return;
    }
    document.getElementById("map").hidden = false;
    const judged = data.judged;
    titleEl.textContent = `${judged.displayName || judged.name} · ${judged.lat.toFixed(5)}, ${judged.lng.toFixed(5)}`;
    const elev = judged.elevation == null ? "" : ` 표고 약 ${Math.round(judged.elevation)}m.`;
    const checks = data.checks || {};
    const bits = [];
    if (checks.sea < 0.03) bits.push("바다 없음");
    else if (checks.sea > 0.08) bits.push("바다 있음");
    if (checks.cloud >= 1) bits.push("골짜기 구름");
    if (checks.forest >= 0.15) bits.push("숲");
    if (checks.rock >= 0.18) bits.push("가까운 바위");
    const seen = bits.length ? ` 사진에서 본 것: ${bits.join(", ")}.` : "";
    noteEl.textContent = `앞에 겹친 산줄기가 이 지점에서 본 ${judged.looks}쪽과 가장 가깝습니다.${elev}${seen} 최적 후보이며 보장은 아닙니다.`;
    fillCompared(data.compared);
    resultEl.hidden = false;
    showMap(judged.lat, judged.lng);
    setStatus("좌표를 골랐습니다.");
  } catch (error) {
    setStatus("요청에 실패했습니다.");
  } finally {
    go.disabled = false;
  }
});
