import Phaser from "phaser";
import type { CharacterNode } from "../content/types";
import { COLORS, FONT } from "../ui/theme";
import { L, t } from "../i18n";
import { hasImage } from "../assets/images";

/**
 * Character introduction card — the cinematic "who is this person" beat.
 *
 * The visible historicity tag ("Tunay na tao sa kasaysayan" / "Likhang tauhan")
 * is the important part: pupils see, on every character, whether that person
 * really existed. That is a continuous honesty signal and it quietly teaches
 * children to ask how we know things — better than one skippable disclaimer.
 *
 * `node.image` is drawn when that portrait has shipped; until then the card
 * falls back to a placeholder plate. Either way it gets a slow Ken Burns drift
 * so the beat feels cinematic rather than static.
 */
export function playCharacter(scene: Phaser.Scene, node: CharacterNode): Promise<void> {
  return new Promise((resolve) => {
    const { width, height } = scene.scale;
    const layer = scene.add.container(0, 0).setDepth(18);
    const isReal = node.historicity === "real";

    // Dim the arc backdrop so the portrait, name and bio always read clearly
    // over any scene (without art, the generated backdrop's sun/palm bled
    // through the text). Part of the layer, so it's cleaned up on exit.
    layer.add(scene.add.rectangle(width / 2, height / 2, width, height, 0x0a0f1c, 0.5));

    // --- Portrait: real art if it has shipped, placeholder plate if not ---
    const portraitX = 150;
    const portraitY = height / 2 - 30;
    const frameW = 180;
    const frameH = 220;
    const accent = isReal ? COLORS.accent : 0x8e7cc3;

    const portrait = scene.add.container(0, 0);
    const zoomTargets: Phaser.GameObjects.GameObject[] = [];

    if (hasImage(node.image) && scene.textures.exists(node.image)) {
      const img = scene.add.image(portraitX, portraitY, node.image);
      // Fit inside the frame without distorting the artwork.
      img.setScale(Math.min(frameW / img.width, frameH / img.height));
      const frame = scene.add
        .rectangle(portraitX, portraitY, frameW, frameH)
        .setStrokeStyle(3, accent);
      portrait.add([img, frame]);
      zoomTargets.push(img);
    } else {
      const plate = scene.add
        .rectangle(portraitX, portraitY, frameW, frameH, COLORS.panel)
        .setStrokeStyle(3, accent);
      const head = scene.add.circle(portraitX, portraitY - 34, 40, 0xe8c9a0);
      const body = scene.add.rectangle(portraitX, portraitY + 62, 104, 84, isReal ? 0x8d6e63 : 0x5c6bc0);
      portrait.add([plate, head, body]);
      zoomTargets.push(plate, head, body);
    }

    // Slow Ken Burns drift so the card feels cinematic even without art.
    scene.tweens.add({
      targets: zoomTargets,
      scale: (t: Phaser.GameObjects.Image) => (t.scale || 1) * 1.06,
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
