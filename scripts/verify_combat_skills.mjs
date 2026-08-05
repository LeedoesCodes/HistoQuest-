// LEGACY: this script verifies removed player attack/heavy-attack mechanics.
// Use verify_mactan.mjs for the current support-role Mactan mini-game.
// Verifies Feature E (skills) via the DEV __mg hook + a charge-ring screenshot:
//   1. DASH grants guaranteed i-frames (a hit during the dash window does 0 dmg),
//   2. DASH has a cooldown (dashCd > 0 right after dashing),
//   3. HEAVY attack lands big damage (player advancing + heavy finishes enemies),
//   4. charge ring is visible while holding attack (screenshot).
// Needs the DEV server (npm run dev).  node scripts/verify_combat_skills.mjs [out] [baseUrl]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const outDir = process.argv[2] || "shots-combat-e";
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
  await page.mouse.click(box.x + (box.width - 800 * s) / 2 + gx * s, box.y + (box.height - 600 * s) / 2 + gy * s);
}
const mg = () => page.evaluate(() => (window.__mg ? window.__mg.state() : null));
const call = (fn, arg) => page.evaluate(([f, a]) => window.__mg[f](a), [fn, arg]);
const results = [];
const check = (name, ok, detail) => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? ": " + detail : ""}`); };

await tapGame(400, 198);
await sleep(1200);
let entered = false;
for (let i = 0; i < 70 && !entered; i++) { await tapGame(400, 320); await sleep(280); if (await mg()) entered = true; }
if (!entered) { console.log("FAIL: never reached mini-game"); await browser.close(); process.exit(1); }
console.log("entered mini-game");
await call("set", { left: true }); await sleep(350); await call("set", { left: false }); await sleep(150); // clean corner

// 1. Control: a forced hit while standing normally DOES damage.
const hp0 = (await mg()).playerHP;
await call("forceHit");
await sleep(60);
const hp1 = (await mg()).playerHP;
check("forced hit hurts when NOT dashing", hp1 < hp0, `HP ${hp0}->${hp1}`);
await sleep(1000); // clear i-frames from that hit

// 2. Dash i-frames: a hit during the dash window does NOTHING.
await call("dash");
await sleep(40);
const dstate = await mg();
check("dash is on cooldown right after dashing", dstate.dashCd > 0, `dashCd=${dstate.dashCd}`);
const hp2 = dstate.playerHP;
await call("forceHit"); // still within the ~175ms dash window
await sleep(50);
const hp3 = (await mg()).playerHP;
check("dash grants i-frames (hit does 0 dmg)", hp3 === hp2, `HP ${hp2}->${hp3}`);
await sleep(1000);

// 3. Charge ring visible while holding attack (hold F past the heavy threshold).
await page.keyboard.down("f");
await sleep(450);
const charged = await mg();
check("charging state active while holding attack", charged.charging === true, `charging=${charged.charging}`);
await page.screenshot({ path: join(outDir, "00-charge-ring.png") });
await page.keyboard.up("f");
await sleep(300);

// 4. Heavy attack lands big damage — advance and heavy; enemies should fall.
const before = (await mg()).defeated;
for (let i = 0; i < 70; i++) {
  const s = await mg();
  // an enemy just ahead (to the right, within heavy reach)?
  const inRange = s.enemyXs.some((x) => x - s.px > 8 && x - s.px < 74);
  await call("set", { right: !inRange }); // advance until one is in reach, then stop
  if (inRange) await call("heavy");
  await sleep(120);
  if (i % 8 === 7) console.log(`  t+${((i + 1) * 0.12).toFixed(1)}s px=${s.px} defeated=${s.defeated} enemyXs=[${s.enemyXs}]`);
  if (s.defeated > before) break;
}
await call("set", { right: false });
const after = await mg();
check("heavy attack finishes enemies", after.defeated > before, `defeated ${before}->${after.defeated}`);
await page.screenshot({ path: join(outDir, "01-after-heavy.png") });

console.log(results.every(Boolean) ? "ALL FEATURE-E CHECKS PASS" : "SOME CHECKS FAILED");
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
