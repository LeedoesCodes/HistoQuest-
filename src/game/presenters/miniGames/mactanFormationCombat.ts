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

// Composition revised for the lane migration: the playfield deepens to 220 px
// to carry three lanes at an 85 px pitch, and the remaining 63% of the frame
// stays scenery so the coast reads as one continuous place.
const BAND_HORIZON_BOTTOM = 100;  // 0..100    sky, horizon, anchored ships
const BAND_DEEP_BOTTOM = 190;     // 100..190  deep water — invaders come from here
const BAND_CORAL_BOTTOM = 275;    // 190..275  coral reef and breaking surf
const BAND_SHALLOWS_BOTTOM = 495; // 275..495  shallows — the three-lane playfield
                                  // 495..600  beach and village — invaders never enter

type Band = "horizon" | "deep" | "coral" | "shallows" | "village";

function bandAt(y: number): Band {
  if (y < BAND_HORIZON_BOTTOM) return "horizon";
  if (y < BAND_DEEP_BOTTOM) return "deep";
  if (y < BAND_CORAL_BOTTOM) return "coral";
  if (y < BAND_SHALLOWS_BOTTOM) return "shallows";
  return "village";
}

// ---------------------------------------------------------------------------
// LANES. Combat happens on three discrete lanes inside the shallows. Lane index
// DECREASES seaward, so a future Advance moves to a lower index and Fall Back to
// a higher one — consistent with the frozen directional rules.
//
// Lane is AUTHORITATIVE; an actor's `y` is derived from it every frame. That is
// what lets all existing distance, depth and rendering code keep working: `y`
// still means what it always meant, it is simply no longer written directly.
// ---------------------------------------------------------------------------
const LANE_COUNT = 3;
const LANE_Y = [305, 390, 475] as const;  // 0 = surf line … 2 = firm shallows
const LANE_SHIFT_MS = 140;                // voluntary step
const LANE_SHIFT_MS_FORCED = 260;         // driven seaward — a heavier stumble
const ALLY_LANE_COOLDOWN = 600;           // stops the ally flip-flopping

/** Interpolated y for an actor part-way through a lane change. */
function laneYAt(from: number, to: number, progress: number): number {
  return Phaser.Math.Linear(LANE_Y[from], LANE_Y[to], Phaser.Math.Easing.Sine.InOut(progress));
}

