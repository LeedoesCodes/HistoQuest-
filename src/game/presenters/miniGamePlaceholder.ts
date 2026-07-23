import Phaser from "phaser";
import type { MiniGameNode, MiniGameResult } from "../content/types";
import { COLORS, FONT } from "../ui/theme";
import { L, t } from "../i18n";

/**
 * Placeholder for arc-specific mini-games (Mactan defense, cedula-tear,
 * recruitment, code-unscramble, Datu Bago defense). Each real mini-game
 * replaces this for its `key`, but must resolve with the same shape so the
 * ArcScene loop and the behavior log stay unchanged.
 */
export function playMiniGamePlaceholder(
  scene: Phaser.Scene,
  node: MiniGameNode
): Promise<MiniGameResult> {
  return new Promise((resolve) => {
    const { width, height } = scene.scale;
    const startedAt = performance.now();
    const layer = scene.add.container(0, 0).setDepth(10);

    const title = scene.add
      .text(width / 2, height / 2 - 70, t("mg.placeholder.title", { title: L(node.title) }), {
        fontFamily: FONT,
        fontSize: "26px",
        color: COLORS.text,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const note = scene.add
      .text(width / 2, height / 2 - 20, t("mg.placeholder.note"), {
        fontFamily: FONT,
        fontSize: "15px",
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    const btn = scene.add
      .rectangle(width / 2, height / 2 + 60, 300, 60, COLORS.success)
      .setInteractive({ useHandCursor: true });
    const btnText = scene.add
      .text(width / 2, height / 2 + 60, t("mg.placeholder.finish"), {
        fontFamily: FONT,
        fontSize: "18px",
        color: "#0a0f1c",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    layer.add([title, note, btn, btnText]);

    btn.on("pointerdown", () => {
      layer.destroy(true);
      resolve({ score: 1, attempts: 1, msSpent: Math.round(performance.now() - startedAt) });
    });
  });
}
