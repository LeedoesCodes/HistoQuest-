import Phaser from "phaser";
import type { MiniGameNode, MiniGameResult } from "../../content/types";
import { COLORS, FONT } from "../../ui/theme";
import { burst, shake, flash, floatText, showStars, starsFor } from "../../ui/juice";
import { sfx } from "../../ui/sfx";
import { t } from "../../i18n";
import { ensureMactanHeroAnims, ensureMactanEnemyAnims, animKeyFor, MACTAN_HERO, MACTAN_ENEMY } from "../../assets/sprites";

/**
 * The hero's spear as a small code-art sibling (PixelLab drops the baked spear
 * across animations, so it's pinned separately and driven by us). Pivot at the
 * grip; shaft grows upward so a +90° rotation thrusts it forward.
 */
function makeSpear(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const shaft = scene.add.rectangle(0, 0, 3, 42, 0x7a5230).setStrokeStyle(1, 0x4e3419).setOrigin(0.5, 1);
  const tip = scene.add.rectangle(0, -42, 5, 9, 0xd8c69a).setStrokeStyle(1, 0x8a6d3b).setOrigin(0.5, 1);
  c.add([shaft, tip]);
  return c;
}

/**
 * Mactan defense — SIDE-VIEW action combat.
 *
 * Side camera on the Mactan seashore. You are a young warrior:
 *   - MOVE left/right, JUMP, CROUCH (keyboard or on-screen buttons).
 *   - ATTACK manually — a weapon swing with a hitbox that damages enemies.
 *   - DODGE: Spanish soldiers fire telegraphed shots. A HIGH shot (crouch under
 *     it) or a LOW shot (jump over it). Your hitbox shrinks when crouching and
 *     lifts when jumping, so correct dodging makes the bullet miss.
 *   - HP BARS: you and every enemy have health; nobody dies in one hit.
 *
 * All real-time logic is in a `scene.events.on('update')` handler (removed on
 * exit). Flat code-art now; built spritesheet-ready (swap the draw* helpers).
 * Every object is in a container destroyed on finish; listeners/hooks removed.
 *
 * score (0..1, classifier) = enemies defeated / total, minus damage taken.
 */

const GROUND_H = 64;
const GRAVITY = 1500;
const MOVE_SPEED = 205;
const JUMP_V = 560;
const ATTACK_CD = 400;
const ATTACK_ACTIVE = 170;
const ATTACK_RANGE = 58;
const ATTACK_DMG = 12;
const PLAYER_HP_MAX = 100;
const INVULN_MS = 900;
const SHOT_SPEED = 300;
const SHOT_DMG = 12;
const CONTACT_DMG = 8;
const ENEMY_HP = 36;
const TOTAL_ENEMIES = 6;   // few invaders, over the whole fight ("only a few made it ashore")
const MAX_CONCURRENT = 3;  // ...and only a few at once, so you + allies visibly outnumber them

// Knockback: a solid hit shoves the enemy back (toward the surf) and briefly
// stuns it — hits feel weighty and the line gets driven back.
const KNOCKBACK_V = 320;       // player hit
const ALLY_KNOCKBACK_V = 170;  // ally hit (weaker)
const KB_STUN = 260;           // ms an enemy can't advance/shoot after being hit

// Allied Mactan warriors fight beside you — but they ASSIST, they don't solo.
// Their hits can't drop an enemy below ALLY_FLOOR; only YOUR hits finish. So the
// crowd softens and screens shots, but the player must land the killing blows —
// which is what stops "the NPCs win it while I stand still."
const NUM_ALLIES = 3;
const ALLY_DMG = 5;
const ALLY_ATTACK_CD = 720;
const ALLY_RANGE = 48;
const ALLY_SPEED = 120;
const ALLY_FLOOR = Math.ceil(ENEMY_HP * 0.25); // ~9 — allies can't chip below this
const ALLY_STAGGER = 520;      // ms an ally is stunned after soaking a hit

