import Phaser from "phaser";
import type { MiniGameNode, MiniGameResult } from "../../content/types";
import { COLORS, FONT } from "../../ui/theme";
import { burst, shake, flash, floatText, showStars, starsFor } from "../../ui/juice";
import { sfx } from "../../ui/sfx";
import { t } from "../../i18n";

/**
 * Mactan defense — top-down shore action, ONE controllable warrior.
 *
 * You ARE a young Mactan warrior. Move freely on the shore (WASD / arrow keys,
 * or an on-screen joystick on touch). Spaniards wade in from their boats on the
 * right and push toward the village on the left.
 *   - FIGHT: your warrior auto-bonks any Spaniard you stand next to — non-gory,
 *     they tumble back. The skill is positioning.
 *   - DODGE: gunners stop, AIM (red telegraph), then FIRE a shot that travels.
 *     Move out of its path or your Health drops.
 *   - OUTNUMBERED, shown: NPC Mactan warriors roam and bonk enemies too, but
 *     they can't be everywhere — some Spaniards slip through to the Village.
 *
 * All real-time logic lives in an `update` handler (removed on finish), so it
 * runs correctly AND is testable via frame-pumping (unlike tween movement).
 * Every object lives in a container destroyed on finish (no leaks).
 *
 * score (0..1, classifier) = (village + player health) / 2, normalised.
 */

interface WaveDef {
  soldiers: number;
  gunners: number;
  spawnMs: number;
}
const WAVES: WaveDef[] = [
  { soldiers: 4, gunners: 1, spawnMs: 1300 },
  { soldiers: 5, gunners: 2, spawnMs: 1050 },
  { soldiers: 6, gunners: 3, spawnMs: 820 },
];

const PLAYER_SPEED = 215; // px/s
const MELEE_RANGE = 62;
const ATTACK_CD = 420;
const INVULN_MS = 750;
const SHOT_SPEED = 235;
const SHOT_DMG = 14;
const CONTACT_DMG = 9;
const VILLAGE_DMG = 9;
const HP_MAX = 100;
const VILLAGE_MAX = 100;
const AIM_MS = 1100;
const GUN_RELOAD = 1500;

type EnemyKind = "soldier" | "gunner";
interface Enemy {
  c: Phaser.GameObjects.Container;
  kind: EnemyKind;
  speed: number;
  state: "advance" | "aim" | "reload" | "dying";
  timer: number; // ms in current timed state
  fireRange: number; // x at which a gunner stops to shoot
  marker: Phaser.GameObjects.Text;
  vx: number; // knockback velocity while dying
  vy: number;
}
interface Ally {
  c: Phaser.GameObjects.Container;
  cd: number;
}
interface Shot {
  c: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  life: number;
}

