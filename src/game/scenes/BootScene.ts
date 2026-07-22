import Phaser from "phaser";

/**
 * BootScene — first scene to run. In a real build this preloads fonts,
 * audio, and sprite atlases with a loading bar. For now it just hands
 * off to the TitleScene so we have something on screen.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    // Asset loading goes here later, e.g.:
    // this.load.image("bonifacio_intro", "assets/pugad_lawin/intro.png");
    // this.load.audio("vo_pl_01", "assets/pugad_lawin/vo_01.mp3");
  }

  create() {
    // Hand off outside Phaser's step loop. Starting the next scene from
    // within create() (inside the SceneManager's update) can leave it
    // stalled at INIT in Phaser 3.90; a macrotask defers it to a clean tick.
    setTimeout(() => this.scene.start("Title"), 0);
  }
}
