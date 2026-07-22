import Phaser from "phaser";
import type { StoryNode } from "../content/types";
import { COLORS, FONT } from "../ui/theme";

/**
 * Reusable story presenter — a narrated beat shown in a bottom text panel,
 * with an optional illustration behind it. Resolves when the pupil advances
 * (click / tap / Space / Enter). Used by all three arcs.
 *
 * Later: draw `node.image` and play `node.vo` audio here — the call sites and
 * the returned Promise stay the same.
 */
export function playStory(scene: Phaser.Scene, node: StoryNode): Promise<void> {
  return new Promise((resolve) => {
    const { width, height } = scene.scale;
    const layer = scene.add.container(0, 0).setDepth(10);

    const boxH = 190;
    const boxY = height - boxH / 2 - 20;

    const box = scene.add
      .rectangle(width / 2, boxY, width - 40, boxH, COLORS.panel, 0.96)
      .setStrokeStyle(2, COLORS.panelStroke);

    const text = scene.add
      .text(40, boxY - boxH / 2 + 22, node.text, {
        fontFamily: FONT,
        fontSize: "20px",
        color: COLORS.text,
        wordWrap: { width: width - 100 },
        lineSpacing: 6,
      })
      .setOrigin(0, 0);

    const hint = scene.add
      .text(width - 50, boxY + boxH / 2 - 22, "▶  Pindutin para magpatuloy", {
        fontFamily: FONT,
        fontSize: "14px",
        color: COLORS.textMuted,
      })
      .setOrigin(1, 0.5);

    // Gentle blink on the hint so kids know to tap.
    const blink = scene.tweens.add({
      targets: hint,
      alpha: 0.35,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    layer.add([box, text, hint]);

    const cleanup = () => {
      blink.stop();
      scene.input.keyboard?.off("keydown-SPACE", advance);
      scene.input.keyboard?.off("keydown-ENTER", advance);
      layer.destroy(true);
    };
    const advance = () => {
      cleanup();
      resolve();
    };

    scene.input.once("pointerdown", advance);
    scene.input.keyboard?.once("keydown-SPACE", advance);
    scene.input.keyboard?.once("keydown-ENTER", advance);
  });
}
