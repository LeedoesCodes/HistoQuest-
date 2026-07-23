import Phaser from "phaser";
import type { DecisionNode, DecisionResult } from "../content/types";
import { COLORS, FONT } from "../ui/theme";
import { pop } from "../ui/juice";
import { sfx } from "../ui/sfx";

/**
 * Reusable timed-decision presenter. Shows a prompt, a shrinking countdown
 * bar, and the choices. The pupil picks within `timeLimitMs`; if the timer
 * expires we auto-pick `defaultChoiceId` (or the first choice) and flag it
 * timed out. Resolves with { choiceId, msElapsed, timedOut } — exactly the
 * fields the engagement classifier reads.
 */
export function playDecision(scene: Phaser.Scene, node: DecisionNode): Promise<DecisionResult> {
  return new Promise((resolve) => {
    const { width } = scene.scale;
    const layer = scene.add.container(0, 0).setDepth(10);
    const startedAt = performance.now();
    let done = false;

    // Prompt
    const prompt = scene.add
      .text(width / 2, 60, node.prompt, {
        fontFamily: FONT,
        fontSize: "24px",
        color: COLORS.text,
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: width - 80 },
      })
      .setOrigin(0.5, 0);

    // Countdown bar
    const barW = width - 120;
    const barBg = scene.add.rectangle(width / 2, 130, barW, 14, 0x22304f).setOrigin(0.5);
    const bar = scene.add.rectangle(width / 2 - barW / 2, 130, barW, 14, COLORS.accent).setOrigin(0, 0.5);
    const secs = scene.add
      .text(width / 2, 150, "", { fontFamily: FONT, fontSize: "13px", color: COLORS.textMuted })
      .setOrigin(0.5, 0);

    const barTween = scene.tweens.add({
      targets: bar,
      scaleX: 0,
      duration: node.timeLimitMs,
      ease: "Linear",
    });

    const tick = scene.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        const remaining = Math.max(0, node.timeLimitMs - (performance.now() - startedAt));
        secs.setText(`${(remaining / 1000).toFixed(1)}s`);
        if (remaining < node.timeLimitMs * 0.3) bar.setFillStyle(COLORS.danger);
      },
    });

    const timeout = scene.time.delayedCall(node.timeLimitMs, () =>
      finish(node.defaultChoiceId ?? node.choices[0].id, true)
    );

    layer.add([prompt, barBg, bar, secs]);

    // Choice buttons
    const btnW = Math.min(520, width - 80);
    const startY = 250;
    node.choices.forEach((choice, i) => {
      const y = startY + i * 84;
      const btn = scene.add
        .rectangle(width / 2, y, btnW, 68, COLORS.panel)
        .setStrokeStyle(2, COLORS.panelStroke)
        .setInteractive({ useHandCursor: true });
      const label = scene.add
        .text(width / 2, y, choice.label, {
          fontFamily: FONT,
          fontSize: "20px",
          color: COLORS.text,
          align: "center",
          wordWrap: { width: btnW - 40 },
        })
        .setOrigin(0.5);

      btn.on("pointerover", () => btn.setFillStyle(COLORS.panelHover));
      btn.on("pointerout", () => btn.setFillStyle(COLORS.panel));
      btn.on("pointerdown", () => {
        sfx.tap();
        pop(scene, btn);
        scene.time.delayedCall(90, () => finish(choice.id, false));
      });
      layer.add([btn, label]);
    });

    function finish(choiceId: string, timedOut: boolean) {
      if (done) return;
      done = true;
      barTween.stop();
      tick.remove();
      timeout.remove();
      layer.destroy(true);
      resolve({ choiceId, msElapsed: Math.round(performance.now() - startedAt), timedOut });
    }
  });
}