// Skills (Feature E).
// DASH: a quick i-frame lunge — GUARANTEED to phase through bullets for its
// window (kid-fair, per Lee: no random dodge chance). Short cooldown.
const DASH_SPEED = 640;
const DASH_DUR = 175;   // ms of movement + i-frames
const DASH_CD = 700;
// HEAVY: hold the attack to charge, release for a lunging high-damage strike.
// Long charge + long cooldown + you're rooted while winding up = the risk.
const CHARGE_MIN = 300; // hold ≥ this for a heavy; a quicker tap is a normal hit
const CHARGE_MAX = 900; // fully charged (visual cap)
const HEAVY_DMG = 40;   // one solid hit ends most soldiers
const HEAVY_CD = 1600;
const HEAVY_RANGE = 76; // wider reach than a normal swing (58)
const HEAVY_LUNGE = 74; // forward step on release
const HEAVY_KNOCK = 480;

type ShotKind = "high" | "low";
/**
 * Shot heights above the feet (groundY). Derived from the ~0.72-scaled kid
 * (standing hitbox ≈ 66px, crouched ≈ 32px, both feet-anchored):
 *   - HIGH (-52): upper-body/head of a STANDER (hits), but ABOVE the crouched
 *     box top (~py-36) so ducking clears it. This is the bug fix — the old -40
 *     high shot sat inside the old crouch box, so crouching never dodged it.
 *   - LOW (-14): shin height — hits a stander/croucher, but a JUMP lifts the
 *     hitbox above it so it passes underneath.
 */
const SHOT_Y: Record<ShotKind, number> = { high: -52, low: -14 };
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
}
interface Shot {
  c: Phaser.GameObjects.Container;
  vx: number;
  kind: ShotKind;
}
/** An allied Mactan warrior (code-art stand-in until Feature G ships sprites). */
interface Ally {
  c: Phaser.GameObjects.Container;
  attackCd: number;
  attackActive: number; // ms of spear-thrust pose remaining
  stagger: number;      // ms stunned after soaking a hit (0 = active)
  kbVx: number;
  walkPhase: number;
  idx: number;          // for round-robin target spread (warriors fan out)
  legL: Phaser.GameObjects.Rectangle;
  legR: Phaser.GameObjects.Rectangle;
  spear: Phaser.GameObjects.Rectangle;
}

