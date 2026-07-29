import Phaser from "phaser";
import type { MiniGameNode, MiniGameResult } from "../../content/types";
import { COLORS, FONT } from "../../ui/theme";
import { burst, shake, flash, floatText, pop, showStars, starsFor } from "../../ui/juice";
import { sfx } from "../../ui/sfx";
import { t } from "../../i18n";

/**
 * Mactan defense mini-game (Mactan arc) — wave-based.
 *
 * History: Lapu-Lapu's people drove Magellan's forces back at the shallow shore
 * before they could land. Here that becomes a real game loop with build-up:
 * THREE waves of increasing intensity, a SHORE you must protect (a health bar),
 * SCORE with a COMBO multiplier for consecutive repels, and a 1-3 STAR rating.
 *
 * score (0..1, for the classifier) = shore health remaining / max. Doing badly
 * is possible and visible — which is what makes doing well feel good.
 */

interface WaveDef {
  count: number;
  speed: [number, number]; // ms to cross (lower = faster)
  spawnMs: number;
}

const WAVES: WaveDef[] = [
  { count: 5, speed: [5200, 6200], spawnMs: 950 },
  { count: 7, speed: [4000, 5200], spawnMs: 720 },
  { count: 9, speed: [3000, 4200], spawnMs: 540 },
];

