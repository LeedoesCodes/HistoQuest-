// Focused verification for the Mactan Formation Combat PHASE 1 SANDBOX.
//
// Separate from verify_mactan.mjs, which verifies the relay fallback and must
// stay untouched and green. Starts a local Vite server unless
// MACTAN_FORMATION_BASE_URL is supplied.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const PORT = 5175;
const baseUrl = process.env.MACTAN_FORMATION_BASE_URL || `http://127.0.0.1:${PORT}`;
const shotsDir = process.env.MACTAN_FORMATION_SHOTS_DIR || join(tmpdir(), "basaquest-mactan-formation");
const useExistingServer = Boolean(process.env.MACTAN_FORMATION_BASE_URL);
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

const state = (page) => page.evaluate(() => window.__mactanFormation?.state() ?? null);
const call = (page, method, args = []) => page.evaluate(([name, values]) => {
  const hook = window.__mactanFormation;
  if (!hook || typeof hook[name] !== "function") return undefined;
  return hook[name](...values);
}, [method, args]);

async function openSandbox(browser, name, language = "fil") {
  const page = await browser.newPage({ viewport: { width: 900, height: 680 } });
  page.on("pageerror", (error) => browserErrors.push(`[${name}] pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`[${name}] console: ${message.text()}`);
  });
  const url = `${baseUrl}/?sandbox=mactan_formation_combat${language === "en" ? "&lang=en" : ""}`;
  await page.goto(url, { waitUntil: "networkidle" });
  for (let attempt = 0; attempt < 40; attempt++) {
    if (await state(page)) break;
    await sleep(250);
  }
  if (!await state(page)) throw new Error(`${name}: Formation Combat sandbox did not start`);
  return page;
}

async function shoot(page, filename) {
  await page.screenshot({ path: join(shotsDir, filename) });
}

async function run() {
  startServer();
  await waitForServer();
  const browser = await chromium.launch();

  try {
    // ---- 1. the new presenter launches under its registry key ----
    const page = await openSandbox(browser, "sandbox");
    const initial = await state(page);
    check("1. presenter launches under mactan_formation_combat", initial !== null);
    check("1b. world is reoriented (sea above the fighting line)", initial.enemy.y < initial.player.y,
      `enemy y=${Math.round(initial.enemy.y)} player y=${Math.round(initial.player.y)}`);
    check("1c. player starts in the shallows fighting zone", initial.player.band === "shallows", initial.player.band);
    await shoot(page, "01-initial-fil.png");

    // ---- 3. movement respects Phase 1 bounds ----
    await call(page, "movePlayerTo", [99999, 99999]);
    const clampedHigh = await state(page);
    await call(page, "movePlayerTo", [-99999, -99999]);
    const clampedLow = await state(page);
    check("3. movement clamps to the sandbox x bounds",
      clampedHigh.player.x === initial.bounds.maxX && clampedLow.player.x === initial.bounds.minX,
      `${clampedLow.player.x}..${clampedHigh.player.x}`);
    check("3b. movement clamps to the fighting-zone y bounds",
      clampedHigh.player.y === initial.bounds.maxY && clampedLow.player.y === initial.bounds.minY,
      `${clampedLow.player.y}..${clampedHigh.player.y}`);
    check("3c. the player never enters the village band", clampedHigh.player.y < initial.bounds.villageTop,
      `maxY=${clampedHigh.player.y} villageTop=${initial.bounds.villageTop}`);

    // ---- 4. attack transitions windup -> active -> recovery ----
    await call(page, "resetSandbox");
    await call(page, "movePlayerTo", [1000, 400]);
    await call(page, "attack");
    const phases = new Set();
    for (let i = 0; i < 40; i++) {
      const s = await state(page);
      phases.add(s.player.attackPhase);
      await sleep(25);
    }
    check("4. attack passes through wind-up", phases.has("windup"));
    check("4b. attack passes through an active window", phases.has("active"));
    check("4c. attack passes through recovery", phases.has("recovery"));
    check("4d. attack returns to idle", phases.has("none"));

    // ---- 5. attack pushes / staggers the invader ----
    await call(page, "resetSandbox");
    const beforeHit = await state(page);
    await call(page, "forceEnemyHit");
    const afterHit = await state(page);
    check("5. attack reduces invader repel stability",
      afterHit.enemy.repelStability < beforeHit.enemy.repelStability,
      `${beforeHit.enemy.repelStability} -> ${afterHit.enemy.repelStability}`);
    check("5b. attack pushes the invader seaward (upward)", afterHit.enemy.y < beforeHit.enemy.y,
      `y ${Math.round(beforeHit.enemy.y)} -> ${Math.round(afterHit.enemy.y)}`);
    check("5c. a single hit chips poise without staggering", afterHit.enemy.staggered === false && afterHit.enemy.poise < 100,
      `poise=${afterHit.enemy.poise}`);
    await shoot(page, "02-attack-exchange.png");

    // ---- POISE: no permanent stunlock; only a poise break staggers ----
    await call(page, "resetSandbox");
    await call(page, "forceEnemyHit");
    const poise1 = await state(page);
    await call(page, "forceEnemyHit");
    const poise2 = await state(page);
    check("P1. poise depletes across successive hits", poise2.enemy.poise < poise1.enemy.poise,
      `${poise1.enemy.poise} -> ${poise2.enemy.poise}`);
    check("P2. the invader is not staggered before the break", poise2.enemy.staggered === false);
    await call(page, "forceEnemyHit");
    const poise3 = await state(page);
    check("P3. a poise break staggers the invader", poise3.enemy.staggered === true);
    check("P4. poise refills on the break", poise3.enemy.poise === 100, `poise=${poise3.enemy.poise}`);

    // ---- STABILITY REGEN: an unpressured invader recovers ----
    await call(page, "resetSandbox");
    await call(page, "forceEnemyHit");
    await call(page, "forceEnemyHit");
    const beforeRegen = (await state(page)).enemy.repelStability;
    await sleep(1400);
    const afterRegen = (await state(page)).enemy.repelStability;
    check("S1. repel stability regenerates when pressure stops", afterRegen > beforeRegen,
      `${beforeRegen.toFixed(1)} -> ${afterRegen.toFixed(1)}`);

    // ---- HOLD ALONE: a lone defender cannot repel an ordinary invader ----
    // Attacks are issued at the player's ideal cadence with the ally parked.
    await call(page, "resetSandbox");
    await call(page, "parkAlly");
    for (let i = 0; i < 20; i++) {
      await call(page, "forceEnemyHit");
      await sleep(600);
    }
    const loneResult = await state(page);
    check("S2. a lone defender HOLDS but does not repel (spec §10)",
      loneResult.enemy.repelStability > 0 && loneResult.enemy.state !== "withdrawing" && loneResult.enemy.state !== "repelled",
      `stability=${loneResult.enemy.repelStability.toFixed(1)} state=${loneResult.enemy.state}`);

    // ---- 6. brace substantially reduces a forced hit ----
    await call(page, "resetSandbox");
    await call(page, "brace", [false]);
    const preUnbraced = (await state(page)).player.composure;
    await call(page, "forcePlayerHit");
    const unbracedLoss = preUnbraced - (await state(page)).player.composure;

    await call(page, "resetSandbox");
    await call(page, "brace", [true]);
    const bracedState = await state(page);
    const preBraced = bracedState.player.composure;
    check("6a. brace reports as active", bracedState.player.braced === true);
    await shoot(page, "03-brace.png");
    await call(page, "forcePlayerHit");
    const afterBraced = await state(page);
    const bracedLoss = preBraced - afterBraced.player.composure;
    check("6. brace substantially reduces footing loss",
      bracedLoss < unbracedLoss * 0.5,
      `unbraced=${unbracedLoss.toFixed(1)} braced=${bracedLoss.toFixed(1)}`);
    check("6b. brace prevents the stagger", afterBraced.player.staggered === false);

    // ---- GUARD: brace is a resource, not a permanent stance ----
    await call(page, "resetSandbox");
    const guardFull = (await state(page)).player.guard;
    await call(page, "brace", [true]);
    await sleep(900);
    const guardDrained = (await state(page)).player.guard;
    check("G1. guard drains while brace is held", guardDrained < guardFull,
      `${guardFull.toFixed(1)} -> ${guardDrained.toFixed(1)}`);
    await call(page, "brace", [false]);
    await sleep(1200);
    const guardRecovered = (await state(page)).player.guard;
    check("G2. guard recovers once brace is released", guardRecovered > guardDrained,
      `${guardDrained.toFixed(1)} -> ${guardRecovered.toFixed(1)}`);

    await call(page, "resetSandbox");
    await call(page, "setGuard", [25]);
    await call(page, "brace", [true]);
    await call(page, "forcePlayerHit");
    await call(page, "forcePlayerHit");
    const broken = await state(page);
    check("G3. absorbing hits with low guard breaks it", broken.player.braced === false && broken.player.guard === 0,
      `braced=${broken.player.braced} guard=${broken.player.guard}`);
    check("G4. a guard break exposes the player", broken.player.staggered === true || broken.player.knocked === true);

    // Composure must NOT regenerate while bracing — previously a braced player
    // gained composure faster than the invader could remove it.
    await call(page, "resetSandbox");
    await call(page, "forcePlayerHit");           // unbraced: drops composure
    await sleep(700);                             // clear the stagger
    await call(page, "brace", [true]);
    const bracedBefore = (await state(page)).player.composure;
    await sleep(1200);
    const bracedAfter = (await state(page)).player.composure;
    check("G5. composure does not regenerate while bracing",
      Math.abs(bracedAfter - bracedBefore) < 1,
      `${bracedBefore.toFixed(1)} -> ${bracedAfter.toFixed(1)}`);
    await call(page, "brace", [false]);
    await sleep(1200);
    const releasedAfter = (await state(page)).player.composure;
    check("G6. composure regenerates again once brace is released",
      releasedAfter > bracedAfter + 1, `${bracedAfter.toFixed(1)} -> ${releasedAfter.toFixed(1)}`);
    await shoot(page, "08-guard.png");

    // ---- 7. dash repositions and deals no damage ----
    await call(page, "resetSandbox");
    await call(page, "movePlayerTo", [1200, 400]);
    const preDash = await state(page);
    await call(page, "dash", [-1, 0]);
    await sleep(300);
    const postDash = await state(page);
    check("7. dash moves the player", Math.abs(postDash.player.x - preDash.player.x) > 100,
      `${Math.round(preDash.player.x)} -> ${Math.round(postDash.player.x)}`);
    check("7b. dash deals no damage to the invader",
      postDash.enemy.repelStability === preDash.enemy.repelStability,
      `${preDash.enemy.repelStability} -> ${postDash.enemy.repelStability}`);
    check("7c. dash goes on cooldown", postDash.player.dashCd > 0);

    // ---- 8. footing depletion knocks the player down, then recovers ----
    await call(page, "resetSandbox");
    await call(page, "brace", [false]);
    for (let i = 0; i < 6; i++) await call(page, "forcePlayerHit");
    const knocked = await state(page);
    check("8. footing depletion causes a knockdown", knocked.player.knocked === true,
      `composure=${knocked.player.composure.toFixed(1)}`);
    await shoot(page, "04-knockdown.png");
    await sleep(2200);
    const recovered = await state(page);
    check("8b. the player recovers and returns to play", recovered.player.knocked === false,
      `composure=${recovered.player.composure.toFixed(1)}`);
    check("8c. recovery restores footing", recovered.player.composure > 0);
    await shoot(page, "05-recovery.png");

    // ---- 9. the ally engages persistently, with no timed disengage ----
    // 6.5 s is deliberately longer than the relay design's 4.2 s response
    // window — a timed disengage would show up as the ally drifting away.
    await call(page, "resetSandbox");
    await call(page, "movePlayerTo", [900, 460]);
    let allyEverIdleFar = false;
    let maxDistanceAfterContact = 0;
    let contacted = false;
    for (let i = 0; i < 26; i++) {
      const s = await state(page);
      if (s.ally.engagedDistance < 60) contacted = true;
      if (contacted) {
        maxDistanceAfterContact = Math.max(maxDistanceAfterContact, s.ally.engagedDistance);
        if (s.ally.engagedDistance > 200) allyEverIdleFar = true;
      }
      await sleep(250);
    }
    check("9. the ally closes on the invader", contacted);
    check("9b. the ally never disengages on a timer", !allyEverIdleFar,
      `max distance after contact=${Math.round(maxDistanceAfterContact)}`);

    // ---- 10. the invader withdraws seaward when repel stability is exhausted ----
    await call(page, "resetSandbox");
    await call(page, "resolveEnemy");
    const withdrawing = await state(page);
    check("10. exhausted repel stability starts a seaward withdrawal",
      withdrawing.enemy.state === "withdrawing", withdrawing.enemy.state);
    await sleep(400);
    const midWithdraw = await state(page);
    check("10b. the invader actually moves seaward", midWithdraw.enemy.y < withdrawing.enemy.y,
      `y ${Math.round(withdrawing.enemy.y)} -> ${Math.round(midWithdraw.enemy.y)}`);
    await shoot(page, "06-withdrawal.png");
    let repelled = false;
    for (let i = 0; i < 40; i++) {
      const s = await state(page);
      if (s.enemy.state === "repelled") { repelled = true; break; }
      await sleep(150);
    }
    check("10c. the invader is repelled off the seaward edge", repelled);

    // ---- SANDBOX LOOP: a repelled invader is replaced automatically ----
    const countAfterRepel = (await state(page)).repelledCount;
    check("L1. a repel is counted", countAfterRepel >= 1, `count=${countAfterRepel}`);
    let respawned = false;
    for (let i = 0; i < 40; i++) {
      const s = await state(page);
      if (s.enemy.state === "wading" && s.enemy.repelStability === 100) { respawned = true; break; }
      await sleep(200);
    }
    check("L2. a fresh invader arrives without a manual reset", respawned);

    // ---- the invader never enters the village band ----
    await call(page, "resetSandbox");
    await call(page, "movePlayerTo", [1200, 465]);
    let enemyEnteredVillage = false;
    for (let i = 0; i < 40; i++) {
      const s = await state(page);
      if (s.enemy.y >= s.bounds.villageTop) enemyEnteredVillage = true;
      await sleep(150);
    }
    check("10d. the invader never enters the village band", !enemyEnteredVillage);

    await page.close();

    // ---- English pass (localized HUD) ----
    const pageEn = await openSandbox(browser, "sandbox-en", "en");
    await shoot(pageEn, "07-initial-en.png");
    check("11a. the English sandbox starts cleanly", (await state(pageEn)) !== null);
    await pageEn.close();

    // ---- 2. the relay presenter is untouched and still registered ----
    const relayPage = await browser.newPage({ viewport: { width: 900, height: 680 } });
    relayPage.on("pageerror", (error) => browserErrors.push(`[relay] pageerror: ${error.message}`));
    await relayPage.goto(`${baseUrl}/?sandbox=mactan_defense`, { waitUntil: "networkidle" });
    let relayStarted = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      if (await relayPage.evaluate(() => Boolean(window.__mg))) { relayStarted = true; break; }
      await sleep(250);
    }
    check("2. the relay presenter still resolves under mactan_defense", relayStarted);
    const relayLeak = await relayPage.evaluate(() => Boolean(window.__mactanFormation));
    check("2b. the relay presenter exposes no Formation Combat hook", !relayLeak);
    await relayPage.close();

    // ---- 11. no browser console or page errors ----
    check("11. no browser console or page errors", browserErrors.length === 0, browserErrors.join(" | "));
  } finally {
    await browser.close();
    server?.kill();
  }

  // ---- 12. the production build contains no development hook identifier ----
  const distAssets = join(process.cwd(), "dist", "assets");
  if (existsSync(distAssets)) {
    const bundles = readdirSync(distAssets).filter((f) => f.endsWith(".js"));
    const leaked = bundles.filter((f) => readFileSync(join(distAssets, f), "utf8").includes("__mactanFormation"));
    check("12. the production build contains no dev hook identifier", leaked.length === 0,
      leaked.length ? `found in ${leaked.join(", ")}` : `checked ${bundles.length} bundle(s)`);
  } else {
    check("12. the production build contains no dev hook identifier", false,
      "dist/assets not found — run `npm run build` before this suite");
  }

  console.log(`Screenshots: ${shotsDir}`);
  if (failures.length) {
    console.error(`\nFormation Combat verification FAILED (${failures.length}):`);
    for (const line of failures) console.error(`  ${line}`);
    process.exit(1);
  }
  console.log("Formation Combat Phase 1 verification passed");
}

run().catch((error) => {
  console.error(error);
  server?.kill();
  process.exit(1);
});
