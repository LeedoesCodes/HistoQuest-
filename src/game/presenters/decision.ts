import Phaser from "phaser";
import type { DecisionNode, DecisionResult } from "../content/types";
import { COLORS, FONT } from "../ui/theme";
import { pop } from "../ui/juice";
import { makeButton } from "../ui/panel";
import { sfx } from "../ui/sfx";
import { L } from "../i18n";

/**
 * Reusable timed-decision presenter. Shows a prompt, a shrinking countdown
 * bar, and the choices. The pupil picks within `timeLimitMs`; if the timer
 * expires we auto-pick `defaultChoiceId` (or the first choice) and flag it
 * timed out. Resolves with { choiceId, msElapsed, timedOut } — exactly the
 * fields the engagement classifier reads.
 */
export function playDecision(scene: Phaser.Scene, node: DecisionNode): Promise<DecisionResult> {
  return new Promise((resolve) => {
    const { width, height } = scene.scale;
    const layer = scene.add.container(0, 0).setDepth(10);
    const startedAt = performance.now();
    let done = false;

    // Dim the backdrop so the prompt + choices read clearly over any scene.
    layer.add(scene.add.rectangle(width / 2, height / 2, width, height, 0x0a0f1c, 0.5));

    // Prompt
    const prompt = scene.add
      .text(width / 2, 60, L(node.prompt), {
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
      const { container: btn, zone } = makeButton(scene, width / 2, y, btnW, 68);
      const label = scene.add
        .text(0, 0, L(choice.label), {
          fontFamily: FONT,
          fontSize: "20px",
          color: COLORS.text,
          align: "center",
          wordWrap: { width: btnW - 40 },
        })
        .setOrigin(0.5);
      btn.add(label);
      layer.add(btn);

      zone.on("pointerdown", () => {
        if (done) return;
        sfx.tap();
        pop(scene, btn);
        // Show the in-character reply so the choice registers as meaningful,
        // then continue. Every path still converges on the same history.
        if (choice.response) {
          showResponse(L(choice.response), () => finish(choice.id, false));
        } else {
          scene.time.delayedCall(90, () => finish(choice.id, false));
        }
      });
    });

    /** Brief in-character reply after a choice, then continue. */
    function showResponse(text: string, then: () => void) {
      barTween.stop();
      tick.remove();
      timeout.remove();
      layer.removeAll(true);
      const reply = scene.add
        .text(scene.scale.width / 2, 250, `“${text}”`, {
          fontFamily: FONT,
          fontSize: "22px",
          color: COLORS.accentText,
          align: "center",
          wordWrap: { width: scene.scale.width - 120 },
          lineSpacing: 6,
        })
        .setOrigin(0.5)
        .setAlpha(0);
      layer.add(reply);
      scene.tweens.add({ targets: reply, alpha: 1, duration: 260 });
      scene.time.delayedCall(1500, then);
    }

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
