// Screenshots the Mactan INTRO slideshow beat-by-beat, to verify the per-beat
// StoryBackdrop cross-dissolve. Usage: node scripts/shoot_intro.mjs <outDir> [baseUrl]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const outDir = process.argv[2] || "shots-intro";
const base = process.argv[3] || "http://localhost:4174";
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 680 } });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto(base, { waitUntil: "networkidle" });
await sleep(1200);

async function tapGame(gx, gy) {
  const box = await page.locator("canvas").boundingBox();
  const scale = Math.min(box.width / 800, box.height / 600);
  const offX = box.x + (box.width - 800 * scale) / 2;
  const offY = box.y + (box.height - 600 * scale) / 2;
  await page.mouse.click(offX + gx * scale, offY + gy * scale);
}
let n = 0;
const shot = async (label) => {
  const name = `${String(n++).padStart(2, "0")}-${label}.png`;
  await page.screenshot({ path: join(outDir, name) });
  console.log("shot:", name);
};

// Enter Mactan.
await tapGame(400, 198);
await sleep(1200);
await shot("entered");

// Pre-test: 3 questions. Tap the first choice then advance; be generous.
for (let i = 0; i < 10; i++) {
  await tapGame(400, 320);
  await sleep(500);
}
await shot("after-pretest");

// Walk the story beats: two taps each (complete typewriter, then advance),
// screenshot after settling so the cross-dissolve is captured mid-arc.
for (let i = 0; i < 22; i++) {
  await tapGame(400, 300); // complete the line
  await sleep(300);
  await tapGame(400, 300); // advance to next beat
  await sleep(900); // let the 600ms cross-dissolve settle
  await shot(`beat-${String(i).padStart(2, "0")}`);
}

await browser.close();
console.log("done");
