import Phaser from "phaser";
import type { MiniGameNode, MiniGameResult } from "../../content/types";
import { COLORS, FONT } from "../../ui/theme";
import { burst, shake, flash, floatText, pop, showStars, starsFor } from "../../ui/juice";
import { sfx } from "../../ui/sfx";
import { t } from "../../i18n";

/**
 * Mactan defense mini-game — shore combat (non-gory).
 *
 * History, made playable: the shallow water let only a SMALL landing party wade
 * ashore, so Lapu-Lapu's many warriors OUTNUMBERED and overwhelmed them. Here
 * you defend the shore across three rising waves:
 *   - BONK advancing soldiers (tap) to drive them back — no blood, they tumble.
 *   - AVOID their guns: some soldiers stop and AIM (they flash red with "!").
 *     Bonk a shooter before he fires or the People's Strength takes a hit.
 *   - Numbers matter: your warriors line the shore; the few invaders lose.
 *
 * score (0..1, for the classifier) = People's Strength remaining / max.
 *
 * IMPORTANT: every object lives in a container destroyed on finish — an earlier
 * version leaked the health bar and stars onto the menu.
 */

interface WaveDef {
  count: number;
  speed: [number, number]; // ms to cross (lower = faster)
  spawnMs: number;
  shooterChance: number;
}

const WAVES: WaveDef[] = [
  { count: 5, speed: [5200, 6200], spawnMs: 1000, shooterChance: 0.2 },
  { count: 7, speed: [4200, 5200], spawnMs: 780, shooterChance: 0.38 },
  { count: 9, speed: [3400, 4400], spawnMs: 600, shooterChance: 0.55 },
];

const SHORE_X = 96;
const MORALE_MAX = 100;
const REACH_DAMAGE = 7; // a soldier who reaches the shore
const SHOT_DAMAGE = 10; // a shooter who fires unbonked
const AIM_MS = 1250;

