import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));

export function locatePhoto(imageBuffer, filename) {
  const ext = path.extname(filename || "").toLowerCase();
  const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg";
  const tmp = path.join(os.tmpdir(), `park-finder-${Date.now()}${safeExt}`);
  fs.writeFileSync(tmp, imageBuffer);
  return new Promise((resolve, reject) => {
    const child = spawn("python3", [path.join(root, "locate.py"), tmp], { cwd: root });
    const chunks = [];
    const errors = [];
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => errors.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      fs.rmSync(tmp, { force: true });
      const text = Buffer.concat(chunks).toString("utf8").trim();
      if (!text) {
        reject(new Error(Buffer.concat(errors).toString("utf8") || `locate_failed_${code}`));
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch (error) {
        reject(error);
      }
    });
  });
}
