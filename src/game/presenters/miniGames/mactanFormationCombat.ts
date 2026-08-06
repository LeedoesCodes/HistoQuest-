import Phaser from "phaser";
import type { MiniGameNode, MiniGameResult } from "../../content/types";
import { COLORS, FONT } from "../../ui/theme";
import { burst, floatText, shake } from "../../ui/juice";
import { sfx } from "../../ui/sfx";
import { t, type MessageKey } from "../../i18n";
import { ensureMactanEnemyAnims, ensureMactanAllyAnims, animKeyFor, MACTAN_ENEMY, MACTAN_ALLY } from "../../assets/sprites";

/**
 * Mactan Formation Combat — PHASE 1 SANDBOX.
 *
 * The first implementation milestone of the redesign specified in
 * `docs/MACTAN_FORMATION_COMBAT_SPEC.md`. This is an isolated combat sandbox
 * that proves the adult-defender combat feel BEFORE formation AI exists.
 *
 * Deliberately NOT here (Phase 2+): formation slots, pressure points, formation
 * commands, encounter phases, the leader, scoring, and semi-scrolling.
 *
 * Orientation (spec §4) — this is a full reorientation from the relay build:
 *   - the long x-axis is the SHORELINE, the short y-axis is SEA-TO-VILLAGE DEPTH;
 *   - sea at the TOP, village at the BOTTOM;
 *   - invaders wade DOWN; repelled invaders are pushed back UP toward the sea.
 * Nothing from the relay presenter's side-view geometry is reused.
 *
 * Combat is footing/composure + knockdown, never lethal HP; invaders are
 * repelled seaward, never killed (spec §10).
 *
 * The relay presenter (`mactanDefense.ts`, key `mactan_defense`) is untouched
 * and remains the routed implementation and verified fallback.
 *
 * Cleanup (the CRITICAL rule): every object lives in one of four containers
 * destroyed on exit, every listener is removed, and the DEV hook is deleted.
 */

// ---------------------------------------------------------------------------
// World and depth bands (spec §4.2). Band y ranges are TUNABLE starting values.
// ---------------------------------------------------------------------------
const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 600;

const BAND_HORIZON_BOTTOM = 90;   // 0..90    scenic only
const BAND_DEEP_BOTTOM = 210;     // 90..210  deep-water enemy approach
const BAND_CORAL_BOTTOM = 320;    // 210..320 coral reef
const BAND_SHALLOWS_BOTTOM = 470; // 320..470 shallows / active fighting zone
                                  // 470..600 village / home — enemies never enter

type Band = "horizon" | "deep" | "coral" | "shallows" | "village";

function bandAt(y: number): Band {
  if (y < BAND_HORIZON_BOTTOM) return "horizon";
  if (y < BAND_DEEP_BOTTOM) return "deep";
  if (y < BAND_CORAL_BOTTOM) return "coral";
  if (y < BAND_SHALLOWS_BOTTOM) return "shallows";
  return "village";
}

// Terrain multipliers (spec §12.3). TUNABLE starting playtest values.
const MOVE_MULT_DEEP = 0.5;
const MOVE_MULT_CORAL = 0.65;
const MOVE_MULT_SHALLOWS = 0.8;
const MOVE_MULT_DEFENDER = 1.0;      // defenders move normally in the fighting zone
const CORAL_RECOVERY_MULT = 1.35;    // staggered/pushed invaders recover slower in coral

function invaderMoveMult(y: number): number {
  const band = bandAt(y);
  if (band === "deep" || band === "horizon") return MOVE_MULT_DEEP;
  if (band === "coral") return MOVE_MULT_CORAL;
  return MOVE_MULT_SHALLOWS;
}

// ---------------------------------------------------------------------------
// Phase 1 sandbox framing. One STATIC camera window (spec §4.6 permits this for
// Phase 1); semi-scrolling is deliberately not implemented yet.
// ---------------------------------------------------------------------------
const CAMERA_SCROLL_X = 800;         // visible world x: 800..1600
const SANDBOX_MIN_X = 860;
const SANDBOX_MAX_X = 1540;
const DEFENDER_MIN_Y = 325;          // defenders operate inside the fighting zone
const DEFENDER_MAX_Y = 465;
const ENEMY_MIN_Y = 70;              // repelled off the top of the deep-water band
const ENEMY_MAX_Y = BAND_SHALLOWS_BOTTOM - 10; // hard stop: never enters the village

const PLAYER_START_X = 1100;
const PLAYER_START_Y = 415;
const ALLY_START_X = 1290;
const ALLY_START_Y = 400;
const ENEMY_START_X = 1200;
// Low enough in the deep-water band that the ~100px sprite clears the HUD
// header text above it (found by screenshot, not by state inspection).
const ENEMY_START_Y = 180;
// A withdrawing invader fades out across this stretch instead of sliding up
// underneath the HUD text.
const WITHDRAW_FADE_FROM = 150;

// ---------------------------------------------------------------------------
// Player (spec §7). All values TUNABLE starting points inside the approved ranges.
// ---------------------------------------------------------------------------
const PLAYER_SPEED = 190;
const ATTACK_WINDUP = 210;           // approved range 180–240 ms
const ATTACK_ACTIVE = 90;
const ATTACK_RECOVERY = 300;         // approved range 250–350 ms
const ATTACK_RANGE = 36;             // approved range 30–40 px
const DASH_DISTANCE = 160;           // approved range 140–180 px
const DASH_DURATION = 170;
const DASH_COOLDOWN = 1000;          // approved range 0.9–1.2 s
// Dash repositions ONLY: no damage and (initially) no i-frames.
const BRACE_FOOTING_MULT = 0.15;     // brace blocks most footing loss...
// ...and blocks stagger entirely while active at impact.

