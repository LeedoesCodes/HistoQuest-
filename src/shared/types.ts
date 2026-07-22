/**
 * SHARED CONTRACTS — agreed by the whole BasaQuest team.
 *
 * These types describe the seams between the three modules (history,
 * reading proficiency, reading comprehension) and the teacher dashboard.
 * DO NOT change anything in this file without team sign-off — every
 * module depends on these shapes lining up.
 *
 * Everything module-specific to History lives in src/game, not here.
 */

/** A pupil is the shared identity all three modules read/write. */
export interface Pupil {
  id: string; // uuid — the join key across every module
  displayName: string; // never sent to any cloud service
  gradeLevel: 1 | 2 | 3 | 4 | 5 | 6;
  section?: string;
}

/** The three independent tracks named in the manuscript. */
export type Track = "history" | "reading_proficiency" | "reading_comprehension";

/**
 * The one entry point the shell uses to mount the History module.
 * The shell renders <HistoryGame {...HistoryGameProps} />. As long as
 * this signature holds, the game can be built in total isolation.
 */
export interface HistoryGameProps {
  pupil: Pupil;
  /** Called once the pupil finishes an arc (or exits). */
  onComplete: (result: HistorySessionResult) => void;
  /** Optional: which arc to jump straight into (else show arc select). */
  startArc?: ArcId;
}

/** The three historical arcs. */
export type ArcId = "mactan" | "pugad_lawin" | "datu_bago";

/** Engagement classifier output (logistic regression, per manuscript). */
export type LearnerLabel = "surface" | "deep";

/**
 * A single history session's result — this is what onComplete returns
 * and what gets stored for the teacher dashboard.
 */
export interface HistorySessionResult {
  pupilId: string;
  arc: ArcId;
  startedAt: string; // ISO timestamp
  finishedAt: string; // ISO timestamp
  preAssessmentScore: number; // 0..1, baseline before the arc
  postAssessmentScore: number; // 0..1, retention after the arc
  learnerLabel: LearnerLabel;
  learnerConfidence: number; // 0..1, sigmoid probability of "deep"
  /** The raw behavioral events, kept for classifier training + audit. */
  behaviorLog: BehaviorEvent[];
}

/** One logged interaction. The classifier's features derive from these. */
export interface BehaviorEvent {
  pupilId: string;
  arc: ArcId;
  sessionId: string; // one uuid per arc playthrough
  ts: string; // ISO timestamp
  type: BehaviorEventType;
  /** Which story/decision/mini-game node this happened in. */
  nodeId: string;
  /** Free-form details per event type (choice id, ms elapsed, score…). */
  payload: Record<string, number | string | boolean>;
}

export type BehaviorEventType =
  | "arc_start"
  | "story_shown"
  | "story_advanced"
  | "decision_shown"
  | "decision_made" // payload: { choiceId, msElapsed, timedOut }
  | "minigame_start"
  | "minigame_attempt" // payload: { attemptNo, success }
  | "minigame_complete" // payload: { score, attempts, msSpent }
  | "arc_complete";
