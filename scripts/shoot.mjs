// LEGACY: this driver assumes the former direct-player-combat controls (Space
// attack). Keep it for historical reference; use verify_mactan.mjs for current
// Mactan verification.
// Playwright screenshot driver — gives the agent "eyes" on the real game.
//
// Unlike frame-pumping, this runs a REAL browser with a REAL animation loop,
// so tweens/movement play at the correct speed and screenshots are accurate.
//
// Usage:
//   node scripts/shoot.mjs <outDir> [baseUrl]
// Produces a series of PNGs walking into the Mactan action mini-game and
// driving the avatar with real arrow-key presses.

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const outDir = process.argv[2] || "shots";
const base = process.argv[3] || "http://localhost:4174";
mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 680 } });
const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(base, { waitUntil: "networkidle" });
await sleep(1200);

// Helper: click the Phaser canvas at game-space coords (800x600 design,
// letterboxed/centered inside the canvas element).
async function tapGame(gx, gy) {
  const box = await page.locator("canvas").boundingBox();
  // FIT scale: the 800x600 game is centered in the canvas box.
  const scale = Math.min(box.width / 800, box.height / 600);
  const offX = box.x + (box.width - 800 * scale) / 2;
  const offY = box.y + (box.height - 600 * scale) / 2;
  await page.mouse.click(offX + gx * scale, offY + gy * scale);
}

async function shot(name) {
  await page.screenshot({ path: join(outDir, name) });
  console.log("shot:", name);
}

await shot("01-menu.png");

// Enter the Mactan arc (first card ~ game y 198).
await tapGame(400, 198);
await sleep(1500);

// Blow through pre-test + narrative. Two taps per story beat (typewriter:
// first tap completes, second advances); quiz answers are near the top choice.
for (let i = 0; i < 34; i++) {
  await tapGame(400, 300);
  await sleep(320);
}
await shot("03-into-game.png");

// Drive the side-view avatar with real keys — real rAF, correct speed.
async function press(key, ms) {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
}
await press("ArrowRight", 800);
await shot("04-walk.png");
await press("ArrowUp", 120); // jump
await sleep(250);
await shot("05-jump.png");
await page.keyboard.down("ArrowDown"); // crouch
await sleep(300);
await shot("06-crouch.png");
await page.keyboard.up("ArrowDown");
await press("Space", 120); // attack
await sleep(120);
await shot("07-attack.png");
await press("ArrowRight", 500);
await press("Space", 120);
await sleep(600);
await shot("08-combat.png");

console.log("--- console tail ---");
console.log(logs.slice(-12).join("\n"));
await browser.close();
