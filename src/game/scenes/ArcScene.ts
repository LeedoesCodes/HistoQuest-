import Phaser from "phaser";
import type { ArcId, HistorySessionResult, Pupil } from "@shared/types";
import { getArcContent } from "../content";
import type { ArcContent } from "../content/types";
import { BehaviorLogger } from "../behaviorLogger";
import { classify } from "../classifier";
import { playStory } from "../presenters/story";
import { playDecision } from "../presenters/decision";
import { playQuiz } from "../presenters/quiz";
import { getMiniGame } from "../presenters/miniGames";
import { COLORS, FONT } from "../ui/theme";

/** Data passed when starting this scene. */
export interface ArcSceneData {
  arc: ArcId;
}

/**
 * ArcScene — the single gameplay scene. It walks an arc's JSON nodes in order,
 * rendering each via a reusable presenter, and logs every interaction through
 * BehaviorLogger. On completion it classifies engagement and emits the result
 * to React (`arc-finished`).
 *
 * Keeping the whole arc inside ONE scene (presenters draw into it) avoids the
 * Phaser scene-manager pitfalls and keeps the narrative flow linear + testable.
 */
export class ArcScene extends Phaser.Scene {
  private logger!: BehaviorLogger;
  private content!: ArcContent;
  private startedAt = "";
  private preScore = 0;
  private postScore = 0;

  constructor() {
    super("Arc");
  }

  create(data: ArcSceneData) {
    const pupil = this.registry.get("pupil") as Pupil;
    this.content = getArcContent(data.arc);
    this.logger = new BehaviorLogger(pupil.id, data.arc);
    this.startedAt = new Date().toISOString();

    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.addArcHeader();

    // Kick off the async node walk. create() itself stays sync.
    void this.run(pupil);
  }

  private addArcHeader() {
    this.add
      .text(20, 16, this.content.title, {
        fontFamily: FONT,
        fontSize: "16px",
        color: COLORS.textMuted,
      })
      .setDepth(5);
  }

  private async run(pupil: Pupil) {
    await this.logger.log("arc_start", this.content.arc, {});

    // Pre-assessment: baseline history knowledge before the arc.
    const pre = await playQuiz(this, this.content.assessment, "pre");
    this.preScore = pre.score;
    await this.logger.log("assessment_complete", `${this.content.arc}_pre`, {
      phase: "pre",
      score: pre.score,
      correct: pre.correct,
      total: pre.total,
    });

    for (const node of this.content.nodes) {
      if (node.type === "story") {
        await this.logger.log("story_shown", node.id, {});
        await playStory(this, node);
        await this.logger.log("story_advanced", node.id, {});
      } else if (node.type === "decision") {
        await this.logger.log("decision_shown", node.id, {});
        const res = await playDecision(this, node);
        await this.logger.log("decision_made", node.id, {
          choiceId: res.choiceId,
          msElapsed: res.msElapsed,
          timedOut: res.timedOut,
        });
      } else if (node.type === "minigame") {
        await this.logger.log("minigame_start", node.id, { key: node.key });
        const r = await getMiniGame(node.key)(this, node);
        await this.logger.log("minigame_complete", node.id, {
          score: r.score,
          attempts: r.attempts,
          msSpent: r.msSpent,
        });
      }
    }

    // Post-assessment: same questions, measures retention (post − pre = gain).
    const post = await playQuiz(this, this.content.assessment, "post");
    this.postScore = post.score;
    await this.logger.log("assessment_complete", `${this.content.arc}_post`, {
      phase: "post",
      score: post.score,
      correct: post.correct,
      total: post.total,
    });

    await this.logger.log("arc_complete", this.content.arc, {});
    await this.finish(pupil);
  }

  private async finish(pupil: Pupil) {
    const events = this.logger.getEvents();
    const engagement = classify(events);

    const result: HistorySessionResult = {
      pupilId: pupil.id,
      arc: this.content.arc,
      startedAt: this.startedAt,
      finishedAt: new Date().toISOString(),
      preAssessmentScore: this.preScore,
      postAssessmentScore: this.postScore,
      learnerLabel: engagement.label,
      learnerConfidence: engagement.confidence,
      behaviorLog: [...events],
    };

    // Best-effort sync (no-op without Supabase / offline).
    void this.logger.flush();

    this.showSummary(engagement.label, engagement.confidence);
    this.game.events.emit("arc-finished", result);
  }

  private showSummary(label: string, confidence: number) {
    const { width, height } = this.scale;
    const labelText = label === "deep" ? "Deep Learner" : "Surface Learner";
    const pct = (s: number) => `${Math.round(s * 100)}%`;
    const gain = this.postScore - this.preScore;
    const gainText =
      gain > 0 ? `+${pct(gain)} ↑` : gain < 0 ? `${pct(gain)} ↓` : "walang pagbabago";

    this.add
      .text(width / 2, height / 2 - 80, "Tapos na ang kabanata!", {
        fontFamily: FONT,
        fontSize: "28px",
        color: COLORS.text,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.add
      .text(
        width / 2,
        height / 2 - 30,
        `Natutuhan: ${pct(this.preScore)} → ${pct(this.postScore)}   (${gainText})`,
        { fontFamily: FONT, fontSize: "18px", color: COLORS.accentText }
      )
      .setOrigin(0.5)
      .setDepth(20);

    this.add
      .text(
        width / 2,
        height / 2 + 2,
        `Engagement: ${labelText}  (${Math.round(confidence * 100)}%)`,
        { fontFamily: FONT, fontSize: "18px", color: COLORS.textMuted }
      )
      .setOrigin(0.5)
      .setDepth(20);

    const btn = this.add
      .rectangle(width / 2, height / 2 + 80, 220, 52, COLORS.panel)
      .setStrokeStyle(2, COLORS.panelStroke)
      .setInteractive({ useHandCursor: true })
      .setDepth(20);
    this.add
      .text(width / 2, height / 2 + 80, "Bumalik sa menu", {
        fontFamily: FONT,
        fontSize: "16px",
        color: COLORS.text,
      })
      .setOrigin(0.5)
      .setDepth(21);

    btn.on("pointerdown", () => this.scene.start("Title"));
  }
}
