import type { AssessmentBank, QuizQuestion } from "./content/types";

/**
 * Builds the pre-test and post-test forms from an arc's item bank.
 *
 * Method (parallel forms):
 *  - For each learning objective, shuffle its items and give one to the
 *    pre-test and a different one to the post-test. Coverage and difficulty
 *    stay equivalent; the exact wording differs, so memorising an answer from
 *    a previous playthrough does not help.
 *  - Question order is shuffled per form.
 *  - Answer-choice order is shuffled per item, so "the answer is always B"
 *    cannot be learned. Scoring is by choice id, never by position.
 *
 * Everything is driven by a seed derived from the session id, so a stored
 * result can be replayed exactly — important when the study needs to show
 * which items a pupil actually saw.
 */

/** Deterministic PRNG (mulberry32) — small, fast, good enough for shuffling. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash so a session id can seed the PRNG. */
export function hashSeed(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Copy of an item with its answer choices in a new order. */
function withShuffledChoices(item: QuizQuestion, rng: () => number): QuizQuestion {
  return { ...item, choices: shuffled(item.choices, rng) };
}

export interface QuizForms {
  pre: QuizQuestion[];
  post: QuizQuestion[];
  /** Seed actually used — logged so the selection can be reproduced. */
  seed: number;
  /** Objectives that could not supply two distinct items (pre === post). */
  reusedObjectiveIds: string[];
}

export function buildQuizForms(bank: AssessmentBank, seed: number): QuizForms {
  const rng = makeRng(seed);
  const pre: QuizQuestion[] = [];
  const post: QuizQuestion[] = [];
  const reusedObjectiveIds: string[] = [];

  for (const objective of bank.objectives) {
    const items = shuffled(objective.items, rng);
    if (items.length === 0) continue;
    pre.push(withShuffledChoices(items[0], rng));
    if (items.length >= 2) {
      post.push(withShuffledChoices(items[1], rng));
    } else {
      // Only one item authored: reuse it, but flag it — this objective is
      // memorisable and should get a parallel item written.
      reusedObjectiveIds.push(objective.id);
      post.push(withShuffledChoices(items[0], rng));
    }
  }

  return {
    pre: shuffled(pre, rng),
    post: shuffled(post, rng),
    seed,
    reusedObjectiveIds,
  };
}
