import Phaser from "phaser";
import type { MiniGameNode, MiniGameResult } from "../../content/types";
import { COLORS, FONT } from "../../ui/theme";
import { burst, shake } from "../../ui/juice";
import { sfx } from "../../ui/sfx";
import { t } from "../../i18n";

/**
 * Cedula-tear mini-game (Pugad Lawin arc).
 *
 * History: at Pugad Lawin the Katipuneros tore their cedulas — the Spanish
 * community-tax certificates — as a symbolic act of revolt. Here the pupil
 * performs that act: drag horizontally across the cedula to tear it in two.
 *
 * Resolves with MiniGameResult; `attempts` (weak/failed drags + the winning
 * one) feeds the engagement classifier's avg_minigame_attempts feature.
 */
export function playCedulaTear(scene: Phaser.Scene, _node: MiniGameNode): Promise<MiniGameResult> {
  return new Promise((resolve) => {
    const { width, height } = scene.scale;
    const startedAt = performance.now();
    let attempts = 0;
    let done = false;

    const layer = scene.add.container(0, 0).setDepth(10);
    const cx = width / 2;
    const cy = height / 2 + 10;
    const pw = 360;
    const ph = 220;

    // --- The cedula "document" ---
    const paper = scene.add.rectangle(cx, cy, pw, ph, 0xf5eecd).setStrokeStyle(3, 0x8a6d3b);
    const title = scene.add
      .text(cx, cy - ph / 2 + 26, "CÉDULA PERSONAL", {
        fontFamily: FONT,
        fontSize: "20px",
        color: "#5b4327",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const textLines: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < 4; i++) {
      textLines.push(scene.add.rectangle(cx - 70, cy - 18 + i * 26, 190, 6, 0xcbb98a).setOrigin(0, 0.5));
    }
    const seal = scene.add.circle(cx + 118, cy + 52, 26, 0xb33a2b, 0.85);
    const year = scene.add
      .text(cx + 118, cy + 52, "1896", { fontFamily: FONT, fontSize: "13px", color: "#ffffff" })
      .setOrigin(0.5);

    const instr = scene.add
      .text(cx, 78, t("mg.cedula.instruction"), {
        fontFamily: FONT,
        fontSize: "20px",
        color: COLORS.text,
        align: "center",
        lineSpacing: 4,
      })
      .setOrigin(0.5);
    const hint = scene.add
      .text(cx, height - 40, "", { fontFamily: FONT, fontSize: "15px", color: "#e4572e" })
      .setOrigin(0.5);

    const paperParts = [paper, title, ...textLines, seal, year];
    layer.add([...paperParts, instr, hint]);

    // --- Tear gesture: pointerdown on paper, drag horizontally, pointerup ---
    let downX: number | null = null;
    let downY: number | null = null;
    let downOnPaper = false;

    const onDown = (p: Phaser.Input.Pointer) => {
      downX = p.worldX;
      downY = p.worldY;
      downOnPaper = Phaser.Geom.Rectangle.Contains(paper.getBounds(), downX, downY);
    };
    const onUp = (p: Phaser.Input.Pointer) => {
      if (done || downX === null || downY === null) return;
      const dx = p.worldX - downX;
      const dy = p.worldY - downY;
      const horizontal = Math.abs(dx) > Math.abs(dy) * 1.3;
      const longEnough = Math.abs(dx) >= pw * 0.5;
      if (downOnPaper && horizontal && longEnough) {
        success(downY);
      } else {
        attempts++;
        fail();
      }
      downX = downY = null;
      downOnPaper = false;
    };

    scene.input.on("pointerdown", onDown);
    scene.input.on("pointerup", onUp);

    function cleanupInput() {
      scene.input.off("pointerdown", onDown);
      scene.input.off("pointerup", onUp);
    }

    function fail() {
      sfx.error();
      shake(scene, 90, 0.002);
      hint.setText(t("mg.cedula.retry"));
      scene.tweens.add({
        targets: paper,
        x: cx + 8,
        duration: 45,
        yoyo: true,
        repeat: 3,
        onComplete: () => (paper.x = cx),
      });
    }

    function success(tearWorldY: number) {
      if (done) return;
      done = true;
      attempts++;
      cleanupInput();
      hint.setText("");
      instr.setText("");

      // Split the paper at the tear line into a top and bottom half.
      // Impact: rip sound, shake, and a spray of paper scraps along the tear.
      sfx.tear();
      shake(scene, 220, 0.006);

      const relY = Phaser.Math.Clamp(tearWorldY - (cy - ph / 2), 30, ph - 30);
      const topH = relY;
      const botH = ph - relY;
      paperParts.forEach((o) => o.setVisible(false));

      const tearY = cy - ph / 2 + relY;
      burst(scene, cx, tearY, [0xf5eecd, 0xcbb98a, 0x8a6d3b], 26, 220);
      scene.time.delayedCall(90, () => burst(scene, cx - 90, tearY, 0xf5eecd, 10, 150));
      scene.time.delayedCall(160, () => burst(scene, cx + 90, tearY, 0xf5eecd, 10, 150));

      const top = scene.add
        .rectangle(cx, cy - ph / 2 + topH / 2, pw, topH, 0xf5eecd)
        .setStrokeStyle(3, 0x8a6d3b);
      const bottom = scene.add
        .rectangle(cx, cy - ph / 2 + relY + botH / 2, pw, botH, 0xf5eecd)
        .setStrokeStyle(3, 0x8a6d3b);
      layer.add([top, bottom]);

      scene.tweens.add({ targets: top, x: cx - 170, y: cy - 170, angle: -38, alpha: 0, duration: 650, ease: "Cubic.easeIn" });
      scene.tweens.add({ targets: bottom, x: cx + 170, y: cy + 190, angle: 42, alpha: 0, duration: 650, ease: "Cubic.easeIn" });

      scene.time.delayedCall(680, () => {
        sfx.success();
        const msg = scene.add
          .text(cx, cy - 16, t("mg.cedula.done"), {
            fontFamily: FONT,
            fontSize: "26px",
            color: COLORS.text,
            fontStyle: "bold",
          })
          .setOrigin(0.5);
        const sub = scene.add
          .text(cx, cy + 22, t("mg.cedula.doneSub"), {
            fontFamily: FONT,
            fontSize: "16px",
            color: COLORS.textMuted,
          })
          .setOrigin(0.5);
        layer.add([msg, sub]);
        scene.time.delayedCall(1000, () => {
          layer.destroy(true);
          resolve({ score: 1, attempts, msSpent: Math.round(performance.now() - startedAt) });
        });
      });
    }
  });
}
