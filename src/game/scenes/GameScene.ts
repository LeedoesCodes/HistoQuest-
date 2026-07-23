import Phaser from "phaser";
import type { ArcId, HistorySessionResult, Pupil } from "@shared/types";
import { getArcContent } from "../content";
import type { ArcContent } from "../content/types";
import { BehaviorLogger } from "../behaviorLogger";
import { classify } from "../classifier";
import { playArcSelect } from "../presenters/arcSelect";
import { playStory } from "../presenters/story";
import { playDecision } from "../presenters/decision";
import { playQuiz } from "../presenters/quiz";
import { getMiniGame } from "../presenters/miniGames";
import { COLORS, FONT } from "../ui/theme";

/**
 * GameScene — the ONLY scene. Everything (arc select, story, decisions,
 * quizzes, mini-games, summary) is drawn by presenters into this one scene.
 *
 * Why one scene: the arc is a linear narrative, so expressing it as a plain
 * async sequence (`await` each presenter) keeps the flow readable in one place
 * and avoids juggling scene lifecycles, cross-scene state, and handoff timing.
 * Each presenter owns a container it creates on entry and destroys on exit —
 * that is the rule that keeps this safe (a presenter that draws straight to the
 * scene leaks its UI onto whatever comes next).
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super("Game");
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    void this.mainLoop();
  }

  /** Arc select → play arc → summary → back to arc select, forever. */
  private async mainLoop() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const arc = await playArcSelect(this);
      await this.runArc(arc);
    }
  }

  private async runArc(arcId: ArcId) {
    const pupil = this.registry.get("pupil") as Pupil;
    const content = getArcContent(arcId);
    const logger = new BehaviorLogger(pupil.id, arcId);
    const startedAt = new Date().toISOString();

    const chrome = this.add.container(0, 0).setDepth(5);
    chrome.add(
      this.add.text(20, 16, content.title, {
        fontFamily: FONT,
        fontSize: "16px",
        color: COLORS.textMuted,
      })
    );

    await logger.log("arc_start", arcId, {});

    // Pre-assessment: baseline history knowledge before the arc.
    const pre = await playQuiz(this, content.assessment, "pre");
    await logger.log("assessment_complete", `${arcId}_pre`, {
      phase: "pre",
      score: pre.score,
      correct: pre.correct,
      total: pre.total,
    });

    await this.playNodes(content, logger);

    // Post-assessment: same questions, measures retention (post − pre = gain).
    const post = await playQuiz(this, content.assessment, "post");
    await logger.log("assessment_complete", `${arcId}_post`, {
      phase: "post",
      score: post.score,
      correct: post.correct,
      total: post.total,
    });

    await logger.log("arc_complete", arcId, {});

    const events = logger.getEvents();
    const engagement = classify(events);
    const result: HistorySessionResult = {
      pupilId: pupil.id,
      arc: arcId,
      startedAt,
      finishedAt: new Date().toISOString(),
      preAssessmentScore: pre.score,
      postAssessmentScore: post.score,
      learnerLabel: engagement.label,
      learnerConfidence: engagement.confidence,
      behaviorLog: [...events],
    };

    void logger.flush(); // best-effort sync (no-op offline / without Supabase)
    this.game.events.emit("arc-finished", result);

    await this.showSummary(pre.score, post.score, engagement.label, engagement.confidence);
    chrome.destroy(true);
  }

  private async playNodes(content: ArcContent, logger: BehaviorLogger) {
    for (const node of content.nodes) {
      if (node.type === "story") {
        await logger.log("story_shown", node.id, {});
        await playStory(this, node);
        await logger.log("story_advanced", node.id, {});
      } else if (node.type === "decision") {
        await logger.log("decision_shown", node.id, {});
        const res = await playDecision(this, node);
        await logger.log("decision_made", node.id, {
          choiceId: res.choiceId,
          msElapsed: res.msElapsed,
          timedOut: res.timedOut,
        });
      } else if (node.type === "minigame") {
        await logger.log("minigame_start", node.id, { key: node.key });
        const r = await getMiniGame(node.key)(this, node);
        await logger.log("minigame_complete", node.id, {
          score: r.score,
          attempts: r.attempts,
          msSpent: r.msSpent,
        });
      }
    }
  }

  /** Resolves when the pupil taps "back to menu". */
  private showSummary(
    preScore: number,
    postScore: number,
    label: string,
    confidence: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const { width, height } = this.scale;
      const labelText = label === "deep" ? "Deep Learner" : "Surface Learner";
      const pct = (s: number) => `${Math.round(s * 100)}%`;
      const gain = postScore - preScore;
      const gainText =
        gain > 0 ? `+${pct(gain)} ↑` : gain < 0 ? `${pct(gain)} ↓` : "walang pagbabago";

      const layer = this.add.container(0, 0).setDepth(20);
      const btn = this.add
        .rectangle(width / 2, height / 2 + 80, 220, 52, COLORS.panel)
        .setStrokeStyle(2, COLORS.panelStroke)
        .setInteractive({ useHandCursor: true });

      layer.add([
        this.add
          .text(width / 2, height / 2 - 80, "Tapos na ang kabanata!", {
            fontFamily: FONT,
            fontSize: "28px",
            color: COLORS.text,
            fontStyle: "bold",
          })
          .setOrigin(0.5),
        this.add
          .text(
            width / 2,
            height / 2 - 30,
            `Natutuhan: ${pct(preScore)} → ${pct(postScore)}   (${gainText})`,
            { fontFamily: FONT, fontSize: "18px", color: COLORS.accentText }
          )
          .setOrigin(0.5),
        this.add
          .text(
            width / 2,
            height / 2 + 2,
            `Engagement: ${labelText}  (${Math.round(confidence * 100)}%)`,
            { fontFamily: FONT, fontSize: "18px", color: COLORS.textMuted }
          )
          .setOrigin(0.5),
        btn,
        this.add
          .text(width / 2, height / 2 + 80, "Bumalik sa menu", {
            fontFamily: FONT,
            fontSize: "16px",
            color: COLORS.text,
          })
          .setOrigin(0.5),
      ]);

      btn.on("pointerdown", () => {
        layer.destroy(true);
        resolve();
      });
    });
  }
}
