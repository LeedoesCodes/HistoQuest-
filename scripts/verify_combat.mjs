// Deterministic verification of the Mactan combat geometry (Feature C):
//   - a SIZE screenshot (kid should read shorter than the soldiers), and
//   - four dodge assertions via the DEV __mg.testShot hook.
// Needs the DEV server (npm run dev) — __mg is stripped from production builds.
//   node scripts/verify_combat.mjs [outDir] [baseUrl=http://localhost:5173]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const outDir = process.argv[2] || "shots-combat";
const base = process.argv[3] || "http://localhost:5173";
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 680 } });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto(base, { waitUntil: "networkidle" });
await sleep(1800);

async function tapGame(gx, gy) {
  const box = await page.locator("canvas").boundingBox();
  const s = Math.min(box.width / 800, box.height / 600);
  const ox = box.x + (box.width - 800 * s) / 2;
  const oy = box.y + (box.height - 600 * s) / 2;
  await page.mouse.click(ox + gx * s, oy + gy * s);
}
const mg = () => page.evaluate(() => (window.__mg ? window.__mg.state() : null));
const call = (fn, arg) => page.evaluate(([f, a]) => window.__mg[f](a), [fn, arg]);

// Enter Mactan, then tap through pretest + story + decision until the mini-game
// registers its __mg hook.
await tapGame(400, 198);
await sleep(1200);
let entered = false;
for (let i = 0; i < 70 && !entered; i++) {
  await tapGame(400, 320);
  await sleep(280);
  if (await mg()) entered = true;
}
if (!entered) { console.log("FAIL: never reached mini-game (__mg missing)"); await browser.close(); process.exit(1); }
console.log("entered mini-game");
await sleep(250);
await page.screenshot({ path: join(outDir, "00-size.png") });

// Slide to the far-left corner for a clean test window (enemies spawn far right
// and won't be in shooting range for the first several seconds).
await call("set", { left: true }); await sleep(380); await call("set", { left: false }); await sleep(120);

const results = [];
async function testCase(name, setup, kind, expectHit) {
  await setup();
  await sleep(140);
  const before = (await mg()).playerHP;
  await call("testShot", kind);
  await sleep(140);
  const after = (await mg()).playerHP;
  const hit = after < before;
  const ok = hit === expectHit;
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}: HP ${before}->${after} (hit=${hit}, expected=${expectHit})`);
  await call("set", { crouch: false });
  await sleep(1000); // wait out i-frames before the next case
}

await testCase("HIGH shot vs CROUCH (should duck under)", async () => { await call("set", { crouch: true }); }, "high", false);
await testCase("HIGH shot vs STAND (should hit)",         async () => { await call("set", { crouch: false }); }, "high", true);
await testCase("LOW shot vs STAND (should hit)",          async () => { await call("set", { crouch: false }); }, "low", true);
await testCase("LOW shot vs JUMP (should clear over)",    async () => { await call("set", { crouch: false }); await call("jump"); await sleep(230); }, "low", false);

const allPass = results.every(Boolean);
console.log(allPass ? "ALL DODGE TESTS PASS" : "SOME TESTS FAILED");
await browser.close();
process.exit(allPass ? 0 : 1);
