import Phaser from "phaser";
import type { MiniGameNode, MiniGameResult } from "../../content/types";
import { COLORS, FONT } from "../../ui/theme";
import { burst, shake, flash, floatText, showStars, starsFor } from "../../ui/juice";
import { sfx } from "../../ui/sfx";
import { t } from "../../i18n";
import { ensureMactanHeroAnims, ensureMactanEnemyAnims, ensureMactanAllyAnims, animKeyFor, MACTAN_HERO, MACTAN_ENEMY, MACTAN_ALLY } from "../../assets/sprites";

/**
 * Mactan defense — SIDE-VIEW support action.
 *
 * Side camera on the Mactan seashore. You are a young helper:
 *   - MOVE left/right, JUMP, CROUCH (keyboard or on-screen buttons).
 *   - DODGE: Spanish soldiers fire telegraphed shots. A HIGH shot (crouch under
 *     it) or a LOW shot (jump over it). Your hitbox shrinks when crouching and
 *     lifts when jumping, so correct dodging makes the bullet miss.
 *   - HP BARS: you and every enemy have health; nobody dies in one hit.
 *
 * All real-time logic is in a `scene.events.on('update')` handler (removed on
 * exit). Flat code-art now; built spritesheet-ready (swap the draw* helpers).
 * Every object is in a container destroyed on finish; listeners/hooks removed.
 *
 * Adult defenders handle combat while the player stays mobile and safe.
 */

const GROUND_H = 64;
const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 600;
const ENEMY_SPAWN_MIN_X = 1700;
const ENEMY_SPAWN_MAX_X = 1760;
const REGROUP_DURATION = 900;

type DefenseStageId = "shoreline" | "beach" | "village_edge";
type DefenseStage = {
  id: DefenseStageId;
  lineX: number;
  anchors: readonly [number, number, number];
  playerSafeX: number;
  defenseCeiling: number;
  labelKey:
    | "mg.mactan.stageShoreline"
    | "mg.mactan.stageBeach"
    | "mg.mactan.stageVillageEdge";
};

const DEFENSE_STAGES: readonly DefenseStage[] = [
  { id: "shoreline", lineX: 1480, anchors: [1250, 1345, 1440], playerSafeX: 1150, defenseCeiling: 100, labelKey: "mg.mactan.stageShoreline" },
  { id: "beach", lineX: 1180, anchors: [950, 1045, 1140], playerSafeX: 880, defenseCeiling: 66, labelKey: "mg.mactan.stageBeach" },
  { id: "village_edge", lineX: 820, anchors: [620, 715, 810], playerSafeX: 520, defenseCeiling: 33, labelKey: "mg.mactan.stageVillageEdge" },
];
const GRAVITY = 1500;
const MOVE_SPEED = 205;
const JUMP_V = 560;
const PLAYER_HP_MAX = 100;
const INVULN_MS = 900;
const SHOT_SPEED = 300;
const SHOT_DMG = 12;
const CONTACT_DMG = 8;
const ENEMY_HP = 36;
const TOTAL_ENEMIES = 6;   // few invaders, over the whole fight ("only a few made it ashore")
const MAX_CONCURRENT = 2;
const ENEMY_SPAWN_DELAY = 4200;
const ENEMY_FIRE_RANGE = 500;
const BREACH_DELAY = 3500;
const BREACH_LIMIT = 3;

// Knockback: a solid hit shoves the enemy back (toward the surf) and briefly
// stuns it — hits feel weighty and the line gets driven back.
const ALLY_KNOCKBACK_V = 170;  // ally hit (weaker)
const KB_STUN = 260;           // ms an enemy can't advance/shoot after being hit

// Allied Mactan warriors handle the defense while the child avoids danger.
const ALLY_DMG = 5;
const ALLY_ATTACK_CD = 720;
const ALLY_RANGE = 48;
const ALLY_SPEED = 120;
const ALLY_STAGGER = 520;      // ms an ally is stunned after soaking a hit
const HOLD_RANGE = 300;
const HOLD_MAX_RESPONDERS = 2;
const HOLD_ANCHOR_LEASH = 90;
const HOLD_THREAT_RANGE = 140;
const HOLD_GROUP_SUPPORT_RANGE = 120;
const HOLD_RESPONSE_DELAY = 650;
const HOLD_RESPONSE_DURATION = 4200;
const HOLD_RESPONSE_EXTENSION = 900;
const HOLD_COOLDOWN = 3000;
const FALLBACK_PRESSURE_DURATION = 1800;
const ADVANCE_RESPONSE_DURATION = 2800;
const ADVANCE_COOLDOWN = 4000;
const ADVANCE_LINE_LIMIT = 170;
const ADVANCE_OPENING_MIN = 60;
const ADVANCE_OPENING_MAX = 220;

type RelayMode = "hold" | "advance";

// DASH: a quick i-frame lunge — GUARANTEED to phase through bullets for its
// window (kid-fair, per Lee: no random dodge chance). Short cooldown.
const DASH_SPEED = 640;
const DASH_DUR = 175;   // ms of movement + i-frames
const DASH_CD = 700;

type ShotKind = "high" | "low";
/**
 * Shot heights above the feet (groundY). Derived from the ~78px hero (standing
 * hitbox ≈ 78px, crouched ≈ 44px, both feet-anchored):
 *   - HIGH (-64): upper-body/head of a STANDER (hits), but ABOVE the crouched
 *     box top (~py-48) so ducking clears it.
 *   - LOW (-18): shin height — hits a stander/croucher, but a JUMP lifts the
 *     hitbox above it so it passes underneath.
 */
const SHOT_Y: Record<ShotKind, number> = { high: -64, low: -18 };
interface Enemy {
  c: Phaser.GameObjects.Container;
  hp: number;
  barBg: Phaser.GameObjects.Rectangle;
  barFill: Phaser.GameObjects.Rectangle;
  shootCd: number;
  telegraph: number; // ms of aim windup remaining (0 = not aiming)
  telegraphKind: ShotKind;
  marker: Phaser.GameObjects.Text;
  dead: boolean;
  sprite?: Phaser.GameObjects.Sprite;
  stun: number; // ms of hit-stun remaining (0 = free to act)
  kbVx: number; // horizontal knockback velocity, decays to 0
  breachTime: number;
}
interface Shot {
  c: Phaser.GameObjects.Container;
  vx: number;
  kind: ShotKind;
}
/** An allied Mactan warrior — PixelLab sprite if shipped, else code-art. */
interface Ally {
  c: Phaser.GameObjects.Container;
  attackCd: number;
  attackActive: number; // ms of attack pose remaining
  stagger: number;      // ms stunned after soaking a hit (0 = active)
  kbVx: number;
  walkPhase: number;
  anchorX: number;
  responseDelay: number;
  responseTime: number;
  responseExtended: boolean;
  responseTarget?: Enemy;
  responseMode?: RelayMode;
  responseFormationOffset?: number;
  sprite?: Phaser.GameObjects.Sprite; // PixelLab warrior
  state: string;        // current sprite anim state
  legL?: Phaser.GameObjects.Rectangle; // code-art fallback parts
  legR?: Phaser.GameObjects.Rectangle;
  spear?: Phaser.GameObjects.Rectangle;
}

