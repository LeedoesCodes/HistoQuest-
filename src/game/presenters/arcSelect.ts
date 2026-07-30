import Phaser from "phaser";
import type { ArcId, Language, LocalizedText } from "@shared/types";
import { getArcContent } from "../content";
import { COLORS, FONT } from "../ui/theme";
import { pop } from "../ui/juice";
import { makeButton } from "../ui/panel";
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
        const { container: card, zone } = makeButton(scene, width / 2, y, cardW, 88, { radius: 14 });
        const title = scene.add
          .text(-cardW / 2 + 24, -16, L(getArcContent(arc.id).title), {
            fontFamily: FONT,
            fontSize: "23px",
            color: COLORS.text,
            fontStyle: "bold",
          })
          .setOrigin(0, 0.5);
        const sub = scene.add
          .text(-cardW / 2 + 24, 16, L(arc.subtitle), {
            fontFamily: FONT,
            fontSize: "14px",
            color: COLORS.textMuted,
          })
          .setOrigin(0, 0.5);
        card.add([title, sub]);
        layer.add(card);

        zone.on("pointerdown", () => {
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
        const x = width / 2 - 80 + i * 110 + 45;
        const { container: btn, zone, setActive } = makeButton(scene, x, toggleY, 100, 34, { radius: 8 });
        setActive(active);
        const label = scene.add
          .text(0, 0, lang.label, {
            fontFamily: FONT,
            fontSize: "14px",
            color: active ? COLORS.accentText : COLORS.textMuted,
            fontStyle: active ? "bold" : "normal",
          })
          .setOrigin(0.5);
        btn.add(label);
        zone.on("pointerdown", () => {
          if (settled || getLanguage() === lang.id) return;
          sfx.tap();
          setLanguage(lang.id);
          render(); // rebuild this screen in the new language
        });
        zone.setData("lang", lang.id); // for tests
        layer.add(btn);
      });
    };

    render();
  });
}
