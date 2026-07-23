import type { Language, LocalizedText } from "@shared/types";
import { MESSAGES, type MessageKey } from "./messages";

/**
 * Minimal i18n for the history module — no library needed.
 *
 * Two kinds of text:
 *  - UI chrome  → keyed messages, `t("quiz.progress", { n, total })`
 *  - Narrative  → LocalizedText authored in the content files, `L(node.text)`
 *
 * Language lives in a module-level store because Phaser scenes and presenters
 * read it directly (they are not React components). It is set from
 * HistoryGameProps on mount and can be switched in-game from the arc select.
 */

let current: Language = "fil";

/** Listeners so open screens can re-render when the language changes. */
const listeners = new Set<(lang: Language) => void>();

export function getLanguage(): Language {
  return current;
}

export function setLanguage(lang: Language): void {
  if (lang === current) return;
  current = lang;
  listeners.forEach((fn) => fn(lang));
}

export function onLanguageChange(fn: (lang: Language) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Resolve authored narrative text in the current language. */
export function L(text: LocalizedText): string {
  return text[current] ?? text.fil;
}

/** Resolve a UI chrome message, filling {placeholders}. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const entry = MESSAGES[key] as Record<Language, string>;
  let out = entry[current] ?? entry.fil;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

export type { MessageKey };
