import Phaser from "phaser";
import type { TitleCardNode } from "../content/types";
import { COLORS, FONT } from "../ui/theme";
import { L, t } from "../i18n";

/**
 * Cinematic opening card — place, year, and the "based on real events" note.
 *
 * The note is deliberately quiet and film-like rather than a legal-looking
 * disclaimer. It is only one of three honesty mechanisms; the character cards
 * (real vs. fictional tags) and the closing "Alam Mo Ba?" card carry more of
 * the weight because pupils actually read those.
 */
export function playTitleCard(scene: Phaser.Scene, node: TitleCardNode): Promise<void> {
  return new Promise((resolve) => {
    const { width, height } = scene.scale;
    const layer = scene.add.container(0, 0).setDepth(18);

    const place = scene.add
      .text(width / 2, height / 2 - 40, L(node.place).toUpperCase(), {
        fontFamily: FONT,
        fontSize: "40px",
        color: COLORS.text,
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: width - 100 },
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const year = scene.add
      .text(width / 2, height / 2 + 10, node.year, {
        fontFamily: FONT,
        fontSize: "26px",
        color: COLORS.accentText,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Thin rules above/below, like a film title card.
    const ruleTop = scene.add.rectangle(width / 2, height / 2 - 84, 0, 2, COLORS.panelStroke);
    const ruleBottom = scene.add.rectangle(width / 2, height / 2 + 46, 0, 2, COLORS.panelStroke);

    const note = scene.add
      .text(width / 2, height - 70, t("titlecard.dramatised"), {
        fontFamily: FONT,
        fontSize: "13px",
        color: COLORS.textMuted,
        align: "center",
        wordWrap: { width: width - 140 },
        lineSpacing: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const hint = scene.add
      .text(width / 2, height - 26, t("story.continue"), {
        fontFamily: FONT,
        fontSize: "13px",
        color: COLORS.textMuted,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    layer.add([ruleTop, ruleBottom, place, year, note, hint]);

    // Fade the card up in sequence, then let the pupil advance.
    scene.tweens.add({ targets: place, alpha: 1, duration: 500, ease: "Quad.easeOut" });
    scene.tweens.add({ targets: [ruleTop, ruleBottom], width: 320, duration: 700, delay: 200, ease: "Quad.easeOut" });
    scene.tweens.add({ targets: year, alpha: 1, duration: 400, delay: 500 });
    scene.tweens.add({ targets: note, alpha: 1, duration: 500, delay: 900 });
    scene.tweens.add({ targets: hint, alpha: 1, duration: 400, delay: 1300 });

    const advance = () => {
      scene.input.keyboard?.off("keydown-SPACE", advance);
      layer.destroy(true);
      resolve();
    };
    scene.input.once("pointerdown", advance);
    scene.input.keyboard?.once("keydown-SPACE", advance);
  });
}