// GUARD (brace as a resource, not a permanent stance). Brace used to be free:
// a braced defender lost 3.9 footing per hit against 6/s regen, i.e. gained
// composure while under attack, with no cost but slower walking. Guard makes
// holding it a decision without removing the ability to attack from it.
const GUARD_MAX = 100;
const GUARD_DRAIN = 20;              // per second while brace is held
const GUARD_BLOCK_COST = 22;         // per hit absorbed while bracing
const GUARD_REGEN = 26;              // per second once brace is released
const GUARD_REGEN_DELAY = 500;       // ms after releasing before guard recovers
const GUARD_BREAK_STAGGER = 700;     // ms of exposure when guard is emptied
const GUARD_BREAK_FOOTING = 15;      // footing lost on a guard break

const COMPOSURE_MAX = 100;
const KNOCKDOWN_MS = 1600;           // approved range 1.4–2 s
const KNOCKDOWN_RECOVER_TO = 60;     // composure restored on standing up
const COMPOSURE_REGEN = 6;           // per second — paused while bracing

// Player attack effect on an invader: push + poise chip, never damage.
// Lowered from 14: the player is not a stronger unit (spec §10), and at 14 a
// lone player repelled an invader in ~5 s, which inverted the frozen
// "one holds / two repel" equation.
const PLAYER_REPEL_DMG = 10;
const PLAYER_PUSH_DISTANCE = 26;     // pushed seaward (up)
const PLAYER_STAGGER_MS = 380;

// ---------------------------------------------------------------------------
// Invader poise (spec §10). Hits CHIP poise; only a poise BREAK staggers. This
// removes the permanent stunlock: previously every hit cancelled the invader's
// 520 ms windup on a 600 ms attack cycle, so it could never act.
// ---------------------------------------------------------------------------
const POISE_MAX = 100;
const POISE_PLAYER_HIT = 40;
const POISE_ALLY_HIT = 20;
const POISE_REGEN = 45;              // per second, after the recovery delay
const POISE_RECOVER_DELAY = 800;     // ms since the last hit before poise recovers

// ---------------------------------------------------------------------------
// Repel-stability regeneration (spec §10) — the core educational mechanic:
// one defender roughly HOLDS an ordinary invader, two clearly REPEL it.
// Regen pauses while the invader is staggered, so a poise break is the window
// in which damage actually sticks — which is what makes a second defender matter.
// ---------------------------------------------------------------------------
const STABILITY_REGEN = 16;          // per second, while not staggered

// ---------------------------------------------------------------------------
// Ally (spec §8). Phase 1 uses the simplest persistent engagement possible:
// close on the invader and keep attacking. NO timed relay response, NO leash,
// NO formation slot — those are Phase 2.
// ---------------------------------------------------------------------------
const ALLY_SPEED = 150;
const ALLY_RANGE = 52;               // reach; also how close the ally will stand
const ALLY_STANDOFF_X = 34;          // lateral offset so defenders flank, not overlap
const ALLY_ATTACK_CD = 900;
const ALLY_REPEL_DMG = 8;
const ALLY_PUSH_DISTANCE = 12;
const ALLY_STAGGER_MS = 260;

// ---------------------------------------------------------------------------
// Standard invader (spec §9).
// ---------------------------------------------------------------------------
const ENEMY_BASE_SPEED = 62;         // multiplied by the band multiplier
const ENEMY_RANGE = 42;
const ENEMY_WINDUP = 520;            // readable telegraph
const ENEMY_ACTIVE = 110;
const ENEMY_RECOVERY = 640;
const ENEMY_HIT_FOOTING = 26;        // footing loss inflicted on a defender
const ENEMY_HIT_STAGGER_MS = 420;
const REPEL_STABILITY_MAX = 100;
const WITHDRAW_SPEED = 170;          // seaward retreat, still terrain-limited
// The sandbox runs continuously for playtesting: a repelled invader is replaced.
// This is NOT an encounter phase — there is no quota, pacing, or completion.
const RESPAWN_DELAY = 2500;

// Lightweight hit feedback (existing assets only — no new artwork).
const HITSTOP_MS = 70;
const FLASH_MS = 90;
const RECOIL_MS = 130;
const RECOIL_PX = 7;

type ActionPhase = "none" | "windup" | "active" | "recovery";
type EnemyState = "wading" | "engaging" | "attacking" | "staggered" | "withdrawing" | "repelled";

interface Defender {
  c: Phaser.GameObjects.Container;
  sprite?: Phaser.GameObjects.Sprite;
  baseTint: number;
  x: number;
  y: number;
  facing: number;
  composure: number;
  knockedMs: number;
  staggerMs: number;
  attackPhase: ActionPhase;
  attackTimer: number;
  attackLanded: boolean;
  moving: boolean;
  flashMs: number;
  recoilMs: number;
  recoilDir: number;
  anim: string;
}

/**
 * Phase 1 combat sandbox. Resolves a `MiniGameResult` when the player presses
 * DONE — there is no win condition here, because encounter phases are Phase 6.
 */
