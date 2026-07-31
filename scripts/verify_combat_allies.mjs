// Verifies Feature D (combat rebalance) via the DEV __mg hook + a screenshot:
//   1. outnumbering — you + NUM_ALLIES allies vs a few enemies (screenshot),
//   2. allies SOFTEN but can't FINISH — idle (no player attacks); assert no
//      enemy dies (defeated===0) and enemies get chipped to the ALLY_FLOOR, then
//   3. the player CAN finish — advance + attack; assert defeated climbs.
// Needs the DEV server (npm run dev).  node scripts/verify_combat_allies.mjs [out] [baseUrl]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const outDir = process.argv[2] || "shots-combat-d";
const base = process.argv[3] || "http://localhost:5173";
const ALLY_FLOOR = 9;
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
  await page.mouse.click(box.x + (box.width - 800 * s) / 2 + gx * s, box.y + (box.height - 600 * s) / 2 + gy * s);
}
const mg = () => page.evaluate(() => (window.__mg ? window.__mg.state() : null));
const call = (fn, arg) => page.evaluate(([f, a]) => window.__mg[f](a), [fn, arg]);

await tapGame(400, 198);
await sleep(1200);
let entered = false;
for (let i = 0; i < 70 && !entered; i++) { await tapGame(400, 320); await sleep(280); if (await mg()) entered = true; }
if (!entered) { console.log("FAIL: never reached mini-game"); await browser.close(); process.exit(1); }
console.log("entered mini-game");

const results = [];
const check = (name, ok, detail) => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? ": " + detail : ""}`); };

// Let allies engage, screenshot the outnumbering, then keep idling to soften.
await sleep(3000);
await page.screenshot({ path: join(outDir, "00-outnumber.png") });
const mid = await mg();
check("3 allies present", mid.allies === 3, `allies=${mid.allies}`);

await sleep(6000); // total ~9s idle — allies chip enemies to the floor
const idle = await mg();
const minHp = idle.enemyHps.length ? Math.min(...idle.enemyHps) : NaN;
check("allies cannot finish (no kills while idle)", idle.defeated === 0, `defeated=${idle.defeated}`);
check("allies soften enemies to the floor", idle.enemyHps.some((h) => h <= ALLY_FLOOR), `enemyHps=[${idle.enemyHps}] min=${minHp}`);

// Now the player advances and attacks — the finishers allies can't land.
const before = idle.defeated;
await call("set", { right: true });
for (let i = 0; i < 60; i++) {
  await call("attack");
  await sleep(130);
  if (i % 8 === 7) { const s = await mg(); console.log(`  t+${((i + 1) * 0.13).toFixed(1)}s px=${s.px} defeated=${s.defeated} enemyHps=[${s.enemyHps}]`); }
}
await call("set", { right: false });
const after = await mg();
check("player CAN finish softened enemies", after.defeated > before, `defeated ${before}->${after.defeated}`);
await page.screenshot({ path: join(outDir, "01-after-attacks.png") });

const allPass = results.every(Boolean);
console.log(allPass ? "ALL FEATURE-D CHECKS PASS" : "SOME CHECKS FAILED");
await browser.close();
process.exit(allPass ? 0 : 1);