function nearestLane(y: number): number {
  let best = 0;
  for (let i = 1; i < LANE_COUNT; i++) {
    if (Math.abs(LANE_Y[i] - y) < Math.abs(LANE_Y[best] - y)) best = i;
  }
  return best;
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
const ENEMY_MIN_Y = 70;              // repelled off the top of the deep-water band

const PLAYER_START_X = 1100;
const PLAYER_START_LANE = 2;         // the landward lane — your back foot
const ALLY_START_X = 1290;
const ALLY_START_LANE = 2;
const ENEMY_START_X = 1200;
// Low enough in the deep-water band that the ~100px sprite clears the HUD
// header text above it (found by screenshot, not by state inspection).
const ENEMY_START_Y = 165;
// A withdrawing invader fades out across this stretch instead of sliding up
// underneath the HUD text.
const WITHDRAW_FADE_FROM = 145;

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
const PLAYER_STAGGER_MS = 380;
// Per-hit seaward push is gone: it used to shove the invader out of reach at the
// exact moment a poise break made it vulnerable. Hits now recoil it along the
// shore, and ground is won at the stability thresholds below.
const PLAYER_RECOIL_X = 14;

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
// Raised 16 -> 21 during the lane migration. Removing the per-hit seaward push
// removed the tempo tax a lone player used to pay re-closing after every hit,
// so solo damage uptime rose and a single defender began repelling an ordinary
// invader in ~20 s. This restores the frozen invariant — one defender holds,
// two clearly repel — rather than tuning feel.
const STABILITY_REGEN = 21;          // per second, while not staggered

// GROUND AS PROGRESS. The invader's lane is a function of its repel stability,
// so driving it back is visible territory rather than a shrinking bar.
//   >= 67 → lane 2 (firm shallows, deepest penetration)
//   >= 34 → lane 1 (mid shallows)
//    > 0  → lane 0 (surf line, nearly out)
//   <= 0  → withdraws
// Hysteresis stops it oscillating on a threshold while stability regenerates:
// it gives ground the moment it drops below a threshold, but must recover a
// clear margin above that threshold before it can retake the lane.
const STABILITY_LANE_THRESHOLDS = [67, 34] as const;
const STABILITY_LANE_HYSTERESIS = 10;

/**
 * The deepest lane this invader has earned the right to stand in.
 *
 * Losing ground is immediate. Retaking it is a ladder: each step landward must
 * clear that lane's own threshold by the hysteresis margin, so an invader
 * hovering on a boundary cannot flicker back and forth.
 */
function laneForStability(stability: number, currentLane: number): number {
  const cap = stability >= STABILITY_LANE_THRESHOLDS[0] ? 2
    : stability >= STABILITY_LANE_THRESHOLDS[1] ? 1
    : 0;
  if (cap > currentLane) {
    const nextLane = currentLane + 1;
    const needed = STABILITY_LANE_THRESHOLDS[nextLane === 2 ? 0 : 1] + STABILITY_LANE_HYSTERESIS;
    if (stability < needed) return currentLane;
    return Math.min(cap, nextLane);
  }
  return cap;
}

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
const ALLY_RECOIL_X = 6;
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

/** Lane occupancy shared by every actor that fights on the line. */
interface LaneState {
  lane: number;
  laneFrom: number;
  laneShiftMs: number;   // remaining transition time, 0 when settled
  laneShiftDur: number;
  laneChanges: number;   // telemetry for the M5.5 "do players use lanes?" question
}

interface Defender extends LaneState {
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
    // Composition goal: a first-time player should read sea / reef / shallows /
    // land without a word of explanation. Depth is carried by ONE continuous
    // colour ramp from deep blue at the top to warm sand at the bottom, so
    // "water" and "land" separate on colour alone. Placeholder code-art only —
    // the five-layer GameLab scenery is a later milestone.
    const terrain = scene.add.graphics();

    // Sky, lightening toward the horizon.
    terrain.fillStyle(0x2c4a63, 1);
    terrain.fillRect(0, 0, WORLD_WIDTH, BAND_HORIZON_BOTTOM - 22);
    terrain.fillStyle(0x486f89, 1);
    terrain.fillRect(0, BAND_HORIZON_BOTTOM - 22, WORLD_WIDTH, 22);

    // Deep water — darkest, coldest. Where the invaders come from.
    terrain.fillStyle(0x11415e, 1);
    terrain.fillRect(0, BAND_HORIZON_BOTTOM, WORLD_WIDTH, BAND_DEEP_BOTTOM - BAND_HORIZON_BOTTOM);
    for (let i = 0; i < 70; i++) {                        // distant swell
      const wx = Math.random() * WORLD_WIDTH;
      const wy = BAND_HORIZON_BOTTOM + 8 + Math.random() * (BAND_DEEP_BOTTOM - BAND_HORIZON_BOTTOM - 14);
      terrain.fillStyle(0x1d5878, 0.7);
      terrain.fillRect(wx, wy, Phaser.Math.Between(10, 26), 2);
    }

    // Coral reef — mid blue-green, visibly obstructed. The reason they wade.
    terrain.fillStyle(0x1c6a78, 1);
    terrain.fillRect(0, BAND_DEEP_BOTTOM, WORLD_WIDTH, BAND_CORAL_BOTTOM - BAND_DEEP_BOTTOM);
    for (let i = 0; i < 150; i++) {
      const cx = Math.random() * WORLD_WIDTH;
      const cy = BAND_DEEP_BOTTOM + 8 + Math.random() * (BAND_CORAL_BOTTOM - BAND_DEEP_BOTTOM - 16);
      terrain.fillStyle(i % 3 === 0 ? 0x8a6a52 : i % 3 === 1 ? 0x5c8a72 : 0x7d5f6b, 0.9);
      terrain.fillTriangle(cx - 8, cy + 8, cx, cy - Phaser.Math.Between(6, 16), cx + 9, cy + 8);
    }
    // Surf breaking ON the reef — the clearest "shallow starts here" signal.
    for (let i = 0; i < 90; i++) {
      const fx = Math.random() * WORLD_WIDTH;
      terrain.fillStyle(0xdff0f2, Phaser.Math.FloatBetween(0.35, 0.8));
      terrain.fillRect(fx, BAND_CORAL_BOTTOM - Phaser.Math.Between(2, 9), Phaser.Math.Between(14, 40), 3);
    }

    // Shallows — the playfield. Each lane sits in slightly shallower water than
    // the one seaward of it, so the three lanes read as natural depth steps
    // rather than as painted rails.
    const laneShades = [0x2f8a99, 0x4aa9b0, 0x6bcbc8];
    for (let i = 0; i < LANE_COUNT; i++) {
      const top = i === 0 ? BAND_CORAL_BOTTOM : (LANE_Y[i - 1] + LANE_Y[i]) / 2;
      const bottom = i === LANE_COUNT - 1 ? BAND_SHALLOWS_BOTTOM : (LANE_Y[i] + LANE_Y[i + 1]) / 2;
      terrain.fillStyle(laneShades[i], 1);
      terrain.fillRect(0, top, WORLD_WIDTH, bottom - top);
      // A foam seam at each depth step — legible as shallowing water, not as a
      // drawn rail. Widened after the first screenshot: the steps were too
      // subtle to read as three distinct places.
      terrain.fillStyle(0xdff0f2, 0.3);
      terrain.fillRect(0, top, WORLD_WIDTH, 2);
      for (let f = 0; f < 60; f++) {
        const fx = Math.random() * WORLD_WIDTH;
        terrain.fillStyle(0xdff0f2, Phaser.Math.FloatBetween(0.1, 0.3));
        terrain.fillRect(fx, top + Phaser.Math.Between(0, 5), Phaser.Math.Between(10, 34), 2);
      }
    }

    // Wet sand, then dry sand. Land is unmistakably warm against cool water.
    terrain.fillStyle(0xefe6cf, 0.9);                     // foam lip at the waterline
    terrain.fillRect(0, BAND_SHALLOWS_BOTTOM - 4, WORLD_WIDTH, 6);
    terrain.fillStyle(0xb0925f, 1);
    terrain.fillRect(0, BAND_SHALLOWS_BOTTOM, WORLD_WIDTH, 26);
    terrain.fillStyle(0xc9ad82, 1);
    terrain.fillRect(0, BAND_SHALLOWS_BOTTOM + 26, WORLD_WIDTH, WORLD_HEIGHT - BAND_SHALLOWS_BOTTOM - 26);
    for (let i = 0; i < 260; i++) {                       // sand grain
      const sx = Math.random() * WORLD_WIDTH;
      const sy = BAND_SHALLOWS_BOTTOM + 8 + Math.random() * (WORLD_HEIGHT - BAND_SHALLOWS_BOTTOM - 12);
      terrain.fillStyle(Math.random() < 0.5 ? 0x8f7550 : 0xe2d3ab, 0.5);
      terrain.fillRect(sx, sy, 2, 2);
    }
    field.add(terrain);

    // The village behind the line — what the defenders have their backs to.
    // Kept ABOVE the control strip: in the first screenshot the huts sat at the
    // bottom edge and were completely hidden by the buttons, so the thing being
    // protected was invisible.
    const VILLAGE_BASE_Y = BAND_SHALLOWS_BOTTOM + 50;
    const village = scene.add.graphics();
    for (let i = 0; i < 14; i++) {
      const hx = 90 + i * 172 + Phaser.Math.Between(-24, 24);
      const hy = VILLAGE_BASE_Y - Phaser.Math.Between(0, 10);
      const w = Phaser.Math.Between(46, 68);
      village.fillStyle(0x6b4b32, 1);                     // stilts and wall
      village.fillRect(hx, hy - 20, w, 20);
      village.fillStyle(0x8f7a4a, 1);                     // nipa roof
      village.fillTriangle(hx - 8, hy - 20, hx + w / 2, hy - 44, hx + w + 8, hy - 20);
      village.fillStyle(0x2f4a34, 1);                     // a palm behind it
      village.fillRect(hx + w + 18, hy - 34, 4, 34);
      village.fillCircle(hx + w + 20, hy - 38, 11);
    }
    field.add(village);

    // The ships that can never come closer — the chapter's thesis, on screen.
    // Sat ON the horizon line originally and vanished behind the HUD; they now
    // ride in the deep-water band where they are unmistakably at sea, and are
    // large enough to read at a glance.
    const ships = scene.add.graphics();
    for (const [sx, scale] of [[380, 1.15], [1000, 0.95], [1900, 1.05]] as const) {
      const hy = BAND_HORIZON_BOTTOM + 34;
      ships.fillStyle(0x0d2436, 1);
      ships.fillRect(sx - 38 * scale, hy - 13 * scale, 76 * scale, 13 * scale);
      ships.fillRect(sx - 2 * scale, hy - 58 * scale, 5 * scale, 45 * scale);
      ships.fillStyle(0x2b4d68, 1);
      ships.fillTriangle(sx, hy - 56 * scale, sx + 30 * scale, hy - 17 * scale, sx, hy - 17 * scale);
      ships.fillTriangle(sx - 2 * scale, hy - 44 * scale, sx - 26 * scale, hy - 17 * scale, sx - 2 * scale, hy - 17 * scale);
      // A wake, so they read as sitting IN water rather than floating on a band.
      ships.fillStyle(0xdff0f2, 0.22);
      ships.fillRect(sx - 46 * scale, hy, 92 * scale, 3);
    }
    field.add(ships);

    // ---------------- ACTORS ----------------
    // Both defenders reuse the shipped adult Mactan warrior sheet — the player
    // is an unnamed ADULT defender, not the child. Degrades to code-art.
    const useDefenderSprite = ensureMactanAllyAnims(scene);
    const useEnemySprite = ensureMactanEnemyAnims(scene);

    function makeDefender(x: number, lane: number, tint: number): Defender {
      const y = LANE_Y[lane];
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
      return {
        c, sprite, baseTint: tint, x, y, facing: -1,
        lane, laneFrom: lane, laneShiftMs: 0, laneShiftDur: LANE_SHIFT_MS, laneChanges: 0,
        composure: COMPOSURE_MAX, knockedMs: 0, staggerMs: 0,
        attackPhase: "none", attackTimer: 0, attackLanded: false,
        moving: false, flashMs: 0, recoilMs: 0, recoilDir: 1, anim: "",
      };
    }

    /** Begin a lane change. `forced` is a shove seaward, not a step. */
    function shiftLane(a: LaneState, to: number, forced = false): boolean {
      const target = Phaser.Math.Clamp(to, 0, LANE_COUNT - 1);
      if (target === a.lane || a.laneShiftMs > 0) return false;
      a.laneFrom = a.lane;
      a.lane = target;
      a.laneShiftDur = forced ? LANE_SHIFT_MS_FORCED : LANE_SHIFT_MS;
      a.laneShiftMs = a.laneShiftDur;
      a.laneChanges++;
      return true;
    }

    /** Resolve an actor's derived y from its lane and transition progress. */
    function resolveLaneY(a: LaneState & { y: number }, dt: number): void {
      if (a.laneShiftMs > 0) {
        a.laneShiftMs = Math.max(0, a.laneShiftMs - dt);
        const progress = 1 - a.laneShiftMs / a.laneShiftDur;
        a.y = laneYAt(a.laneFrom, a.lane, progress);
      } else {
        a.y = LANE_Y[a.lane];
      }
    }

    const player = makeDefender(PLAYER_START_X, PLAYER_START_LANE, 0xffd54a);
    const ally = makeDefender(ALLY_START_X, ALLY_START_LANE, 0x9fd8a0);

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
      // Free-Y while entering from the sea or withdrawing; lane-bound in combat.
      // That flag is the seam a later milestone extends into full band traversal.
      laneBound: false,
      lane: 2,
      laneFrom: 2,
      laneShiftMs: 0,
      laneShiftDur: LANE_SHIFT_MS_FORCED,
      laneChanges: 0,
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
    let allyLaneCd = 0;

    // ---------------- CAMERA: one static window (Phase 1) ----------------
    const camera = scene.cameras.main;
    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    camera.setScroll(CAMERA_SCROLL_X, 0);

    // ---------------- HUD ----------------
    // Deliberately compact: this milestone's goal is that the BATTLEFIELD reads
    // first. The HUD was previously a stack of four meters filling the top third
    // of the frame, hiding the sky, the horizon and the ships behind it.
    hud.add([
      scene.add.text(width / 2, 15, t("mg.formation.title"), { fontFamily: FONT, fontSize: "15px", color: COLORS.text, fontStyle: "bold" }).setOrigin(0.5),
      scene.add.text(width / 2, 33, t("mg.formation.hint"), { fontFamily: FONT, fontSize: "10px", color: COLORS.textMuted, align: "center", wordWrap: { width: width - 40 } }).setOrigin(0.5),
    ]);

    function makeBar(x: number, y: number, w: number, labelKey: MessageKey, color: number, alignRight = false) {
      const ox = alignRight ? 1 : 0;
      hud.add(scene.add.text(alignRight ? x + w : x, y - 10, t(labelKey), { fontFamily: FONT, fontSize: "9px", color: COLORS.textMuted }).setOrigin(ox, 0.5));
      hud.add(scene.add.rectangle(x, y, w, 8, 0x2a2f3f).setOrigin(0, 0.5));
      const fill = scene.add.rectangle(x, y, w, 8, color).setOrigin(0, 0.5);
      hud.add(fill);
      return { fill, w };
    }
    const playerBar = makeBar(20, 58, 130, "mg.formation.footing", COLORS.success);
    const guardBar = makeBar(20, 78, 130, "mg.formation.guard", 0x9fd8ff);
    const enemyBar = makeBar(width - 150, 58, 130, "mg.formation.repelStability", COLORS.danger, true);
    const allyBar = makeBar(width - 150, 78, 130, "mg.formation.allyFooting", 0x9fd8a0, true);

    const statusText = scene.add.text(width / 2, height - 96, "", { fontFamily: FONT, fontSize: "14px", color: COLORS.accentText, fontStyle: "bold", align: "center" }).setOrigin(0.5);
    hud.add(statusText);

    // ---------------- CONTROLS (desktop + touch) ----------------
    function makeButton(x: number, y: number, w: number, label: string, onDown: () => void, onUp?: () => void) {
      const bg = scene.add.rectangle(x, y, w, 32, COLORS.panel, 0.86).setStrokeStyle(2, COLORS.panelStroke).setInteractive({ useHandCursor: true });
      const tx = scene.add.text(x, y, label, { fontFamily: FONT, fontSize: "13px", color: COLORS.text, fontStyle: "bold" }).setOrigin(0.5);
      bg.on("pointerdown", onDown);
      if (onUp) { bg.on("pointerup", onUp); bg.on("pointerout", onUp); }
      controls.add([bg, tx]);
      return bg;
    }
    makeButton(88, height - 26, 130, t("mg.formation.attack"), () => tryAttack());
    makeButton(232, height - 26, 130, t("mg.formation.brace"), () => setBrace(true), () => setBrace(false));
    makeButton(376, height - 26, 130, t("mg.formation.dash"), () => tryDash());
    makeButton(width - 76, height - 26, 120, t("mg.formation.done"), () => finish());

    // ---------------- INPUT STATE ----------------
    let braced = false;
    let dashCd = 0;
    let dashMs = 0;
    let dashVX = 0;
    // Touch: tap the field to walk toward that x, and to that lane.
    let moveTargetX: number | null = null;

    const keys = scene.input.keyboard?.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT,E") as Record<string, Phaser.Input.Keyboard.Key> | undefined;
    scene.input.keyboard?.addCapture("SPACE,SHIFT,UP,DOWN,LEFT,RIGHT,E");

    const onKeyAttack = () => tryAttack();
    const onKeyDash = () => tryDash();
    const onBraceDown = () => setBrace(true);
    const onBraceUp = () => setBrace(false);
    // Lane steps are edge-triggered: one press, one lane. Holding does nothing.
    const onKeySeaward = () => stepPlayerLane(-1);
    const onKeyLandward = () => stepPlayerLane(1);
    scene.input.keyboard?.on("keydown-SPACE", onKeyAttack);
    scene.input.keyboard?.on("keydown-E", onKeyDash);
    scene.input.keyboard?.on("keydown-SHIFT", onBraceDown);
    scene.input.keyboard?.on("keyup-SHIFT", onBraceUp);
    scene.input.keyboard?.on("keydown-W", onKeySeaward);
    scene.input.keyboard?.on("keydown-UP", onKeySeaward);
    scene.input.keyboard?.on("keydown-S", onKeyLandward);
    scene.input.keyboard?.on("keydown-DOWN", onKeyLandward);

    const onPointerDown = (p: Phaser.Input.Pointer) => {
      if (p.y > height - 46) return; // control strip
      moveTargetX = Phaser.Math.Clamp(p.worldX, SANDBOX_MIN_X, SANDBOX_MAX_X);
      const lane = nearestLane(p.worldY);
      if (lane !== player.lane && canAct(player)) shiftLane(player, lane);
    };
    scene.input.on("pointerdown", onPointerDown);

    // ---------------- ACTIONS ----------------
    function canAct(d: Defender): boolean {
      return d.knockedMs <= 0 && d.staggerMs <= 0;
    }

    /** One press, one lane. Seaward is -1. */
    function stepPlayerLane(dir: number) {
      if (done || !canAct(player) || dashMs > 0) return;
      if (shiftLane(player, player.lane + dir)) sfx.tap();
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

    /** Dash is now purely lateral — depth is changed by stepping a lane. */
    function tryDash(dirX?: number) {
      if (done || !canAct(player) || dashCd > 0 || dashMs > 0) return;
      const dx = dirX && dirX !== 0 ? Math.sign(dirX) : player.facing;
      dashVX = dx * (DASH_DISTANCE / (DASH_DURATION / 1000));
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
    function strikeEnemy(repel: number, recoilX: number, staggerMs: number, poiseCost: number, fromLabel: string) {
      if (enemy.state === "repelled" || enemy.state === "withdrawing") return;
      enemy.repelStability = Math.max(0, enemy.repelStability - repel);
      // Hits recoil along the shore; ground is won at the stability thresholds.
      const from = enemy.target?.x ?? enemy.x;
      enemy.x = Phaser.Math.Clamp(enemy.x + Math.sign(enemy.x - from || 1) * recoilX, SANDBOX_MIN_X, SANDBOX_MAX_X);
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
      enemy.laneBound = false;      // back to free-Y for the retreat through the reef
      enemy.laneShiftMs = 0;
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
      enemy.laneBound = false;
      enemy.lane = 0;
      enemy.laneFrom = 0;
      enemy.laneShiftMs = 0;
      enemy.laneChanges = 0;
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
      player.x = PLAYER_START_X; player.lane = PLAYER_START_LANE;
      ally.x = ALLY_START_X; ally.lane = ALLY_START_LANE;
      for (const d of [player, ally]) {
        d.laneFrom = d.lane; d.laneShiftMs = 0; d.laneChanges = 0; d.y = LANE_Y[d.lane];
        d.composure = COMPOSURE_MAX; d.knockedMs = 0; d.staggerMs = 0;
        d.attackPhase = "none"; d.attackTimer = 0; d.attackLanded = false; d.c.setAngle(0);
        d.flashMs = 0; d.recoilMs = 0; d.moving = false;
      }
      enemy.attackTimer = 0;
      allyLaneCd = 0;
      respawnEnemy();
      enemyTelegraph.setAlpha(0);
      braced = false; dashCd = 0; dashMs = 0;
      guard = GUARD_MAX; guardIdleMs = 0; hitstopMs = 0;
      repelledCount = 0;
      moveTargetX = null;
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

      // ---- player movement: lateral only; depth is a lane step ----
      let vx = 0;
      if (keys) {
        if (keys.A?.isDown || keys.LEFT?.isDown) vx -= 1;
        if (keys.D?.isDown || keys.RIGHT?.isDown) vx += 1;
      }
      if (vx !== 0) moveTargetX = null;
      else if (moveTargetX !== null) {
        const ddx = moveTargetX - player.x;
        if (Math.abs(ddx) < 6) moveTargetX = null;
        else vx = ddx;
      }

      player.moving = false;
      if (dashMs > 0) {
        dashMs -= dt;
        player.x += dashVX * sec;
        player.moving = true;
      } else if (canAct(player) && player.attackPhase !== "windup" && player.attackPhase !== "active") {
        if (vx !== 0) {
          const speed = PLAYER_SPEED * MOVE_MULT_DEFENDER * (braced ? 0.35 : 1);
          player.x += Math.sign(vx) * speed * sec;
          player.facing = vx < 0 ? -1 : 1;
          player.moving = true;
        }
      }
      player.x = Phaser.Math.Clamp(player.x, SANDBOX_MIN_X, SANDBOX_MAX_X);
      resolveLaneY(player, dt);
      if (player.laneShiftMs > 0) player.moving = true;

      // ---- player attack ----
      updateDefenderAction(player, dt, () => {});
      if (player.attackPhase === "active" && !player.attackLanded) {
        if (Math.hypot(enemy.x - player.x, enemy.y - player.y) <= ATTACK_RANGE + 14) {
          player.attackLanded = true;
          strikeEnemy(PLAYER_REPEL_DMG, PLAYER_RECOIL_X, PLAYER_STAGGER_MS, POISE_PLAYER_HIT, t("mg.formation.push"));
        }
      }

      // ---- ally: simplest persistent engagement (no timer, no leash) ----
      ally.moving = false;
      allyLaneCd = Math.max(0, allyLaneCd - dt);
      if (canAct(ally) && enemy.state !== "repelled") {
        // Hold the line WITH the player, not chase the invader. Matching the
        // invader's lane instead produced a mutual lock: the ally followed the
        // invader seaward, the invader targets the nearest defender, and neither
        // ever moved. Defenders choose the line; invaders come to it.
        if (ally.lane !== player.lane && allyLaneCd <= 0 && ally.laneShiftMs <= 0) {
          if (shiftLane(ally, player.lane)) allyLaneCd = ALLY_LANE_COOLDOWN;
        }
        // Stand off to the far side of the invader from the player, so the two
        // defenders read as flanking it instead of standing inside its sprite.
        const standoffSide = player.x <= enemy.x ? 1 : -1;
        const goalX = enemy.x + standoffSide * ALLY_STANDOFF_X;
        const adx = goalX - ally.x;
        const reach = Math.hypot(enemy.x - ally.x, enemy.y - ally.y);
        if (Math.abs(adx) > 8 && reach > ALLY_RANGE) {
          const step = ALLY_SPEED * MOVE_MULT_DEFENDER * sec;
          ally.x += Math.sign(adx) * Math.min(step, Math.abs(adx));
          ally.facing = enemy.x < ally.x ? -1 : 1;
          ally.moving = true;
        } else if (ally.attackPhase === "none" && ally.attackTimer <= 0) {
          ally.attackPhase = "windup";
          ally.attackTimer = ATTACK_WINDUP;
          ally.attackLanded = false;
        }
        ally.x = Phaser.Math.Clamp(ally.x, SANDBOX_MIN_X, SANDBOX_MAX_X);
      }
      resolveLaneY(ally, dt);
      if (ally.laneShiftMs > 0) ally.moving = true;
      updateDefenderAction(ally, dt, () => {});
      if (ally.attackPhase === "active" && !ally.attackLanded) {
        ally.attackLanded = true;
        if (Math.hypot(enemy.x - ally.x, enemy.y - ally.y) <= ALLY_RANGE + 14) {
          strikeEnemy(ALLY_REPEL_DMG, ALLY_RECOIL_X, ALLY_STAGGER_MS, POISE_ALLY_HIT, t("mg.formation.chip"));
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
        // Entering: free-Y wade from the sea until it reaches the shallows,
        // then it joins the lane system at the surf line and works inland.
        if (!enemy.laneBound) {
          enemy.state = "wading";
          enemy.y += ENEMY_BASE_SPEED * invaderMoveMult(enemy.y) * sec;
          if (enemy.y >= LANE_Y[0]) {
            enemy.laneBound = true;
            enemy.lane = 0;
            enemy.laneFrom = 0;
            enemy.laneShiftMs = 0;
            enemy.y = LANE_Y[0];
          }
        }
        if (enemy.staggerMs > 0) {
          enemy.staggerMs -= dt;
          enemy.state = "staggered";
        } else if (enemy.laneBound) {
          const targets = [player, ally].filter((d) => d.knockedMs <= 0);
          const tgt = targets.length ? targets.reduce((a, b) =>
            Math.hypot(a.x - enemy.x, a.y - enemy.y) <= Math.hypot(b.x - enemy.x, b.y - enemy.y) ? a : b) : player;
          enemy.target = tgt;

          // GROUND AS PROGRESS: stability sets how far inland this invader has
          // earned the right to stand. Inside that cap it may follow a defender;
          // as it is worn down the cap forces it back toward the surf.
          const laneCap = laneForStability(enemy.repelStability, enemy.lane);
          const desired = Math.min(tgt.lane, laneCap);
          if (desired !== enemy.lane && enemy.laneShiftMs <= 0) {
            const step = Math.sign(desired - enemy.lane);
            // Being driven seaward INTERRUPTS whatever it was doing — otherwise
            // an engaged invader is permanently mid-attack (1270 ms cycle) and
            // could never be pushed back at all. Advancing landward still waits
            // for a clean moment.
            if (step < 0) {
              enemy.attackPhase = "none";
              enemyTelegraph.setAlpha(0);
              shiftLane(enemy, enemy.lane + step, true);
              sfx.thud();
              floatText(scene, enemy.x, enemy.y - 74, t("mg.formation.driven"), "#9fd8ff");
            } else if (enemy.attackPhase === "none") {
              shiftLane(enemy, enemy.lane + step, false);
            }
          }

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
            // Lane-bound: it closes along the shore only. Depth is the lane.
            const step = ENEMY_BASE_SPEED * invaderMoveMult(enemy.y) * sec;
            if (Math.abs(edx) > 4) enemy.x += Math.sign(edx) * Math.min(step, Math.abs(edx));
            void edist;
          }
        }
        if (enemy.laneBound) resolveLaneY(enemy, dt);
        enemy.x = Phaser.Math.Clamp(enemy.x, SANDBOX_MIN_X, SANDBOX_MAX_X);
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
      playerBar.fill.setDisplaySize(playerBar.w * (player.composure / COMPOSURE_MAX), 8);
      allyBar.fill.setDisplaySize(allyBar.w * (ally.composure / COMPOSURE_MAX), 8);
      enemyBar.fill.setDisplaySize(enemyBar.w * (enemy.repelStability / REPEL_STABILITY_MAX), 8);
      guardBar.fill.setDisplaySize(guardBar.w * (guard / GUARD_MAX), 8);
      guardBar.fill.setFillStyle(braced ? 0x9fd8ff : 0x5f7fa0);
      // Poise has no bar any more — it reads on the invader itself, as the
      // telegraph ring dimming toward a break.
      enemyTelegraph.setStrokeStyle(3, 0xe4572e, enemy.attackPhase !== "none" ? 0.9 : 0);
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
          player: { x: player.x, y: player.y, lane: player.lane, laneShifting: player.laneShiftMs > 0, laneChanges: player.laneChanges, band: bandAt(player.y), composure: player.composure, knocked: player.knockedMs > 0, staggered: player.staggerMs > 0, attackPhase: player.attackPhase, braced, guard, dashing: dashMs > 0, dashCd },
          ally: { x: ally.x, y: ally.y, lane: ally.lane, laneChanges: ally.laneChanges, composure: ally.composure, knocked: ally.knockedMs > 0, attackPhase: ally.attackPhase, engagedDistance: Math.hypot(enemy.x - ally.x, enemy.y - ally.y) },
          enemy: { x: enemy.x, y: enemy.y, lane: enemy.lane, laneBound: enemy.laneBound, laneChanges: enemy.laneChanges, band: bandAt(enemy.y), state: enemy.state, repelStability: enemy.repelStability, poise: enemy.poise, staggered: enemy.staggerMs > 0, attackPhase: enemy.attackPhase },
          repelledCount,
          lanes: { count: LANE_COUNT, y: [...LANE_Y] },
          bounds: { minX: SANDBOX_MIN_X, maxX: SANDBOX_MAX_X, villageTop: BAND_SHALLOWS_BOTTOM },
        }),
        movePlayerTo: (x: number, y: number) => {
          player.x = Phaser.Math.Clamp(x, SANDBOX_MIN_X, SANDBOX_MAX_X);
          const lane = nearestLane(y);
          player.lane = lane; player.laneFrom = lane; player.laneShiftMs = 0; player.y = LANE_Y[lane];
          moveTargetX = null;
        },
        setPlayerLane: (i: number) => {
          const lane = Phaser.Math.Clamp(Math.round(i), 0, LANE_COUNT - 1);
          player.lane = lane; player.laneFrom = lane; player.laneShiftMs = 0; player.y = LANE_Y[lane];
        },
        stepLane: (dir: number) => stepPlayerLane(Math.sign(dir)),
        setStability: (v: number) => { enemy.repelStability = Phaser.Math.Clamp(v, 0, REPEL_STABILITY_MAX); },
        /** Skip the wade — puts the invader straight onto the surf-line lane. */
        landEnemy: () => {
          enemy.laneBound = true;
          enemy.lane = 0; enemy.laneFrom = 0; enemy.laneShiftMs = 0;
          enemy.y = LANE_Y[0];
          enemy.state = "wading";
        },
        attack: () => tryAttack(),
        brace: (on: boolean) => setBrace(on),
        dash: (dx: number) => tryDash(dx),
        forcePlayerHit: () => hitDefender(player),
        forceAllyHit: () => hitDefender(ally),
        forceEnemyHit: () => strikeEnemy(PLAYER_REPEL_DMG, PLAYER_RECOIL_X, PLAYER_STAGGER_MS, POISE_PLAYER_HIT, t("mg.formation.push")),
        resolveEnemy: () => { enemy.repelStability = 0; beginWithdraw(); },
        resetSandbox: () => resetSandbox(),
        /** Park the ally out of the fight so lone-defender balance is measurable. */
        parkAlly: () => { ally.x = SANDBOX_MIN_X; ally.knockedMs = 1e9; },
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
