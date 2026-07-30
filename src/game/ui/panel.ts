import Phaser from "phaser";

/**
 * A styled dialogue/UI panel — rounded, slightly translucent dark fill with a
 * warm wood-and-gold double border. Matches the pixel-art backgrounds and the
 * gold speaker name tags so text boxes feel part of the same world instead of
 * a flat rectangle floating on top.
 *
 * Returns a Graphics object (add it to your presenter's container). Draw text
 * on top afterwards.
 */
export function makePanel(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  w: number,
  h: number,
  opts: { radius?: number; alpha?: number } = {}
): Phaser.GameObjects.Graphics {
  const r = opts.radius ?? 16;
  const alpha = opts.alpha ?? 0.86;
  const x = cx - w / 2;
  const y = cy - h / 2;

  const g = scene.add.graphics();
  // Soft drop shadow.
  g.fillStyle(0x000000, 0.25);
  g.fillRoundedRect(x + 3, y + 4, w, h, r);
  // Main fill.
  g.fillStyle(0x14100a, alpha); // warm near-black, not the cold navy
  g.fillRoundedRect(x, y, w, h, r);
  // Warm wood outer border.
  g.lineStyle(3, 0x8a6d3b, 1);
  g.strokeRoundedRect(x, y, w, h, r);
  // Thin gold inner accent.
  g.lineStyle(1, 0xffd54a, 0.55);
  g.strokeRoundedRect(x + 4, y + 4, w - 8, h - 8, r - 4);

  return g;
}