export function playMactanDefense(
  scene: Phaser.Scene,
  _node: MiniGameNode
): Promise<MiniGameResult> {
  return new Promise((resolve) => {
    const { width, height } = scene.scale;
    const startedAt = performance.now();
    const groundY = height - GROUND_H; // top surface of the ground

    let playerHP = PLAYER_HP_MAX;
    let score = 0;
    let combo = 0;
    let defeated = 0;
    let spawned = 0;
    let invuln = 0;
    let attackCd = 0;
    let attackActive = 0;
    let done = false;

    const enemies: Enemy[] = [];
    const shots: Shot[] = [];
    const allies: Ally[] = [];

    const field = scene.add.container(0, 0).setDepth(10);
    const hud = scene.add.container(0, 0).setDepth(14);
    const controls = scene.add.container(0, 0).setDepth(15);
    const overlay = scene.add.container(0, 0).setDepth(20);

    // Scrim so the side-view reads clearly over the arc backdrop (the real
    // Mactan bg shows through beneath it).
    field.add(scene.add.rectangle(width / 2, height / 2, width, height, 0x0a1420, 0.5));
    // Shallow sea band where the water meets the shore.
    field.add(scene.add.rectangle(width / 2, groundY - 26, width, 52, 0x1b4a5a, 0.45));
    // Textured beach ground — damp sand at the waterline, warm dry sand, a foam
    // lip and scattered grains — reads far better than the old flat brown bar
    // and matches the sunset-shore palette.
    const beach = scene.add.graphics();
    beach.fillStyle(0xc9ad82, 1); beach.fillRect(0, groundY, width, GROUND_H);            // dry sand
    beach.fillStyle(0xb0925f, 1); beach.fillRect(0, groundY, width, 18);                  // damp sand
    beach.fillStyle(0x7d6746, 1); beach.fillRect(0, groundY + GROUND_H - 10, width, 10);  // shaded base
    beach.fillStyle(0xefe6cf, 1); beach.fillRect(0, groundY - 2, width, 3);               // foam lip
    for (let i = 0; i < 70; i++) {
      const sx = Math.random() * width, sy = groundY + 10 + Math.random() * (GROUND_H - 14);
      beach.fillStyle(Math.random() < 0.5 ? 0x8f7550 : 0xe2d3ab, 0.55);
      beach.fillRect(sx, sy, 2, 2);
    }
    field.add(beach);

    // ---------------- PLAYER ----------------
    const player = scene.add.container(150, groundY);
    field.add(player);

    // Prefer the animated PixelLab sprite; fall back to flat code-art shapes if
    // the sheets weren't shipped (the game must run with zero character art).
    const useHeroSprite = ensureMactanHeroAnims(scene);
    const useEnemySprite = ensureMactanEnemyAnims(scene);
    let hero: Phaser.GameObjects.Sprite | undefined;
    let heroState = "";
    let spear: Phaser.GameObjects.Container | undefined;

    // Shape-fallback parts — only built when there is no sprite.
    let pLegL!: Phaser.GameObjects.Rectangle, pLegR!: Phaser.GameObjects.Rectangle;
    let pBody!: Phaser.GameObjects.Rectangle, pWeapon!: Phaser.GameObjects.Rectangle;
    let pShield!: Phaser.GameObjects.Arc, pHead!: Phaser.GameObjects.Arc;

    if (useHeroSprite) {
      hero = scene.add
        .sprite(0, 0, "mactan/hero_idle")
        .setOrigin(MACTAN_HERO.originX, MACTAN_HERO.originY)
        .setScale(MACTAN_HERO.scale);
      hero.play(animKeyFor("mactan/hero_idle"));
      spear = makeSpear(scene);
      player.add([spear, hero]);
    } else {
      pLegL = scene.add.rectangle(-6, -8, 8, 18, 0x3a2a20).setOrigin(0.5, 0);
      pLegR = scene.add.rectangle(6, -8, 8, 18, 0x3a2a20).setOrigin(0.5, 0);
      pBody = scene.add.rectangle(0, -20, 22, 26, 0x8d3b2e).setStrokeStyle(2, 0x5b2016).setOrigin(0.5, 1);
      pShield = scene.add.circle(-13, -26, 10, 0xcbb98a).setStrokeStyle(2, 0x8a6d3b);
      pHead = scene.add.circle(0, -44, 9, 0xe8c9a0);
      pWeapon = scene.add.rectangle(11, -30, 5, 30, 0x9aa4b0).setOrigin(0.5, 1); // club/bolo
      player.add([pLegL, pLegR, pWeapon, pBody, pShield, pHead]);
    }
    // player physics state
    let px = 150, py = groundY, pvy = 0, grounded = true, facing = 1, crouching = false;
    let walkPhase = 0;
    // skills (Feature E): dash i-frames + charged heavy
    let dashCd = 0, dashTime = 0, heavyCd = 0, charging = false, chargeStart = 0;
    let dashQueued = false, heavyQueued = false;

    // Charge-up ring for the heavy attack — grows while you hold, gold once it
    // has passed the heavy threshold. Hidden otherwise. Part of the player rig.
    const chargeRing = scene.add.circle(0, -80, 5, 0x000000, 0).setStrokeStyle(3, 0xffd54a, 0.9).setVisible(false);
    player.add(chargeRing);

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
    hud.add([hpFill, hpLabel, scoreText]);
    const updateHud = () => {
      const f = Math.max(0, playerHP / PLAYER_HP_MAX);
      hpFill.width = hpBarW * f;
      hpFill.setFillStyle(f > 0.5 ? COLORS.success : f > 0.25 ? 0xffb300 : COLORS.danger);
      hpLabel.setText(`${t("mg.mactan.hp")} ${Math.max(0, Math.round(playerHP))}`);
      scoreText.setText(t("mg.mactan.score", { n: score }));
    };
    updateHud();

    // ---------------- INPUT ----------------
    // Keyboard: move A/D or ←/→, jump W/↑/Space, crouch S/↓/Ctrl, attack F or
    // left-click. Touch: the on-screen buttons below.
    const keys = scene.input.keyboard?.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,F,CTRL,SHIFT") as Record<string, Phaser.Input.Keyboard.Key> | undefined;
    // Capture these so Space/arrows don't scroll the page and Ctrl/Shift don't
    // fire browser shortcuts while playing. Released again in finish().
    scene.input.keyboard?.addCapture("SPACE,CTRL,SHIFT,UP,DOWN,LEFT,RIGHT");
    const held = { left: false, right: false, crouch: false };
    let jumpQueued = false;
    let attackQueued = false;

    // Attack is press-and-hold: a quick tap is a normal swing, a held press
    // charges the heavy (resolved on release). Dash is a discrete trigger.
    const beginCharge = () => { if (!done && !charging && dashTime <= 0) { charging = true; chargeStart = performance.now(); } };
    const releaseCharge = () => {
      if (!charging) return;
      charging = false;
      if (performance.now() - chargeStart >= CHARGE_MIN) heavyQueued = true; else attackQueued = true;
    };

    // On-screen buttons — touch only. Tracked so their input can be toggled with
    // visibility (invisible objects still receive input in Phaser).
    const touchButtons: Phaser.GameObjects.Arc[] = [];
    const mkButton = (x: number, y: number, r: number, label: string, color: number, onDown: () => void, onUp?: () => void) => {
      const btn = scene.add.circle(x, y, r, color, 0.32).setStrokeStyle(2, color, 0.8).setInteractive({ useHandCursor: true });
      const txt = scene.add.text(x, y, label, { fontFamily: FONT, fontSize: "13px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
      btn.on("pointerdown", onDown);
      if (onUp) { btn.on("pointerup", onUp); btn.on("pointerout", onUp); }
      controls.add([btn, txt]);
      touchButtons.push(btn);
    };
    // Movement pad (bottom-left), action buttons (bottom-right).
    mkButton(48, height - 52, 26, "◀", 0x3d5a99, () => (held.left = true), () => (held.left = false));
    mkButton(108, height - 52, 26, "▶", 0x3d5a99, () => (held.right = true), () => (held.right = false));
    mkButton(width - 118, height - 52, 26, "⤒", 0x4caf50, () => (jumpQueued = true));
    mkButton(width - 60, height - 90, 24, "⤓", 0x4fc3f7, () => (held.crouch = true), () => (held.crouch = false));
    mkButton(width - 122, height - 104, 23, "»", 0x9c6ade, () => (dashQueued = true)); // dash
    // ATAKE: tap = normal swing, hold = charge the heavy (release to strike).
    mkButton(width - 52, height - 44, 30, t("mg.mactan.attack"), 0xe4572e, beginCharge, releaseCharge);

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
        if (show) b.setInteractive({ useHandCursor: true });
        else b.disableInteractive();
      }
    };
    const prefersDesktop =
      typeof window !== "undefined" &&
      window.matchMedia?.("(hover: hover) and (pointer: fine)").matches === true;
    setControlsShown(!prefersDesktop);

    // Desktop: hold left-click to charge / release to strike (F does the same);
    // SHIFT dashes. Touch uses the on-screen buttons instead.
    const onPointerDown = (pointer: Phaser.Input.Pointer) => {
      if (pointer.wasTouch) { setControlsShown(true); return; }
      setControlsShown(false);
      if (pointer.leftButtonDown()) beginCharge();
    };
    const onPointerUp = (pointer: Phaser.Input.Pointer) => { if (!pointer.wasTouch) releaseCharge(); };
    const onPointerMove = (pointer: Phaser.Input.Pointer) => { if (!pointer.wasTouch) setControlsShown(false); };
    const onAnyKey = () => setControlsShown(false);
    const onKeyFDown = () => beginCharge();
    const onKeyFUp = () => releaseCharge();
    const onKeyDash = () => { dashQueued = true; };
    scene.input.on("pointerdown", onPointerDown);
    scene.input.on("pointerup", onPointerUp);
    scene.input.on("pointermove", onPointerMove);
    scene.input.keyboard?.on("keydown", onAnyKey);
    scene.input.keyboard?.on("keydown-F", onKeyFDown);
    scene.input.keyboard?.on("keyup-F", onKeyFUp);
    scene.input.keyboard?.on("keydown-SHIFT", onKeyDash);

    // DEV hook so tests can drive without real input.
    if (import.meta.env.DEV) {
      (window as unknown as { __mg: unknown }).__mg = {
        set: (o: Partial<{ left: boolean; right: boolean; crouch: boolean }>) => Object.assign(held, o),
        jump: () => (jumpQueued = true),
        attack: () => (attackQueued = true),
        dash: () => (dashQueued = true),
        heavy: () => (heavyQueued = true),
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
        state: () => ({ playerHP, score, defeated, spawned, allies: allies.length, enemies: enemies.filter((e) => !e.dead).length, enemyHps: enemies.filter((e) => !e.dead).map((e) => Math.round(e.hp)), enemyXs: enemies.filter((e) => !e.dead).map((e) => Math.round(e.c.x)), shots: shots.length, px: Math.round(px), py: Math.round(py), grounded, crouching, dashing: dashTime > 0, dashCd: Math.round(dashCd), heavyCd: Math.round(heavyCd), charging }),
      };
    }

    // ---------------- ENEMIES ----------------
    function spawnEnemy() {
      if (done) return;
      spawned++;
      const c = scene.add.container(width - 40 - Math.random() * 60, groundY);
      const marker = scene.add.text(0, -62, "", { fontFamily: FONT, fontSize: "18px", fontStyle: "bold", color: "#e4572e" }).setOrigin(0.5);
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
      const barBg = scene.add.rectangle(0, -70, 34, 5, 0x000000, 0.5).setOrigin(0.5);
      const barFill = scene.add.rectangle(-17, -70, 34, 5, 0x8bc34a).setOrigin(0, 0.5);
      c.add([barBg, barFill]);
      enemies.push({ c, hp: ENEMY_HP, barBg, barFill, shootCd: Phaser.Math.Between(900, 1600), telegraph: 0, telegraphKind: "high", marker, dead: false, sprite, stun: 0, kbVx: 0 });
    }
    // Start with two, then trickle the rest — but only ever a few at once
    // (MAX_CONCURRENT), so you + the allies stay the larger side.
    spawnEnemy(); spawnEnemy();
    const spawner = scene.time.addEvent({
      delay: 2600, loop: true,
      callback: () => {
        if (done) return;
        if (spawned >= TOTAL_ENEMIES) { spawner?.remove(); return; }
        if (enemies.filter((e) => !e.dead).length < MAX_CONCURRENT) spawnEnemy();
      },
    });

    // ---------------- ALLIES (Mactan warriors) ----------------
    function spawnAlly(x: number) {
      const c = scene.add.container(x, groundY);
      // Adult warrior, warm tones + gold sash + headband + bolo-spear — clearly
      // "our side," and taller than the kid. Feet sit on the container origin.
      const legL = scene.add.rectangle(-6, -28, 8, 28, 0x4a3526).setOrigin(0.5, 0);
      const legR = scene.add.rectangle(6, -28, 8, 28, 0x4a3526).setOrigin(0.5, 0);
      const body = scene.add.rectangle(0, -28, 24, 44, 0xa64b2e).setStrokeStyle(2, 0x6e2f1a).setOrigin(0.5, 1);
      const sash = scene.add.rectangle(0, -44, 26, 6, 0xe0b64a).setOrigin(0.5, 0.5);
      const shield = scene.add.circle(-14, -46, 10, 0xcbb98a).setStrokeStyle(2, 0x8a6d3b);
      const head = scene.add.circle(0, -84, 12, 0xc98a5a);
      const band = scene.add.rectangle(0, -91, 22, 5, 0x8a2f22).setOrigin(0.5, 0.5);
      const spear = scene.add.rectangle(13, -46, 4, 48, 0x7a5230).setStrokeStyle(1, 0x4e3419).setOrigin(0.5, 1);
      c.add([legL, legR, spear, body, sash, shield, head, band]);
      field.add(c);
      allies.push({ c, attackCd: 0, attackActive: 0, stagger: 0, kbVx: 0, walkPhase: 0, idx: allies.length, legL, legR, spear });
    }
    for (let i = 0; i < NUM_ALLIES; i++) spawnAlly(250 + i * 95);

    /**
     * Damage an enemy. `canFinish` gates the kill: the player's hits can finish
     * (floor 0), allies' hits can't drop it below ALLY_FLOOR — so allies soften,
     * the player finishes. Every hit also knocks the enemy back + briefly stuns.
     */
    function damageEnemy(e: Enemy, dmg: number, fromX: number, canFinish: boolean, knockV: number) {
      if (e.dead) return;
      const floor = canFinish ? 0 : ALLY_FLOOR;
      e.hp = Math.max(floor, e.hp - dmg);
      e.barFill.width = Math.max(0, (e.hp / ENEMY_HP) * 34);
      e.kbVx = (e.c.x >= fromX ? 1 : -1) * knockV; // shoved away from the attacker
      e.stun = Math.max(e.stun, KB_STUN);
      sfx.hit();
      burst(scene, e.c.x, e.c.y - 24, [0xffd54a, 0xffffff], 8, 140);
      if (e.hp <= 0 && !e.dead) {
        e.dead = true;
        defeated++;
        combo++;
        score += 30 * Math.max(1, combo);
        floatText(scene, e.c.x, e.c.y - 50, "BONK!", "#ffd54a", "15px");
        scene.tweens.add({ targets: e.c, angle: 70, alpha: 0, y: e.c.y + 10, duration: 380, onComplete: () => e.c.destroy() });
        updateHud();
        checkWin();
      }
    }

    function hurtPlayer(dmg: number, fromX: number) {
      if (invuln > 0 || dashTime > 0 || done) return; // dash = guaranteed i-frames
      playerHP -= dmg;
      combo = 0;
      invuln = INVULN_MS;
      sfx.thud();
      flash(scene, 0xe4572e, 120);
      shake(scene, 150, 0.006);
      px = Phaser.Math.Clamp(px + (px < fromX ? -20 : 20), 20, width - 20);
      updateHud();
      if (playerHP <= 0) {
        playerHP = 40; // soft recover — kids never hit a dead end
        px = 120; py = groundY; pvy = 0;
        floatText(scene, px, groundY - 70, t("mg.mactan.defeated"), "#e4572e", "14px");
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
      if (!done && defeated >= TOTAL_ENEMIES) finish();
    }

    // ---------------- UPDATE ----------------
    const update = (_time: number, deltaMs: number) => {
      if (done) return;
      const dt = Math.min(deltaMs, 50) / 1000;
      if (invuln > 0) invuln -= deltaMs;
      dashCd -= deltaMs;
      heavyCd -= deltaMs;
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
        dashTime = DASH_DUR; dashCd = DASH_CD; charging = false; // dashing cancels a charge
        sfx.tap();
        burst(scene, px, py - 30, [0x9c6ade, 0xffffff], 10, 170);
      }
      dashQueued = false;
      const dashing = dashTime > 0;
      if (dashing) { dashTime -= deltaMs; px = Phaser.Math.Clamp(px + facing * DASH_SPEED * dt, 20, width - 20); }
      // A charge roots you (committed windup) and cancels crouch.
      if (charging) { moveDir = 0; crouching = false; }

      // --- horizontal move (no move while crouching / dashing / charging) ---
      if (!crouching && !dashing && !charging) px = Phaser.Math.Clamp(px + moveDir * MOVE_SPEED * dt, 20, width - 20);
      if (moveDir !== 0 && grounded && !crouching && !dashing && !charging) walkPhase += dt * 10; else walkPhase = 0;

      // --- jump / gravity ---
      if (jumpQueued && grounded && !crouching && !dashing && !charging) { pvy = -JUMP_V; grounded = false; }
      jumpQueued = false;
      pvy += GRAVITY * dt;
      py += pvy * dt;
      if (py >= groundY) { py = groundY; pvy = 0; grounded = true; }

      // --- attack ---
      attackCd -= deltaMs;
      if (attackActive > 0) attackActive -= deltaMs;
      if (attackQueued && attackCd <= 0) {
        attackCd = ATTACK_CD;
        attackActive = ATTACK_ACTIVE;
        for (const e of enemies) {
          if (e.dead) continue;
          const dx = e.c.x - px;
          if (Math.sign(dx) === facing && Math.abs(dx) < ATTACK_RANGE && Math.abs(e.c.y - py) < 70) damageEnemy(e, ATTACK_DMG, px, true, KNOCKBACK_V);
        }
      }
      attackQueued = false;

      // --- heavy attack (released from a charge): a lunging power strike ---
      if (heavyQueued && heavyCd <= 0) {
        heavyCd = HEAVY_CD;
        attackActive = ATTACK_ACTIVE + 90;
        const startX = px;
        px = Phaser.Math.Clamp(px + facing * HEAVY_LUNGE, 20, width - 20);
        shake(scene, 220, 0.01);
        burst(scene, px + facing * 28, py - 30, [0xffd54a, 0xff8a3d, 0xffffff], 18, 260);
        sfx.hit();
        // The lunge SWEEPS forward: hit everything from the start point through
        // the reach, so a close enemy isn't leapt over before the hit registers.
        for (const e of enemies) {
          if (e.dead) continue;
          const dx = e.c.x - startX;
          if (Math.sign(dx) === facing && Math.abs(dx) < HEAVY_LUNGE + HEAVY_RANGE && Math.abs(e.c.y - py) < 80) damageEnemy(e, HEAVY_DMG, startX, true, HEAVY_KNOCK);
        }
      }
      heavyQueued = false;

      // --- draw player pose ---
      player.setPosition(px, py);
      player.setScale(facing, 1); // flips the whole rig (sprite + spear) to face left

      // dash after-image: translucent during the i-frame lunge
      if (dashing) player.setAlpha(0.6);
      // charge ring: grows while held, turns gold once past the heavy threshold
      if (charging) {
        const frac = Math.min(1, (performance.now() - chargeStart) / CHARGE_MAX);
        chargeRing.setVisible(true);
        chargeRing.setRadius(5 + frac * 12);
        chargeRing.setStrokeStyle(3, performance.now() - chargeStart >= CHARGE_MIN ? 0xffd54a : 0x9c6ade, 0.9);
      } else if (chargeRing.visible) {
        chargeRing.setVisible(false);
      }

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
        if (spear) {
          const thrust = attackActive > 0; // swing to a forward stab on attack
          spear.setAngle(thrust ? 90 : -8);
          spear.setPosition(thrust ? 14 : 8, thrust ? -30 : -34);
          spear.setVisible(!crouching);
        }
      } else {
        const swing = attackActive > 0 ? -70 * facing : 0;
        pWeapon.setAngle(swing);
        if (crouching) { pBody.scaleY = 0.6; pHead.y = -32; pShield.y = -18; player.y = py; pLegL.scaleY = 0.5; pLegR.scaleY = 0.5; }
        else { pBody.scaleY = 1; pHead.y = -44; pShield.y = -26; pLegL.scaleY = 1; pLegR.scaleY = 1; }
        // little walk wobble
        const wob = Math.sin(walkPhase) * 3;
        pLegL.y = -8 + (grounded ? wob : -4);
        pLegR.y = -8 - (grounded ? wob : -4);
      }

      // Player hitbox (reflects crouch/jump so dodging works). Feet-anchored:
      // the box spans py-2*halfH .. py. Sized to the ~0.72 kid — standing ≈ 66px,
      // crouched ≈ 32px. The crouched top (~py-36 incl. tolerance) sits BELOW the
      // HIGH shot line (py-52), so ducking now clears it; a JUMP lifts the whole
      // box above the LOW shot (py-14). (Was 20/46, which left the crouch box
      // reaching py-44 and getting clipped by the old py-40 high shot.)
      const halfH = crouching ? 16 : 33;
      const cy = py - halfH; // center of body
      const halfW = 11;

      // --- enemies ---
      for (const e of enemies) {
        if (e.dead) continue;
        // Knockback slides the enemy back toward the surf; stun freezes its own
        // actions for a beat so a solid hit reads as driving the line back.
        if (e.kbVx !== 0) {
          e.c.x = Phaser.Math.Clamp(e.c.x + e.kbVx * dt, 40, width - 30);
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
        const approaching = Math.abs(dist) > 210;
        if (e.sprite) { if (approaching) e.sprite.anims.resume(); else e.sprite.anims.pause(); }
        if (approaching) e.c.x -= Math.sign(dist) * 46 * dt;
        // contact damage
        if (Math.abs(dist) < 26 && Math.abs(e.c.y - py) < 60) hurtPlayer(CONTACT_DMG, e.c.x);
        // shoot cycle
        if (e.telegraph > 0) {
          e.telegraph -= deltaMs;
          e.marker.setScale(1 + Math.sin(performance.now() / 80) * 0.25);
          if (e.telegraph <= 0) { e.marker.setText(""); fireShot(e, e.telegraphKind); e.shootCd = Phaser.Math.Between(1400, 2200); }
        } else {
          e.shootCd -= deltaMs;
          if (e.shootCd <= 0 && Math.abs(dist) < 360) {
            e.telegraphKind = Math.random() < 0.5 ? "high" : "low";
            e.telegraph = 700;
            e.marker.setText(e.telegraphKind === "high" ? "↓" : "↑"); // ↓=crouch, ↑=jump
            e.marker.setColor(e.telegraphKind === "high" ? "#e4572e" : "#4fc3f7");
          }
        }
      }

      // --- allies (advance, chip, knock back — but can't land the kill) ---
      // Fan out: each warrior takes a different invader (round-robin), so the
      // crowd mobs the few soldiers instead of dogpiling one — reads as the
      // Mactan side outnumbering them.
      const live = enemies.filter((e) => !e.dead);
      for (const a of allies) {
        if (a.attackActive > 0) a.attackActive -= deltaMs;
        if (a.kbVx !== 0) {
          a.c.x = Phaser.Math.Clamp(a.c.x + a.kbVx * dt, 30, width - 90);
          a.kbVx *= 0.86;
          if (Math.abs(a.kbVx) < 8) a.kbVx = 0;
        }
        const target: Enemy | undefined = live.length ? live[a.idx % live.length] : undefined;
        let moving = false;
        if (a.stagger > 0) {
          a.stagger -= deltaMs;
        } else if (target) {
          const dx = target.c.x - a.c.x;
          a.c.setScale(dx >= 0 ? 1 : -1, 1);
          a.attackCd -= deltaMs;
          if (Math.abs(dx) > ALLY_RANGE) {
            a.c.x = Phaser.Math.Clamp(a.c.x + Math.sign(dx) * ALLY_SPEED * dt, 30, width - 90);
            moving = true;
          } else if (a.attackCd <= 0) {
            a.attackCd = ALLY_ATTACK_CD;
            a.attackActive = 160;
            damageEnemy(target, ALLY_DMG, a.c.x, false, ALLY_KNOCKBACK_V);
          }
        }
        // pose: leg wobble while advancing, spear thrust on attack, blink when staggered
        a.walkPhase = moving ? a.walkPhase + dt * 10 : 0;
        const wob = Math.sin(a.walkPhase) * 3;
        a.legL.y = -28 + wob;
        a.legR.y = -28 - wob;
        a.spear.setAngle(a.attackActive > 0 ? 64 : -6);
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
        if (s.c.x < -20 || s.c.x > width + 20) { s.c.destroy(); shots.splice(i, 1); }
      }
    };
    scene.events.on(Phaser.Scenes.Events.UPDATE, update);

    const failsafe = scene.time.delayedCall(120000, () => finish());

    function finish() {
      if (done) return;
      done = true;
      scene.events.off(Phaser.Scenes.Events.UPDATE, update);
      // Remove input listeners BEFORE the results overlay so a click on it can't
      // fire a phantom attack; release the key captures we took.
      scene.input.off("pointerdown", onPointerDown);
      scene.input.off("pointerup", onPointerUp);
      scene.input.off("pointermove", onPointerMove);
      scene.input.keyboard?.off("keydown", onAnyKey);
      scene.input.keyboard?.off("keydown-F", onKeyFDown);
      scene.input.keyboard?.off("keyup-F", onKeyFUp);
      scene.input.keyboard?.off("keydown-SHIFT", onKeyDash);
      scene.input.keyboard?.removeCapture("SPACE,CTRL,SHIFT,UP,DOWN,LEFT,RIGHT");
      spawner?.remove();
      failsafe.remove();
      if (import.meta.env.DEV) delete (window as unknown as { __mg?: unknown }).__mg;

      const perf = Math.max(0, defeated / TOTAL_ENEMIES) * 0.6 + Math.max(0, playerHP / PLAYER_HP_MAX) * 0.4;
      const stars = starsFor(perf);
      if (stars >= 2) { sfx.success(); burst(scene, width / 2, height / 2 - 60, [0x8bc34a, 0xffd54a, 0xffffff], 34, 280); }

      hud.removeAll(true);
      controls.removeAll(true);
      overlay.add([
        scene.add.text(width / 2, height / 2 - 120, t("mg.mactan.result", { n: defeated }), { fontFamily: FONT, fontSize: "22px", color: COLORS.text, fontStyle: "bold" }).setOrigin(0.5),
        scene.add.text(width / 2, height / 2 - 86, t("mg.mactan.score", { n: score }), { fontFamily: FONT, fontSize: "17px", color: COLORS.accentText }).setOrigin(0.5),
        scene.add.text(width / 2, height / 2 + 10, stars >= 2 ? t("mg.mactan.resultWin") : t("mg.mactan.resultOk"), { fontFamily: FONT, fontSize: "15px", color: COLORS.textMuted, align: "center", wordWrap: { width: width - 80 } }).setOrigin(0.5),
      ]);
      overlay.add(showStars(scene, width / 2, height / 2 - 40, stars, () => sfx.pop()));

      scene.time.delayedCall(2000, () => {
        overlay.destroy(true); hud.destroy(true); controls.destroy(true); field.destroy(true);
        resolve({ score: perf, attempts: Math.max(1, TOTAL_ENEMIES - defeated + 1), msSpent: Math.round(performance.now() - startedAt) });
      });
    }
  });
}