const SHORE_X = 96;
const SHORE_MAX = 100;
const BREACH_DAMAGE = 11;

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
    let shore = SHORE_MAX;
    let score = 0;
    let combo = 0;
    let bestCombo = 0;
    let repelled = 0;
    let breached = 0;
    let done = false;
    let spawner: Phaser.Time.TimerEvent | null = null;

    const totalInvaders = WAVES.reduce((n, w) => n + w.count, 0);

    const field = scene.add.container(0, 0).setDepth(10);
    const hud = scene.add.container(0, 0).setDepth(12);
    const active = new Set<Phaser.GameObjects.Container>();

    // --- Shore (Mactan) on the left ---
    const shoreRect = scene.add.rectangle(SHORE_X / 2, height / 2 + 40, SHORE_X, height - 150, 0x2e5d34);
    const shoreLabel = scene.add
      .text(SHORE_X / 2, height - 96, t("mg.mactan.shore"), {
        fontFamily: FONT,
        fontSize: "12px",
        color: "#cfe8cf",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    field.add([shoreRect, shoreLabel]);

    // --- HUD: instruction, wave, score, shore health bar ---
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
        })
        .setOrigin(0.5),
    ]);

    const waveText = scene.add
      .text(24, 82, "", { fontFamily: FONT, fontSize: "15px", color: COLORS.textMuted, fontStyle: "bold" })
      .setOrigin(0, 0.5);
    const scoreText = scene.add
      .text(width - 24, 82, "", { fontFamily: FONT, fontSize: "16px", color: COLORS.accentText, fontStyle: "bold" })
      .setOrigin(1, 0.5);

    // Shore health bar
    const barX = 24;
    const barY = 104;
    const barW = width - 48;
    scene.add.rectangle(barX, barY, barW, 12, 0x3a2020).setOrigin(0, 0.5).setDepth(12);
    const healthBar = scene.add.rectangle(barX, barY, barW, 12, COLORS.success).setOrigin(0, 0.5).setDepth(12);
    const heartLabel = scene.add
      .text(barX, barY - 16, "", { fontFamily: FONT, fontSize: "11px", color: COLORS.textMuted })
      .setOrigin(0, 0.5)
      .setDepth(12);
    hud.add([waveText, scoreText, healthBar, heartLabel]);

    const updateHud = () => {
      waveText.setText(t("mg.mactan.wave", { n: waveIdx + 1, total: WAVES.length }));
      scoreText.setText(t("mg.mactan.score", { n: score }));
      const frac = Math.max(0, shore / SHORE_MAX);
      healthBar.width = barW * frac;
      healthBar.setFillStyle(frac > 0.5 ? COLORS.success : frac > 0.25 ? 0xffb300 : COLORS.danger);
      heartLabel.setText(`${t("mg.mactan.shore")}  ${Math.max(0, Math.round(shore))}%`);
    };
    updateHud();

    function removeInvader(c: Phaser.GameObjects.Container) {
      if (!active.has(c)) return;
      active.delete(c);
      (c.getData("tween") as Phaser.Tweens.Tween | undefined)?.stop();
      c.destroy();
    }

    function spawnInvader() {
      if (done) return;
      const wave = WAVES[waveIdx];
      spawnedThisWave++;
      const y = Phaser.Math.Between(150, height - 120);
      const c = scene.add.container(width + 50, y);

      const big = waveIdx === WAVES.length - 1 && Math.random() < 0.3;
      const s = big ? 1.25 : 1;
      const hull = scene.add.rectangle(0, 14 * s, 76 * s, 20 * s, big ? 0x5d4037 : 0x6d4c41).setStrokeStyle(2, 0x3e2723);
      const sail = scene.add.triangle(0, -14 * s, 0, 20 * s, 0, -20 * s, 26 * s, 10 * s, big ? 0xd7ccc8 : 0xe0e0e0);
      const soldier = scene.add.circle(-18 * s, -4 * s, 8 * s, 0xb0bec5);
      const hit = scene.add
        .rectangle(0, 0, 92 * s, 62 * s, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true });
      hit.setData("kind", "invader");
      c.add([hull, sail, soldier, hit]);
      field.add(c);
      active.add(c);

      const duration = Phaser.Math.Between(wave.speed[0], wave.speed[1]) * (big ? 1.15 : 1);
      const tw = scene.tweens.add({
        targets: c,
        x: SHORE_X - 10,
        duration,
        ease: "Linear",
        onComplete: () => onBreach(c, big),
      });
      c.setData("tween", tw);

      hit.on("pointerdown", () => onRepel(c, big));
    }

    function onRepel(c: Phaser.GameObjects.Container, big: boolean) {
      if (done || !active.has(c)) return;
      repelled++;
      combo++;
      bestCombo = Math.max(bestCombo, combo);
      const gained = (big ? 25 : 10) * Math.max(1, combo);
      score += gained;
      sfx.hit();
      shake(scene, 70, 0.003);
      burst(scene, c.x, c.y, [0x8bc34a, 0xffffff, 0x4fc3f7], big ? 20 : 14, 200);
      floatText(scene, c.x, c.y - 24, `+${gained}`, "#8bc34a");
      if (combo >= 3) floatText(scene, c.x, c.y - 52, t("mg.mactan.combo", { n: combo }), "#ffd54a", "15px");
      pop(scene, scoreText);
      // Knock it back out to sea.
      (c.getData("tween") as Phaser.Tweens.Tween).stop();
      active.delete(c);
      scene.tweens.add({
        targets: c,
        x: c.x + 90,
        alpha: 0,
        angle: 18,
        duration: 240,
        onComplete: () => c.destroy(),
      });
      updateHud();
      onResolved();
    }

    function onBreach(c: Phaser.GameObjects.Container, big: boolean) {
      if (done || !active.has(c)) return;
      breached++;
      combo = 0;
      shore -= big ? BREACH_DAMAGE * 1.6 : BREACH_DAMAGE;
      sfx.thud();
      flash(scene, 0xe4572e, 150);
      shake(scene, 200, 0.007);
      burst(scene, SHORE_X + 20, c.y, 0xe4572e, 14, 160);
      floatText(scene, SHORE_X + 50, c.y, "✗", "#e4572e");
      removeInvader(c);
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
      // Wave banner (the build-up beat).
      const isFinal = waveIdx === WAVES.length - 1;
      const banner = scene.add
        .text(width / 2, height / 2, isFinal ? t("mg.mactan.finalWave") : t("mg.mactan.waveBanner", { n: waveIdx + 1 }), {
          fontFamily: FONT,
          fontSize: "40px",
          color: isFinal ? "#e4572e" : COLORS.accentText,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(20)
        .setAlpha(0)
        .setScale(0.7);
      scene.tweens.add({ targets: banner, alpha: 1, scale: 1, duration: 300, ease: "Back.easeOut" });
      scene.time.delayedCall(1100, () => {
        scene.tweens.add({ targets: banner, alpha: 0, duration: 250, onComplete: () => banner.destroy() });
        beginSpawning();
      });
    }

    function beginSpawning() {
      if (done) return;
      const wave = WAVES[waveIdx];
      spawnInvader();
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
          spawnInvader();
        },
      });
    }

    // Safety net so the round can never hang.
    const failsafe = scene.time.delayedCall(70000, () => finish());

    function finish() {
      if (done) return;
      done = true;
      spawner?.remove();
      failsafe.remove();
      active.forEach((c) => {
        (c.getData("tween") as Phaser.Tweens.Tween | undefined)?.stop();
        c.destroy();
      });
      active.clear();

      const perf = Math.max(0, shore / SHORE_MAX);
      const stars = starsFor(perf);

      if (stars >= 2) {
        sfx.success();
        burst(scene, width / 2, height / 2 - 60, [0x8bc34a, 0xffd54a, 0xffffff], 34, 280);
      }

      hud.removeAll(true);
      const resultLayer = scene.add.container(0, 0).setDepth(13);
      resultLayer.add([
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
          })
          .setOrigin(0.5),
      ]);

      // Stars pop in, each with a chime.
      showStars(scene, width / 2, height / 2 - 40, stars, () => sfx.pop());

      scene.time.delayedCall(1900, () => {
        resultLayer.destroy(true);
        field.destroy(true);
        // score for the classifier reflects how well the shore was held.
        resolve({ score: perf, attempts: breached + 1, msSpent: Math.round(performance.now() - startedAt) });
      });
    }

    // Kick off wave 1.
    startWave();
    void totalInvaders;
  });
}
