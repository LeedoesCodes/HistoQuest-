import Phaser from "phaser";
import type { AssessmentPhase, QuizQuestion, QuizResult } from "../content/types";
import { COLORS, FONT } from "../ui/theme";
import { pop } from "../ui/juice";
import { makeButton } from "../ui/panel";
import { sfx } from "../ui/sfx";
import { L, t } from "../i18n";

/**
 * Reusable auto-scored multiple-choice quiz. Asks each question once, records
 * the chosen answer, and resolves with the score (correct / total). Used for
 * BOTH the pre-assessment (baseline) and post-assessment (retention) — the
 * caller passes the phase and the same question set, so post − pre is the gain.
 *
 * No per-question right/wrong feedback: this is a measurement, not practice, so
 * showing answers during the pre-test would contaminate the baseline.
 */
export function playQuiz(
  scene: Phaser.Scene,
  questions: QuizQuestion[],
  phase: AssessmentPhase,
  /** Arc name, shown above the pre-test so it isn't context-free. */
  contextTitle?: string
): Promise<QuizResult> {
  return new Promise((resolve) => {
    const { width, height } = scene.scale;
    void contextTitle; // arc name already shown by the scene chrome
    const answers: Record<string, string> = {};

    // Dim the arc backdrop so the question + choices read clearly. Behind both
    // the header and the per-question layer; destroyed when the quiz ends.
    const scrim = scene.add.rectangle(width / 2, height / 2, width, height, 0x0a0f1c, 0.5).setDepth(13);

    const layer = scene.add.container(0, 0).setDepth(15);

    // Header (phase + subtitle) — its own container so it survives the
    // per-question re-render but is cleaned up when the quiz ends.
    const headerLayer = scene.add.container(0, 0).setDepth(15);
    headerLayer.add([
      scene.add
        .text(width / 2, 46, t(phase === "pre" ? "quiz.pre.title" : "quiz.post.title"), {
          fontFamily: FONT,
          fontSize: "24px",
          color: COLORS.accentText,
          fontStyle: "bold",
        })
        .setOrigin(0.5),
      scene.add
        .text(width / 2, 78, t(phase === "pre" ? "quiz.pre.sub" : "quiz.post.sub"), {
          fontFamily: FONT,
          fontSize: "14px",
          color: COLORS.textMuted,
        })
        .setOrigin(0.5),
    ]);

    let index = 0;

    const renderQuestion = () => {
      layer.removeAll(true);
      const q = questions[index];

      const progress = scene.add
        .text(width / 2, 118, t("quiz.progress", { n: index + 1, total: questions.length }), {
          fontFamily: FONT,
          fontSize: "14px",
          color: COLORS.textMuted,
        })
        .setOrigin(0.5);

      const question = scene.add
        .text(width / 2, 170, L(q.question), {
          fontFamily: FONT,
          fontSize: "22px",
          color: COLORS.text,
          fontStyle: "bold",
          align: "center",
          wordWrap: { width: width - 100 },
        })
        .setOrigin(0.5, 0);

      layer.add([progress, question]);

      const btnW = Math.min(560, width - 80);
      const startY = 250;
      q.choices.forEach((choice, i) => {
        const y = startY + i * 66;
        const { container: btn, zone } = makeButton(scene, width / 2, y, btnW, 54);
        const label = scene.add
          .text(0, 0, L(choice.label), {
            fontFamily: FONT,
            fontSize: "19px",
            color: COLORS.text,
            align: "center",
            wordWrap: { width: btnW - 40 },
          })
          .setOrigin(0.5);
        btn.add(label);
        layer.add(btn);

        zone.on("pointerdown", () => {
          sfx.tap();
          pop(scene, btn);
          answers[q.id] = choice.id;
          index++;
          // Brief beat so the tap registers visually before the screen changes.
          scene.time.delayedCall(110, () => {
            if (index < questions.length) renderQuestion();
            else finish();
          });
        });
      });
    };

    const finish = () => {
      const correct = questions.reduce(
        (n, q) => n + (answers[q.id] === q.correctChoiceId ? 1 : 0),
        0
      );
      scrim.destroy();
      headerLayer.destroy(true);
      layer.destroy(true);
      resolve({
        score: questions.length ? correct / questions.length : 0,
        correct,
        total: questions.length,
        answers,
      });
    };

    if (questions.length === 0) finish();
    else renderQuestion();
  });
}
