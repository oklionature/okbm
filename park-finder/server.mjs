import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { locatePhoto } from "./pipeline.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8787);

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function imageFromMultipart(buffer, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "");
  if (!match) return null;
  const boundary = Buffer.from("--" + (match[1] || match[2]));
  const parts = [];
  let start = buffer.indexOf(boundary);
  while (start !== -1) {
    const next = buffer.indexOf(boundary, start + boundary.length);
    if (next === -1) break;
    parts.push(buffer.subarray(start + boundary.length, next));
    start = next;
  }
  for (const part of parts) {
    const sep = part.indexOf(Buffer.from("\r\n\r\n"));
    if (sep === -1) continue;
    const header = part.subarray(0, sep).toString("utf8");
    if (!/name="image"/i.test(header) && !/filename=/i.test(header)) continue;
    let data = part.subarray(sep + 4);
    if (data.subarray(-2).equals(Buffer.from("\r\n"))) data = data.subarray(0, -2);
    const name = (/filename="([^"]+)"/.exec(header) || [])[1] || "photo.jpg";
    return { data, name };
  }
  return null;
}

function send(res, status, body, type) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return send(res, 200, fs.readFileSync(path.join(root, "index.html")), "text/html; charset=utf-8");
    }
    if (req.method === "GET" && url.pathname === "/app.js") {
      return send(res, 200, fs.readFileSync(path.join(root, "app.js")), "text/javascript; charset=utf-8");
    }
    if (req.method === "GET" && url.pathname === "/app.css") {
      return send(res, 200, fs.readFileSync(path.join(root, "app.css")), "text/css; charset=utf-8");
    }
    if (req.method === "POST" && url.pathname === "/api/find") {
      const body = await readBody(req, 8 * 1024 * 1024);
      const image = imageFromMultipart(body, req.headers["content-type"]);
      if (!image || image.data.length < 1000) return send(res, 400, JSON.stringify({ ok: false, error: "image_required" }), "application/json; charset=utf-8");
      const result = await locatePhoto(image.data, image.name);
      return send(res, 200, JSON.stringify(result), "application/json; charset=utf-8");
    }
    return send(res, 404, "not found", "text/plain; charset=utf-8");
  } catch (error) {
    console.error(error);
    const message = error && error.message === "too_large" ? "too_large" : "search_failed";
    return send(res, 500, JSON.stringify({ ok: false, error: message }), "application/json; charset=utf-8");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`park-finder http://127.0.0.1:${port}`);
});
