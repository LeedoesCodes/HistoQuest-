import Phaser from "phaser";
import type { MiniGameNode, MiniGameResult } from "../../content/types";
import { playMiniGamePlaceholder } from "../miniGamePlaceholder";
import { playCedulaTear } from "./cedulaTear";
import { playCodeUnscramble } from "./codeUnscramble";
import { playKatipunanRecruit } from "./katipunanRecruit";

export type MiniGamePresenter = (
  scene: Phaser.Scene,
  node: MiniGameNode
) => Promise<MiniGameResult>;

/**
 * Maps a mini-game `key` (from arc content) to its presenter. Add each new
 * arc-specific mini-game here; anything not yet built falls back to the
 * placeholder so the arc still plays through.
 *
 * Planned keys: cedula_tear ✓, katipunan_recruit, code_unscramble (Pugad
 * Lawin); mactan_defense (Mactan); datu_bago_defense (Datu Bago).
 */
const REGISTRY: Record<string, MiniGamePresenter> = {
  cedula_tear: playCedulaTear,
  code_unscramble: playCodeUnscramble,
  katipunan_recruit: playKatipunanRecruit,
};

export function getMiniGame(key: string): MiniGamePresenter {
  return REGISTRY[key] ?? playMiniGamePlaceholder;
}