export function playMactanFormationCombat(
  scene: Phaser.Scene,
  _node: MiniGameNode
): Promise<MiniGameResult> {
  return new Promise((resolve) => {
    const { width, height } = scene.scale;
    const startedAt = performance.now();
    let done = false;

    const field = scene.add.container(0, 0).setDepth(10);
    const hud = scene.add.container(0, 0).setDepth(14).setScrollFactor(0);
    const controls = scene.add.container(0, 0).setDepth(15).setScrollFactor(0);
    const overlay = scene.add.container(0, 0).setDepth(20).setScrollFactor(0);

    // ---------------- TERRAIN: five readable horizontal bands ----------------
    // Bands only; no per-tile terrain, pathfinding, or procedural obstacles
    // (spec §12.2). Terrain acts purely through the movement/recovery lookups.
    const terrain = scene.add.graphics();
    terrain.fillStyle(0x16324a, 1);
    terrain.fillRect(0, 0, WORLD_WIDTH, BAND_HORIZON_BOTTOM);
    terrain.fillStyle(0x1a4a63, 1);
    terrain.fillRect(0, BAND_HORIZON_BOTTOM, WORLD_WIDTH, BAND_DEEP_BOTTOM - BAND_HORIZON_BOTTOM);
    terrain.fillStyle(0x246072, 1);
    terrain.fillRect(0, BAND_DEEP_BOTTOM, WORLD_WIDTH, BAND_CORAL_BOTTOM - BAND_DEEP_BOTTOM);
    terrain.fillStyle(0x3d8b96, 1);
    terrain.fillRect(0, BAND_CORAL_BOTTOM, WORLD_WIDTH, BAND_SHALLOWS_BOTTOM - BAND_CORAL_BOTTOM);
    terrain.fillStyle(0xc9ad82, 1);
    terrain.fillRect(0, BAND_SHALLOWS_BOTTOM, WORLD_WIDTH, WORLD_HEIGHT - BAND_SHALLOWS_BOTTOM);
    // Coral texture — readability only, no collision.
    for (let i = 0; i < 90; i++) {
      const cx = Math.random() * WORLD_WIDTH;
      const cy = BAND_DEEP_BOTTOM + 10 + Math.random() * (BAND_CORAL_BOTTOM - BAND_DEEP_BOTTOM - 20);
      terrain.fillStyle(i % 2 ? 0x5c7c68 : 0x7d6351, 0.8);
      terrain.fillTriangle(cx - 7, cy + 7, cx, cy - Phaser.Math.Between(5, 13), cx + 8, cy + 7);
    }
    // Foam lip where the shallows meet the sand.
    terrain.fillStyle(0xefe6cf, 0.85);
    terrain.fillRect(0, BAND_SHALLOWS_BOTTOM - 3, WORLD_WIDTH, 4);
    field.add(terrain);

    const bandLabelStyle = { fontFamily: FONT, fontSize: "11px", color: "#cfe4ee" };
    field.add([
      // Kept clear of the HUD bar stack above it (found by screenshot).
      scene.add.text(CAMERA_SCROLL_X + 12, 196, t("mg.formation.bandDeep"), bandLabelStyle).setAlpha(0.75),
      scene.add.text(CAMERA_SCROLL_X + 12, 258, t("mg.formation.bandCoral"), bandLabelStyle).setAlpha(0.75),
      scene.add.text(CAMERA_SCROLL_X + 12, 390, t("mg.formation.bandShallows"), bandLabelStyle).setAlpha(0.75),
      scene.add.text(CAMERA_SCROLL_X + 12, 500, t("mg.formation.bandVillage"), { ...bandLabelStyle, color: "#6b563a" }).setAlpha(0.85),
    ]);

    // ---------------- ACTORS ----------------
    // Both defenders reuse the shipped adult Mactan warrior sheet — the player
    // is an unnamed ADULT defender, not the child. Degrades to code-art.
    const useDefenderSprite = ensureMactanAllyAnims(scene);
    const useEnemySprite = ensureMactanEnemyAnims(scene);

    function makeDefender(x: number, y: number, tint: number): Defender {
      const c = scene.add.container(x, y);
      field.add(c);
      let sprite: Phaser.GameObjects.Sprite | undefined;
      if (useDefenderSprite) {
        sprite = scene.add
          .sprite(0, 0, "mactan/ally_idle")
          .setOrigin(MACTAN_ALLY.originX, MACTAN_ALLY.originY)
          .setScale(MACTAN_ALLY.scale);
        sprite.setTint(tint);
        c.add(sprite);
      } else {
        c.add([
          scene.add.rectangle(0, -8, 20, 26, tint).setOrigin(0.5, 1),
          scene.add.circle(0, -38, 9, 0xe8c9a0),
          scene.add.rectangle(-14, -26, 6, 20, 0xcbb98a),
        ]);
      }
      return { c, sprite, baseTint: tint, x, y, facing: -1, composure: COMPOSURE_MAX, knockedMs: 0, staggerMs: 0, attackPhase: "none", attackTimer: 0, attackLanded: false, moving: false, flashMs: 0, recoilMs: 0, recoilDir: 1, anim: "" };
    }

    const player = makeDefender(PLAYER_START_X, PLAYER_START_Y, 0xffd54a);
    const ally = makeDefender(ALLY_START_X, ALLY_START_Y, 0x9fd8a0);

    // Marker so the player is unmistakable in a sandbox with two similar adults.
    const playerMarker = scene.add.triangle(0, -66, 0, 10, 7, -4, -7, -4, COLORS.accent);
    player.c.add(playerMarker);

    const enemyC = scene.add.container(ENEMY_START_X, ENEMY_START_Y);
    field.add(enemyC);
    let enemySprite: Phaser.GameObjects.Sprite | undefined;
    if (useEnemySprite) {
      enemySprite = scene.add
        .sprite(0, 0, "mactan/enemy_walk")
        .setOrigin(MACTAN_ENEMY.originX, MACTAN_ENEMY.originY)
        .setScale(MACTAN_ENEMY.scale);
      enemyC.add(enemySprite);
    } else {
      enemyC.add([
        scene.add.rectangle(0, -8, 22, 30, 0x8d3b2e).setOrigin(0.5, 1),
        scene.add.circle(0, -42, 9, 0xd8cdbd),
      ]);
    }
    const enemyTelegraph = scene.add.circle(0, -54, 12, 0xe4572e, 0).setStrokeStyle(3, 0xe4572e, 0);
    enemyC.add(enemyTelegraph);

    const enemy = {
      c: enemyC,
      x: ENEMY_START_X,
      y: ENEMY_START_Y,
      state: "wading" as EnemyState,
      repelStability: REPEL_STABILITY_MAX,
      poise: POISE_MAX,
      poiseIdleMs: 0,        // ms since the last hit, gates poise recovery
      staggerMs: 0,
      attackPhase: "none" as ActionPhase,
      attackTimer: 0,
      attackLanded: false,
      target: player as Defender,
      flashMs: 0,
      recoilMs: 0,
      respawnMs: 0,
    };
    let repelledCount = 0;

    // Guard (brace) state.
    let guard = GUARD_MAX;
    let guardIdleMs = 0;
    let hitstopMs = 0;

    // ---------------- CAMERA: one static window (Phase 1) ----------------
    const camera = scene.cameras.main;
    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    camera.setScroll(CAMERA_SCROLL_X, 0);

    // ---------------- HUD ----------------
    hud.add([
      scene.add.text(width / 2, 22, t("mg.formation.title"), { fontFamily: FONT, fontSize: "17px", color: COLORS.text, fontStyle: "bold" }).setOrigin(0.5),
      scene.add.text(width / 2, 44, t("mg.formation.hint"), { fontFamily: FONT, fontSize: "11px", color: COLORS.textMuted, align: "center", wordWrap: { width: width - 40 } }).setOrigin(0.5),
    ]);

    function makeBar(x: number, y: number, w: number, labelKey: MessageKey, color: number) {
      hud.add(scene.add.text(x, y - 13, t(labelKey), { fontFamily: FONT, fontSize: "10px", color: COLORS.textMuted }).setOrigin(0, 0.5));
      hud.add(scene.add.rectangle(x, y, w, 10, 0x2a2f3f).setOrigin(0, 0.5));
      const fill = scene.add.rectangle(x, y, w, 10, color).setOrigin(0, 0.5);
      hud.add(fill);
      return { fill, w };
    }
    const playerBar = makeBar(20, 90, 150, "mg.formation.footing", COLORS.success);
    const guardBar = makeBar(20, 120, 150, "mg.formation.guard", 0x9fd8ff);
    const allyBar = makeBar(20, 150, 150, "mg.formation.allyFooting", 0x9fd8a0);
    const enemyBar = makeBar(width - 170, 90, 150, "mg.formation.repelStability", COLORS.danger);
    const poiseBar = makeBar(width - 170, 120, 150, "mg.formation.poise", 0xd9a441);
    const repelledText = scene.add.text(width - 20, 150, "", { fontFamily: FONT, fontSize: "11px", color: COLORS.textMuted }).setOrigin(1, 0.5);
    hud.add(repelledText);

    const statusText = scene.add.text(width / 2, height - 96, "", { fontFamily: FONT, fontSize: "14px", color: COLORS.accentText, fontStyle: "bold", align: "center" }).setOrigin(0.5);
    hud.add(statusText);

    // ---------------- CONTROLS (desktop + touch) ----------------
    function makeButton(x: number, y: number, w: number, label: string, onDown: () => void, onUp?: () => void) {
      const bg = scene.add.rectangle(x, y, w, 40, COLORS.panel, 0.92).setStrokeStyle(2, COLORS.panelStroke).setInteractive({ useHandCursor: true });
      const tx = scene.add.text(x, y, label, { fontFamily: FONT, fontSize: "13px", color: COLORS.text, fontStyle: "bold" }).setOrigin(0.5);
      bg.on("pointerdown", onDown);
      if (onUp) { bg.on("pointerup", onUp); bg.on("pointerout", onUp); }
      controls.add([bg, tx]);
      return bg;
    }
    makeButton(90, height - 40, 130, t("mg.formation.attack"), () => tryAttack());
    makeButton(240, height - 40, 130, t("mg.formation.brace"), () => setBrace(true), () => setBrace(false));
    makeButton(390, height - 40, 130, t("mg.formation.dash"), () => tryDash());
    makeButton(width - 80, height - 40, 120, t("mg.formation.done"), () => finish());

    // ---------------- INPUT STATE ----------------
    let braced = false;
    let dashCd = 0;
    let dashMs = 0;
    let dashVX = 0;
    let dashVY = 0;
    // Touch: tap the field to walk toward that point.
    let moveTargetX: number | null = null;
    let moveTargetY: number | null = null;

    const keys = scene.input.keyboard?.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT,E") as Record<string, Phaser.Input.Keyboard.Key> | undefined;
    scene.input.keyboard?.addCapture("SPACE,SHIFT,UP,DOWN,LEFT,RIGHT,E");

    const onKeyAttack = () => tryAttack();
    const onKeyDash = () => tryDash();
    const onBraceDown = () => setBrace(true);
    const onBraceUp = () => setBrace(false);
    scene.input.keyboard?.on("keydown-SPACE", onKeyAttack);
    scene.input.keyboard?.on("keydown-E", onKeyDash);
    scene.input.keyboard?.on("keydown-SHIFT", onBraceDown);
    scene.input.keyboard?.on("keyup-SHIFT", onBraceUp);

    const onPointerDown = (p: Phaser.Input.Pointer) => {
      if (p.y > height - 70) return; // control strip
      moveTargetX = Phaser.Math.Clamp(p.worldX, SANDBOX_MIN_X, SANDBOX_MAX_X);
      moveTargetY = Phaser.Math.Clamp(p.worldY, DEFENDER_MIN_Y, DEFENDER_MAX_Y);
    };
    scene.input.on("pointerdown", onPointerDown);

    // ---------------- ACTIONS ----------------
    function canAct(d: Defender): boolean {
      return d.knockedMs <= 0 && d.staggerMs <= 0;
    }

    function tryAttack() {
      if (done || !canAct(player) || player.attackPhase !== "none" || dashMs > 0) return;
      player.attackPhase = "windup";
      player.attackTimer = ATTACK_WINDUP;
      player.attackLanded = false;
      sfx.tap();
    }

    function setBrace(on: boolean) {
      if (done) return;
      // Attacking from brace stays allowed — brace costs guard, not tempo.
      braced = on && canAct(player) && guard > 0;
      if (braced) guardIdleMs = 0;
    }

    function tryDash(dirX?: number, dirY?: number) {
      if (done || !canAct(player) || dashCd > 0 || dashMs > 0) return;
      let dx = dirX ?? 0;
      let dy = dirY ?? 0;
      if (dx === 0 && dy === 0) { dx = player.facing; }
      const len = Math.hypot(dx, dy) || 1;
      dashVX = (dx / len) * (DASH_DISTANCE / (DASH_DURATION / 1000));
      dashVY = (dy / len) * (DASH_DISTANCE / (DASH_DURATION / 1000));
      dashMs = DASH_DURATION;
      dashCd = DASH_COOLDOWN;
      player.attackPhase = "none";
      braced = false; // dash repositions only — no damage, no i-frames
      sfx.pop();
    }

    /**
     * A defender's strike on the invader: repel damage + seaward push + poise
     * chip. Only a POISE BREAK staggers — that is what stops the old stunlock,
     * and it is the opening a second defender helps create.
     */
    function strikeEnemy(repel: number, push: number, staggerMs: number, poiseCost: number, fromLabel: string) {
      if (enemy.state === "repelled" || enemy.state === "withdrawing") return;
      enemy.repelStability = Math.max(0, enemy.repelStability - repel);
      enemy.y = Phaser.Math.Clamp(enemy.y - push, ENEMY_MIN_Y, ENEMY_MAX_Y);
      enemy.poiseIdleMs = 0;
      enemy.poise = Math.max(0, enemy.poise - poiseCost);
      enemy.flashMs = FLASH_MS;
      enemy.recoilMs = RECOIL_MS;
      hitstopMs = Math.max(hitstopMs, HITSTOP_MS);
      if (enemy.poise <= 0) {
        // POISE BREAK — the invader is opened up and its attack is cancelled.
        const mult = bandAt(enemy.y) === "coral" ? CORAL_RECOVERY_MULT : 1;
        enemy.staggerMs = Math.max(enemy.staggerMs, staggerMs * mult);
        enemy.state = "staggered";
        enemy.attackPhase = "none";
        enemy.poise = POISE_MAX;
        enemyTelegraph.setAlpha(0);
        sfx.thud();
        floatText(scene, enemy.x, enemy.y - 70, t("mg.formation.poiseBreak"), "#ffd54a");
      } else {
        sfx.hit();
        floatText(scene, enemy.x, enemy.y - 70, fromLabel, COLORS.accentText);
      }
      if (enemy.repelStability <= 0) beginWithdraw();
    }

    function beginWithdraw() {
      if (enemy.state === "repelled") return;
      enemy.state = "withdrawing";
      enemy.staggerMs = 0;
      enemy.attackPhase = "none";
      enemyTelegraph.setAlpha(0);
      statusText.setText(t("mg.formation.repelling"));
    }

    /** Continuous sandbox: a repelled invader is replaced after a short beat. */
    function respawnEnemy() {
      enemy.x = ENEMY_START_X;
      enemy.y = ENEMY_START_Y;
      enemy.state = "wading";
      enemy.repelStability = REPEL_STABILITY_MAX;
      enemy.poise = POISE_MAX;
      enemy.poiseIdleMs = 0;
      enemy.staggerMs = 0;
      enemy.attackPhase = "none";
      enemy.attackLanded = false;
      enemy.flashMs = 0;
      enemy.recoilMs = 0;
      enemy.respawnMs = 0;
      enemy.c.setAlpha(1).setVisible(true);
      statusText.setText("");
    }

    /**
     * An invader hit on a defender: footing loss, blunted by an active brace.
     * Bracing now SPENDS guard; emptying it breaks the guard and exposes you.
     */
    function hitDefender(d: Defender) {
      if (d.knockedMs > 0) return;
      const isPlayer = d === player;
      const blocking = isPlayer && braced && guard > 0;
      const loss = ENEMY_HIT_FOOTING * (blocking ? BRACE_FOOTING_MULT : 1);
      d.composure = Math.max(0, d.composure - loss);
      d.flashMs = FLASH_MS;
      d.recoilMs = RECOIL_MS;
      d.recoilDir = enemy.y < d.y ? 1 : -1;
      hitstopMs = Math.max(hitstopMs, HITSTOP_MS);
      if (blocking) {
        guard = Math.max(0, guard - GUARD_BLOCK_COST);
        guardIdleMs = 0;
        sfx.thud();
        if (guard <= 0) breakGuard();
        else floatText(scene, d.x, d.y - 70, t("mg.formation.blocked"), "#9fd8ff");
      } else {
        d.staggerMs = Math.max(d.staggerMs, ENEMY_HIT_STAGGER_MS);
        d.attackPhase = "none";
        sfx.hit();
        shake(scene, 120, 0.003);
      }
      if (d.composure <= 0) knockDown(d);
    }

    /** Guard emptied: brace drops, the player is staggered and loses footing. */
    function breakGuard() {
      braced = false;
      guard = 0;
      guardIdleMs = 0;
      player.composure = Math.max(0, player.composure - GUARD_BREAK_FOOTING);
      player.staggerMs = Math.max(player.staggerMs, GUARD_BREAK_STAGGER);
      player.attackPhase = "none";
      sfx.error();
      shake(scene, 180, 0.005);
      floatText(scene, player.x, player.y - 70, t("mg.formation.guardBreak"), "#ff9d7a");
      statusText.setText(t("mg.formation.guardBreak"));
      if (player.composure <= 0) knockDown(player);
    }

    function knockDown(d: Defender) {
      d.knockedMs = KNOCKDOWN_MS;
      d.staggerMs = 0;
      d.attackPhase = "none";
      if (d === player) { braced = false; statusText.setText(t("mg.formation.knocked")); }
      d.c.setAngle(d.facing * -70);
      sfx.thud();
    }

    function standUp(d: Defender) {
      d.knockedMs = 0;
      d.composure = KNOCKDOWN_RECOVER_TO;
      d.c.setAngle(0);
      if (d === player) statusText.setText("");
    }

    function resetSandbox() {
      player.x = PLAYER_START_X; player.y = PLAYER_START_Y;
      ally.x = ALLY_START_X; ally.y = ALLY_START_Y;
      for (const d of [player, ally]) {
        d.composure = COMPOSURE_MAX; d.knockedMs = 0; d.staggerMs = 0;
        d.attackPhase = "none"; d.attackTimer = 0; d.attackLanded = false; d.c.setAngle(0);
        d.flashMs = 0; d.recoilMs = 0; d.moving = false;
      }
      enemy.attackTimer = 0;
      respawnEnemy();
      enemyTelegraph.setAlpha(0);
      braced = false; dashCd = 0; dashMs = 0;
      guard = GUARD_MAX; guardIdleMs = 0; hitstopMs = 0;
      repelledCount = 0;
      moveTargetX = null; moveTargetY = null;
      statusText.setText("");
    }

    // ---------------- UPDATE ----------------
    function updateDefenderAction(d: Defender, dt: number, onLand: () => void) {
      if (d.attackPhase === "none") return;
      d.attackTimer -= dt;
      if (d.attackTimer > 0) return;
      if (d.attackPhase === "windup") { d.attackPhase = "active"; d.attackTimer = ATTACK_ACTIVE; d.attackLanded = false; return; }
      if (d.attackPhase === "active") { d.attackPhase = "recovery"; d.attackTimer = ATTACK_RECOVERY; return; }
      d.attackPhase = "none"; d.attackTimer = 0;
      void onLand;
    }

    function update(_time: number, delta: number) {
      if (done) return;
      // Hitstop: a brief freeze on impact so hits land with weight.
      if (hitstopMs > 0) { hitstopMs -= delta; return; }
      const dt = delta;
      const sec = delta / 1000;

      // ---- timers ----
      dashCd = Math.max(0, dashCd - dt);
      for (const d of [player, ally]) {
        d.flashMs = Math.max(0, d.flashMs - dt);
        d.recoilMs = Math.max(0, d.recoilMs - dt);
        if (d.knockedMs > 0) { d.knockedMs -= dt; if (d.knockedMs <= 0) standUp(d); }
        else if (d.staggerMs > 0) d.staggerMs -= dt;
        // Composure recovery is PAUSED while bracing — holding guard no longer
        // out-regenerates the damage it absorbs.
        else if (d.composure < COMPOSURE_MAX && !(d === player && braced)) {
          d.composure = Math.min(COMPOSURE_MAX, d.composure + COMPOSURE_REGEN * sec);
        }
      }
      enemy.flashMs = Math.max(0, enemy.flashMs - dt);
      enemy.recoilMs = Math.max(0, enemy.recoilMs - dt);

      // ---- guard ----
      if (braced) {
        guard = Math.max(0, guard - GUARD_DRAIN * sec);
        guardIdleMs = 0;
        if (guard <= 0) breakGuard();
      } else {
        guardIdleMs += dt;
        if (guardIdleMs >= GUARD_REGEN_DELAY && guard < GUARD_MAX) {
          guard = Math.min(GUARD_MAX, guard + GUARD_REGEN * sec);
        }
      }

      // ---- invader poise and repel-stability recovery ----
      if (enemy.state !== "repelled" && enemy.state !== "withdrawing") {
        enemy.poiseIdleMs += dt;
        if (enemy.poiseIdleMs >= POISE_RECOVER_DELAY && enemy.poise < POISE_MAX) {
          enemy.poise = Math.min(POISE_MAX, enemy.poise + POISE_REGEN * sec);
        }
        // A staggered invader recovers no stability — the poise break is the
        // window in which a second defender's damage actually sticks.
        if (enemy.staggerMs <= 0 && enemy.repelStability < REPEL_STABILITY_MAX) {
          enemy.repelStability = Math.min(REPEL_STABILITY_MAX, enemy.repelStability + STABILITY_REGEN * sec);
        }
      }

      // ---- player movement ----
      let vx = 0, vy = 0;
      if (keys) {
        if (keys.A?.isDown || keys.LEFT?.isDown) vx -= 1;
        if (keys.D?.isDown || keys.RIGHT?.isDown) vx += 1;
        if (keys.W?.isDown || keys.UP?.isDown) vy -= 1;
        if (keys.S?.isDown || keys.DOWN?.isDown) vy += 1;
      }
      if (vx !== 0 || vy !== 0) { moveTargetX = null; moveTargetY = null; }
      else if (moveTargetX !== null && moveTargetY !== null) {
        const ddx = moveTargetX - player.x, ddy = moveTargetY - player.y;
        if (Math.hypot(ddx, ddy) < 6) { moveTargetX = null; moveTargetY = null; }
        else { vx = ddx; vy = ddy; }
      }

      player.moving = false;
      if (dashMs > 0) {
        dashMs -= dt;
        player.x += dashVX * sec;
        player.y += dashVY * sec;
        player.moving = true;
      } else if (canAct(player) && player.attackPhase !== "windup" && player.attackPhase !== "active") {
        const len = Math.hypot(vx, vy);
        if (len > 0) {
          const speed = PLAYER_SPEED * MOVE_MULT_DEFENDER * (braced ? 0.35 : 1);
          player.x += (vx / len) * speed * sec;
          player.y += (vy / len) * speed * sec;
          if (Math.abs(vx) > 0.01) player.facing = vx < 0 ? -1 : 1;
          player.moving = true;
        }
      }
      player.x = Phaser.Math.Clamp(player.x, SANDBOX_MIN_X, SANDBOX_MAX_X);
      player.y = Phaser.Math.Clamp(player.y, DEFENDER_MIN_Y, DEFENDER_MAX_Y);

      // ---- player attack ----
      updateDefenderAction(player, dt, () => {});
      if (player.attackPhase === "active" && !player.attackLanded) {
        if (Math.hypot(enemy.x - player.x, enemy.y - player.y) <= ATTACK_RANGE + 14) {
          player.attackLanded = true;
          strikeEnemy(PLAYER_REPEL_DMG, PLAYER_PUSH_DISTANCE, PLAYER_STAGGER_MS, POISE_PLAYER_HIT, t("mg.formation.push"));
        }
      }

      // ---- ally: simplest persistent engagement (no timer, no leash) ----
      ally.moving = false;
      if (canAct(ally) && enemy.state !== "repelled") {
        // Stand off to the far side of the invader from the player, so the two
        // defenders read as flanking it instead of standing inside its sprite.
        const standoffSide = player.x <= enemy.x ? 1 : -1;
        const goalX = enemy.x + standoffSide * ALLY_STANDOFF_X;
        const adx = goalX - ally.x, ady = enemy.y - ally.y;
        const adist = Math.hypot(adx, ady);
        const reach = Math.hypot(enemy.x - ally.x, enemy.y - ally.y);
        if (adist > 8 && reach > ALLY_RANGE) {
          const step = ALLY_SPEED * MOVE_MULT_DEFENDER * sec;
          ally.x += (adx / adist) * step;
          ally.y += (ady / adist) * step;
          ally.facing = enemy.x < ally.x ? -1 : 1;
          ally.moving = true;
        } else if (ally.attackPhase === "none" && ally.attackTimer <= 0) {
          ally.attackPhase = "windup";
          ally.attackTimer = ATTACK_WINDUP;
          ally.attackLanded = false;
        }
        // The ally may follow into the shallows but never leaves the fighting zone.
        ally.x = Phaser.Math.Clamp(ally.x, SANDBOX_MIN_X, SANDBOX_MAX_X);
        ally.y = Phaser.Math.Clamp(ally.y, DEFENDER_MIN_Y, DEFENDER_MAX_Y);
      }
      updateDefenderAction(ally, dt, () => {});
      if (ally.attackPhase === "active" && !ally.attackLanded) {
        ally.attackLanded = true;
        if (Math.hypot(enemy.x - ally.x, enemy.y - ally.y) <= ALLY_RANGE + 14) {
          strikeEnemy(ALLY_REPEL_DMG, ALLY_PUSH_DISTANCE, ALLY_STAGGER_MS, POISE_ALLY_HIT, t("mg.formation.chip"));
        }
      }
      if (ally.attackPhase === "none" && ally.attackTimer > 0) ally.attackTimer -= dt;
      if (ally.attackPhase === "none" && ally.attackTimer <= 0 && ally.attackLanded) {
        ally.attackTimer = ALLY_ATTACK_CD;
        ally.attackLanded = false;
      }

      // ---- invader ----
      if (enemy.state === "withdrawing") {
        enemy.y -= WITHDRAW_SPEED * invaderMoveMult(enemy.y) * sec;
        enemy.c.setAlpha(Phaser.Math.Clamp((enemy.y - ENEMY_MIN_Y) / (WITHDRAW_FADE_FROM - ENEMY_MIN_Y), 0, 1));
        if (enemy.y <= ENEMY_MIN_Y) {
          enemy.state = "repelled";
          enemy.c.setVisible(false);
          repelledCount++;
          enemy.respawnMs = RESPAWN_DELAY;
          statusText.setText(t("mg.formation.repelled"));
          burst(scene, enemy.x, ENEMY_MIN_Y, [0x9fd8ff, 0xffffff], 20, 220);
          sfx.success();
        }
      } else if (enemy.state === "repelled") {
        // Continuous sandbox: send the next invader in. No quota, no pacing.
        enemy.respawnMs -= dt;
        if (enemy.respawnMs <= 0) respawnEnemy();
      } else {
        if (enemy.staggerMs > 0) {
          enemy.staggerMs -= dt;
          enemy.state = "staggered";
        } else {
          const targets = [player, ally].filter((d) => d.knockedMs <= 0);
          const tgt = targets.length ? targets.reduce((a, b) =>
            Math.hypot(a.x - enemy.x, a.y - enemy.y) <= Math.hypot(b.x - enemy.x, b.y - enemy.y) ? a : b) : player;
          enemy.target = tgt;
          const edx = tgt.x - enemy.x, edy = tgt.y - enemy.y;
          const edist = Math.hypot(edx, edy);
          if (enemy.attackPhase !== "none") {
            enemy.state = "attacking";
            enemy.attackTimer -= dt;
            enemyTelegraph.setAlpha(enemy.attackPhase === "windup" ? 0.9 : 0.3);
            if (enemy.attackTimer <= 0) {
              if (enemy.attackPhase === "windup") { enemy.attackPhase = "active"; enemy.attackTimer = ENEMY_ACTIVE; enemy.attackLanded = false; }
              else if (enemy.attackPhase === "active") { enemy.attackPhase = "recovery"; enemy.attackTimer = ENEMY_RECOVERY; }
              else { enemy.attackPhase = "none"; enemyTelegraph.setAlpha(0); }
            }
            if (enemy.attackPhase === "active" && !enemy.attackLanded) {
              enemy.attackLanded = true;
              if (Math.hypot(enemy.target.x - enemy.x, enemy.target.y - enemy.y) <= ENEMY_RANGE + 14) hitDefender(enemy.target);
            }
          } else if (edist <= ENEMY_RANGE) {
            enemy.state = "engaging";
            enemy.attackPhase = "windup";
            enemy.attackTimer = ENEMY_WINDUP;
            enemy.attackLanded = false;
          } else {
            enemy.state = "wading";
            const step = ENEMY_BASE_SPEED * invaderMoveMult(enemy.y) * sec;
            enemy.x += (edx / edist) * step;
            enemy.y += (edy / edist) * step;
          }
        }
        // HARD RULE (spec §4.3): an invader never enters the village band.
        enemy.y = Phaser.Math.Clamp(enemy.y, ENEMY_MIN_Y, ENEMY_MAX_Y);
      }

      // ---- presentation ----
      player.c.setPosition(player.x, player.y).setDepth(player.y);
      ally.c.setPosition(ally.x, ally.y).setDepth(ally.y);
      enemy.c.setPosition(enemy.x, enemy.y).setDepth(enemy.y);
      for (const d of [player, ally]) applyDefenderVisuals(d);
      if (player.sprite) player.sprite.setAlpha(braced ? 0.75 : 1);
      if (enemySprite) {
        enemySprite.setFlipX(enemy.x > player.x);
        if (enemy.state === "wading" || enemy.state === "withdrawing") enemySprite.play(animKeyFor("mactan/enemy_walk"), true);
        else enemySprite.anims.stop();
        if (enemy.flashMs > 0) enemySprite.setTintFill(0xffffff); else enemySprite.clearTint();
        enemySprite.setY(enemy.recoilMs > 0 ? -(enemy.recoilMs / RECOIL_MS) * RECOIL_PX : 0);
      }
      playerMarker.setAlpha(player.attackPhase === "windup" ? 0.4 : 1);
      playerBar.fill.setDisplaySize(playerBar.w * (player.composure / COMPOSURE_MAX), 10);
      allyBar.fill.setDisplaySize(allyBar.w * (ally.composure / COMPOSURE_MAX), 10);
      enemyBar.fill.setDisplaySize(enemyBar.w * (enemy.repelStability / REPEL_STABILITY_MAX), 10);
      guardBar.fill.setDisplaySize(guardBar.w * (guard / GUARD_MAX), 10);
      guardBar.fill.setFillStyle(braced ? 0x9fd8ff : 0x5f7fa0);
      poiseBar.fill.setDisplaySize(poiseBar.w * (enemy.poise / POISE_MAX), 10);
      repelledText.setText(t("mg.formation.repelledCount", { n: repelledCount }));
    }

    /**
     * Defender animation + hit feedback. Both defenders share the shipped adult
     * warrior sheet, so walk/attack/idle come from existing assets — no new art.
     */
    function applyDefenderVisuals(d: Defender) {
      const s = d.sprite;
      if (!s) return;
      s.setFlipX(d.facing < 0);
      const want = d.knockedMs > 0 ? "idle"
        : d.attackPhase === "windup" || d.attackPhase === "active" ? "attack"
        : d.moving ? "walk" : "idle";
      if (want !== d.anim) {
        d.anim = want;
        if (want === "idle") { s.anims.stop(); s.setTexture("mactan/ally_idle", 0); }
        else s.play(animKeyFor("mactan/ally_" + want), true);
      }
      if (d.flashMs > 0) s.setTintFill(0xffffff);
      else s.setTint(d.baseTint);
      s.setX(d.recoilMs > 0 ? (d.recoilMs / RECOIL_MS) * RECOIL_PX * -d.recoilDir : 0);
    }

    scene.events.on(Phaser.Scenes.Events.UPDATE, update);

    // ---------------- DEV VERIFICATION HOOK ----------------
    if (import.meta.env.DEV) {
      (window as unknown as { __mactanFormation: unknown }).__mactanFormation = {
        state: () => ({
          player: { x: player.x, y: player.y, band: bandAt(player.y), composure: player.composure, knocked: player.knockedMs > 0, staggered: player.staggerMs > 0, attackPhase: player.attackPhase, braced, guard, dashing: dashMs > 0, dashCd },
          ally: { x: ally.x, y: ally.y, composure: ally.composure, knocked: ally.knockedMs > 0, attackPhase: ally.attackPhase, engagedDistance: Math.hypot(enemy.x - ally.x, enemy.y - ally.y) },
          enemy: { x: enemy.x, y: enemy.y, band: bandAt(enemy.y), state: enemy.state, repelStability: enemy.repelStability, poise: enemy.poise, staggered: enemy.staggerMs > 0, attackPhase: enemy.attackPhase },
          repelledCount,
          bounds: { minX: SANDBOX_MIN_X, maxX: SANDBOX_MAX_X, minY: DEFENDER_MIN_Y, maxY: DEFENDER_MAX_Y, villageTop: BAND_SHALLOWS_BOTTOM },
        }),
        movePlayerTo: (x: number, y: number) => {
          player.x = Phaser.Math.Clamp(x, SANDBOX_MIN_X, SANDBOX_MAX_X);
          player.y = Phaser.Math.Clamp(y, DEFENDER_MIN_Y, DEFENDER_MAX_Y);
          moveTargetX = null; moveTargetY = null;
        },
        attack: () => tryAttack(),
        brace: (on: boolean) => setBrace(on),
        dash: (dx: number, dy: number) => tryDash(dx, dy),
        forcePlayerHit: () => hitDefender(player),
        forceAllyHit: () => hitDefender(ally),
        forceEnemyHit: () => strikeEnemy(PLAYER_REPEL_DMG, PLAYER_PUSH_DISTANCE, PLAYER_STAGGER_MS, POISE_PLAYER_HIT, t("mg.formation.push")),
        resolveEnemy: () => { enemy.repelStability = 0; beginWithdraw(); },
        resetSandbox: () => resetSandbox(),
        /** Park the ally out of the fight so lone-defender balance is measurable. */
        parkAlly: () => { ally.x = SANDBOX_MIN_X; ally.y = DEFENDER_MAX_Y; ally.knockedMs = 1e9; },
        setGuard: (value: number) => { guard = Phaser.Math.Clamp(value, 0, GUARD_MAX); },
      };
    }

    // ---------------- EXIT ----------------
    function finish() {
      if (done) return;
      done = true;
      scene.events.off(Phaser.Scenes.Events.UPDATE, update);
      scene.input.off("pointerdown", onPointerDown);
      scene.input.keyboard?.off("keydown-SPACE", onKeyAttack);
      scene.input.keyboard?.off("keydown-E", onKeyDash);
      scene.input.keyboard?.off("keydown-SHIFT", onBraceDown);
      scene.input.keyboard?.off("keyup-SHIFT", onBraceUp);
      scene.input.keyboard?.removeCapture("SPACE,SHIFT,UP,DOWN,LEFT,RIGHT,E");
      if (import.meta.env.DEV) {
        window.dispatchEvent(new CustomEvent("mactan-formation-sandbox-complete", { detail: { repelled: enemy.state === "repelled" } }));
        delete (window as unknown as { __mactanFormation?: unknown }).__mactanFormation;
      }
      camera.removeBounds();
      camera.setScroll(0, 0);
      overlay.destroy(true); controls.destroy(true); hud.destroy(true); field.destroy(true);
      // Phase 1 is a sandbox, not a scored encounter (spec §16 is Phase 6 work).
      resolve({ score: 1, attempts: 1, msSpent: Math.round(performance.now() - startedAt) });
    }
  });
}
