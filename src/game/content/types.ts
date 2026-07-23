import type { ArcId, LocalizedText } from "@shared/types";

/**
 * Arc content is DATA, not code. Each arc is a list of nodes the ArcScene
 * walks in order. The Story and Decision node types are reusable across all
 * three arcs; only MiniGame nodes point at arc-specific mechanics.
 *
 * This is what lets three arcs share two presenters (see CLAUDE.md rule 5).
 */

export interface ArcContent {
  arc: ArcId;
  title: LocalizedText;
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
  question: LocalizedText;
  choices: QuizChoice[];
  correctChoiceId: string;
}

export interface QuizChoice {
  id: string;
  label: LocalizedText;
}

/** "pre" = baseline before the arc, "post" = retention after. */
export type AssessmentPhase = "pre" | "post";

export interface QuizResult {
  score: number; // 0..1 = correct / total
  correct: number;
  total: number;
  answers: Record<string, string>; // questionId -> chosen choiceId
}

export type ArcNode =
  | TitleCardNode
  | CharacterNode
  | StoryNode
  | DecisionNode
  | MiniGameNode
  | DidYouKnowNode;

/** Cinematic opening card: place, year, and the "dramatised" note. */
export interface TitleCardNode {
  id: string;
  type: "titlecard";
  place: LocalizedText;
  year: string;
}

/**
 * Character introduction card. `historicity` is shown as a visible tag so
 * pupils always know which people really existed and which were created for
 * the story — a continuous, teachable alternative to one skippable disclaimer.
 */
export interface CharacterNode {
  id: string;
  type: "character";
  name: LocalizedText;
  role: LocalizedText;
  historicity: "real" | "fictional";
  /** Background / goal beats, revealed one after another. */
  lines: LocalizedText[];
  image?: string;
}

/** Closing card separating what is documented from what was dramatised. */
export interface DidYouKnowNode {
  id: string;
  type: "didyouknow";
  real: LocalizedText[];
  invented: LocalizedText[];
}

/** A narrated story beat: text, optional illustration, optional voiceover. */
export interface StoryNode {
  id: string;
  type: "story";
  text: LocalizedText;
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
  prompt: LocalizedText;
  timeLimitMs: number;
  choices: DecisionChoice[];
  defaultChoiceId?: string;
}

export interface DecisionChoice {
  id: string;
  label: LocalizedText;
  /** Short in-character reply shown after picking — makes the choice felt. */
  response?: LocalizedText;
  /** Optional: which mini-game this choice routes into (future). */
  routeTo?: string;
}

/** Placeholder for an arc-specific mini-game (built per arc later). */
export interface MiniGameNode {
  id: string;
  type: "minigame";
  /** e.g. "cedula_tear", "katipunan_recruit", "code_unscramble". */
  key: string;
  title: LocalizedText;
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
