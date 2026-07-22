import type { ArcId } from "@shared/types";

/**
 * Arc content is DATA, not code. Each arc is a list of nodes the ArcScene
 * walks in order. The Story and Decision node types are reusable across all
 * three arcs; only MiniGame nodes point at arc-specific mechanics.
 *
 * This is what lets three arcs share two presenters (see CLAUDE.md rule 5).
 */

export interface ArcContent {
  arc: ArcId;
  title: string;
  /**
   * Auto-scored multiple-choice questions on this arc's history. The SAME set
   * is asked before the arc (baseline) and after (retention), so post − pre is
   * the learning gain the study measures. Keep it short (3–5) for Grade 5.
   */
  assessment: QuizQuestion[];
  /** Played top to bottom. Every decision path converges back onto this line. */
  nodes: ArcNode[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  choices: QuizChoice[];
  correctChoiceId: string;
}

export interface QuizChoice {
  id: string;
  label: string;
}

/** "pre" = baseline before the arc, "post" = retention after. */
export type AssessmentPhase = "pre" | "post";

export interface QuizResult {
  score: number; // 0..1 = correct / total
  correct: number;
  total: number;
  answers: Record<string, string>; // questionId -> chosen choiceId
}

export type ArcNode = StoryNode | DecisionNode | MiniGameNode;

/** A narrated story beat: text, optional illustration, optional voiceover. */
export interface StoryNode {
  id: string;
  type: "story";
  text: string;
  /** Asset key loaded in a preloader (later). Optional while art is pending. */
  image?: string;
  /** Voiceover audio key (edge-tts MP3s, later). Optional. */
  vo?: string;
}

/**
 * A timed decision point. The pupil picks within `timeLimitMs`; if the timer
 * runs out we auto-select `defaultChoiceId` (or the first choice) and mark it
 * timed out. Every choice converges on the same historical outcome — the
 * choice shapes the experience and the behavioral log, not the history.
 */
export interface DecisionNode {
  id: string;
  type: "decision";
  prompt: string;
  timeLimitMs: number;
  choices: DecisionChoice[];
  defaultChoiceId?: string;
}

export interface DecisionChoice {
  id: string;
  label: string;
  /** Optional: which mini-game this choice routes into (future). */
  routeTo?: string;
}

/** Placeholder for an arc-specific mini-game (built per arc later). */
export interface MiniGameNode {
  id: string;
  type: "minigame";
  /** e.g. "cedula_tear", "katipunan_recruit", "code_unscramble". */
  key: string;
  title: string;
}

export interface DecisionResult {
  choiceId: string;
  msElapsed: number;
  timedOut: boolean;
}

/** Every mini-game (real or placeholder) resolves with this shape. */
export interface MiniGameResult {
  /** 0..1 — how well the pupil performed. */
  score: number;
  /** Total tries including the successful one (feeds the classifier). */
  attempts: number;
  msSpent: number;
}