export function playMactanDefense(
  scene: Phaser.Scene,
  _node: MiniGameNode
): Promise<MiniGameResult> {
  return new Promise((resolve) => {
    const { width, height } = scene.scale;
    const startedAt = performance.now();
    const groundY = WORLD_HEIGHT - GROUND_H; // top surface of the ground
    let activeStageIndex = 0;
    let defenseValue = DEFENSE_STAGES[activeStageIndex].defenseCeiling;
    let regrouping = false;
    const activeStage = () => DEFENSE_STAGES[activeStageIndex];

    let playerHP = PLAYER_HP_MAX;
    let score = 0;
    let combo = 0;
    let defeated = 0;
    let spawned = 0;
    let breaches = 0;
    let invuln = 0;
    let holdCooldown = 0;
    let fallbackIntroduced = false;
    let fallbackButtonEnabled = false;
    let advanceIntroduced = false;
    let advanceButtonEnabled = false;
    let advanceCooldown = 0;
    let done = false;

    const enemies: Enemy[] = [];
    const shots: Shot[] = [];
    const allies: Ally[] = [];

    const field = scene.add.container(0, 0).setDepth(10);
    const hud = scene.add.container(0, 0).setDepth(14).setScrollFactor(0);
    const controls = scene.add.container(0, 0).setDepth(15).setScrollFactor(0);
    const overlay = scene.add.container(0, 0).setDepth(20).setScrollFactor(0);

    // Scrim so the side-view reads clearly over the arc backdrop (the real
    // Mactan bg shows through beneath it).
    field.add(scene.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x0a1420, 0.5));
    // Shallow sea band where the water meets the shore.
    field.add(scene.add.rectangle(2050, groundY - 26, 700, 52, 0x1b4a5a, 0.45));
    // Textured beach ground — damp sand at the waterline, warm dry sand, a foam
    // lip and scattered grains — reads far better than the old flat brown bar
    // and matches the sunset-shore palette.
    const zones = scene.add.graphics();
    zones.fillStyle(0x284c3a, 0.28); zones.fillRect(0, 0, 760, groundY);
    zones.fillStyle(0xc9ad82, 0.22); zones.fillRect(760, 0, 620, groundY);
    zones.fillStyle(0xb0925f, 0.2); zones.fillRect(1380, 0, 320, groundY);
    zones.fillStyle(0x1b4a5a, 0.34); zones.fillRect(1700, 0, 700, groundY);
    for (let i = 0; i < 28; i++) {
      const coralX = 1720 + i * 24 + Phaser.Math.Between(-7, 7);
      zones.fillStyle(i % 2 ? 0x5c7c68 : 0x7d6351, 0.85);
      zones.fillTriangle(coralX - 8, groundY, coralX, groundY - Phaser.Math.Between(10, 22), coralX + 9, groundY);
    }
    field.add(zones);

    const beach = scene.add.graphics();
    beach.fillStyle(0xc9ad82, 1); beach.fillRect(0, groundY, WORLD_WIDTH, GROUND_H);
    beach.fillStyle(0xb0925f, 1); beach.fillRect(0, groundY, WORLD_WIDTH, 18);
    beach.fillStyle(0x7d6746, 1); beach.fillRect(0, groundY + GROUND_H - 10, WORLD_WIDTH, 10);
    beach.fillStyle(0xefe6cf, 1); beach.fillRect(1380, groundY - 2, 320, 3);
    for (let i = 0; i < 210; i++) {
      const sx = Math.random() * WORLD_WIDTH, sy = groundY + 10 + Math.random() * (GROUND_H - 14);
      beach.fillStyle(Math.random() < 0.5 ? 0x8f7550 : 0xe2d3ab, 0.55);
      beach.fillRect(sx, sy, 2, 2);
    }
    field.add(beach);

    // ---------------- PLAYER ----------------
    const player = scene.add.container(activeStage().playerSafeX, groundY);
    field.add(player);

    // Prefer the animated PixelLab sprite; fall back to flat code-art shapes if
    // the sheets weren't shipped (the game must run with zero character art).
    const useHeroSprite = ensureMactanHeroAnims(scene);
    const useEnemySprite = ensureMactanEnemyAnims(scene);
    const useAllySprite = ensureMactanAllyAnims(scene);
    let hero: Phaser.GameObjects.Sprite | undefined;
    let heroState = "";

    // Shape-fallback parts — only built when there is no sprite.
    let pLegL!: Phaser.GameObjects.Rectangle, pLegR!: Phaser.GameObjects.Rectangle;
    let pBody!: Phaser.GameObjects.Rectangle;
    let pShield!: Phaser.GameObjects.Arc, pHead!: Phaser.GameObjects.Arc;

    if (useHeroSprite) {
      hero = scene.add
        .sprite(0, 0, "mactan/hero_idle")
        .setOrigin(MACTAN_HERO.originX, MACTAN_HERO.originY)
        .setScale(MACTAN_HERO.scale);
      hero.play(animKeyFor("mactan/hero_idle"));
      player.add(hero);
    } else {
      pLegL = scene.add.rectangle(-6, -8, 8, 18, 0x3a2a20).setOrigin(0.5, 0);
      pLegR = scene.add.rectangle(6, -8, 8, 18, 0x3a2a20).setOrigin(0.5, 0);
      pBody = scene.add.rectangle(0, -20, 22, 26, 0x8d3b2e).setStrokeStyle(2, 0x5b2016).setOrigin(0.5, 1);
      pShield = scene.add.circle(-13, -26, 10, 0xcbb98a).setStrokeStyle(2, 0x8a6d3b);
      pHead = scene.add.circle(0, -44, 9, 0xe8c9a0);
      player.add([pLegL, pLegR, pBody, pShield, pHead]);
    }
    // player physics state
    let px = activeStage().playerSafeX, py = groundY, pvy = 0, grounded = true, facing = 1, crouching = false;
    let walkPhase = 0;
    // Dash provides a short, reliable escape from danger.
    let dashCd = 0, dashTime = 0;
    let dashQueued = false;

    const camera = scene.cameras.main;
    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    camera.setDeadzone(320, WORLD_HEIGHT);
    camera.setScroll(Phaser.Math.Clamp(activeStage().playerSafeX - width / 2, 0, WORLD_WIDTH - width), 0);
    camera.startFollow(player, true, 0.12, 0);

    // ---------------- HUD ----------------
    hud.add([
      scene.add.text(width / 2, 26, t("mg.mactan.instruction"), { fontFamily: FONT, fontSize: "18px", color: COLORS.text, fontStyle: "bold" }).setOrigin(0.5),
      scene.add.text(width / 2, 48, t("mg.mactan.sub"), { fontFamily: FONT, fontSize: "12px", color: COLORS.textMuted, align: "center", wordWrap: { width: width - 40 } }).setOrigin(0.5),
    ]);
    const scoreText = scene.add.text(width - 20, 80, "", { fontFamily: FONT, fontSize: "15px", color: COLORS.accentText, fontStyle: "bold" }).setOrigin(1, 0.5);
    // player HP bar
    const hpBarW = 220;
    hud.add(scene.add.rectangle(20, 80, hpBarW, 14, 0x3a2020).setOrigin(0, 0.5));
    const hpFill = scene.add.rectangle(20, 80, hpBarW, 14, COLORS.success).setOrigin(0, 0.5);
    const hpLabel = scene.add.text(24, 80, "", { fontFamily: FONT, fontSize: "11px", color: "#0a0f1c", fontStyle: "bold" }).setOrigin(0, 0.5);
    const defenseSegmentCount = 10;
    const defenseSegmentW = 12;
    const defenseSegmentGap = 4;
    const defenseSegmentsW = defenseSegmentCount * defenseSegmentW + (defenseSegmentCount - 1) * defenseSegmentGap;
    const defenseSegmentsX = width / 2 - defenseSegmentsW / 2 + 8;
    const defenseLabel = scene.add.text(width / 2 + 8, 70, "", { fontFamily: FONT, fontSize: "12px", color: "#c6e8ff", fontStyle: "bold" }).setOrigin(0.5);
    const defenseShield = scene.add.graphics();
    defenseShield.fillStyle(0x173b5f, 1);
    defenseShield.lineStyle(2, 0x78c8f0, 1);
    defenseShield.fillPoints([
      new Phaser.Geom.Point(defenseSegmentsX - 24, 79),
      new Phaser.Geom.Point(defenseSegmentsX - 10, 83),
      new Phaser.Geom.Point(defenseSegmentsX - 12, 96),
      new Phaser.Geom.Point(defenseSegmentsX - 24, 103),
      new Phaser.Geom.Point(defenseSegmentsX - 36, 96),
      new Phaser.Geom.Point(defenseSegmentsX - 38, 83),
    ], true);
    defenseShield.strokePoints([
      new Phaser.Geom.Point(defenseSegmentsX - 24, 79),
      new Phaser.Geom.Point(defenseSegmentsX - 10, 83),
      new Phaser.Geom.Point(defenseSegmentsX - 12, 96),
      new Phaser.Geom.Point(defenseSegmentsX - 24, 103),
      new Phaser.Geom.Point(defenseSegmentsX - 36, 96),
      new Phaser.Geom.Point(defenseSegmentsX - 38, 83),
    ], true);
    const defenseSegments = Array.from({ length: defenseSegmentCount }, (_, index) =>
      scene.add.rectangle(
        defenseSegmentsX + index * (defenseSegmentW + defenseSegmentGap),
        91,
        defenseSegmentW,
        index % 2 === 0 ? 18 : 14,
        0x4ba3d3
      ).setStrokeStyle(1, 0xa8ddf5).setOrigin(0, 0.5)
    );
    hud.add([hpFill, hpLabel, scoreText, defenseLabel, defenseShield, ...defenseSegments]);
    const updateHud = () => {
      const f = Math.max(0, playerHP / PLAYER_HP_MAX);
      hpFill.width = hpBarW * f;
      hpFill.setFillStyle(f > 0.5 ? COLORS.success : f > 0.25 ? 0xffb300 : COLORS.danger);
      hpLabel.setText(`${t("mg.mactan.hp")} ${Math.max(0, Math.round(playerHP))}`);
      scoreText.setText(t("mg.mactan.score", { n: score }));
    };
    const updateDefenseHud = () => {
      const fraction = Phaser.Math.Clamp(defenseValue / 100, 0, 1);
      const activeSegments = Math.ceil(fraction * defenseSegmentCount);
      defenseSegments.forEach((segment, index) => {
        segment.setFillStyle(index < activeSegments ? 0x4ba3d3 : 0x173b5f);
        segment.setAlpha(index < activeSegments ? 1 : 0.55);
      });
      defenseLabel.setText(t("mg.mactan.defense", { stage: t(activeStage().labelKey) }));
    };
    updateHud();
    updateDefenseHud();
    let statusText: Phaser.GameObjects.Text | undefined;
    function showStatus(message: string, color: string) {
      statusText?.destroy();
      const text = scene.add
        .text(width / 2, 126, message, { fontFamily: FONT, fontSize: "13px", color, fontStyle: "bold", align: "center", wordWrap: { width: width - 80 } })
        .setOrigin(0.5);
      statusText = text;
      hud.add(text);
      scene.time.delayedCall(1000, () => {
        if (statusText === text) {
          text.destroy();
          statusText = undefined;
        }
      });
    }

    // ---------------- INPUT ----------------
    // Keyboard: move A/D or ←/→, jump W/↑/Space, crouch S/↓/Ctrl, dash Shift.
    // Touch: the on-screen buttons below.
    const keys = scene.input.keyboard?.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E,F,G,CTRL,SHIFT") as Record<string, Phaser.Input.Keyboard.Key> | undefined;
    // Capture these so Space/arrows don't scroll the page and Ctrl/Shift don't
    // fire browser shortcuts while playing. Released again in finish().
    scene.input.keyboard?.addCapture("SPACE,CTRL,SHIFT,UP,DOWN,LEFT,RIGHT");
    const held = { left: false, right: false, crouch: false };
    let jumpQueued = false;

    // On-screen buttons — touch only. Tracked so their input can be toggled with
    // visibility (invisible objects still receive input in Phaser).
    const touchButtons: Phaser.GameObjects.Arc[] = [];
    const mkButton = (x: number, y: number, r: number, label: string, color: number, onDown: () => void, onUp?: () => void, fontSize = "13px") => {
      const btn = scene.add.circle(x, y, r, color, 0.32).setStrokeStyle(2, color, 0.8).setInteractive({ useHandCursor: true });
      const txt = scene.add.text(x, y, label, { fontFamily: FONT, fontSize, color: "#ffffff", fontStyle: "bold", align: "center", wordWrap: { width: r * 2 - 8 } }).setOrigin(0.5);
      btn.on("pointerdown", onDown);
      if (onUp) { btn.on("pointerup", onUp); btn.on("pointerout", onUp); }
      btn.setData("label", txt);
      controls.add([btn, txt]);
      touchButtons.push(btn);
      return btn;
    };
    // Movement pad (bottom-left), action buttons (bottom-right).
    mkButton(48, height - 52, 26, "◀", 0x3d5a99, () => (held.left = true), () => (held.left = false));
    mkButton(108, height - 52, 26, "▶", 0x3d5a99, () => (held.right = true), () => (held.right = false));
    mkButton(width - 118, height - 52, 26, `⤒\n${t("mg.mactan.jump")}`, 0x4caf50, () => (jumpQueued = true), undefined, "10px");
    mkButton(width - 60, height - 90, 24, `⤓\n${t("mg.mactan.crouch")}`, 0x4fc3f7, () => (held.crouch = true), () => (held.crouch = false), "10px");
    mkButton(width - 122, height - 104, 23, "»", 0x9c6ade, () => (dashQueued = true)); // dash

    const holdButton = mkButton(width - 52, height - 48, 38, t("mg.mactan.hold"), 0x8a6d3b, () => requestHold());
    const fallbackButton = mkButton(width - 194, height - 52, 32, t("mg.mactan.fallback"), 0x8a6d3b, () => requestFallBack());
    const advanceButton = mkButton(width - 270, height - 52, 32, t("mg.mactan.advance"), 0x8a6d3b, () => requestAdvance());
    const fallbackLabel = fallbackButton.getData("label") as Phaser.GameObjects.Text;
    const advanceLabel = advanceButton.getData("label") as Phaser.GameObjects.Text;
    fallbackButton.setVisible(false).disableInteractive();
    fallbackLabel.setVisible(false);
    advanceButton.setVisible(false).disableInteractive();
    advanceLabel.setVisible(false);

    // --- desktop vs touch (adaptive) ---
    // Buttons start visible (mkButton). Hide them on a hover + fine-pointer
    // device (a computer), and switch live: a real touch reveals them, a mouse
    // or key hides them — so a 2-in-1 shows them only once actually touched.
    let controlsShown = true;
    const setControlsShown = (show: boolean) => {
      if (show === controlsShown) return;
      controlsShown = show;
      controls.setVisible(show);
      for (const b of touchButtons) {
        if (show &&
          (b !== fallbackButton || fallbackIntroduced && fallbackButtonEnabled) &&
          (b !== advanceButton || advanceIntroduced && advanceButtonEnabled) &&
          !regrouping) b.setInteractive({ useHandCursor: true });
        else b.disableInteractive();
      }
    };
    const prefersDesktop =
      typeof window !== "undefined" &&
      window.matchMedia?.("(hover: hover) and (pointer: fine)").matches === true;
    setControlsShown(!prefersDesktop);

    // Desktop pointer movement hides touch controls. E advances, F holds, G regroups; Shift dashes.
    const onPointerDown = (pointer: Phaser.Input.Pointer) => {
      if (pointer.wasTouch) { setControlsShown(true); return; }
      setControlsShown(false);
    };
    const onPointerMove = (pointer: Phaser.Input.Pointer) => { if (!pointer.wasTouch) setControlsShown(false); };
    const onAnyKey = () => setControlsShown(false);
    const onKeyHold = () => requestHold();
    const onKeyFallBack = () => requestFallBack();
    const onKeyAdvance = () => requestAdvance();
    const onKeyDash = () => { if (!regrouping) dashQueued = true; };
    scene.input.on("pointerdown", onPointerDown);
    scene.input.on("pointermove", onPointerMove);
    scene.input.keyboard?.on("keydown", onAnyKey);
    scene.input.keyboard?.on("keydown-F", onKeyHold);
    scene.input.keyboard?.on("keydown-G", onKeyFallBack);
    scene.input.keyboard?.on("keydown-E", onKeyAdvance);
    scene.input.keyboard?.on("keydown-SHIFT", onKeyDash);

    // DEV hook so tests can drive without real input.
    if (import.meta.env.DEV) {
      (window as unknown as { __mg: unknown }).__mg = {
        set: (o: Partial<{ left: boolean; right: boolean; crouch: boolean }>) => Object.assign(held, o),
        jump: () => (jumpQueued = true),
        dash: () => (dashQueued = true),
        hold: () => requestHold(),
        fallBack: () => requestFallBack(),
        advance: () => requestAdvance(),
        spawnEnemy: () => spawnEnemy(),
        setLinePressure: (ms = FALLBACK_PRESSURE_DURATION) => {
          const enemy = enemies.find((e) => !e.dead) ?? (spawnEnemy(), enemies[enemies.length - 1]);
          if (!enemy || enemy.dead) return false;
          enemy.c.x = activeStage().lineX;
          enemy.breachTime = Math.max(0, ms);
          return true;
        },
        advanceLinePressure: (ms: number) => {
          const enemy = enemies.find((e) => !e.dead);
          if (!enemy) return false;
          enemy.c.x = activeStage().lineX;
          enemy.breachTime = Math.max(0, enemy.breachTime + ms);
          return true;
        },
        setEnemyExposed: () => {
          const enemy = enemies.find((e) => !e.dead) ?? (spawnEnemy(), enemies[enemies.length - 1]);
          if (!enemy || enemy.dead) return false;
          enemy.c.x = activeStage().lineX + 100;
          enemy.breachTime = 0;
          enemy.telegraph = 0;
          enemy.marker.setText("");
          enemy.shootCd = 9999;
          return true;
        },
        breach: () => {
          const enemy = enemies.find((e) => !e.dead);
          if (!enemy) return false;
          registerBreach(enemy);
          return true;
        },
        repel: () => {
          const enemy = enemies.find((e) => !e.dead);
          if (!enemy) return false;
          damageEnemy(enemy, enemy.hp, enemy.c.x, ALLY_KNOCKBACK_V);
          return true;
        },
        // Apply one hit through the real hurtPlayer path — no-ops during i-frames
        // (invuln/dash). Lets a script assert the dash grants i-frames.
        forceHit: () => hurtPlayer(SHOT_DMG, px + 40),
        // Deterministic dodge test: clear shots, drop a stationary shot at the
        // player's x/height so the next update's hitbox test alone decides
        // hit/miss. Lets a script assert crouch-clears-high / jump-clears-low.
        testShot: (kind: ShotKind) => {
          for (const s of shots) s.c.destroy();
          shots.length = 0;
          const c = scene.add.container(px, groundY + SHOT_Y[kind]);
          c.add(scene.add.circle(0, 0, 6, kind === "high" ? 0xe4572e : 0x4fc3f7).setStrokeStyle(2, 0xffffff));
          field.add(c);
          shots.push({ c, vx: 0, kind });
        },
        state: () => ({
          playerHP, score, defeated, spawned, breaches, done, regrouping,
          stageId: activeStage().id, stageIndex: activeStageIndex, defenseValue,
          holdCooldown: Math.round(holdCooldown), holdResponders: allies.filter((a) => a.responseMode === "hold" && (a.responseDelay > 0 || a.responseTime > 0)).length,
          advanceCooldown: Math.round(advanceCooldown), advanceIntroduced, advanceAvailable: canRequestAdvance(),
          advanceResponders: allies.filter((a) => a.responseMode === "advance" && (a.responseDelay > 0 || a.responseTime > 0)).length,
          fallbackIntroduced, fallbackAvailable: canRequestFallBack(), spawnEligible: canSpawnEnemy(),
          allies: allies.length, enemies: enemies.filter((e) => !e.dead).length,
          enemyHps: enemies.filter((e) => !e.dead).map((e) => Math.round(e.hp)),
          enemyXs: enemies.filter((e) => !e.dead).map((e) => Math.round(e.c.x)),
          shots: shots.length, px: Math.round(px), py: Math.round(py), grounded, crouching,
          dashing: dashTime > 0, dashCd: Math.round(dashCd),
        }),
      };
    }

    // ---------------- ENEMIES ----------------
    function canSpawnEnemy() {
      const activeEnemies = enemies.filter((e) => !e.dead).length;
      return !done && !regrouping && defeated < TOTAL_ENEMIES && activeEnemies < MAX_CONCURRENT && defeated + activeEnemies < TOTAL_ENEMIES;
    }

    function spawnEnemy() {
      if (done) return;
      spawned++;
      const c = scene.add.container(ENEMY_SPAWN_MIN_X + Math.random() * (ENEMY_SPAWN_MAX_X - ENEMY_SPAWN_MIN_X), groundY);
      const marker = scene.add.text(0, -116, "", { fontFamily: FONT, fontSize: "18px", fontStyle: "bold", color: "#e4572e" }).setOrigin(0.5);
      let sprite: Phaser.GameObjects.Sprite | undefined;
      if (useEnemySprite) {
        sprite = scene.add
          .sprite(0, 0, "mactan/enemy_walk")
          .setOrigin(MACTAN_ENEMY.originX, MACTAN_ENEMY.originY)
          .setScale(MACTAN_ENEMY.scale);
        sprite.play(animKeyFor("mactan/enemy_walk"));
        c.add([sprite, marker]);
      } else {
        const legL = scene.add.rectangle(-6, -8, 8, 18, 0x263238).setOrigin(0.5, 0);
        const legR = scene.add.rectangle(6, -8, 8, 18, 0x263238).setOrigin(0.5, 0);
        const body = scene.add.rectangle(0, -18, 22, 26, 0x455a74).setStrokeStyle(2, 0x2f3e52).setOrigin(0.5, 1);
        const head = scene.add.circle(0, -40, 9, 0xd9b892);
        const helmet = scene.add.rectangle(0, -46, 22, 8, 0x9aa4b0).setStrokeStyle(1, 0x5b6470);
        const gun = scene.add.rectangle(-4, -22, 26, 4, 0x5a4326).setOrigin(1, 0.5);
        c.add([legL, legR, gun, body, head, helmet, marker]);
      }
      field.add(c);
      const barBg = scene.add.rectangle(0, -106, 34, 5, 0x000000, 0.5).setOrigin(0.5);
      const barFill = scene.add.rectangle(-17, -106, 34, 5, 0x8bc34a).setOrigin(0, 0.5);
      c.add([barBg, barFill]);
      enemies.push({ c, hp: ENEMY_HP, barBg, barFill, shootCd: Phaser.Math.Between(900, 1600), telegraph: 0, telegraphKind: "high", marker, dead: false, sprite, stun: 0, kbVx: 0, breachTime: 0 });
    }
    // Start with two, then trickle the rest — but only ever a few at once
    // (MAX_CONCURRENT), so you + the allies stay the larger side.
    spawnEnemy();
    const spawner = scene.time.addEvent({
      delay: ENEMY_SPAWN_DELAY, loop: true,
      callback: () => {
        if (done || regrouping) return;
        if (defeated >= TOTAL_ENEMIES) { spawner?.remove(); return; }
        if (canSpawnEnemy()) spawnEnemy();
      },
    });

    // ---------------- ALLIES (Mactan warriors) ----------------
    function spawnAlly(x: number) {
      const c = scene.add.container(x, groundY);
      let sprite: Phaser.GameObjects.Sprite | undefined;
      let legL: Phaser.GameObjects.Rectangle | undefined;
      let legR: Phaser.GameObjects.Rectangle | undefined;
      let spear: Phaser.GameObjects.Rectangle | undefined;
      if (useAllySprite) {
        // PixelLab Mactan warrior — walk/attack/idle, driven in the update loop.
        sprite = scene.add
          .sprite(0, 0, "mactan/ally_idle")
          .setOrigin(MACTAN_ALLY.originX, MACTAN_ALLY.originY)
          .setScale(MACTAN_ALLY.scale);
        c.add(sprite);
      } else {
        // Code-art fallback: adult warrior, warm tones + gold sash + bolo-spear.
        legL = scene.add.rectangle(-6, -28, 8, 28, 0x4a3526).setOrigin(0.5, 0);
        legR = scene.add.rectangle(6, -28, 8, 28, 0x4a3526).setOrigin(0.5, 0);
        const body = scene.add.rectangle(0, -28, 24, 44, 0xa64b2e).setStrokeStyle(2, 0x6e2f1a).setOrigin(0.5, 1);
        const sash = scene.add.rectangle(0, -44, 26, 6, 0xe0b64a).setOrigin(0.5, 0.5);
        const shield = scene.add.circle(-14, -46, 10, 0xcbb98a).setStrokeStyle(2, 0x8a6d3b);
        const head = scene.add.circle(0, -84, 12, 0xc98a5a);
        const band = scene.add.rectangle(0, -91, 22, 5, 0x8a2f22).setOrigin(0.5, 0.5);
        spear = scene.add.rectangle(13, -46, 4, 48, 0x7a5230).setStrokeStyle(1, 0x4e3419).setOrigin(0.5, 1);
        c.add([legL, legR, spear, body, sash, shield, head, band]);
      }
      field.add(c);
      allies.push({ c, attackCd: 0, attackActive: 0, stagger: 0, kbVx: 0, walkPhase: 0, anchorX: x, responseDelay: 0, responseTime: 0, responseExtended: false, sprite, state: "", legL, legR, spear });
    }
    for (const x of activeStage().anchors) spawnAlly(x);

    function isThreatNearAnchor(a: Ally, e: Enemy) {
      return !e.dead && e.c.x >= a.anchorX && e.c.x - a.anchorX <= HOLD_THREAT_RANGE;
    }

    function hasNextDefenseStage() {
      return activeStageIndex + 1 < DEFENSE_STAGES.length;
    }

    function hasEligibleNearbyAdult() {
      return allies.some((a) => a.stagger <= 0 && Math.abs(a.c.x - px) <= HOLD_RANGE);
    }

    function isEnemyPressuringLine(e: Enemy) {
      return !e.dead && Math.abs(e.c.x - activeStage().lineX) <= 4 && e.breachTime >= FALLBACK_PRESSURE_DURATION;
    }

    function hasFallBackPressure() {
      return enemies.some(isEnemyPressuringLine);
    }

    function isImmediateLinePressure(e: Enemy) {
      return !e.dead && e.c.x <= activeStage().lineX + 4;
    }

    function hasImmediateLinePressure() {
      return enemies.some(isImmediateLinePressure);
    }

    function hasActiveRelayResponse() {
      return allies.some((a) => a.responseDelay > 0 || a.responseTime > 0);
    }

    function isAdvanceOpening(e: Enemy) {
      const distanceAhead = e.c.x - activeStage().lineX;
      return !e.dead && e.telegraph <= 0 &&
        distanceAhead >= ADVANCE_OPENING_MIN && distanceAhead <= ADVANCE_OPENING_MAX &&
        !hasImmediateLinePressure();
    }

    function getAdvanceTarget() {
      const live = enemies.filter((e) => !e.dead);
      return live.length === 1 && isAdvanceOpening(live[0]) ? live[0] : undefined;
    }

    function isActiveAdvanceTargetValid(target: Enemy) {
      return !regrouping && !target.dead && target.telegraph <= 0 &&
        enemies.filter((e) => !e.dead).length === 1 &&
        target.c.x > activeStage().lineX + 4 && !hasImmediateLinePressure();
    }

    function getAdvanceFormationFront(target: Enemy) {
      return Math.min(activeStage().lineX + ADVANCE_LINE_LIMIT, target.c.x - (ALLY_RANGE - 16));
    }

    function canRequestFallBack() {
      return !done && !regrouping && fallbackIntroduced && hasNextDefenseStage() && hasEligibleNearbyAdult() && hasFallBackPressure();
    }

    function updateFallBackControl() {
      const enabled = canRequestFallBack();
      if (enabled === fallbackButtonEnabled) return;
      fallbackButtonEnabled = enabled;
      fallbackButton.setAlpha(enabled ? 1 : 0.35);
      if (enabled && controlsShown) fallbackButton.setInteractive({ useHandCursor: true });
      else fallbackButton.disableInteractive();
    }

    function canRequestAdvance() {
      return !done && !regrouping && advanceIntroduced && advanceCooldown <= 0 &&
        !hasActiveRelayResponse() && hasEligibleNearbyAdult() && !!getAdvanceTarget();
    }

    function updateAdvanceControl() {
      const enabled = canRequestAdvance();
      if (enabled === advanceButtonEnabled) return;
      advanceButtonEnabled = enabled;
      advanceButton.setAlpha(enabled ? 1 : 0.35);
      if (enabled && controlsShown) advanceButton.setInteractive({ useHandCursor: true });
      else advanceButton.disableInteractive();
    }

    function introduceFallBack() {
      if (fallbackIntroduced || !hasNextDefenseStage() || !hasFallBackPressure()) return;
      fallbackIntroduced = true;
      fallbackButton.setVisible(true);
      fallbackLabel.setVisible(true);
      showStatus(t("mg.mactan.fallbackTutorial"), "#ffd54a");
      updateFallBackControl();
    }

    function introduceAdvance() {
      if (advanceIntroduced || !getAdvanceTarget() || !hasEligibleNearbyAdult()) return;
      advanceIntroduced = true;
      advanceButton.setVisible(true);
      advanceLabel.setVisible(true);
      showStatus(t("mg.mactan.advanceTutorial"), "#ffd54a");
      updateAdvanceControl();
    }

    function isResponseTargetValid(a: Ally) {
      const target = a.responseTarget;
      if (!target || target.dead) return false;
      if (a.responseMode === "advance") return isActiveAdvanceTargetValid(target);
      return target.c.x >= a.anchorX && target.c.x - a.anchorX <= HOLD_THREAT_RANGE + HOLD_GROUP_SUPPORT_RANGE;
    }

    function isImmediateResponseThreat(a: Ally) {
      const target = a.responseTarget;
      return !!target && allies.some((responder) => responder.responseTarget === target && isThreatNearAnchor(responder, target));
    }

    function clearResponse(a: Ally) {
      a.responseDelay = 0;
      a.responseTime = 0;
      a.responseExtended = false;
      a.responseTarget = undefined;
      a.responseMode = undefined;
      a.responseFormationOffset = undefined;
    }

    function requestHold() {
      if (done || regrouping) return;
      if (hasActiveRelayResponse()) {
        showStatus(t("mg.mactan.holdWait"), "#ffd54a");
        return;
      }
      if (holdCooldown > 0) {
        showStatus(t("mg.mactan.holdWait"), "#ffd54a");
        return;
      }
      const eligible = allies.filter((a) =>
        a.stagger <= 0 &&
        a.responseDelay <= 0 &&
        a.responseTime <= 0 &&
        Math.abs(a.c.x - px) <= HOLD_RANGE
      );
      if (!eligible.length) {
        showStatus(t("mg.mactan.holdTooFar"), "#ffd54a");
        return;
      }
      const directDetectors = eligible.flatMap((a) =>
        enemies.filter((e) => isThreatNearAnchor(a, e)).map((target) => ({ a, target }))
      );
      if (!directDetectors.length) {
        showStatus(t("mg.mactan.holdNoThreat"), "#ffd54a");
        return;
      }
      directDetectors.sort((left, right) => Math.abs(left.target.c.x - left.a.anchorX) - Math.abs(right.target.c.x - right.a.anchorX));
      const primary = directDetectors[0];
      const supporter = eligible
        .filter((a) => a !== primary.a && Math.abs(a.anchorX - primary.a.anchorX) <= HOLD_GROUP_SUPPORT_RANGE)
        .sort((left, right) => {
          const leftDirect = isThreatNearAnchor(left, primary.target) ? 0 : 1;
          const rightDirect = isThreatNearAnchor(right, primary.target) ? 0 : 1;
          return leftDirect - rightDirect || Math.abs(left.anchorX - primary.a.anchorX) - Math.abs(right.anchorX - primary.a.anchorX);
        })[0];
      const responders = [primary.a, ...(supporter ? [supporter] : [])].slice(0, HOLD_MAX_RESPONDERS);
      holdCooldown = HOLD_COOLDOWN;
      for (const a of responders) {
        a.responseTarget = primary.target;
        a.responseDelay = HOLD_RESPONSE_DELAY;
        a.responseExtended = false;
        a.responseMode = "hold";
        a.responseFormationOffset = undefined;
      }
      showStatus(t("mg.mactan.holdAcknowledged"), "#8bc34a");
    }

    function requestAdvance() {
      if (done || regrouping || !advanceIntroduced) return;
      if (advanceCooldown > 0 || hasActiveRelayResponse()) {
        showStatus(t("mg.mactan.advanceWait"), "#ffd54a");
        return;
      }
      const eligible = allies.filter((a) => a.stagger <= 0 && Math.abs(a.c.x - px) <= HOLD_RANGE);
      if (!eligible.length) {
        showStatus(t("mg.mactan.holdTooFar"), "#ffd54a");
        return;
      }
      const target = getAdvanceTarget();
      if (!target) {
        showStatus(hasImmediateLinePressure() ? t("mg.mactan.advanceUnderPressure") : t("mg.mactan.advanceNoOpening"), "#ffd54a");
        return;
      }
      const responders = eligible
        .sort((left, right) => Math.abs(left.anchorX - target.c.x) - Math.abs(right.anchorX - target.c.x))
        .slice(0, HOLD_MAX_RESPONDERS);
      advanceCooldown = ADVANCE_COOLDOWN;
      responders.forEach((a, index) => {
        a.responseTarget = target;
        a.responseDelay = HOLD_RESPONSE_DELAY;
        a.responseExtended = false;
        a.responseMode = "advance";
        a.responseFormationOffset = index === 0 ? 0 : -16;
      });
      showStatus(t("mg.mactan.advanceAcknowledged"), "#8bc34a");
    }

    function requestFallBack() {
      if (done) return;
      if (regrouping) {
        showStatus(t("mg.mactan.fallbackRegrouping"), "#ffd54a");
        return;
      }
      if (!fallbackIntroduced) return;
      if (!hasNextDefenseStage()) {
        showStatus(t("mg.mactan.fallbackNoStage"), "#ffd54a");
        return;
      }
      if (!hasEligibleNearbyAdult()) {
        showStatus(t("mg.mactan.holdTooFar"), "#ffd54a");
        return;
      }
      if (!hasFallBackPressure()) {
        showStatus(t("mg.mactan.fallbackNoPressure"), "#ffd54a");
        return;
      }
      beginRegroup();
    }

    /** Adult defenders drive enemies back through coordinated attacks. */
    function damageEnemy(e: Enemy, dmg: number, fromX: number, knockV: number) {
      if (e.dead) return;
      e.hp = Math.max(0, e.hp - dmg);
      e.barFill.width = Math.max(0, (e.hp / ENEMY_HP) * 34);
      e.kbVx = (e.c.x >= fromX ? 1 : -1) * knockV; // shoved away from the attacker
      e.stun = Math.max(e.stun, KB_STUN);
      sfx.hit();
      burst(scene, e.c.x, e.c.y - 24, [0xffd54a, 0xffffff], 8, 140);
      if (e.hp <= 0 && !e.dead) {
        e.dead = true;
        for (const a of allies) if (a.responseTarget === e) clearResponse(a);
        defeated++;
        combo++;
        score += 30 * Math.max(1, combo);
        defenseValue = Math.min(activeStage().defenseCeiling, defenseValue + 8);
        floatText(scene, e.c.x, e.c.y - 50, "BONK!", "#ffd54a", "15px");
        scene.tweens.add({ targets: e.c, angle: 70, alpha: 0, y: e.c.y + 10, duration: 380, onComplete: () => e.c.destroy() });
        updateHud();
        updateDefenseHud();
        checkWin();
      }
    }

    function hurtPlayer(dmg: number, fromX: number) {
      if (invuln > 0 || dashTime > 0 || done || regrouping) return; // dash = guaranteed i-frames
      playerHP -= dmg;
      combo = 0;
      invuln = INVULN_MS;
      sfx.thud();
      flash(scene, 0xe4572e, 120);
      shake(scene, 150, 0.006);
      px = Phaser.Math.Clamp(px + (px < fromX ? -20 : 20), 20, WORLD_WIDTH - 20);
      updateHud();
      if (playerHP <= 0) {
        playerHP = 40; // soft recover — kids never hit a dead end
        px = activeStage().playerSafeX; py = groundY; pvy = 0;
        showStatus(t("mg.mactan.defeated"), "#e4572e");
      }
    }

    function fireShot(e: Enemy, kind: ShotKind) {
      const yOff = SHOT_Y[kind]; // high ~head (crouch under), low ~shins (jump over)
      const c = scene.add.container(e.c.x - 18, e.c.y + yOff);
      const dot = scene.add.circle(0, 0, 6, kind === "high" ? 0xe4572e : 0x4fc3f7).setStrokeStyle(2, 0xffffff);
      c.add(dot);
      field.add(c);
      shots.push({ c, vx: px < e.c.x ? -SHOT_SPEED : SHOT_SPEED, kind });
      sfx.tap();
    }

    function checkWin() {
      if (!done && defeated >= TOTAL_ENEMIES) finish(false);
    }

    function beginRegroup() {
      const nextStage = DEFENSE_STAGES[activeStageIndex + 1];
      if (!nextStage) return;
      regrouping = true;
      activeStageIndex++;
      defenseValue = nextStage.defenseCeiling;
      held.left = false;
      held.right = false;
      held.crouch = false;
      jumpQueued = false;
      dashQueued = false;
      holdButton.disableInteractive().setAlpha(0.25);
      fallbackButton.disableInteractive().setAlpha(0.25);
      advanceButton.disableInteractive().setAlpha(0.25);
      for (const a of allies) {
        clearResponse(a);
        a.stagger = 0;
        a.kbVx = 0;
        a.attackActive = 0;
        a.c.setScale(-1, 1);
        a.state = "walk";
        if (a.sprite) a.sprite.play(animKeyFor("mactan/ally_walk"), true);
        else if (a.legL && a.legR) {
          scene.tweens.add({ targets: a.legL, y: -24, duration: 110, yoyo: true, repeat: 3 });
          scene.tweens.add({ targets: a.legR, y: -32, duration: 110, yoyo: true, repeat: 3 });
        }
      }
      facing = -1;
      player.setScale(-1, 1);
      heroState = "walk";
      if (hero) hero.play(animKeyFor("mactan/hero_walk"), true);
      else {
        scene.tweens.add({ targets: pLegL, y: -4, duration: 110, yoyo: true, repeat: 3 });
        scene.tweens.add({ targets: pLegR, y: -12, duration: 110, yoyo: true, repeat: 3 });
      }
      for (const enemy of enemies) {
        if (enemy.dead) continue;
        enemy.breachTime = 0;
        enemy.telegraph = 0;
        enemy.marker.setText("");
      }
      for (const shot of shots) shot.c.destroy();
      shots.length = 0;
      updateDefenseHud();
      showStatus(t("mg.mactan.regroup", { stage: t(nextStage.labelKey) }), "#ffd54a");
      allies.forEach((a, index) => {
        scene.tweens.add({ targets: a.c, x: nextStage.anchors[index], duration: REGROUP_DURATION, ease: "Sine.inOut" });
      });
      scene.tweens.add({
        targets: player,
        x: nextStage.playerSafeX,
        duration: REGROUP_DURATION,
        ease: "Sine.inOut",
        onComplete: () => {
          px = nextStage.playerSafeX;
          py = groundY;
          pvy = 0;
          player.setPosition(px, py);
          allies.forEach((a, index) => {
            a.anchorX = nextStage.anchors[index];
            a.c.setPosition(a.anchorX, groundY);
            a.state = "idle";
            if (a.sprite) {
              a.sprite.anims.stop();
              a.sprite.setTexture("mactan/ally_idle", 0);
            } else {
              a.legL!.y = -28;
              a.legR!.y = -28;
              a.spear!.setAngle(-6);
            }
          });
          heroState = "idle";
          if (hero) {
            hero.anims.stop();
            hero.setTexture("mactan/hero_idle", 0);
          } else {
            pLegL.y = -8;
            pLegR.y = -8;
          }
          regrouping = false;
          if (controlsShown) holdButton.setInteractive({ useHandCursor: true });
          holdButton.setAlpha(holdCooldown > 0 ? 0.45 : 1);
          updateFallBackControl();
          updateAdvanceControl();
        },
      });
    }

    function registerBreach(e: Enemy) {
      if (e.dead || done) return;
      e.dead = true;
      for (const a of allies) if (a.responseTarget === e) clearResponse(a);
      breaches++;
      scene.tweens.add({ targets: e.c, alpha: 0, x: e.c.x - 35, duration: 260, onComplete: () => e.c.destroy() });
      if (breaches >= BREACH_LIMIT) {
        defenseValue = 0;
        updateDefenseHud();
        finish(true);
      } else beginRegroup();
    }

    // ---------------- UPDATE ----------------
    const update = (_time: number, deltaMs: number) => {
      if (done || regrouping) return;
      const dt = Math.min(deltaMs, 50) / 1000;
      if (invuln > 0) invuln -= deltaMs;
      dashCd -= deltaMs;
      holdCooldown = Math.max(0, holdCooldown - deltaMs);
      advanceCooldown = Math.max(0, advanceCooldown - deltaMs);
      holdButton.setAlpha(holdCooldown > 0 ? 0.45 : 1);
      player.setAlpha(invuln > 0 && Math.floor(invuln / 90) % 2 === 0 ? 0.4 : 1);

      // --- input → intent ---
      let moveDir = 0;
      if (keys) {
        if (keys.A.isDown || keys.LEFT.isDown) moveDir -= 1;
        if (keys.D.isDown || keys.RIGHT.isDown) moveDir += 1;
        if (Phaser.Input.Keyboard.JustDown(keys.W) || Phaser.Input.Keyboard.JustDown(keys.UP) || Phaser.Input.Keyboard.JustDown(keys.SPACE)) jumpQueued = true;
      }
      if (held.left) moveDir -= 1;
      if (held.right) moveDir += 1;
      crouching = grounded && ((keys?.S.isDown || keys?.DOWN.isDown || keys?.CTRL.isDown) || held.crouch) === true;

      if (moveDir !== 0) facing = moveDir;

      // --- dash: a quick i-frame lunge in the facing direction ---
      if (dashQueued && dashCd <= 0 && dashTime <= 0 && grounded && !crouching) {
        dashTime = DASH_DUR; dashCd = DASH_CD;
        sfx.tap();
        burst(scene, px, py - 30, [0x9c6ade, 0xffffff], 10, 170);
      }
      dashQueued = false;
      const dashing = dashTime > 0;
      if (dashing) { dashTime -= deltaMs; px = Phaser.Math.Clamp(px + facing * DASH_SPEED * dt, 20, WORLD_WIDTH - 20); }
      // --- horizontal move (no move while crouching / dashing) ---
      if (!crouching && !dashing) px = Phaser.Math.Clamp(px + moveDir * MOVE_SPEED * dt, 20, WORLD_WIDTH - 20);
      if (moveDir !== 0 && grounded && !crouching && !dashing) walkPhase += dt * 10; else walkPhase = 0;

      // --- jump / gravity ---
      if (jumpQueued && grounded && !crouching && !dashing) { pvy = -JUMP_V; grounded = false; }
      jumpQueued = false;
      pvy += GRAVITY * dt;
      py += pvy * dt;
      if (py >= groundY) { py = groundY; pvy = 0; grounded = true; }

      // --- draw player pose ---
      player.setPosition(px, py);
      player.setScale(facing, 1); // flips the character to face left

      // dash after-image: translucent during the i-frame lunge
      if (dashing) player.setAlpha(0.6);
      if (hero) {
        // Animation state machine — priority: airborne > crouch > walk > idle.
        let want = "idle";
        if (!grounded) want = "jump";
        else if (crouching) want = "crouch";
        else if (moveDir !== 0) want = "walk";
        if (want !== heroState) {
          heroState = want;
          if (want === "crouch") { hero.anims.stop(); hero.setTexture("mactan/hero_crouch", 2); }
          else hero.play(animKeyFor("mactan/hero_" + want), true);
        }
      } else {
        if (crouching) { pBody.scaleY = 0.6; pHead.y = -32; pShield.y = -18; player.y = py; pLegL.scaleY = 0.5; pLegR.scaleY = 0.5; }
        else { pBody.scaleY = 1; pHead.y = -44; pShield.y = -26; pLegL.scaleY = 1; pLegR.scaleY = 1; }
        // little walk wobble
        const wob = Math.sin(walkPhase) * 3;
        pLegL.y = -8 + (grounded ? wob : -4);
        pLegR.y = -8 - (grounded ? wob : -4);
      }

      // Player hitbox (reflects crouch/jump so dodging works). Feet-anchored:
      // the box spans py-2*halfH .. py. Sized to the ~78px hero — standing ≈ 78px,
      // crouched ≈ 44px. The crouched top (~py-48 incl. tolerance) sits BELOW the
      // HIGH shot line (py-64), so ducking clears it; a JUMP lifts the whole box
      // above the LOW shot (py-18).
      const halfH = crouching ? 22 : 39;
      const cy = py - halfH; // center of body
      const halfW = 13;

      // --- enemies ---
      for (const e of enemies) {
        if (e.dead) continue;
        // Knockback slides the enemy back toward the surf; stun freezes its own
        // actions for a beat so a solid hit reads as driving the line back.
        if (e.kbVx !== 0) {
          e.c.x = Phaser.Math.Clamp(e.c.x + e.kbVx * dt, 40, WORLD_WIDTH - 30);
          e.kbVx *= 0.86;
          if (Math.abs(e.kbVx) < 8) e.kbVx = 0;
        }
        if (e.stun > 0) {
          e.stun -= deltaMs;
          if (e.sprite) e.sprite.anims.pause();
          continue; // no approach / contact / shooting while stunned
        }
        // The east-facing sprite art faces the opposite way from the old shapes.
        const faceLeft = px < e.c.x;
        e.c.setScale(e.sprite ? (faceLeft ? -1 : 1) : faceLeft ? 1 : -1, 1);
        const dist = e.c.x - px;
        // approach until in shooting range — walk only while actually moving
        const approaching = e.c.x > activeStage().lineX;
        if (e.sprite) { if (approaching) e.sprite.anims.resume(); else e.sprite.anims.pause(); }
        if (approaching) e.c.x = Math.max(activeStage().lineX, e.c.x - 46 * dt);
        else {
          e.breachTime += deltaMs;
          if (e.breachTime >= BREACH_DELAY) {
            registerBreach(e);
            if (regrouping) return;
            continue;
          }
        }
        // contact damage
        if (Math.abs(dist) < 26 && Math.abs(e.c.y - py) < 60) hurtPlayer(CONTACT_DMG, e.c.x);
        // shoot cycle
        if (e.telegraph > 0) {
          e.telegraph -= deltaMs;
          e.marker.setScale(1 + Math.sin(performance.now() / 80) * 0.25);
          if (e.telegraph <= 0) { e.marker.setText(""); fireShot(e, e.telegraphKind); e.shootCd = Phaser.Math.Between(1400, 2200); }
        } else {
          e.shootCd -= deltaMs;
          if (e.shootCd <= 0 && Math.abs(dist) < ENEMY_FIRE_RANGE) {
            e.telegraphKind = Math.random() < 0.5 ? "high" : "low";
            e.telegraph = 700;
            e.marker.setText(e.telegraphKind === "high" ? "↓" : "↑"); // ↓=crouch, ↑=jump
            e.marker.setColor(e.telegraphKind === "high" ? "#e4572e" : "#4fc3f7");
          }
        }
      }

      introduceFallBack();
      updateFallBackControl();
      introduceAdvance();
      updateAdvanceControl();

      // --- allies (advance, chip, knock back — but can't land the kill) ---
      // Fan out: each warrior takes a different invader (round-robin), so the
      // crowd mobs the few soldiers instead of dogpiling one — reads as the
      // Mactan side outnumbering them.
      const live = enemies.filter((e) => !e.dead);
      for (const a of allies) {
        if (a.attackActive > 0) a.attackActive -= deltaMs;
        if (a.kbVx !== 0) {
          a.c.x = Phaser.Math.Clamp(a.c.x + a.kbVx * dt, 30, WORLD_WIDTH - 90);
          a.kbVx *= 0.86;
          if (Math.abs(a.kbVx) < 8) a.kbVx = 0;
        }
        let moving = false;
        if (a.stagger > 0) {
          a.stagger -= deltaMs;
          clearResponse(a);
        } else if (a.responseDelay > 0) {
          if (!isResponseTargetValid(a)) clearResponse(a);
          else {
            a.responseDelay -= deltaMs;
            if (a.responseDelay <= 0) a.responseTime = a.responseMode === "advance" ? ADVANCE_RESPONSE_DURATION : HOLD_RESPONSE_DURATION;
          }
        } else if (a.responseTime > 0) {
          a.responseTime -= deltaMs;
          const target = a.responseTarget;
          if (!isResponseTargetValid(a)) clearResponse(a);
          else if (a.responseTime <= 0) {
            if (a.responseMode === "hold" && !a.responseExtended && isImmediateResponseThreat(a)) {
              a.responseTime = HOLD_RESPONSE_EXTENSION;
              a.responseExtended = true;
            } else clearResponse(a);
          }
          else if (target) {
            const formationX = a.responseMode === "advance"
              ? getAdvanceFormationFront(target) + (a.responseFormationOffset ?? 0)
              : target.c.x;
            const dx = formationX - a.c.x;
            a.c.setScale(dx >= 0 ? 1 : -1, 1);
            a.attackCd -= deltaMs;
            const targetDistance = Math.abs(target.c.x - a.c.x);
            if (a.responseMode === "advance" && targetDistance <= ALLY_RANGE) {
              if (a.attackCd <= 0) {
                a.attackCd = ALLY_ATTACK_CD;
                a.attackActive = 220;
                damageEnemy(target, ALLY_DMG, a.c.x, ALLY_KNOCKBACK_V);
              }
            } else if (Math.abs(dx) > 1) {
              const previousX = a.c.x;
              const nextX = previousX + Math.sign(dx) * ALLY_SPEED * dt;
              const maxX = a.responseMode === "advance"
                ? activeStage().lineX + ADVANCE_LINE_LIMIT
                : a.anchorX + HOLD_ANCHOR_LEASH;
              a.c.x = Phaser.Math.Clamp(nextX, a.anchorX - HOLD_ANCHOR_LEASH, maxX);
              moving = a.c.x !== previousX;
            } else if (a.responseMode !== "advance" && a.attackCd <= 0) {
              a.attackCd = ALLY_ATTACK_CD;
              a.attackActive = 220;
              damageEnemy(target, ALLY_DMG, a.c.x, ALLY_KNOCKBACK_V);
            }
          }
        }
        if (a.responseTime <= 0) {
          const nearbyThreat = live.find((e) => !e.dead && Math.abs(e.c.x - a.anchorX) <= HOLD_THREAT_RANGE);
          if (nearbyThreat) a.c.setScale(nearbyThreat.c.x >= a.c.x ? 1 : -1, 1);
          if (Math.abs(a.c.x - a.anchorX) > 1) {
            const nextX = a.c.x + Math.sign(a.anchorX - a.c.x) * ALLY_SPEED * dt;
            a.c.x = Phaser.Math.Clamp(nextX, a.anchorX - HOLD_ANCHOR_LEASH, a.anchorX + HOLD_ANCHOR_LEASH);
            moving = true;
          }
        }
        // pose: PixelLab sprite anim (walk/attack/idle), or code-art fallback
        if (a.sprite) {
          const want = a.stagger > 0 ? "idle" : a.attackActive > 0 ? "attack" : moving ? "walk" : "idle";
          if (want !== a.state) {
            a.state = want;
            if (want === "idle") { a.sprite.anims.stop(); a.sprite.setTexture("mactan/ally_idle", 0); }
            else a.sprite.play(animKeyFor("mactan/ally_" + want), true);
          }
        } else {
          a.walkPhase = moving ? a.walkPhase + dt * 10 : 0;
          const wob = Math.sin(a.walkPhase) * 3;
          a.legL!.y = -28 + wob;
          a.legR!.y = -28 - wob;
          a.spear!.setAngle(a.attackActive > 0 ? 64 : -6);
        }
        a.c.setAlpha(a.stagger > 0 && Math.floor(a.stagger / 90) % 2 === 0 ? 0.5 : 1);
      }

      // --- shots ---
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.c.x += s.vx * dt;
        // Allies screen some shots — one that reaches a standing ally is absorbed
        // (the ally is knocked back + staggered instead of the player being hit).
        let blocked = false;
        for (const a of allies) {
          if (a.stagger > 0) continue;
          if (Math.abs(s.c.x - a.c.x) < 15 && Math.abs(s.c.y - (a.c.y - 46)) < 44) {
            a.stagger = ALLY_STAGGER;
            a.kbVx = (a.c.x <= s.c.x ? -1 : 1) * ALLY_KNOCKBACK_V;
            burst(scene, s.c.x, s.c.y, [0xcbb98a, 0xffffff], 6, 120);
            sfx.thud();
            s.c.destroy(); shots.splice(i, 1); blocked = true; break;
          }
        }
        if (blocked) continue;
        // hit test vs player hitbox
        if (Math.abs(s.c.x - px) < halfW + 6 && Math.abs(s.c.y - cy) < halfH + 4) {
          hurtPlayer(SHOT_DMG, s.c.x);
          s.c.destroy(); shots.splice(i, 1); continue;
        }
        if (s.c.x < -20 || s.c.x > WORLD_WIDTH + 20) { s.c.destroy(); shots.splice(i, 1); }
      }
    };
    scene.events.on(Phaser.Scenes.Events.UPDATE, update);

    const failsafe = scene.time.delayedCall(120000, () => finish(true));

    function restoreCamera() {
      camera.stopFollow();
      camera.removeBounds();
      camera.setDeadzone();
      camera.setScroll(0, 0);
    }

    function finish(recovery: boolean) {
      if (done) return;
      done = true;
      if (import.meta.env.DEV) {
        window.dispatchEvent(new CustomEvent("mactan-mini-game-complete", { detail: { recovery, defeated, breaches, spawned } }));
      }
      scene.events.off(Phaser.Scenes.Events.UPDATE, update);
      // Remove input listeners before the results overlay; release key captures.
      scene.input.off("pointerdown", onPointerDown);
      scene.input.off("pointermove", onPointerMove);
      scene.input.keyboard?.off("keydown", onAnyKey);
      scene.input.keyboard?.off("keydown-F", onKeyHold);
      scene.input.keyboard?.off("keydown-G", onKeyFallBack);
      scene.input.keyboard?.off("keydown-E", onKeyAdvance);
      scene.input.keyboard?.off("keydown-SHIFT", onKeyDash);
      scene.input.keyboard?.removeCapture("SPACE,CTRL,SHIFT,UP,DOWN,LEFT,RIGHT");
      spawner?.remove();
      failsafe.remove();
      if (import.meta.env.DEV) delete (window as unknown as { __mg?: unknown }).__mg;

      const perf = recovery ? 0 : Math.max(0, defeated / TOTAL_ENEMIES) * 0.6 + Math.max(0, playerHP / PLAYER_HP_MAX) * 0.4;
      const stars = starsFor(perf);
      if (stars >= 2) { sfx.success(); burst(scene, width / 2, height / 2 - 60, [0x8bc34a, 0xffd54a, 0xffffff], 34, 280); }

      hud.removeAll(true);
      controls.removeAll(true);
      overlay.add([
        scene.add.text(width / 2, height / 2 - 120, recovery ? t("mg.mactan.resultRecovery") : t("mg.mactan.result", { n: defeated }), { fontFamily: FONT, fontSize: "22px", color: COLORS.text, fontStyle: "bold", align: "center", wordWrap: { width: width - 80 } }).setOrigin(0.5),
        scene.add.text(width / 2, height / 2 - 86, t("mg.mactan.score", { n: score }), { fontFamily: FONT, fontSize: "17px", color: COLORS.accentText }).setOrigin(0.5),
        scene.add.text(width / 2, height / 2 + 10, recovery ? t("mg.mactan.resultRecoveryTip") : stars >= 2 ? t("mg.mactan.resultWin") : t("mg.mactan.resultOk"), { fontFamily: FONT, fontSize: "15px", color: COLORS.textMuted, align: "center", wordWrap: { width: width - 80 } }).setOrigin(0.5),
      ]);
      overlay.add(showStars(scene, width / 2, height / 2 - 40, stars, () => sfx.pop()));

      scene.time.delayedCall(2000, () => {
        restoreCamera();
        overlay.destroy(true); hud.destroy(true); controls.destroy(true); field.destroy(true);
        resolve({ score: perf, attempts: Math.max(1, TOTAL_ENEMIES - defeated + 1), msSpent: Math.round(performance.now() - startedAt) });
      });
    }
  });
}
