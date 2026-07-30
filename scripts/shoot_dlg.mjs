import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
const outDir = process.argv[2], base = process.argv[3] || "http://localhost:4174";
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 900, height: 680 } });
await page.goto(base, { waitUntil: "networkidle" });
await sleep(1200);
async function tap(gx, gy) {
  const box = await page.locator("canvas").boundingBox();
  const s = Math.min(box.width / 800, box.height / 600);
  await page.mouse.click(box.x + (box.width - 800 * s) / 2 + gx * s, box.y + (box.height - 600 * s) / 2 + gy * s);
}
async function shot(n) { await page.screenshot({ path: join(outDir, n) }); console.log("shot", n); }
await tap(400, 198); await sleep(1400); // Mactan arc
for (let i = 0; i < 3; i++) { await tap(400, 300); await sleep(500); } // pre-test
// Advance slowly; screenshot every step so every beat (cards + dialogue) is caught.
let n = 0;
for (let i = 0; i < 40; i++) {
  await sleep(650);
  await shot(`b${String(n++).padStart(2, "0")}.png`);
  await tap(400, 300); // one tap: completes a typewriter OR advances a card
}
await b.close();
