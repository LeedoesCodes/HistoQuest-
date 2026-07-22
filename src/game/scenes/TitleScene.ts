import Phaser from "phaser";
import type { ArcId } from "@shared/types";

const ARCS: { id: ArcId; title: string; subtitle: string }[] = [
  { id: "mactan", title: "Labanan sa Mactan", subtitle: "Lapu-Lapu, 1521" },
  { id: "pugad_lawin", title: "Sigaw sa Pugad Lawin", subtitle: "Andres Bonifacio, 1896" },
  { id: "datu_bago", title: "Paglaban ni Datu Bago", subtitle: "Davao del Norte" },
];

/**
 * TitleScene — arc selection. This is a placeholder layout to prove the
 * canvas + input works end to end. We replace the rectangles with real
 * art once assets land; the arc-select FLOW stays the same.
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create() {
    const { width } = this.scale;

    this.add
      .text(width / 2, 60, "BasaQuest", {
        fontFamily: "sans-serif",
        fontSize: "44px",
        color: "#ffd54a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 108, "Pumili ng Kabanata sa Kasaysayan", {
        fontFamily: "sans-serif",
        fontSize: "18px",
        color: "#e8e8e8",
      })
      .setOrigin(0.5);

    ARCS.forEach((arc, i) => this.addArcCard(arc, 180 + i * 120));
  }

  private addArcCard(arc: { id: ArcId; title: string; subtitle: string }, y: number) {
    const { width } = this.scale;
    const cardW = Math.min(520, width - 60);
    const cardX = width / 2;

    const card = this.add
      .rectangle(cardX, y, cardW, 96, 0x1f2a44)
      .setStrokeStyle(2, 0x3d5a99)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(cardX - cardW / 2 + 24, y - 20, arc.title, {
        fontFamily: "sans-serif",
        fontSize: "24px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    this.add
      .text(cardX - cardW / 2 + 24, y + 16, arc.subtitle, {
        fontFamily: "sans-serif",
        fontSize: "15px",
        color: "#a9b7d6",
      })
      .setOrigin(0, 0.5);

    card.on("pointerover", () => card.setFillStyle(0x27365a));
    card.on("pointerout", () => card.setFillStyle(0x1f2a44));
    card.on("pointerdown", () => {
      // Later: this.scene.start("Arc", { arc: arc.id })
      this.game.events.emit("arc-selected", arc.id);
    });
  }
}
