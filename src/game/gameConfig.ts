import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";

/** Design resolution. Phaser's Scale.FIT letterboxes to any screen. */
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO, // WebGL with Canvas fallback
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#0e1524",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // ONE scene for the whole game; presenters draw everything into it.
    // See GameScene for the rationale.
    scene: [GameScene],
  };
}
