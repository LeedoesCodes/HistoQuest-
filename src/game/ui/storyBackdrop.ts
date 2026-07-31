import Phaser from "phaser";
import { hasImage } from "../assets/images";

/**
 * StoryBackdrop — a per-beat scene layer that cross-dissolves between beats,
 * turning the intro sequence into a slideshow that illustrates the dialogue
 * (Magellan leaving Spain → storms at sea → the far west → the Mactan shore)
 * instead of one fixed arc background.
 *
 * It sits ABOVE the arc backdrop (depth 0) and BELOW every presenter (story
 * depth 10, character depth 18), so a beat's own art shows through while the
 * text panel and portraits stay on top. When a beat names no scene — or its art
 * hasn't shipped yet — the layer fades to empty and the arc backdrop shows
 * through unchanged. Art is additive: drop the PNG in and the slide appears.
 *
 * Owned by GameScene for the life of an arc; `destroy()` tears down the layer
 * and any running tween (the container-cleanup rule).
 */

const FADE_MS = 600; // slideshow-paced cross-dissolve between beats

export class StoryBackdrop {
  private readonly layer: Phaser.GameObjects.Container;
  private readonly width: number;
  private readonly height: number;
  private readonly reduce: boolean;
  /** The currently-shown slide (image + scrim), or null when empty. */
  private current: Phaser.GameObjects.Container | null = null;
  /** The key on screen now — so repeated beats with the same scene don't re-fade. */
  private currentKey: string | undefined = undefined;

  constructor(scene: Phaser.Scene) {
    this.width = scene.scale.width;
    this.height = scene.scale.height;
    this.reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    this.layer = scene.add.container(0, 0).setDepth(1);
    this.scene = scene;
  }

  private readonly scene: Phaser.Scene;

  /**
   * Cross-dissolve to the scene named by `key`. Passing the same key twice is a
   * no-op (consecutive beats can share a scene without a flicker). Passing an
   * unshipped key or `undefined` fades back to the arc backdrop.
   */
  show(key: string | undefined): void {
    if (key === this.currentKey) return;
    this.currentKey = key;

    const prev = this.current;
    let next: Phaser.GameObjects.Container | null = null;

    if (hasImage(key) && this.scene.textures.exists(key)) {
      next = this.buildSlide(key);
      this.layer.add(next); // added last → renders over the outgoing slide
    }
    this.current = next;

    const dur = this.reduce ? 0 : FADE_MS;
    if (next) {
      next.setAlpha(0);
      this.scene.tweens.add({ targets: next, alpha: 1, duration: dur });
    }
    if (prev) {
      this.scene.tweens.add({
        targets: prev,
        alpha: 0,
        duration: dur,
        onComplete: () => prev.destroy(true),
      });
    }
  }

  /** One slide = the cover-scaled scene image + a matching readability scrim. */
  private buildSlide(key: string): Phaser.GameObjects.Container {
    const { width, height, scene } = this;
    const slide = scene.add.container(0, 0);

    const img = scene.add.image(width / 2, height / 2, key);
    // Cover the stage, with a little overscan so the Ken Burns drift never
    // reveals an edge — same treatment as the arc backdrop.
    const cover = Math.max(width / img.width, height / img.height);
    const base = cover * 1.06;
    img.setScale(base);
    slide.add(img);

    // Dim toward legibility, matching backdrop.ts so slides and the fallback
    // arc backdrop read at the same brightness under the text.
    slide.add(scene.add.rectangle(width / 2, height / 2, width, height, 0x0e1524, 0.28));

    if (!this.reduce) {
      const tween = scene.tweens.add({
        targets: img,
        scale: base * 1.05,
        x: width / 2 + width * 0.015,
        y: height / 2 - height * 0.015,
        duration: 16000,
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: -1,
      });
      slide.once(Phaser.GameObjects.Events.DESTROY, () => tween.remove());
    }

    return slide;
  }

  destroy(): void {
    this.layer.destroy(true);
  }
}