export function playMactanDefense(
  scene: Phaser.Scene,
  _node: MiniGameNode
): Promise<MiniGameResult> {
  return new Promise((resolve) => {
    const { width, height } = scene.scale;
    const startedAt = performance.now();

    // Play area.
    const VILLAGE_X = 92;
    const MINX = VILLAGE_X + 26;
    const MAXX = width - 24;
    const MINY = 150;
    const MAXY = height - 28;

    let waveIdx = 0;
    let spawnedS = 0;
    let spawnedG = 0;
    let resolvedThisWave = 0;
    let playerHP = HP_MAX;
    let village = VILLAGE_MAX;
    let score = 0;
    let combo = 0;
    let defeated = 0;
    let attackCd = 0;
    let invuln = 0;
    let done = false;
    let spawner: Phaser.Time.TimerEvent | null = null;

    const enemies: Enemy[] = [];
    const allies: Ally[] = [];
    const shots: Shot[] = [];

    const field = scene.add.container(0, 0).setDepth(10);
    const hud = scene.add.container(0, 0).setDepth(14);
    const controls = scene.add.container(0, 0).setDepth(15);
    const overlay = scene.add.container(0, 0).setDepth(20);

    // --- Village (left) ---
    const villageRect = scene.add.rectangle(VILLAGE_X / 2 + 6, height / 2 + 40, VILLAGE_X, height - 150, 0x2e5d34);
    const villageLabel = scene.add
      .text(VILLAGE_X / 2 + 6, height - 96, t("mg.mactan.morale"), { fontFamily: FONT, fontSize: "11px", color: "#cfe8cf", fontStyle: "bold" })
      .setOrigin(0.5);
    field.add([villageRect, villageLabel]);

    // --- Player warrior ---
    const player = scene.add.container(220, height / 2);
    const pShield = scene.add.circle(-14, 2, 11, 0xcbb98a).setStrokeStyle(2, 0x8a6d3b);
    const pBody = scene.add.rectangle(0, 6, 22, 28, 0x8d3b2e).setStrokeStyle(2, 0x5b2016);
    const pHead = scene.add.circle(0, -14, 9, 0xe8c9a0);
    const pClub = scene.add.rectangle(12, -2, 4, 22, 0x6d4c41).setOrigin(0.5, 1).setAngle(20);
    player.add([pClub, pShield, pBody, pHead]);
    field.add(player);

    // --- NPC allied warriors (the "we are many") ---
    for (let i = 0; i < 4; i++) {
      const a = scene.add.container(VILLAGE_X + 40, 190 + i * 80);
      const body = scene.add.rectangle(0, 6, 18, 24, 0x8d6e63);
      const head = scene.add.circle(0, -12, 7, 0xe8c9a0);
      const spear = scene.add.rectangle(10, -6, 3, 30, 0xcbb98a).setAngle(20);
      a.add([spear, body, head]);
      field.add(a);
      allies.push({ c: a, cd: 0 });
    }

    // --- HUD ---
    hud.add([
      scene.add.text(width / 2, 26, t("mg.mactan.instruction"), { fontFamily: FONT, fontSize: "18px", color: COLORS.text, fontStyle: "bold" }).setOrigin(0.5),
      scene.add.text(width / 2, 48, t("mg.mactan.sub"), { fontFamily: FONT, fontSize: "12px", color: COLORS.textMuted, align: "center", wordWrap: { width: width - 40 } }).setOrigin(0.5),
    ]);
    const waveText = scene.add.text(20, 78, "", { fontFamily: FONT, fontSize: "14px", color: COLORS.textMuted, fontStyle: "bold" }).setOrigin(0, 0.5);
    const scoreText = scene.add.text(width - 20, 78, "", { fontFamily: FONT, fontSize: "15px", color: COLORS.accentText, fontStyle: "bold" }).setOrigin(1, 0.5);
    // Two bars: player Health (left) + Village (right).
    const barW = (width - 60) / 2;
    const barY = 100;
    const mkBar = (x: number, color: number, label: string) => {
      const bg = scene.add.rectangle(x, barY, barW, 11, 0x2a2333).setOrigin(0, 0.5);
      const bar = scene.add.rectangle(x, barY, barW, 11, color).setOrigin(0, 0.5);
      const lab = scene.add.text(x, barY - 15, label, { fontFamily: FONT, fontSize: "10px", color: COLORS.textMuted }).setOrigin(0, 0.5);
      hud.add([bg, bar, lab]); // all in the container so nothing leaks onto the menu
      return { bar, lab };
    };
    const hpBar = mkBar(20, COLORS.success, "");
    const vilBar = mkBar(40 + barW, 0x4fc3f7, "");
    hud.add([waveText, scoreText]);

    const updateHud = () => {
      waveText.setText(t("mg.mactan.wave", { n: waveIdx + 1, total: WAVES.length }));
      scoreText.setText(t("mg.mactan.score", { n: score }));
      const hpF = Math.max(0, playerHP / HP_MAX);
      hpBar.bar.width = barW * hpF;
      hpBar.bar.setFillStyle(hpF > 0.5 ? COLORS.success : hpF > 0.25 ? 0xffb300 : COLORS.danger);
      hpBar.lab.setText(`${t("mg.mactan.hp")}  ${Math.max(0, Math.round(playerHP))}%`);
      const vF = Math.max(0, village / VILLAGE_MAX);
      vilBar.bar.width = barW * vF;
      vilBar.bar.setFillStyle(vF > 0.5 ? 0x4fc3f7 : vF > 0.25 ? 0xffb300 : COLORS.danger);
      vilBar.lab.setText(`${t("mg.mactan.morale")}  ${Math.max(0, Math.round(village))}%`);
    };
    updateHud();

    // ---------------- INPUT ----------------
    const keys = scene.input.keyboard?.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT") as Record<string, Phaser.Input.Keyboard.Key> | undefined;
    scene.input.addPointer(1); // allow 2 touch points (joystick + it's fine)

    // Virtual joystick (touch / mouse). Lives in the lower-left.
    const joyBaseX = 90;
    const joyBaseY = height - 80;
    const joyRadius = 46;
    const joyRing = scene.add.circle(joyBaseX, joyBaseY, joyRadius, 0xffffff, 0.06).setStrokeStyle(2, 0x3d5a99, 0.5);
    const joyKnob = scene.add.circle(joyBaseX, joyBaseY, 20, COLORS.accent, 0.5);
    controls.add([joyRing, joyKnob]);
    let joyPointerId = -1;
    const joyVec = { x: 0, y: 0 };

    const inJoyZone = (px: number, py: number) => px < width * 0.5 && py > height * 0.45;

    const onPointerDown = (p: Phaser.Input.Pointer) => {
      if (done) return;
      if (joyPointerId === -1 && inJoyZone(p.x, p.y)) {
        joyPointerId = p.id;
        joyRing.setPosition(p.x, p.y);
        joyKnob.setPosition(p.x, p.y);
      }
    };
    const onPointerMove = (p: Phaser.Input.Pointer) => {
      if (p.id !== joyPointerId) return;
      const dx = p.x - joyRing.x;
      const dy = p.y - joyRing.y;
      const len = Math.hypot(dx, dy) || 1;
      const cl = Math.min(len, joyRadius);
      joyKnob.setPosition(joyRing.x + (dx / len) * cl, joyRing.y + (dy / len) * cl);
      joyVec.x = (dx / len) * (cl / joyRadius);
      joyVec.y = (dy / len) * (cl / joyRadius);
    };
    const releaseJoy = (p: Phaser.Input.Pointer) => {
      if (p.id !== joyPointerId) return;
      joyPointerId = -1;
      joyVec.x = 0;
      joyVec.y = 0;
      joyRing.setPosition(joyBaseX, joyBaseY);
      joyKnob.setPosition(joyBaseX, joyBaseY);
    };
    scene.input.on("pointerdown", onPointerDown);
    scene.input.on("pointermove", onPointerMove);
    scene.input.on("pointerup", releaseJoy);
    scene.input.on("pointerupoutside", releaseJoy);
    const removeInput = () => {
      scene.input.off("pointerdown", onPointerDown);
      scene.input.off("pointermove", onPointerMove);
      scene.input.off("pointerup", releaseJoy);
      scene.input.off("pointerupoutside", releaseJoy);
    };

    // DEV: let tests drive movement/attack without real input.
    const extVec = { x: 0, y: 0 };
    if (import.meta.env.DEV) {
      (window as unknown as { __mg: unknown }).__mg = {
        move: (x: number, y: number) => { extVec.x = x; extVec.y = y; },
        state: () => ({ playerHP, village, enemies: enemies.length, shots: shots.length, px: Math.round(player.x), py: Math.round(player.y), wave: waveIdx + 1, score }),
      };
    }

    // ---------------- ENEMIES ----------------
    function spawnEnemy(kind: EnemyKind) {
      const wave = WAVES[waveIdx];
      const y = Phaser.Math.Between(MINY + 10, MAXY - 10);
      const c = scene.add.container(width + 30, y);
      const helmet = scene.add.rectangle(0, -18, 20, 7, 0x9aa4b0).setStrokeStyle(1, 0x5b6470);
      const head = scene.add.circle(0, -11, 7, 0xd9b892);
      const body = scene.add.rectangle(0, 7, 22, 26, kind === "gunner" ? 0x5a3a5a : 0x455a74).setStrokeStyle(1, 0x2f3e52);
      const gun = scene.add.rectangle(-16, 2, 22, 4, 0x5a4326).setOrigin(1, 0.5);
      const marker = scene.add.text(0, -34, "", { fontFamily: FONT, fontSize: "18px", color: "#e4572e", fontStyle: "bold" }).setOrigin(0.5);
      c.add([gun, body, head, helmet, marker]);
      field.add(c);
      enemies.push({
        c, kind,
        speed: kind === "gunner" ? 52 : 62,
        state: "advance",
        timer: 0,
        fireRange: width * Phaser.Math.FloatBetween(0.5, 0.64),
        marker,
        vx: 0, vy: 0,
      });
      void wave;
    }

    function defeatEnemy(e: Enemy, fromX: number) {
      if (e.state === "dying") return;
      e.state = "dying";
      e.vx = (e.c.x - fromX >= 0 ? 1 : 1) * 260 + 120; // fly back toward the sea (right)
      e.vy = Phaser.Math.Between(-120, 120);
      e.marker.setText("");
      defeated++;
      combo++;
      const gained = (e.kind === "gunner" ? 18 : 10) * Math.max(1, combo);
      score += gained;
      sfx.hit();
      burst(scene, e.c.x, e.c.y, [0xffd54a, 0xffffff, 0x8bc34a], 12, 180);
      floatText(scene, e.c.x, e.c.y - 22, "BONK!", "#ffd54a", "15px");
      updateHud();
      onResolved();
    }

    function removeEnemyAt(i: number) {
      enemies[i].c.destroy();
      enemies.splice(i, 1);
    }

    function hurtPlayer(dmg: number, fromX: number) {
      if (invuln > 0 || done) return;
      playerHP -= dmg;
      combo = 0;
      invuln = INVULN_MS;
      sfx.thud();
      flash(scene, 0xe4572e, 120);
      shake(scene, 160, 0.006);
      // knock player slightly away from the hit
      player.x = Phaser.Math.Clamp(player.x + (player.x < fromX ? -18 : 18), MINX, MAXX);
      updateHud();
      if (playerHP <= 0) {
        // Soft fail: stunned, then back up at the village with partial health.
        playerHP = 45;
        player.setPosition(MINX + 30, height / 2);
        floatText(scene, player.x, player.y - 40, "!", "#e4572e", "22px");
      }
    }

    function fireShot(fromX: number, fromY: number, tx: number, ty: number) {
      const dx = tx - fromX, dy = ty - fromY;
      const len = Math.hypot(dx, dy) || 1;
      const dot = scene.add.circle(fromX, fromY, 6, 0xffd54a).setStrokeStyle(2, 0xe4572e);
      field.add(dot);
      shots.push({ c: dot, vx: (dx / len) * SHOT_SPEED, vy: (dy / len) * SHOT_SPEED, life: 3000 });
      sfx.tap();
    }

    // ---------------- WAVES ----------------
    function waveTotal(w: WaveDef) { return w.soldiers + w.gunners; }

    function onResolved() {
      resolvedThisWave++;
      if (resolvedThisWave >= waveTotal(WAVES[waveIdx])) {
        waveIdx++;
        if (waveIdx < WAVES.length) startWave();
        else finish();
      }
    }

    function startWave() {
      spawnedS = 0; spawnedG = 0; resolvedThisWave = 0;
      updateHud();
      const isFinal = waveIdx === WAVES.length - 1;
      const banner = scene.add
        .text(width / 2, height / 2, isFinal ? t("mg.mactan.finalWave") : t("mg.mactan.waveBanner", { n: waveIdx + 1 }), { fontFamily: FONT, fontSize: "38px", color: isFinal ? "#e4572e" : COLORS.accentText, fontStyle: "bold" })
        .setOrigin(0.5).setAlpha(0).setScale(0.7);
      overlay.add(banner);
      scene.tweens.add({ targets: banner, alpha: 1, scale: 1, duration: 300, ease: "Back.easeOut" });
      scene.time.delayedCall(1100, () => {
        scene.tweens.add({ targets: banner, alpha: 0, duration: 250, onComplete: () => banner.destroy() });
        beginSpawning();
      });
    }

    function beginSpawning() {
      if (done) return;
      const wave = WAVES[waveIdx];
      spawner = scene.time.addEvent({
        delay: wave.spawnMs,
        loop: true,
        callback: () => {
          if (done) return;
          const wantGunner = spawnedG < wave.gunners && (spawnedS >= wave.soldiers || Math.random() < 0.35);
          if (wantGunner) { spawnEnemy("gunner"); spawnedG++; }
          else if (spawnedS < wave.soldiers) { spawnEnemy("soldier"); spawnedS++; }
          if (spawnedS >= wave.soldiers && spawnedG >= wave.gunners) { spawner?.remove(); spawner = null; }
        },
      });
    }

    // ---------------- UPDATE LOOP ----------------
    const update = (_time: number, deltaMs: number) => {
      if (done) return;
      const dt = Math.min(deltaMs, 50) / 1000;
      if (invuln > 0) invuln -= deltaMs;
      player.setAlpha(invuln > 0 ? 0.55 : 1);

      // --- player movement (keyboard + joystick + dev) ---
      let mx = joyVec.x + extVec.x;
      let my = joyVec.y + extVec.y;
      if (keys) {
        if (keys.A.isDown || keys.LEFT.isDown) mx -= 1;
        if (keys.D.isDown || keys.RIGHT.isDown) mx += 1;
        if (keys.W.isDown || keys.UP.isDown) my -= 1;
        if (keys.S.isDown || keys.DOWN.isDown) my += 1;
      }
      const ml = Math.hypot(mx, my);
      if (ml > 1) { mx /= ml; my /= ml; }
      player.x = Phaser.Math.Clamp(player.x + mx * PLAYER_SPEED * dt, MINX, MAXX);
      player.y = Phaser.Math.Clamp(player.y + my * PLAYER_SPEED * dt, MINY, MAXY);

      // --- auto-attack: bonk the nearest enemy in range ---
      attackCd -= deltaMs;
      if (attackCd <= 0) {
        let nearest: Enemy | null = null;
        let nd = MELEE_RANGE;
        for (const e of enemies) {
          if (e.state === "dying") continue;
          const d = Phaser.Math.Distance.Between(player.x, player.y, e.c.x, e.c.y);
          if (d < nd) { nd = d; nearest = e; }
        }
        if (nearest) {
          attackCd = ATTACK_CD;
          player.scaleX = 1.15; scene.tweens.add({ targets: player, scaleX: 1, duration: 140 });
          defeatEnemy(nearest, player.x);
        }
      }

      // --- enemies ---
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.state === "dying") {
          e.c.x += e.vx * dt;
          e.c.y += e.vy * dt;
          e.c.angle += 360 * dt;
          e.c.alpha -= dt * 2.2;
          if (e.c.alpha <= 0 || e.c.x > width + 80) removeEnemyAt(i);
          continue;
        }
        if (e.kind === "gunner") {
          if (e.state === "advance") {
            e.c.x -= e.speed * dt;
            if (e.c.x <= e.fireRange) { e.state = "aim"; e.timer = AIM_MS; e.marker.setText("!"); }
          } else if (e.state === "aim") {
            e.timer -= deltaMs;
            e.marker.setScale(1 + Math.sin(performance.now() / 90) * 0.25);
            if (e.timer <= 0) {
              e.marker.setText("");
              fireShot(e.c.x, e.c.y, player.x, player.y);
              e.state = "reload"; e.timer = GUN_RELOAD;
            }
          } else if (e.state === "reload") {
            e.timer -= deltaMs;
            e.c.x -= e.speed * 0.4 * dt;
            if (e.timer <= 0) e.state = e.c.x <= e.fireRange ? "aim" : "advance";
            if (e.state === "aim") { e.timer = AIM_MS; e.marker.setText("!"); }
          }
        } else {
          e.c.x -= e.speed * dt;
          // contact with player
          if (Phaser.Math.Distance.Between(player.x, player.y, e.c.x, e.c.y) < 30) hurtPlayer(CONTACT_DMG, e.c.x);
        }
        // reached the village?
        if (e.c.x <= VILLAGE_X + 16) {
          village -= VILLAGE_DMG;
          combo = 0;
          floatText(scene, VILLAGE_X + 30, e.c.y, "✗", "#e4572e");
          shake(scene, 90, 0.003);
          updateHud();
          removeEnemyAt(i);
          onResolved();
        }
      }

      // --- shots ---
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.c.x += s.vx * dt;
        s.c.y += s.vy * dt;
        s.life -= deltaMs;
        if (Phaser.Math.Distance.Between(player.x, player.y, s.c.x, s.c.y) < 18) {
          hurtPlayer(SHOT_DMG, s.c.x);
          s.c.destroy(); shots.splice(i, 1); continue;
        }
        if (s.life <= 0 || s.c.x < -20 || s.c.x > width + 20 || s.c.y < 0 || s.c.y > height) {
          s.c.destroy(); shots.splice(i, 1);
        }
      }

      // --- NPC allies: seek nearest enemy, bonk on contact ---
      for (const a of allies) {
        a.cd -= deltaMs;
        let target: Enemy | null = null;
        let nd = 1e9;
        for (const e of enemies) {
          if (e.state === "dying") continue;
          const d = Phaser.Math.Distance.Between(a.c.x, a.c.y, e.c.x, e.c.y);
          if (d < nd) { nd = d; target = e; }
        }
        if (target) {
          const dx = target.c.x - a.c.x, dy = target.c.y - a.c.y;
          const len = Math.hypot(dx, dy) || 1;
          a.c.x += (dx / len) * 90 * dt;
          a.c.y += (dy / len) * 90 * dt;
          a.c.x = Phaser.Math.Clamp(a.c.x, VILLAGE_X + 10, MAXX);
          if (nd < 40 && a.cd <= 0) { a.cd = 900; defeatEnemy(target, a.c.x); }
        } else {
          // drift home
          a.c.x += (VILLAGE_X + 40 - a.c.x) * 0.5 * dt;
        }
      }

      if (village <= 0 && !done) finish();
    };
    scene.events.on(Phaser.Scenes.Events.UPDATE, update);

    const failsafe = scene.time.delayedCall(90000, () => finish());

    function finish() {
      if (done) return;
      done = true;
      scene.events.off(Phaser.Scenes.Events.UPDATE, update);
      removeInput();
      spawner?.remove();
      failsafe.remove();
      if (import.meta.env.DEV) delete (window as unknown as { __mg?: unknown }).__mg;

      const perf = Math.max(0, (Math.max(0, village) / VILLAGE_MAX + Math.max(0, playerHP) / HP_MAX) / 2);
      const stars = starsFor(perf);
      if (stars >= 2) {
        sfx.success();
        burst(scene, width / 2, height / 2 - 60, [0x8bc34a, 0xffd54a, 0xffffff], 34, 280);
      }

      hud.removeAll(true);
      controls.removeAll(true);
      overlay.add([
        scene.add.text(width / 2, height / 2 - 120, t("mg.mactan.result", { n: defeated }), { fontFamily: FONT, fontSize: "22px", color: COLORS.text, fontStyle: "bold" }).setOrigin(0.5),
        scene.add.text(width / 2, height / 2 - 86, t("mg.mactan.score", { n: score }), { fontFamily: FONT, fontSize: "17px", color: COLORS.accentText }).setOrigin(0.5),
        scene.add.text(width / 2, height / 2 + 10, stars >= 2 ? t("mg.mactan.resultWin") : t("mg.mactan.resultOk"), { fontFamily: FONT, fontSize: "15px", color: COLORS.textMuted, align: "center", wordWrap: { width: width - 80 } }).setOrigin(0.5),
      ]);
      overlay.add(showStars(scene, width / 2, height / 2 - 40, stars, () => sfx.pop()));

      scene.time.delayedCall(2000, () => {
        overlay.destroy(true);
        hud.destroy(true);
        controls.destroy(true);
        field.destroy(true);
        resolve({ score: perf, attempts: Math.max(1, Math.round((HP_MAX - playerHP) / 20) + 1), msSpent: Math.round(performance.now() - startedAt) });
      });
    }

    startWave();
  });
}
