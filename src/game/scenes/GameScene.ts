import Phaser from "phaser";
import type { ArcId, HistorySessionResult, Pupil } from "@shared/types";
import { getArcContent } from "../content";
import type { ArcContent } from "../content/types";
import { BehaviorLogger } from "../behaviorLogger";
import { classify } from "../classifier";
import { buildQuizForms, hashSeed } from "../assessment";
import { playArcSelect } from "../presenters/arcSelect";
import { playStory } from "../presenters/story";
import { playTitleCard } from "../presenters/titleCard";
import { playCharacter } from "../presenters/character";
import { playDidYouKnow } from "../presenters/didYouKnow";
import { playDecision } from "../presenters/decision";
import { playQuiz } from "../presenters/quiz";
import { getMiniGame } from "../presenters/miniGames";
import { COLORS, FONT } from "../ui/theme";
import { burst, pop, showStars, starsFor } from "../ui/juice";
import { makePanel, makeButton } from "../ui/panel";
import { sfx } from "../ui/sfx";
import { L, t } from "../i18n";
import { IMAGE_URLS } from "../assets/images";
import { loadSpriteSheets } from "../assets/sprites";
import { createBackdrop } from "../ui/backdrop";

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

  /**
   * Load whatever art has shipped. The registry is generated from the files
   * actually present, so this is a no-op on a fresh clone with no assets and
   * the game still runs — art is additive, never required.
   */
  preload() {
    for (const [key, url] of Object.entries(IMAGE_URLS)) {
      if (!this.textures.exists(key)) this.load.image(key, url);
    }
    // Character animation spritesheets (additive; falls back to code-art).
    loadSpriteSheets(this.load);
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

    // Scene backdrop for the whole arc (real art if shipped, generated if not).
    const backdrop = createBackdrop(this, arcId);

    const chrome = this.add.container(0, 0).setDepth(5);
    chrome.add(
      this.add.text(20, 16, L(content.title), {
        fontFamily: FONT,
        fontSize: "16px",
        color: COLORS.textMuted,
      })
    );

    await logger.log("arc_start", arcId, {});

    // Draw parallel pre/post forms from the item bank. Seeded from the session
    // id so the exact items a pupil saw can be reproduced from stored data.
    const forms = buildQuizForms(content.assessment, hashSeed(logger.sessionId));

    // Pre-assessment runs BEFORE any arc content (including the title card) so
    // the baseline measures prior knowledge only. The arc name is passed for
    // context — it was already visible on the menu, so it leaks nothing.
    const pre = await playQuiz(this, forms.pre, "pre", L(content.title));
    await logger.log("assessment_complete", `${arcId}_pre`, {
      phase: "pre",
      score: pre.score,
      correct: pre.correct,
      total: pre.total,
      seed: forms.seed,
      items: forms.pre.map((q) => q.id).join(","),
    });

    await this.playNodes(content, logger);

    // Post-assessment: DIFFERENT items covering the SAME objectives, so the
    // gain reflects learning rather than memorising the pre-test wording.
    const post = await playQuiz(this, forms.post, "post", L(content.title));
    await logger.log("assessment_complete", `${arcId}_post`, {
      phase: "post",
      score: post.score,
      correct: post.correct,
      total: post.total,
      seed: forms.seed,
      items: forms.post.map((q) => q.id).join(","),
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

    // Tally stars earned across the arc's mini-games (the reward kids chase).
    const mgScores = events.filter((e) => e.type === "minigame_complete");
    const earnedStars = mgScores.reduce((n, e) => n + starsFor(Number(e.payload.score)), 0);
    const maxStars = mgScores.length * 3;

    await this.showSummary(pre.score, post.score, engagement.label, engagement.confidence, earnedStars, maxStars);
    chrome.destroy(true);
    backdrop.destroy(true);
  }

  private async playNodes(content: ArcContent, logger: BehaviorLogger) {
    for (const node of content.nodes) {
      // Cinematic/narrative cards. Logged as story beats so the classifier's
      // features (decisions + mini-games) stay unchanged; the nodeId says which.
      if (node.type === "titlecard") {
        await logger.log("story_shown", node.id, {});
        await playTitleCard(this, node);
        await logger.log("story_advanced", node.id, {});
      } else if (node.type === "character") {
        await logger.log("story_shown", node.id, { historicity: node.historicity });
        await playCharacter(this, node);
        await logger.log("story_advanced", node.id, {});
      } else if (node.type === "didyouknow") {
        await logger.log("story_shown", node.id, {});
        await playDidYouKnow(this, node);
        await logger.log("story_advanced", node.id, {});
      } else if (node.type === "story") {
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
    confidence: number,
    earnedStars: number,
    maxStars: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const { width, height } = this.scale;
      const labelText = t(label === "deep" ? "summary.deep" : "summary.surface");
      const pct = (s: number) => `${Math.round(s * 100)}%`;
      const gain = postScore - preScore;
      const gainText =
        gain > 0 ? `+${pct(gain)} ↑` : gain < 0 ? `${pct(gain)} ↓` : t("summary.noChange");

      const layer = this.add.container(0, 0).setDepth(20);
      // A styled panel behind the summary so it reads over the arc background.
      layer.add(makePanel(this, width / 2, height / 2 - 40, 460, 300, { alpha: 0.9 }));
      const { container: btn, zone } = makeButton(this, width / 2, height / 2 + 80, 220, 52);
      btn.add(
        this.add
          .text(0, 0, t("summary.back"), { fontFamily: FONT, fontSize: "16px", color: COLORS.text })
          .setOrigin(0.5)
      );

      layer.add([
        this.add
          .text(width / 2, height / 2 - 150, t("summary.title"), {
            fontFamily: FONT,
            fontSize: "28px",
            color: COLORS.text,
            fontStyle: "bold",
          })
          .setOrigin(0.5),
        this.add
          .text(width / 2, height / 2 - 58, t("summary.stars", { n: earnedStars, max: maxStars }), {
            fontFamily: FONT,
            fontSize: "15px",
            color: COLORS.textMuted,
          })
          .setOrigin(0.5),
        this.add
          .text(
            width / 2,
            height / 2 - 22,
            t("summary.learned", { pre: pct(preScore), post: pct(postScore), gain: gainText }),
            { fontFamily: FONT, fontSize: "18px", color: COLORS.accentText }
          )
          .setOrigin(0.5),
        this.add
          .text(
            width / 2,
            height / 2 + 10,
            t("summary.engagement", { label: labelText, pct: Math.round(confidence * 100) }),
            { fontFamily: FONT, fontSize: "18px", color: COLORS.textMuted }
          )
          .setOrigin(0.5),
        btn,
      ]);

      // Headline 3-star arc rating from the mini-game star tally.
      if (maxStars > 0) {
        const arcStars = starsFor(earnedStars / maxStars);
        layer.add(showStars(this, width / 2, height / 2 - 105, arcStars, () => sfx.pop()));
      }

      // Celebrate an improvement from pre-test to post-test.
      if (gain > 0) {
        sfx.success();
        this.time.delayedCall(600, () => burst(this, width / 2, height / 2 - 105, [0xffd54a, 0x8bc34a, 0xffffff], 30, 240));
      }

      zone.on("pointerdown", () => {
        sfx.tap();
        pop(this, btn);
        this.time.delayedCall(120, () => {
          layer.destroy(true);
          resolve();
        });
      });
    });
  }
}
