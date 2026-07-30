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
  /** Item bank the pre-test and post-test forms are drawn from. */
  assessment: AssessmentBank;
  /** Played top to bottom. Every decision path converges back onto this line. */
  nodes: ArcNode[];
}

/**
 * Item bank organised by learning objective.
 *
 * Why not one fixed question list: pupils replay arcs, so a fixed pre/post set
 * gets memorised and the "gain" stops measuring learning. But freely random
 * questions break the comparison — pre and post must be equivalent in coverage
 * and difficulty or the gain measures item difficulty instead.
 *
 * The fix used here is PARALLEL FORMS: every objective carries >= 2 items of
 * matched difficulty; the pre-test takes one and the post-test takes another.
 * Coverage stays identical, the wording changes, and memorising an answer does
 * not help. Which item lands on which form is decided by a per-session seed and
 * logged, so a result can be reproduced and audited later.
 */
export interface AssessmentBank {
  objectives: LearningObjective[];
}

export interface LearningObjective {
  id: string;
  /** What this objective tests — shown to teachers, not to pupils. */
  description: LocalizedText;
  /** Parallel items of equal difficulty. Author at least 2. */
  items: QuizQuestion[];
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
  /**
   * Optional "historians still debate this" line. Teaches that history is
   * studied, not just memorised — and lets an arc name a real controversy
   * (e.g. Pugad Lawin vs. Balintawak) honestly.
   */
  note?: LocalizedText;
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
  /**
   * When set, a character portrait pops in (with a shake + sound) while this
   * beat is shown — a speaker for the line. Degrades gracefully if the image
   * hasn't shipped (just the name shows).
   */
  speaker?: StorySpeaker;
}

export interface StorySpeaker {
  name: LocalizedText;
  /** Portrait image key (e.g. "mactan/char_lapulapu"). */
  image: string;
  /** Which side the portrait pops in on. Default "left". */
  side?: "left" | "right";
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
