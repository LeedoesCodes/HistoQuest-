import Phaser from "phaser";
import type { CharacterNode } from "../content/types";
import { COLORS, FONT } from "../ui/theme";
import { L, t } from "../i18n";

/**
 * Character introduction card — the cinematic "who is this person" beat.
 *
 * The visible historicity tag ("Tunay na tao sa kasaysayan" / "Likhang tauhan")
 * is the important part: pupils see, on every character, whether that person
 * really existed. That is a continuous honesty signal and it quietly teaches
 * children to ask how we know things — better than one skippable disclaimer.
 *
 * `node.image` is unused until art exists; the portrait is a placeholder plate
 * with a slow zoom so the card still feels cinematic.
 */
export function playCharacter(scene: Phaser.Scene, node: CharacterNode): Promise<void> {
  return new Promise((resolve) => {
    const { width, height } = scene.scale;
    const layer = scene.add.container(0, 0).setDepth(18);
    const isReal = node.historicity === "real";

    // --- Portrait placeholder (slow Ken Burns zoom) ---
    const portraitX = 150;
    const portraitY = height / 2 - 30;
    const plate = scene.add
      .rectangle(portraitX, portraitY, 180, 220, COLORS.panel)
      .setStrokeStyle(3, isReal ? COLORS.accent : 0x8e7cc3);
    const head = scene.add.circle(portraitX, portraitY - 34, 40, 0xe8c9a0);
    const body = scene.add.rectangle(portraitX, portraitY + 62, 104, 84, isReal ? 0x8d6e63 : 0x5c6bc0);
    const portrait = scene.add.container(0, 0, [plate, head, body]);
    scene.tweens.add({
      targets: [plate, head, body],
      scale: 1.06,
      duration: 5000,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });

    // --- Name + role ---
    const textX = 280;
    const name = scene.add
      .text(textX, portraitY - 110, L(node.name), {
        fontFamily: FONT,
        fontSize: "32px",
        color: COLORS.text,
        fontStyle: "bold",
        wordWrap: { width: width - textX - 40 },
      })
      .setOrigin(0, 0);

    const role = scene.add
      .text(textX, portraitY - 68, L(node.role), {
        fontFamily: FONT,
        fontSize: "17px",
        color: COLORS.accentText,
        wordWrap: { width: width - textX - 40 },
      })
      .setOrigin(0, 0);

    // --- Historicity tag (the honesty signal) ---
    const tagText = t(isReal ? "char.real" : "char.fictional");
    const tagLabel = scene.add
      .text(0, 0, tagText, {
        fontFamily: FONT,
        fontSize: "12px",
        color: isReal ? "#ffd54a" : "#c7bce8",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    const tagBg = scene.add
      .rectangle(textX, portraitY - 34, tagLabel.width + 20, 24, isReal ? 0x3a3016 : 0x2c2545)
      .setStrokeStyle(1, isReal ? COLORS.accent : 0x8e7cc3)
      .setOrigin(0, 0.5);
    tagLabel.setPosition(textX + 10, portraitY - 34);

    layer.add([portrait, name, role, tagBg, tagLabel]);

    // --- Background / goal lines, revealed one by one ---
    const lines = node.lines.map((line, i) => {
      const txt = scene.add
        .text(textX, portraitY + 8 + i * 46, L(line), {
          fontFamily: FONT,
          fontSize: "16px",
          color: COLORS.text,
          wordWrap: { width: width - textX - 40 },
          lineSpacing: 4,
        })
        .setOrigin(0, 0)
        .setAlpha(0);
      scene.tweens.add({ targets: txt, alpha: 1, x: textX, duration: 420, delay: 260 + i * 340 });
      txt.x = textX - 14;
      layer.add(txt);
      return txt;
    });

    const hint = scene.add
      .text(width - 40, height - 30, t("story.continue"), {
        fontFamily: FONT,
        fontSize: "13px",
        color: COLORS.textMuted,
      })
      .setOrigin(1, 0.5)
      .setAlpha(0);
    scene.tweens.add({ targets: hint, alpha: 1, duration: 400, delay: 300 + lines.length * 340 });
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
