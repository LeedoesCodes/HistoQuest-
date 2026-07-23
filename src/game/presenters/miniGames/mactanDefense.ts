import Phaser from "phaser";
import type { MiniGameNode, MiniGameResult } from "../../content/types";
import { COLORS, FONT } from "../../ui/theme";

/**
 * Mactan defense mini-game (Mactan arc).
 *
 * History: in April 1521 Lapu-Lapu and his warriors met Magellan's forces in
 * the shallows off Mactan and drove them back before they could take the shore.
 * Here the pupil defends that shoreline: invader boats advance from the sea and
 * must be repelled by tapping them before they land.
 *
 * score = repelled / total. `attempts` = 1 + breaches (feeds the classifier).
 */

const TOTAL_INVADERS = 10;
const SPAWN_MS = 800;
const SHORE_X = 96; // invaders that cross this have landed

export function playMactanDefense(
  scene: Phaser.Scene,
  _node: MiniGameNode
): Promise<MiniGameResult> {
  return new Promise((resolve) => {
    const { width, height } = scene.scale;
    const startedAt = performance.now();
    let spawned = 0;
    let repelled = 0;
    let breached = 0;
    let done = false;

    const field = scene.add.container(0, 0).setDepth(10);
    const hud = scene.add.container(0, 0).setDepth(12);
    const active = new Set<Phaser.GameObjects.Container>();

    // --- Shore (Mactan) on the left ---
    const shore = scene.add.rectangle(SHORE_X / 2, height / 2 + 40, SHORE_X, height - 150, 0x2e5d34);
    const shoreLabel = scene.add
      .text(SHORE_X / 2, height - 90, "MACTAN", {
        fontFamily: FONT,
        fontSize: "13px",
        color: "#cfe8cf",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    field.add([shore, shoreLabel]);

    // --- HUD ---
    hud.add([
      scene.add
        .text(width / 2, 38, "Ipagtanggol ang baybayin ng Mactan!", {
          fontFamily: FONT,
          fontSize: "20px",
          color: COLORS.text,
          fontStyle: "bold",
        })
        .setOrigin(0.5),
      scene.add
        .text(width / 2, 64, "Pindutin ang mga sasakyang-dagat bago sila makalapag.", {
          fontFamily: FONT,
          fontSize: "13px",
          color: COLORS.textMuted,
        })
        .setOrigin(0.5),
    ]);
    const counter = scene.add
      .text(width - 24, 96, "", { fontFamily: FONT, fontSize: "17px", color: COLORS.accentText, fontStyle: "bold" })
      .setOrigin(1, 0.5);
    hud.add(counter);
    const updateHud = () =>
      counter.setText(`Naitaboy: ${repelled}   Nakalusot: ${breached}   (${spawned}/${TOTAL_INVADERS})`);
    updateHud();

    function floatText(x: number, y: number, txt: string, color: string) {
      const t = scene.add
        .text(x, y, txt, { fontFamily: FONT, fontSize: "20px", color, fontStyle: "bold" })
        .setOrigin(0.5)
        .setDepth(13);
      scene.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 550, onComplete: () => t.destroy() });
    }

    function removeInvader(c: Phaser.GameObjects.Container) {
      if (!active.has(c)) return;
      active.delete(c);
      (c.getData("tween") as Phaser.Tweens.Tween | undefined)?.stop();
      c.destroy();
      checkEnd();
    }

    function spawnInvader() {
      if (done) return;
      spawned++;
      const y = Phaser.Math.Between(170, height - 120);
      const c = scene.add.container(width + 50, y);

      const hull = scene.add.rectangle(0, 14, 76, 20, 0x6d4c41).setStrokeStyle(2, 0x3e2723);
      const sail = scene.add.triangle(0, -14, 0, 20, 0, -20, 26, 10, 0xe0e0e0);
      const soldier = scene.add.circle(-18, -4, 8, 0xb0bec5);
      const hit = scene.add
        .rectangle(0, 0, 92, 62, 0xffffff, 0.001) // invisible, generous tap target
        .setInteractive({ useHandCursor: true });
      hit.setData("kind", "invader"); // for tests
      c.add([hull, sail, soldier, hit]);
      field.add(c);
      active.add(c);
      updateHud();

      const duration = Phaser.Math.Between(3600, 5200);
      const tw = scene.tweens.add({
        targets: c,
        x: SHORE_X - 10,
        duration,
        ease: "Linear",
        onComplete: () => {
          if (done || !active.has(c)) return;
          breached++;
          floatText(SHORE_X + 40, c.y, "✗", "#e4572e");
          updateHud();
          removeInvader(c);
        },
      });
      c.setData("tween", tw);

      hit.on("pointerdown", () => {
        if (done || !active.has(c)) return;
        repelled++;
        floatText(c.x, c.y - 20, "✓", "#8bc34a");
        updateHud();
        // knock the boat back out to sea before removing it
        (c.getData("tween") as Phaser.Tweens.Tween).stop();
        scene.tweens.add({
          targets: c,
          x: c.x + 90,
          alpha: 0,
          angle: 18,
          duration: 260,
          onComplete: () => removeInvader(c),
        });
        active.delete(c); // no longer tappable/breachable while flying back
        checkEnd();
      });
    }

    const spawner = scene.time.addEvent({
      delay: SPAWN_MS,
      loop: true,
      callback: () => {
        if (spawned >= TOTAL_INVADERS) {
          spawner.remove();
          return;
        }
        spawnInvader();
      },
    });
    spawnInvader();

    function checkEnd() {
      if (done) return;
      if (spawned >= TOTAL_INVADERS && repelled + breached >= TOTAL_INVADERS) finish();
    }

    // Safety net so the round can never hang.
    const failsafe = scene.time.delayedCall(45000, () => finish());

    function finish() {
      if (done) return;
      done = true;
      spawner.remove();
      failsafe.remove();
      active.forEach((c) => {
        (c.getData("tween") as Phaser.Tweens.Tween | undefined)?.stop();
        c.destroy();
      });
      active.clear();

      const score = repelled / TOTAL_INVADERS;
      hud.removeAll(true);
      const resultLayer = scene.add.container(0, 0).setDepth(13);
      resultLayer.add([
        scene.add
          .text(width / 2, height / 2 - 16, `Naitaboy mo ang ${repelled} sasakyang-dagat!`, {
            fontFamily: FONT,
            fontSize: "23px",
            color: COLORS.text,
            fontStyle: "bold",
          })
          .setOrigin(0.5),
        scene.add
          .text(
            width / 2,
            height / 2 + 22,
            breached === 0
              ? "Walang nakalusot — matatag ang Mactan!"
              : "Nanindigan pa rin ang mga mandirigma ni Lapu-Lapu.",
            { fontFamily: FONT, fontSize: "16px", color: COLORS.textMuted }
          )
          .setOrigin(0.5),
      ]);

      scene.time.delayedCall(1300, () => {
        resultLayer.destroy(true);
        field.destroy(true);
        resolve({ score, attempts: breached + 1, msSpent: Math.round(performance.now() - startedAt) });
      });
    }
  });
}
