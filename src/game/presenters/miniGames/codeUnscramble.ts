import Phaser from "phaser";
import type { MiniGameNode, MiniGameResult } from "../../content/types";
import { COLORS, FONT } from "../../ui/theme";

/**
 * Code-unscramble mini-game (Pugad Lawin arc).
 *
 * History: the Katipuneros used coded phrases to communicate secretly. Here the
 * pupil reassembles an intercepted "secret message" by tapping scrambled word
 * tiles into the right order. Tap a pool tile to place it; tap a placed tile to
 * take it back. When all slots are filled it auto-checks.
 *
 * `attempts` (wrong checks + the winning one) feeds the classifier.
 */

// The message to decode (word order = the answer). Kept short for Grade 5.
const TARGET_WORDS = ["Mabuhay", "ang", "mga", "Katipunero"];

interface Tile {
  id: number;
  word: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function playCodeUnscramble(
  scene: Phaser.Scene,
  _node: MiniGameNode
): Promise<MiniGameResult> {
  return new Promise((resolve) => {
    const { width, height } = scene.scale;
    const startedAt = performance.now();
    let attempts = 0;
    let done = false;
    let locked = false; // blocks input during check/feedback animations

    const targetStr = TARGET_WORDS.join(" ");
    const allTiles: Tile[] = TARGET_WORDS.map((word, id) => ({ id, word }));
    const poolOrder = shuffle(allTiles).map((t) => t.id);

    const answer: number[] = []; // tile ids, in placed order
    const pool: number[] = [...poolOrder]; // tile ids still available

    const layer = scene.add.container(0, 0).setDepth(10);

    // Static UI (instruction, subtitle, feedback) lives in its OWN container so
    // the per-render layer can be rebuilt without it, and it is cleaned up when
    // the mini-game ends (otherwise it leaks onto the next scene).
    const staticLayer = scene.add.container(0, 0).setDepth(11);
    const feedback = scene.add
      .text(width / 2, height - 40, "", { fontFamily: FONT, fontSize: "16px", color: "#e4572e" })
      .setOrigin(0.5);
    staticLayer.add([
      scene.add
        .text(width / 2, 70, "Ayusin ang lihim na mensahe ng mga Katipunero!", {
          fontFamily: FONT,
          fontSize: "20px",
          color: COLORS.text,
          fontStyle: "bold",
          align: "center",
          wordWrap: { width: width - 80 },
        })
        .setOrigin(0.5),
      scene.add
        .text(width / 2, 100, "Pindutin ang mga salita sa tamang pagkakasunod.", {
          fontFamily: FONT,
          fontSize: "14px",
          color: COLORS.textMuted,
        })
        .setOrigin(0.5),
      feedback,
    ]);

    const wordOf = (id: number) => allTiles[id].word;
    const tileWidth = (word: string) => Math.max(70, word.length * 15 + 30);

    const render = () => {
      layer.removeAll(true);
      const answerY = 200;
      const poolY = 330;

      // --- Answer slots (placed words) ---
      const answerWidths = answer.map((id) => tileWidth(wordOf(id)));
      const slotEmpty = TARGET_WORDS.length - answer.length;
      const totalAnswerW =
        answerWidths.reduce((a, b) => a + b, 0) + slotEmpty * 90 + (TARGET_WORDS.length - 1) * 10;
      let ax = width / 2 - totalAnswerW / 2;

      answer.forEach((id) => {
        const w = tileWidth(wordOf(id));
        const tile = scene.add
          .rectangle(ax + w / 2, answerY, w, 48, COLORS.panelHover)
          .setStrokeStyle(2, COLORS.accent)
          .setInteractive({ useHandCursor: true });
        const label = scene.add
          .text(ax + w / 2, answerY, wordOf(id), { fontFamily: FONT, fontSize: "18px", color: COLORS.text })
          .setOrigin(0.5);
        tile.on("pointerdown", () => {
          if (locked) return;
          // return this tile to the pool
          answer.splice(answer.indexOf(id), 1);
          pool.push(id);
          feedback.setText("");
          render();
        });
        layer.add([tile, label]);
        ax += w + 10;
      });
      // empty slots
      for (let i = 0; i < slotEmpty; i++) {
        const slot = scene.add
          .rectangle(ax + 45, answerY, 90, 48, 0x0e1524)
          .setStrokeStyle(2, COLORS.panelStroke, 0.6);
        layer.add([slot]);
        ax += 90 + 10;
      }

      // --- Pool tiles (available words) ---
      const poolWidths = pool.map((id) => tileWidth(wordOf(id)));
      const totalPoolW = poolWidths.reduce((a, b) => a + b, 0) + (pool.length - 1) * 12;
      let px = width / 2 - totalPoolW / 2;
      pool.forEach((id) => {
        const w = tileWidth(wordOf(id));
        const tile = scene.add
          .rectangle(px + w / 2, poolY, w, 48, COLORS.panel)
          .setStrokeStyle(2, COLORS.panelStroke)
          .setInteractive({ useHandCursor: true });
        const label = scene.add
          .text(px + w / 2, poolY, wordOf(id), { fontFamily: FONT, fontSize: "18px", color: COLORS.text })
          .setOrigin(0.5);
        tile.on("pointerover", () => tile.setFillStyle(COLORS.panelHover));
        tile.on("pointerout", () => tile.setFillStyle(COLORS.panel));
        tile.on("pointerdown", () => {
          if (locked) return;
          pool.splice(pool.indexOf(id), 1);
          answer.push(id);
          feedback.setText("");
          render();
          if (answer.length === TARGET_WORDS.length) check();
        });
        layer.add([tile, label]);
        px += w + 12;
      });
    };

    const check = () => {
      const assembled = answer.map(wordOf).join(" ");
      if (assembled === targetStr) {
        success();
      } else {
        attempts++;
        locked = true;
        feedback.setColor("#e4572e").setText("Mali ang code! Subukan mong muli.");
        scene.time.delayedCall(900, () => {
          // return everything to the pool and let them retry
          while (answer.length) pool.push(answer.pop()!);
          locked = false;
          render();
        });
      }
    };

    const success = () => {
      if (done) return;
      done = true;
      attempts++;
      locked = true;
      layer.destroy(true);
      staticLayer.destroy(true);

      const winLayer = scene.add.container(0, 0).setDepth(12);
      winLayer.add([
        scene.add
          .text(width / 2, height / 2 - 20, "Na-decode mo ang mensahe!", {
            fontFamily: FONT,
            fontSize: "24px",
            color: COLORS.text,
            fontStyle: "bold",
          })
          .setOrigin(0.5),
        scene.add
          .text(width / 2, height / 2 + 24, `“${targetStr}!”`, {
            fontFamily: FONT,
            fontSize: "20px",
            color: COLORS.accentText,
          })
          .setOrigin(0.5),
      ]);

      scene.time.delayedCall(1100, () => {
        winLayer.destroy(true);
        resolve({ score: 1, attempts, msSpent: Math.round(performance.now() - startedAt) });
      });
    };

    render();
  });
}
