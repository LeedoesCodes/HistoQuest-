import Phaser from "phaser";
import { TitleScene } from "./scenes/TitleScene";
// BootScene is kept for when real assets exist (a dedicated Preloader).
// For now there is nothing to preload, so TitleScene is the entry scene.
// import { BootScene } from "./scenes/BootScene";

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
    scene: [TitleScene],
  };
}