export function playMactanDefense(
  scene: Phaser.Scene,
  _node: MiniGameNode
): Promise<MiniGameResult> {
  return new Promise((resolve) => {
    const { width, height } = scene.scale;
    const startedAt = performance.now();

    let waveIdx = 0;
    let spawnedThisWave = 0;
    let resolvedThisWave = 0;
    let morale = MORALE_MAX;
    let score = 0;
    let combo = 0;
    let repelled = 0;
    let done = false;
    let spawner: Phaser.Time.TimerEvent | null = null;

    // Every visual lives under one of these; both destroyed in finish().
    const field = scene.add.container(0, 0).setDepth(10);
    const hud = scene.add.container(0, 0).setDepth(12);
    const overlay = scene.add.container(0, 0).setDepth(20); // banners, result, stars
    const active = new Set<Phaser.GameObjects.Container>();

    // --- Shore + a line of allied warriors (the "we are many" visual) ---
    const shoreRect = scene.add.rectangle(SHORE_X / 2, height / 2 + 40, SHORE_X, height - 150, 0x2e5d34);
    field.add(shoreRect);
    for (let i = 0; i < 5; i++) {
      const wy = 170 + i * 78;
      const w = scene.add.container(SHORE_X - 18, wy);
      const head = scene.add.circle(0, -12, 7, 0xe8c9a0);
      const bodyR = scene.add.rectangle(0, 6, 18, 26, 0x8d6e63);
      const spear = scene.add.rectangle(10, -6, 3, 34, 0xcbb98a).setAngle(20);
      w.add([spear, bodyR, head]);
      field.add(w);
    }

    // --- HUD ---
    hud.add([
      scene.add
        .text(width / 2, 30, t("mg.mactan.instruction"), {
          fontFamily: FONT,
          fontSize: "19px",
          color: COLORS.text,
          fontStyle: "bold",
        })
        .setOrigin(0.5),
      scene.add
        .text(width / 2, 54, t("mg.mactan.sub"), {
          fontFamily: FONT,
          fontSize: "12px",
          color: COLORS.textMuted,
          align: "center",
          wordWrap: { width: width - 40 },
        })
        .setOrigin(0.5),
    ]);

    const waveText = scene.add
      .text(24, 82, "", { fontFamily: FONT, fontSize: "15px", color: COLORS.textMuted, fontStyle: "bold" })
      .setOrigin(0, 0.5);
    const scoreText = scene.add
      .text(width - 24, 82, "", { fontFamily: FONT, fontSize: "16px", color: COLORS.accentText, fontStyle: "bold" })
      .setOrigin(1, 0.5);
    const barX = 24;
    const barY = 106;
    const barW = width - 48;
    const barBg = scene.add.rectangle(barX, barY, barW, 12, 0x3a2020).setOrigin(0, 0.5);
    const healthBar = scene.add.rectangle(barX, barY, barW, 12, COLORS.success).setOrigin(0, 0.5);
    const moraleLabel = scene.add
      .text(barX, barY - 16, "", { fontFamily: FONT, fontSize: "11px", color: COLORS.textMuted })
      .setOrigin(0, 0.5);
    hud.add([waveText, scoreText, barBg, healthBar, moraleLabel]);

    const updateHud = () => {
      waveText.setText(t("mg.mactan.wave", { n: waveIdx + 1, total: WAVES.length }));
      scoreText.setText(t("mg.mactan.score", { n: score }));
      const frac = Math.max(0, morale / MORALE_MAX);
      healthBar.width = barW * frac;
      healthBar.setFillStyle(frac > 0.5 ? COLORS.success : frac > 0.25 ? 0xffb300 : COLORS.danger);
      moraleLabel.setText(`${t("mg.mactan.morale")}  ${Math.max(0, Math.round(morale))}%`);
    };
    updateHud();

    function clearSoldierTimers(c: Phaser.GameObjects.Container) {
      (c.getData("advance") as Phaser.Tweens.Tween | undefined)?.stop();
      (c.getData("aimTimer") as Phaser.Time.TimerEvent | undefined)?.remove();
      (c.getData("fireTimer") as Phaser.Time.TimerEvent | undefined)?.remove();
    }

    function removeSoldier(c: Phaser.GameObjects.Container) {
      if (!active.has(c)) return;
      active.delete(c);
      clearSoldierTimers(c);
      c.destroy();
    }

    function spawnSoldier() {
      if (done) return;
      const wave = WAVES[waveIdx];
      spawnedThisWave++;
      const y = Phaser.Math.Between(150, height - 120);
      const shooter = Math.random() < wave.shooterChance;
      const c = scene.add.container(width + 40, y);

      const helmet = scene.add.rectangle(0, -20, 22, 8, 0x9aa4b0).setStrokeStyle(1, 0x5b6470);
      const head = scene.add.circle(0, -12, 8, 0xd9b892);
      const body = scene.add.rectangle(0, 8, 26, 30, 0x455a74).setStrokeStyle(1, 0x2f3e52);
      const gun = scene.add.rectangle(-20, 2, 26, 4, shooter ? 0x6b4a2a : 0x5a4326).setOrigin(1, 0.5);
      const marker = scene.add
        .text(0, -40, "", { fontFamily: FONT, fontSize: "20px", color: "#e4572e", fontStyle: "bold" })
        .setOrigin(0.5);
      const hit = scene.add.rectangle(0, -4, 46, 62, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.setData("kind", "invader");
      c.add([gun, body, head, helmet, marker, hit]);
      c.setData("shooter", shooter);
      c.setData("marker", marker);
      c.setData("gun", gun);
      field.add(c);
      active.add(c);

      const duration = Phaser.Math.Between(wave.speed[0], wave.speed[1]);
      const advance = scene.tweens.add({
        targets: c,
        x: SHORE_X + 6,
        duration,
        ease: "Linear",
        onComplete: () => onReach(c),
      });
      c.setData("advance", advance);

      // Shooters stop partway to aim, then fire unless bonked in time.
      if (shooter) {
        const aimTimer = scene.time.delayedCall(duration * Phaser.Math.FloatBetween(0.35, 0.55), () => startAim(c));
        c.setData("aimTimer", aimTimer);
      }

      hit.on("pointerdown", () => onBonk(c));
    }

    function startAim(c: Phaser.GameObjects.Container) {
      if (done || !active.has(c)) return;
      (c.getData("advance") as Phaser.Tweens.Tween).pause();
      const marker = c.getData("marker") as Phaser.GameObjects.Text;
      const gun = c.getData("gun") as Phaser.GameObjects.Rectangle;
      marker.setText("!");
      gun.setFillStyle(0xe4572e);
      // Pulse the warning so it reads as "danger — bonk me first".
      scene.tweens.add({ targets: marker, scale: 1.35, duration: 300, yoyo: true, repeat: -1 });
      const fireTimer = scene.time.delayedCall(AIM_MS, () => fire(c));
      c.setData("fireTimer", fireTimer);
      c.setData("aiming", true);
    }

    function fire(c: Phaser.GameObjects.Container) {
      if (done || !active.has(c)) return;
      // A shot got through: the People's Strength takes a hit.
      morale -= SHOT_DAMAGE;
      combo = 0;
      sfx.thud();
      flash(scene, 0xe4572e, 130);
      shake(scene, 160, 0.006);
      floatText(scene, c.x, c.y - 40, "💥", "#e4572e");
      updateHud();
      // Shooter is spent; it retreats back out.
      active.delete(c);
      clearSoldierTimers(c);
      scene.tweens.add({ targets: c, x: width + 60, alpha: 0, duration: 500, onComplete: () => c.destroy() });
      onResolved();
    }

    function onBonk(c: Phaser.GameObjects.Container) {
      if (done || !active.has(c)) return;
      repelled++;
      combo++;
      const wasAiming = c.getData("aiming") === true;
      const wasShooter = c.getData("shooter") === true;
      // Reward stopping a shooter (teaches: deal with the guns first).
      const base = wasShooter ? 18 : 10;
      const gained = base * Math.max(1, combo);
      score += gained;
      sfx.hit();
      shake(scene, 70, 0.003);
      burst(scene, c.x, c.y, [0xffd54a, 0xffffff, 0x8bc34a], 14, 200);
      floatText(scene, c.x, c.y - 26, wasAiming ? "BONK! ✋" : "BONK!", "#ffd54a", "16px");
      if (combo >= 3) floatText(scene, c.x, c.y - 54, t("mg.mactan.combo", { n: combo }), "#ffd54a", "14px");
      pop(scene, scoreText);
      active.delete(c);
      clearSoldierTimers(c);
      // Tumble back toward the sea (non-gory knockback).
      scene.tweens.add({
        targets: c,
        x: c.x + 120,
        angle: 60,
        alpha: 0,
        duration: 300,
        ease: "Quad.easeIn",
        onComplete: () => c.destroy(),
      });
      updateHud();
      onResolved();
    }

    function onReach(c: Phaser.GameObjects.Container) {
      if (done || !active.has(c)) return;
      // Reached the shore, but your warriors push him back — a small cost.
      morale -= REACH_DAMAGE;
      combo = 0;
      sfx.thud();
      shake(scene, 90, 0.003);
      floatText(scene, SHORE_X + 40, c.y, "✗", "#e4572e");
      removeSoldier(c);
      updateHud();
      onResolved();
    }

    function onResolved() {
      resolvedThisWave++;
      if (resolvedThisWave >= WAVES[waveIdx].count) {
        waveIdx++;
        if (waveIdx < WAVES.length) startWave();
        else finish();
      }
    }

    function startWave() {
      spawnedThisWave = 0;
      resolvedThisWave = 0;
      updateHud();
      const isFinal = waveIdx === WAVES.length - 1;
      const banner = scene.add
        .text(width / 2, height / 2, isFinal ? t("mg.mactan.finalWave") : t("mg.mactan.waveBanner", { n: waveIdx + 1 }), {
          fontFamily: FONT,
          fontSize: "40px",
          color: isFinal ? "#e4572e" : COLORS.accentText,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setAlpha(0)
        .setScale(0.7);
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
      spawnSoldier();
      spawner = scene.time.addEvent({
        delay: wave.spawnMs,
        loop: true,
        callback: () => {
          if (done) return;
          if (spawnedThisWave >= wave.count) {
            spawner?.remove();
            spawner = null;
            return;
          }
          spawnSoldier();
        },
      });
    }

    const failsafe = scene.time.delayedCall(80000, () => finish());

    function finish() {
      if (done) return;
      done = true;
      spawner?.remove();
      failsafe.remove();
      active.forEach((c) => {
        clearSoldierTimers(c);
        c.destroy();
      });
      active.clear();

      const perf = Math.max(0, morale / MORALE_MAX);
      const stars = starsFor(perf);

      if (stars >= 2) {
        sfx.success();
        burst(scene, width / 2, height / 2 - 60, [0x8bc34a, 0xffd54a, 0xffffff], 34, 280);
      }

      hud.removeAll(true);
      overlay.add([
        scene.add
          .text(width / 2, height / 2 - 120, t("mg.mactan.result", { n: repelled }), {
            fontFamily: FONT,
            fontSize: "22px",
            color: COLORS.text,
            fontStyle: "bold",
          })
          .setOrigin(0.5),
        scene.add
          .text(width / 2, height / 2 - 86, t("mg.mactan.score", { n: score }), {
            fontFamily: FONT,
            fontSize: "17px",
            color: COLORS.accentText,
          })
          .setOrigin(0.5),
        scene.add
          .text(width / 2, height / 2 + 10, stars >= 2 ? t("mg.mactan.resultWin") : t("mg.mactan.resultOk"), {
            fontFamily: FONT,
            fontSize: "15px",
            color: COLORS.textMuted,
            align: "center",
            wordWrap: { width: width - 80 },
          })
          .setOrigin(0.5),
      ]);
      // Stars go INTO the overlay container so they are destroyed with it.
      overlay.add(showStars(scene, width / 2, height / 2 - 40, stars, () => sfx.pop()));

      scene.time.delayedCall(2000, () => {
        overlay.destroy(true);
        hud.destroy(true);
        field.destroy(true);
        resolve({ score: perf, attempts: Math.round(MORALE_MAX - morale) / 10 + 1, msSpent: Math.round(performance.now() - startedAt) });
      });
    }

    startWave();
  });
}
