import Phaser from "phaser";
import type { StoryNode } from "../content/types";
import { COLORS, FONT } from "../ui/theme";
import { L, t } from "../i18n";
import { sfx } from "../ui/sfx";
import { makePanel } from "../ui/panel";
import { hasImage } from "../assets/images";

/**
 * Reusable story presenter — a narrated beat in a bottom text panel.
 *
 * Two things worth knowing:
 *
 * 1. The panel is sized to its text. It used to be a fixed 190px, which made
 *    longer beats spill out of the box and collide with the hint.
 *
 * 2. The text types itself in. To avoid words visibly jumping as they wrap, we
 *    pre-wrap the whole string first (getWrappedText) and then reveal
 *    characters of the ALREADY-wrapped result — so the layout never reflows
 *    mid-animation. Tapping once completes the line instantly; tapping again
 *    advances. Impatient readers are never forced to wait.
 */

const CHARS_PER_TICK = 2; // ~125 chars/sec at 60fps — fast, per Lee's preference
const TICK_MS = 16;
/**
 * Characters between key sounds. Text reveals far faster than anyone can type,
 * so we deliberately DON'T play a press per character — that machine-guns. This
 * range lands roughly 10–15 presses/sec, about the cadence of fast real typing.
 */
const SOUND_GAP_MIN = 8;
const SOUND_GAP_MAX = 13;

const PADDING_X = 24;
const PADDING_TOP = 20;
const HINT_ROW = 30; // reserved strip at the panel bottom for the hint

export function playStory(scene: Phaser.Scene, node: StoryNode): Promise<void> {
  return new Promise((resolve) => {
    const { width, height } = scene.scale;
    const layer = scene.add.container(0, 0).setDepth(10);
    const full = L(node.text);

    // Optional per-beat illustration, sitting above the arc backdrop but below
    // the text panel. Absent for most beats — the arc backdrop shows through.
    if (hasImage(node.image) && scene.textures.exists(node.image)) {
      const art = scene.add.image(width / 2, height / 2, node.image).setDepth(1);
      art.setScale(Math.max(width / art.width, height / art.height));
      art.setAlpha(0);
      scene.tweens.add({ targets: art, alpha: 1, duration: 320 });
      layer.add(art);
    }

    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: FONT,
      fontSize: "20px",
      color: COLORS.text,
      wordWrap: { width: width - 40 - PADDING_X * 2 },
      lineSpacing: 6,
    };

    // Measure first: build the text, pre-wrap it, and size the panel to fit.
    const text = scene.add.text(0, 0, full, style).setOrigin(0, 0);
    const wrapped = text.getWrappedText(full).join("\n");
    text.setText(wrapped);
    const textHeight = text.height;

    const maxPanelH = height - 150;
    const panelH = Math.min(maxPanelH, textHeight + PADDING_TOP + HINT_ROW + 12);
    if (import.meta.env.DEV && textHeight + PADDING_TOP + HINT_ROW + 12 > maxPanelH) {
      console.warn(`[story] beat "${node.id}" is too long for one panel — split it.`);
    }

    const panelY = height - panelH / 2 - 20;
    const box = makePanel(scene, width / 2, panelY, width - 40, panelH);

    text.setPosition(20 + PADDING_X, panelY - panelH / 2 + PADDING_TOP);
    text.setText(""); // start empty; the typewriter fills it

    const hint = scene.add
      .text(width - 20 - PADDING_X, panelY + panelH / 2 - HINT_ROW / 2, t("story.continue"), {
        fontFamily: FONT,
        fontSize: "14px",
        color: COLORS.textMuted,
      })
      .setOrigin(1, 0.5)
      .setAlpha(0);

    layer.add([box, text, hint]);

    // --- Speaker portrait: pops in with a shake + sound when set ---
    if (node.speaker && hasImage(node.speaker.image) && scene.textures.exists(node.speaker.image)) {
      const sp = node.speaker;
      const side = sp.side ?? "left";
      const panelTop = panelY - panelH / 2;
      const portraitH = Math.min(panelTop - 14, 330);
      const sx = side === "left" ? 132 : width - 132;

      const spLayer = scene.add.container(sx, 0).setDepth(9);
      const img = scene.add.image(0, panelTop + 6, sp.image).setOrigin(0.5, 1);
      img.setScale(portraitH / img.height);
      const nameTxt = scene.add
        .text(0, panelTop - 2, L(sp.name), { fontFamily: FONT, fontSize: "15px", color: "#0a0f1c", fontStyle: "bold" })
        .setOrigin(0.5, 1);
      const nameBg = scene.add
        .rectangle(0, panelTop - 1, nameTxt.width + 20, 24, COLORS.accent, 0.95)
        .setStrokeStyle(2, 0x8a6d3b)
        .setOrigin(0.5, 1);
      spLayer.add([img, nameBg, nameTxt]);
      layer.add(spLayer);

      // Pop in from just below, then a quick shake — the "they're speaking" beat.
      spLayer.setAlpha(0).setScale(0.9);
      spLayer.y = 26;
      sfx.voice();
      scene.tweens.add({
        targets: spLayer,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        y: 0,
        duration: 260,
        ease: "Back.easeOut",
        onComplete: () => {
          scene.tweens.add({ targets: spLayer, x: sx + 5, duration: 45, yoyo: true, repeat: 3, onComplete: () => (spLayer.x = sx) });
        },
      });
    }

    // --- Typewriter ---
    let revealed = 0;
    let complete = false;
    let blink: Phaser.Tweens.Tween | null = null;

    const finishTyping = () => {
      if (complete) return;
      complete = true;
      typer.remove();
      text.setText(wrapped);
      hint.setAlpha(1);
      blink = scene.tweens.add({
        targets: hint,
        alpha: 0.35,
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
    };

    const nextGap = () =>
      SOUND_GAP_MIN + Math.floor(Math.random() * (SOUND_GAP_MAX - SOUND_GAP_MIN + 1));
    let sinceSound = 0;
    let soundGap = nextGap();

    const typer = scene.time.addEvent({
      delay: TICK_MS,
      loop: true,
      callback: () => {
        const from = revealed;
        revealed = Math.min(wrapped.length, revealed + CHARS_PER_TICK);
        const chunk = wrapped.slice(from, revealed);
        text.setText(wrapped.slice(0, revealed));

        sinceSound += chunk.length;
        if (sinceSound >= soundGap) {
          sinceSound = 0;
          soundGap = nextGap();
          // A word gap gets the deeper spacebar; everything else a letter key.
          if (/[ \n]/.test(chunk)) sfx.keySpace();
          else sfx.key();
        }

        if (revealed >= wrapped.length) finishTyping();
      },
    });

    // --- Input: first tap skips the animation, second advances ---
    const onInput = () => {
      if (!complete) {
        finishTyping();
        return;
      }
      cleanup();
      resolve();
    };

    const cleanup = () => {
      typer.remove();
      blink?.stop();
      scene.input.off("pointerdown", onInput);
      scene.input.keyboard?.off("keydown-SPACE", onInput);
      scene.input.keyboard?.off("keydown-ENTER", onInput);
      layer.destroy(true);
    };

    scene.input.on("pointerdown", onInput);
    scene.input.keyboard?.on("keydown-SPACE", onInput);
    scene.input.keyboard?.on("keydown-ENTER", onInput);
  });
}
