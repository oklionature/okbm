const form = document.getElementById("form");
const fileInput = document.getElementById("file");
const go = document.getElementById("go");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const titleEl = document.getElementById("title");
const noteEl = document.getElementById("note");
const linesEl = document.getElementById("lines");
const comparedEl = document.getElementById("compared");
const satEl = document.getElementById("sat");

let map;
let marker;
let circle;

function setStatus(text) {
  statusEl.textContent = text;
}

function showMap(lat, lng) {
  if (!window.L) return;
  if (!map) {
    map = L.map("map").setView([lat, lng], 16);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Esri",
      maxZoom: 19,
    }).addTo(map);
    marker = L.circleMarker([lat, lng], { radius: 8, color: "#f2d36b", fillColor: "#f2d36b", fillOpacity: 1 }).addTo(map);
    circle = L.circle([lat, lng], { radius: 700, color: "#f2d36b", weight: 2, fillOpacity: 0.08 }).addTo(map);
    setTimeout(() => map.invalidateSize(), 50);
    return;
  }
  map.setView([lat, lng], 16);
  marker.setLatLng([lat, lng]);
  circle.setLatLng([lat, lng]);
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
  setStatus("이미지 검색으로 지역을 읽고, 그 구간 위성을 비교하는 중입니다.");
  try {
    const body = new FormData();
    body.append("image", file, file.name);
    const res = await fetch("/api/find", { method: "POST", body });
    const data = await res.json();
    if (!data.ok) {
      setStatus(data.error === "no_region" ? "검색 결과에 지명이 없어 위성으로 열 지역이 없습니다." : "찾지 못했습니다.");
      return;
    }
    const judged = data.judged;
    titleEl.textContent = `${judged.displayName || judged.label} · ${judged.lat.toFixed(5)}, ${judged.lng.toFixed(5)}`;
    const elev = judged.elevation == null ? "" : ` 해발 약 ${Math.round(judged.elevation)}m.`;
    noteEl.textContent = `이미지 검색 뒤 이 구간 위성에서 바위가 드러난 정도(${judged.rock})가 가장 높았습니다.${elev} 최적 후보이며 같은 산의 비슷한 골은 틀릴 수 있습니다.`;
    linesEl.replaceChildren();
    for (const line of data.lines || []) {
      const li = document.createElement("li");
      li.textContent = line;
      linesEl.appendChild(li);
    }
    comparedEl.replaceChildren();
    for (const row of data.compared || []) {
      const li = document.createElement("li");
      li.textContent = `${row.displayName || row.label} · 바위 ${row.rock} · 점수 ${row.score}`;
      comparedEl.appendChild(li);
    }
    satEl.src = "data:image/jpeg;base64," + judged.satelliteJpeg;
    resultEl.hidden = false;
    showMap(judged.lat, judged.lng);
    setStatus("좌표를 골랐습니다.");
  } catch (error) {
    setStatus("요청에 실패했습니다.");
  } finally {
    go.disabled = false;
  }
});
