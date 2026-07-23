import Phaser from "phaser";
import type { DidYouKnowNode } from "../content/types";
import { COLORS, FONT } from "../ui/theme";
import { L, t } from "../i18n";

/**
 * Closing "Alam Mo Ba?" card — separates what is documented from what was
 * dramatised, in language a Grade 5 pupil can read.
 *
 * This does double duty: it is the strongest of the three honesty mechanisms
 * (pupils actually read it, unlike a disclaimer), AND it reinforces the arc's
 * key facts immediately before the post-assessment.
 */
export function playDidYouKnow(scene: Phaser.Scene, node: DidYouKnowNode): Promise<void> {
  return new Promise((resolve) => {
    const { width, height } = scene.scale;
    const layer = scene.add.container(0, 0).setDepth(18);

    layer.add(
      scene.add
        .text(width / 2, 46, t("dyk.title"), {
          fontFamily: FONT,
          fontSize: "30px",
          color: COLORS.accentText,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
    );

    let y = 108;

    const section = (
      heading: string,
      items: string[],
      color: number,
      textColor: string,
      bullet: string
    ) => {
      const head = scene.add
        .text(46, y, heading, { fontFamily: FONT, fontSize: "18px", color: textColor, fontStyle: "bold" })
        .setOrigin(0, 0);
      layer.add(head);
      y += 30;

      items.forEach((item, i) => {
        const dot = scene.add
          .text(52, y + 1, bullet, { fontFamily: FONT, fontSize: "15px", color: textColor })
          .setOrigin(0, 0);
        const txt = scene.add
          .text(76, y, item, {
            fontFamily: FONT,
            fontSize: "15px",
            color: COLORS.text,
            wordWrap: { width: width - 130 },
            lineSpacing: 3,
          })
          .setOrigin(0, 0)
          .setAlpha(0);
        dot.setAlpha(0);
        scene.tweens.add({ targets: [txt, dot], alpha: 1, duration: 320, delay: 180 + i * 220 });
        layer.add([dot, txt]);
        y += txt.height + 12;
      });

      // Left accent rule for the section.
      const rule = scene.add.rectangle(38, head.y + 6, 3, y - head.y - 10, color).setOrigin(0, 0);
      layer.add(rule);
      y += 16;
    };

    section(t("dyk.real"), node.real.map(L), 0x8bc34a, "#9ccc9c", "✓");
    section(t("dyk.invented"), node.invented.map(L), 0xffd54a, "#ffd54a", "✎");

    const hint = scene.add
      .text(width - 40, height - 26, t("story.continue"), {
        fontFamily: FONT,
        fontSize: "13px",
        color: COLORS.textMuted,
      })
      .setOrigin(1, 0.5);
    layer.add(hint);

    const advance = () => {
      scene.input.keyboard?.off("keydown-SPACE", advance);
      layer.destroy(true);
      resolve();
    };
    scene.input.once("pointerdown", advance);
    scene.input.keyboard?.once("keydown-SPACE", advance);
  });
}
