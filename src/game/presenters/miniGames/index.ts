import Phaser from "phaser";
import type { MiniGameNode, MiniGameResult } from "../../content/types";
import { playMiniGamePlaceholder } from "../miniGamePlaceholder";
import { playCedulaTear } from "./cedulaTear";
import { playCodeUnscramble } from "./codeUnscramble";
import { playKatipunanRecruit } from "./katipunanRecruit";
import { playMactanDefense } from "./mactanDefense";
import { playMactanFormationCombat } from "./mactanFormationCombat";

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
 *
 * `mactan_formation_combat` is the Formation Combat redesign, built BESIDE the
 * verified relay fallback (`mactan_defense`). Arc content still routes to
 * `mactan_defense`; switching the route requires separate explicit approval
 * (docs/MACTAN_FORMATION_COMBAT_SPEC.md §18.1). Registered here so the sandbox
 * can be launched and verified without touching the live route.
 */
const REGISTRY: Record<string, MiniGamePresenter> = {
  cedula_tear: playCedulaTear,
  code_unscramble: playCodeUnscramble,
  katipunan_recruit: playKatipunanRecruit,
  mactan_defense: playMactanDefense,
  mactan_formation_combat: playMactanFormationCombat,
};

export function getMiniGame(key: string): MiniGamePresenter {
  return REGISTRY[key] ?? playMiniGamePlaceholder;
}
