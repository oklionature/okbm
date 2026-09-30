import fs from "fs";
import os from "os";
import path from "path";
import puppeteer from "puppeteer-core";

const CHROME = process.env.CHROME_PATH || "/usr/local/bin/google-chrome";

function usefulLines(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 2 && line.length <= 100 && /[가-힣]/.test(line))
    .filter((line) => !/콘텐츠로 건너뛰기|접근성 피드백|부적절한/.test(line));
}

export async function visualSearch(imageBuffer, filename) {
  const tmp = path.join(os.tmpdir(), `park-finder-${Date.now()}.jpg`);
  fs.writeFileSync(tmp, imageBuffer);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--lang=ko-KR", "--window-size=1100,800"],
    defaultViewport: { width: 1100, height: 800 },
  });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);
    await page.setExtraHTTPHeaders({ "Accept-Language": "ko-KR,ko;q=0.9" });
    await page.goto("https://www.bing.com/visualsearch?cc=kr&setlang=ko", { waitUntil: "domcontentloaded" });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const input = await page.$('input[type="file"]');
    if (!input) throw new Error("image_search_unavailable");
    await input.uploadFile(tmp);
    await page.waitForFunction(() => /[가-힣]{2,6}산/.test(document.body.innerText), { timeout: 20000 }).catch(() => {});
    for (let step = 0; step < 8; step += 1) {
      await page.evaluate(() => window.scrollBy(0, 1100));
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    const text = await page.evaluate(() => {
      const bits = [];
      for (const node of document.querySelectorAll("a, h2, h3, cite")) {
        const value = (node.innerText || "").trim();
        if (value) bits.push(value);
      }
      bits.push(document.body.innerText);
      return bits.join("\n").slice(0, 30000);
    });
    const query = new URL(page.url()).searchParams.get("q") || "";
    return { query, lines: usefulLines(text), filename: filename || "photo.jpg" };
  } finally {
    await browser.close();
    fs.rmSync(tmp, { force: true });
  }
}
