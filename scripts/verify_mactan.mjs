// Focused development verification for the current Mactan defense mini-game.
// Starts a local Vite server unless MACTAN_BASE_URL is supplied.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const PORT = 5174;
const baseUrl = process.env.MACTAN_BASE_URL || `http://127.0.0.1:${PORT}`;
const shotsDir = process.env.MACTAN_SHOTS_DIR || join(tmpdir(), "basaquest-mactan-verification");
const useExistingServer = Boolean(process.env.MACTAN_BASE_URL);
const failures = [];
const browserErrors = [];
let server;

mkdirSync(shotsDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (name, condition, detail = "") => {
  const line = `${condition ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`;
  console.log(line);
  if (!condition) failures.push(line);
};

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // The Vite server has not finished starting.
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

function startServer() {
  if (useExistingServer) return;
  server = spawn(process.execPath, [join(process.cwd(), "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"], {
    cwd: process.cwd(),
    stdio: "pipe",
    windowsHide: true,
  });
  server.stderr.on("data", (chunk) => process.stderr.write(chunk));
}

async function tapGame(page, x, y) {
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("Phaser canvas was not found");
  const scale = Math.min(box.width / 800, box.height / 600);
  const offsetX = box.x + (box.width - 800 * scale) / 2;
  const offsetY = box.y + (box.height - 600 * scale) / 2;
  await page.mouse.click(offsetX + x * scale, offsetY + y * scale);
}

async function touchGame(page, x, y) {
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("Phaser canvas was not found");
  const scale = Math.min(box.width / 800, box.height / 600);
  const offsetX = box.x + (box.width - 800 * scale) / 2;
  const offsetY = box.y + (box.height - 600 * scale) / 2;
  await page.touchscreen.tap(offsetX + x * scale, offsetY + y * scale);
}

const state = (page) => page.evaluate(() => window.__mg?.state() ?? null);
const call = (page, method, arg) => page.evaluate(([name, value]) => {
  const hook = window.__mg;
  if (!hook || typeof hook[name] !== "function") return undefined;
  return value === undefined ? hook[name]() : hook[name](value);
}, [method, arg]);

async function waitFor(page, predicate, description) {
  await page.waitForFunction(predicate, undefined, { timeout: 8000 });
  console.log(`ready: ${description}`);
}

async function enterMactan(browser, name, language = "fil", touch = false) {
  const page = await browser.newPage({ viewport: { width: 900, height: 680 }, hasTouch: touch });
  page.on("pageerror", (error) => browserErrors.push(`[${name}] pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`[${name}] console: ${message.text()}`);
  });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await sleep(900);
  const tap = touch ? touchGame : tapGame;
  if (language === "en") {
    await tap(page, 475, 520);
    await sleep(300);
  }
  await tap(page, 400, 198);
  await sleep(1000);
  for (let attempt = 0; attempt < 90; attempt++) {
    if (await state(page)) break;
    await tap(page, 400, 320);
    await sleep(260);
  }
  if (!await state(page)) throw new Error(`${name}: Mactan mini-game did not start`);
  await page.evaluate(() => {
    window.__mactanTestResult = undefined;
    window.addEventListener("mactan-mini-game-complete", (event) => {
      window.__mactanTestResult = event.detail;
    }, { once: true });
  });
  return page;
}

async function waitForRegroup(page) {
  await waitFor(page, () => window.__mg && !window.__mg.state().regrouping, "regroup complete");
}

async function waitForResult(page) {
  await page.waitForFunction(() => window.__mactanTestResult !== undefined, undefined, { timeout: 4000 });
  return page.evaluate(() => window.__mactanTestResult);
}

async function ensureEnemy(page) {
  if ((await state(page)).enemies === 0) await call(page, "spawnEnemy");
}

async function repelSix(page) {
  for (let count = 0; count < 6; count++) {
    await ensureEnemy(page);
    check(`repel helper ${count + 1} accepted`, await call(page, "repel") === true);
    await sleep(40);
  }
}

async function forceBreach(page) {
  await ensureEnemy(page);
  check("breach helper accepted", await call(page, "breach") === true);
  await waitForRegroup(page);
}

async function runVictory(browser) {
  const page = await enterMactan(browser, "victory");
  await page.screenshot({ path: join(shotsDir, "01-shoreline.png") });
  await repelSix(page);
  const result = await waitForResult(page);
  check("six repels produce success", result.recovery === false && result.defeated === 6, JSON.stringify(result));
  await page.screenshot({ path: join(shotsDir, "06-success.png") });
  await page.close();
}

async function captureControlHuds(browser) {
  for (const [language, filename] of [["fil", "08-controls-filipino.png"], ["en", "09-controls-english.png"]]) {
    const page = await enterMactan(browser, `controls-${language}`, language, true);
    await touchGame(page, 400, 300);
    await sleep(100);
    await page.screenshot({ path: join(shotsDir, filename) });
    await page.close();
  }
}

async function runRecovery(browser) {
  const page = await enterMactan(browser, "recovery");
  await forceBreach(page);
  await forceBreach(page);
  await ensureEnemy(page);
  check("third breach helper accepted", await call(page, "breach") === true);
  const result = await waitForResult(page);
  check("third breach produces recovery", result.recovery === true && result.breaches === 3, JSON.stringify(result));
  await page.screenshot({ path: join(shotsDir, "07-recovery.png") });
  await page.close();
}

async function runMixedOutcome(browser, breachCount) {
  const page = await enterMactan(browser, `mixed-${breachCount}`);
  for (let count = 0; count < breachCount; count++) await forceBreach(page);
  const afterBreaches = await state(page);
  check(`${breachCount} breach run remains unfinished`, !afterBreaches.done && afterBreaches.enemies === 0 && afterBreaches.defeated === 0 && afterBreaches.breaches === breachCount);
  check(`${breachCount} breach run can spawn a replacement`, afterBreaches.spawnEligible === true);
  await repelSix(page);
  const result = await waitForResult(page);
  check(`${breachCount} breach run reaches six-repel success`, result.recovery === false && result.defeated === 6, JSON.stringify(result));
  await page.close();
}

async function runSignals(browser) {
  const page = await enterMactan(browser, "signals");
  await call(page, "setLinePressure", 1600);
  await sleep(40);
  let before = await state(page);
  check("Fall Back is unavailable before 1800 ms pressure", before.fallbackIntroduced === false && before.fallbackAvailable === false);
  await call(page, "fallBack");
  check("early Fall Back does not change the Shoreline stage", (await state(page)).stageId === "shoreline");

  await call(page, "setLinePressure", 1800);
  await waitFor(page, () => window.__mg?.state().fallbackIntroduced === true, "Fall Back introduction");
  before = await state(page);
  const enemyHp = before.enemyHps[0];
  const breaches = before.breaches;
  check("Fall Back becomes valid under meaningful pressure", before.fallbackAvailable === true);
  await page.screenshot({ path: join(shotsDir, "02-fallback-tutorial.png") });
  await call(page, "fallBack");
  await waitForRegroup(page);
  let after = await state(page);
  check("first Fall Back reaches Beach", after.stageId === "beach");
  check("Fall Back preserves breaches and the threatened enemy health", after.breaches === breaches && after.enemyHps.includes(enemyHp));
  check("Beach defense recovery is capped", after.defenseValue <= 66, `defenseValue=${after.defenseValue}`);
  await page.screenshot({ path: join(shotsDir, "03-beach.png") });

  await call(page, "setLinePressure", 1800);
  await sleep(80);
  await call(page, "fallBack");
  await waitForRegroup(page);
  after = await state(page);
  check("second Fall Back reaches Village Edge", after.stageId === "village_edge");
  check("Village Edge defense recovery is capped", after.defenseValue <= 33, `defenseValue=${after.defenseValue}`);
  await page.screenshot({ path: join(shotsDir, "04-village-edge.png") });

  await call(page, "setLinePressure", 1800);
  await sleep(80);
  await call(page, "fallBack");
  check("Fall Back remains unavailable at Village Edge", (await state(page)).stageId === "village_edge");

  await page.close();
}

async function runHold(browser) {
  const page = await enterMactan(browser, "hold");
  await call(page, "setLinePressure", 0);
  await call(page, "hold");
  await sleep(40);
  const current = await state(page);
  check("Hold affects at most two responders", current.holdResponders > 0 && current.holdResponders <= 2, `responders=${current.holdResponders}`);
  await page.close();
}

async function runAdvance(browser) {
  const page = await enterMactan(browser, "advance");
  await call(page, "setEnemyExposed");
  await waitFor(page, () => window.__mg?.state().advanceIntroduced === true, "Advance introduction");
  let current = await state(page);
  check("Advance becomes valid at a safe opening", current.advanceAvailable === true);
  await page.screenshot({ path: join(shotsDir, "05-advance-tutorial.png") });
  await call(page, "advance");
  await sleep(40);
  current = await state(page);
  check("Advance affects at most two responders", current.advanceResponders > 0 && current.advanceResponders <= 2, `responders=${current.advanceResponders}`);
  await sleep(720);
  await call(page, "setLinePressure", 0);
  await waitFor(page, () => window.__mg && window.__mg.state().advanceResponders === 0, "Advance clears when line pressure returns");
  current = await state(page);
  check("line pressure ends Advance without a breach", current.breaches === 0 && current.advanceResponders === 0);
  await page.close();
}

try {
  startServer();
  await waitForServer();
  const browser = await chromium.launch();
  try {
    await runVictory(browser);
    await runRecovery(browser);
    await runMixedOutcome(browser, 1);
    await runMixedOutcome(browser, 2);
    await runSignals(browser);
    await runHold(browser);
    await runAdvance(browser);
    await captureControlHuds(browser);
  } finally {
    await browser.close();
  }
} catch (error) {
  failures.push(`ERROR — ${error instanceof Error ? error.message : String(error)}`);
} finally {
  if (server) server.kill();
}

if (browserErrors.length) {
  console.log("Browser errors:");
  for (const error of browserErrors) console.log(error);
  failures.push(...browserErrors);
}
console.log(`Screenshots: ${shotsDir}`);
if (failures.length) {
  console.log("Failures:");
  for (const failure of failures) console.log(failure);
}
console.log(failures.length ? `Mactan verification failed (${failures.length})` : "Mactan verification passed");
process.exit(failures.length ? 1 : 0);
