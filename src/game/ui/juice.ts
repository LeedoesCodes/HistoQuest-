import Phaser from "phaser";

/**
 * Game-feel helpers ("juice"): screen shake, particle bursts, and scale pops.
 *
 * Mechanics being correct is not the same as them feeling good — these are the
 * cheap effects that make a tap read as impact. All of them are additive and
 * safe: they never change game state, so logic and logging are unaffected.
 *
 * We ship no image assets, so the particle texture is drawn once at runtime.
 */

const DOT_KEY = "juice-dot";

/** Create the small white dot used by every particle burst (once per game). */
function ensureDot(scene: Phaser.Scene): string {
  if (!scene.textures.exists(DOT_KEY)) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 6, 6);
    g.generateTexture(DOT_KEY, 12, 12);
    g.destroy();
  }
  return DOT_KEY;
}

/** Short camera shake. Keep intensity small — this is seasoning, not spectacle. */
export function shake(scene: Phaser.Scene, duration = 150, intensity = 0.004): void {
  scene.cameras.main.shake(duration, intensity);
}

/** Quick colour wash over the screen (e.g. red when something gets through). */
export function flash(scene: Phaser.Scene, color = 0xe4572e, duration = 180): void {
  const c = Phaser.Display.Color.IntegerToColor(color);
  scene.cameras.main.flash(duration, c.red, c.green, c.blue, true);
}

/** Burst of particles at a point — the workhorse "that felt good" effect. */
export function burst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  tint: number | number[] = 0xffd54a,
  count = 14,
  speed = 180
): void {
  const key = ensureDot(scene);
  const emitter = scene.add.particles(x, y, key, {
    lifespan: { min: 260, max: 520 },
    speed: { min: speed * 0.35, max: speed },
    angle: { min: 0, max: 360 },
    scale: { start: 0.55, end: 0 },
    alpha: { start: 1, end: 0 },
    gravityY: 220,
    tint,
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });
  emitter.setDepth(30);
  emitter.explode(count);
  // Clean up after the longest possible particle lifetime.
  scene.time.delayedCall(700, () => emitter.destroy());
}

/**
 * Squash-and-stretch pop on any game object. Returns immediately; the tween
 * runs on the scene. Safe to call on objects that may be destroyed mid-tween.
 */
export function pop(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject & { scaleX: number; scaleY: number },
  amount = 1.14,
  duration = 130
): void {
  const baseX = target.scaleX;
  const baseY = target.scaleY;
  scene.tweens.add({
    targets: target,
    scaleX: baseX * amount,
    scaleY: baseY * amount,
    duration: duration / 2,
    yoyo: true,
    ease: "Quad.easeOut",
    onComplete: () => {
      if (target.active) {
        target.scaleX = baseX;
        target.scaleY = baseY;
      }
    },
  });
}

/**
 * Star rating (0–3) that pops in one at a time with a sound cue left to the
 * caller. Returns the container so the caller can position/clean it up.
 * The reward kids chase — used at the end of every mini-game.
 */
export function showStars(
  scene: Phaser.Scene,
  x: number,
  y: number,
  filled: number,
  onEachStar?: (index: number) => void
): Phaser.GameObjects.Container {
  const layer = scene.add.container(x, y).setDepth(32);
  const size = 46;
  const gap = 54;
  for (let i = 0; i < 3; i++) {
    const sx = (i - 1) * gap;
    const empty = scene.add
      .text(sx, 0, "☆", { fontFamily: "sans-serif", fontSize: `${size}px`, color: "#5b6784" })
      .setOrigin(0.5);
    layer.add(empty);
    if (i < filled) {
      const star = scene.add
        .text(sx, 0, "★", { fontFamily: "sans-serif", fontSize: `${size}px`, color: "#ffd54a" })
        .setOrigin(0.5)
        .setScale(0);
      layer.add(star);
      scene.tweens.add({
        targets: star,
        scale: 1,
        duration: 260,
        ease: "Back.easeOut",
        delay: 250 + i * 320,
        onStart: () => onEachStar?.(i),
      });
    }
  }
  return layer;
}

/** Map a 0..1 performance score to a 1–3 star rating. */
export function starsFor(score: number): number {
  if (score >= 0.85) return 3;
  if (score >= 0.55) return 2;
  return 1;
}

/** Floating text that drifts up and fades ("+1", "✓", "✗"). */
export function floatText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = "#ffd54a",
  size = "22px"
): void {
  const t = scene.add
    .text(x, y, text, { fontFamily: "sans-serif", fontSize: size, color, fontStyle: "bold" })
    .setOrigin(0.5)
    .setDepth(31);
  scene.tweens.add({
    targets: t,
    y: y - 62,
    alpha: 0,
    duration: 620,
    ease: "Quad.easeOut",
    onComplete: () => t.destroy(),
  });
}
