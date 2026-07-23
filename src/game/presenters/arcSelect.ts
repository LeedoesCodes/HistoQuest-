import Phaser from "phaser";
import type { ArcId, Language, LocalizedText } from "@shared/types";
import { getArcContent } from "../content";
import { COLORS, FONT } from "../ui/theme";
import { pop } from "../ui/juice";
import { sfx } from "../ui/sfx";
import { L, t, getLanguage, setLanguage } from "../i18n";

/** Arc order on the menu, with a short historical subtitle for each. */
const ARCS: { id: ArcId; subtitle: LocalizedText }[] = [
  { id: "mactan", subtitle: { fil: "Lapu-Lapu, 1521", en: "Lapu-Lapu, 1521" } },
  { id: "pugad_lawin", subtitle: { fil: "Andres Bonifacio, 1896", en: "Andres Bonifacio, 1896" } },
  { id: "datu_bago", subtitle: { fil: "Davao del Norte", en: "Davao del Norte" } },
];

const LANGS: { id: Language; label: string }[] = [
  { id: "fil", label: "Filipino" },
  { id: "en", label: "English" },
];

/**
 * Arc-select presenter, including the language toggle. Switching language
 * rebuilds this screen in place, so the pupil immediately sees the effect
 * before committing to an arc. Resolves with the chosen arc.
 */
export function playArcSelect(scene: Phaser.Scene): Promise<ArcId> {
  return new Promise((resolve) => {
    const { width } = scene.scale;
    const layer = scene.add.container(0, 0).setDepth(5);
    let settled = false;

    const render = () => {
      layer.removeAll(true);

      layer.add([
        scene.add
          .text(width / 2, 54, "BasaQuest", {
            fontFamily: FONT,
            fontSize: "42px",
            color: COLORS.accentText,
            fontStyle: "bold",
          })
          .setOrigin(0.5),
        scene.add
          .text(width / 2, 98, t("app.subtitle"), {
            fontFamily: FONT,
            fontSize: "18px",
            color: COLORS.text,
          })
          .setOrigin(0.5),
      ]);

      // --- Arc cards ---
      ARCS.forEach((arc, i) => {
        const y = 168 + i * 108;
        const cardW = Math.min(520, width - 60);
        const card = scene.add
          .rectangle(width / 2, y, cardW, 88, COLORS.panel)
          .setStrokeStyle(2, COLORS.panelStroke)
          .setInteractive({ useHandCursor: true });
        const title = scene.add
          .text(width / 2 - cardW / 2 + 24, y - 16, L(getArcContent(arc.id).title), {
            fontFamily: FONT,
            fontSize: "23px",
            color: COLORS.text,
            fontStyle: "bold",
          })
          .setOrigin(0, 0.5);
        const sub = scene.add
          .text(width / 2 - cardW / 2 + 24, y + 16, L(arc.subtitle), {
            fontFamily: FONT,
            fontSize: "14px",
            color: COLORS.textMuted,
          })
          .setOrigin(0, 0.5);

        card.on("pointerover", () => card.setFillStyle(COLORS.panelHover));
        card.on("pointerout", () => card.setFillStyle(COLORS.panel));
        card.on("pointerdown", () => {
          if (settled) return;
          settled = true;
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

      // --- Language toggle ---
      const toggleY = 520;
      layer.add(
        scene.add
          .text(width / 2 - 108, toggleY, `${t("lang.label")}:`, {
            fontFamily: FONT,
            fontSize: "15px",
            color: COLORS.textMuted,
          })
          .setOrigin(1, 0.5)
      );
      LANGS.forEach((lang, i) => {
        const active = getLanguage() === lang.id;
        const x = width / 2 - 80 + i * 110;
        const btn = scene.add
          .rectangle(x + 45, toggleY, 100, 34, active ? COLORS.panelHover : COLORS.panel)
          .setStrokeStyle(2, active ? COLORS.accent : COLORS.panelStroke)
          .setInteractive({ useHandCursor: true });
        const label = scene.add
          .text(x + 45, toggleY, lang.label, {
            fontFamily: FONT,
            fontSize: "14px",
            color: active ? COLORS.accentText : COLORS.textMuted,
            fontStyle: active ? "bold" : "normal",
          })
          .setOrigin(0.5);
        btn.on("pointerdown", () => {
          if (settled || getLanguage() === lang.id) return;
          sfx.tap();
          setLanguage(lang.id);
          render(); // rebuild this screen in the new language
        });
        btn.setData("lang", lang.id); // for tests
        layer.add([btn, label]);
      });
    };

    render();
  });
}
