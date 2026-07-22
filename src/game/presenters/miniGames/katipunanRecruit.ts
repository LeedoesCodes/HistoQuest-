import Phaser from "phaser";
import type { MiniGameNode, MiniGameResult } from "../../content/types";
import { COLORS, FONT } from "../../ui/theme";

/**
 * Katipunan recruitment mini-game (Pugad Lawin arc).
 *
 * History: the Katipunan grew by quietly recruiting fellow Filipinos. Here the
 * pupil taps appearing Filipinos to recruit them into the Katipunan before the
 * timer runs out — while avoiding the Spanish guards (guardia civil).
 *
 * score = recruited / target (0..1). `attempts` = 1 + wrong taps (feeds the
 * classifier). Reaching the target or the timer ending both end the round.
 */

const TARGET = 6;
const TIME_MS = 15000;
const SPAWN_MS = 650;
const FIGURE_LIFE_MS = 1800;

export function playKatipunanRecruit(
  scene: Phaser.Scene,
  _node: MiniGameNode
): Promise<MiniGameResult> {
  return new Promise((resolve) => {
    const { width, height } = scene.scale;
    const startedAt = performance.now();
    let recruited = 0;
    let misses = 0;
    let done = false;

    const figures = scene.add.container(0, 0).setDepth(10);
    const hud = scene.add.container(0, 0).setDepth(12);
    const active = new Set<Phaser.GameObjects.Container>();

    hud.add([
      scene.add
        .text(width / 2, 40, "Pindutin ang mga Pilipino para sumapi sa Katipunan!", {
          fontFamily: FONT,
          fontSize: "19px",
          color: COLORS.text,
          fontStyle: "bold",
          align: "center",
          wordWrap: { width: width - 60 },
        })
        .setOrigin(0.5),
      scene.add
        .text(width / 2, 68, "Iwasan ang mga guwardiyang Espanyol (pula).", {
          fontFamily: FONT,
          fontSize: "13px",
          color: COLORS.textMuted,
        })
        .setOrigin(0.5),
    ]);

    const counter = scene.add
      .text(24, 100, `Nakuha: ${recruited}/${TARGET}`, {
        fontFamily: FONT,
        fontSize: "18px",
        color: COLORS.accentText,
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    const timerText = scene.add
      .text(width - 24, 100, `${(TIME_MS / 1000).toFixed(1)}s`, {
        fontFamily: FONT,
        fontSize: "18px",
        color: COLORS.text,
      })
      .setOrigin(1, 0.5);
    hud.add([counter, timerText]);

    const endAt = performance.now() + TIME_MS;
    const tick = scene.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        const remaining = Math.max(0, endAt - performance.now());
        timerText.setText(`${(remaining / 1000).toFixed(1)}s`);
        if (remaining <= 0) finish();
      },
    });

    function makeFigure(isFilipino: boolean) {
      const x = Phaser.Math.Between(70, width - 70);
      const y = Phaser.Math.Between(165, height - 110);
      const c = scene.add.container(x, y);

      const stroke = isFilipino ? COLORS.success : COLORS.danger;
      const card = scene.add
        .rectangle(0, 0, 74, 92, COLORS.panel)
        .setStrokeStyle(3, stroke)
        .setInteractive({ useHandCursor: true });
      card.setData("kind", isFilipino ? "fil" : "guard"); // for tests
      const head = scene.add.circle(0, -18, 13, 0xe8c9a0);
      const body = scene.add.rectangle(0, 14, 34, 34, isFilipino ? 0x8d6e63 : 0x37474f);
      const label = scene.add
        .text(0, 40, isFilipino ? "Pilipino" : "Guwardiya", {
          fontFamily: FONT,
          fontSize: "11px",
          color: isFilipino ? "#9ccc9c" : "#e79b8f",
        })
        .setOrigin(0.5);
      c.add([card, head, body, label]);
      c.setScale(0);
      scene.tweens.add({ targets: c, scale: 1, duration: 140, ease: "Back.easeOut" });

      const life = scene.time.delayedCall(FIGURE_LIFE_MS, () => removeFigure(c));
      c.setData("life", life);

      card.on("pointerdown", () => {
        if (done) return;
        if (isFilipino) {
          recruited++;
          counter.setText(`Nakuha: ${recruited}/${TARGET}`);
          floatPlus(x, y, "+1", COLORS.accentText);
          removeFigure(c);
          if (recruited >= TARGET) finish();
        } else {
          misses++;
          floatPlus(x, y, "✗", "#e4572e");
          removeFigure(c);
        }
      });

      figures.add(c);
      active.add(c);
    }

    function floatPlus(x: number, y: number, txt: string, color: string) {
      const t = scene.add
        .text(x, y - 30, txt, { fontFamily: FONT, fontSize: "22px", color, fontStyle: "bold" })
        .setOrigin(0.5)
        .setDepth(13);
      scene.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 600, onComplete: () => t.destroy() });
    }

    function removeFigure(c: Phaser.GameObjects.Container) {
      if (!active.has(c)) return;
      active.delete(c);
      (c.getData("life") as Phaser.Time.TimerEvent | undefined)?.remove();
      c.destroy();
    }

    const spawner = scene.time.addEvent({
      delay: SPAWN_MS,
      loop: true,
      callback: () => {
        if (done) return;
        makeFigure(Math.random() < 0.7);
      },
    });
    makeFigure(true);
    makeFigure(true);

    function finish() {
      if (done) return;
      done = true;
      tick.remove();
      spawner.remove();
      active.forEach((c) => {
        (c.getData("life") as Phaser.Time.TimerEvent | undefined)?.remove();
        c.destroy();
      });
      active.clear();

      const score = Math.min(recruited / TARGET, 1);
      hud.removeAll(true);
      const resultLayer = scene.add.container(0, 0).setDepth(13);
      resultLayer.add([
        scene.add
          .text(width / 2, height / 2 - 16, `Nakuha mo: ${recruited} Katipunero!`, {
            fontFamily: FONT,
            fontSize: "24px",
            color: COLORS.text,
            fontStyle: "bold",
          })
          .setOrigin(0.5),
        scene.add
          .text(
            width / 2,
            height / 2 + 22,
            recruited >= TARGET ? "Lumakas ang hukbo ng himagsikan!" : "Magaling! Patuloy ang laban.",
            { fontFamily: FONT, fontSize: "16px", color: COLORS.textMuted }
          )
          .setOrigin(0.5),
      ]);

      scene.time.delayedCall(1200, () => {
        resultLayer.destroy(true);
        figures.destroy(true);
        resolve({ score, attempts: misses + 1, msSpent: Math.round(performance.now() - startedAt) });
      });
    }
  });
}
