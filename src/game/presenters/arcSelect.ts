import Phaser from "phaser";
import type { ArcId } from "@shared/types";
import { COLORS, FONT } from "../ui/theme";
import { pop } from "../ui/juice";
import { sfx } from "../ui/sfx";

const ARCS: { id: ArcId; title: string; subtitle: string }[] = [
  { id: "mactan", title: "Labanan sa Mactan", subtitle: "Lapu-Lapu, 1521" },
  { id: "pugad_lawin", title: "Sigaw sa Pugad Lawin", subtitle: "Andres Bonifacio, 1896" },
  { id: "datu_bago", title: "Paglaban ni Datu Bago", subtitle: "Davao del Norte" },
];

/**
 * Arc-select presenter. This was originally its own Phaser Scene; it is a
 * presenter now so the whole game lives in one scene (see GameScene) and the
 * flow reads as a simple sequence: select an arc, play it, return here.
 * Resolves with the chosen arc.
 */
export function playArcSelect(scene: Phaser.Scene): Promise<ArcId> {
  return new Promise((resolve) => {
    const { width } = scene.scale;
    const layer = scene.add.container(0, 0).setDepth(5);

    layer.add([
      scene.add
        .text(width / 2, 60, "BasaQuest", {
          fontFamily: FONT,
          fontSize: "44px",
          color: COLORS.accentText,
          fontStyle: "bold",
        })
        .setOrigin(0.5),
      scene.add
        .text(width / 2, 108, "Pumili ng Kabanata sa Kasaysayan", {
          fontFamily: FONT,
          fontSize: "18px",
          color: COLORS.text,
        })
        .setOrigin(0.5),
    ]);

    ARCS.forEach((arc, i) => {
      const y = 180 + i * 120;
      const cardW = Math.min(520, width - 60);
      const card = scene.add
        .rectangle(width / 2, y, cardW, 96, COLORS.panel)
        .setStrokeStyle(2, COLORS.panelStroke)
        .setInteractive({ useHandCursor: true });
      const title = scene.add
        .text(width / 2 - cardW / 2 + 24, y - 20, arc.title, {
          fontFamily: FONT,
          fontSize: "24px",
          color: COLORS.text,
          fontStyle: "bold",
        })
        .setOrigin(0, 0.5);
      const sub = scene.add
        .text(width / 2 - cardW / 2 + 24, y + 16, arc.subtitle, {
          fontFamily: FONT,
          fontSize: "15px",
          color: COLORS.textMuted,
        })
        .setOrigin(0, 0.5);

      card.on("pointerover", () => card.setFillStyle(COLORS.panelHover));
      card.on("pointerout", () => card.setFillStyle(COLORS.panel));
      card.on("pointerdown", () => {
        sfx.tap();
        pop(scene, card);
        scene.game.events.emit("arc-selected", arc.id);
        scene.time.delayedCall(140, () => {
          layer.destroy(true);
          resolve(arc.id);
        });
      });

      layer.add([card, title, sub]);
    });
  });
}
