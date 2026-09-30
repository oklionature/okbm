import jpeg from "jpeg-js";
import { satelliteScores } from "./places.mjs";

export async function satellitePatch(lat, lng) {
  const delta = 0.008;
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join(",");
  const url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export"
    + `?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=180,180&format=jpg&f=image`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("satellite_unavailable");
  const bytes = Buffer.from(await res.arrayBuffer());
  const decoded = jpeg.decode(bytes, { useTArray: true });
  const scores = satelliteScores(decoded.data);
  return { jpeg: bytes.toString("base64"), ...scores };
}
