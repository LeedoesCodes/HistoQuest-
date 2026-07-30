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

/**
 * A styled, interactive button matching the panels. Self-contained in a
 * container positioned at (cx, cy) with children drawn around a LOCAL centre,
 * so it can be safely popped/scaled. Returns the container (add it to your
 * layer), the interactive `zone` (wire `pointerdown` on it), and `setActive`
 * for a persistent selected look (e.g. the language toggle).
 *
 * Add your own label into `container` at local (0, 0) so it pops with the button.
 */
export function makeButton(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  w: number,
  h: number,
  opts: { radius?: number; tone?: "wood" | "danger" | "go" } = {}
): {
  container: Phaser.GameObjects.Container;
  zone: Phaser.GameObjects.Rectangle;
  setActive: (on: boolean) => void;
} {
  const r = opts.radius ?? 12;
  const border = opts.tone === "danger" ? 0xe4572e : opts.tone === "go" ? 0x4caf50 : 0x8a6d3b;
  const container = scene.add.container(cx, cy);

  const base = scene.add.graphics();
  base.fillStyle(0x241a0f, 0.9);
  base.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  base.lineStyle(2, border, 1);
  base.strokeRoundedRect(-w / 2, -h / 2, w, h, r);

  const hi = scene.add.graphics().setVisible(false);
  hi.fillStyle(0xffd54a, 0.16);
  hi.fillRoundedRect(-w / 2, -h / 2, w, h, r);

  const active = scene.add.graphics().setVisible(false);
  active.lineStyle(2, 0xffd54a, 1);
  active.strokeRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, r - 2);

  const zone = scene.add.rectangle(0, 0, w, h, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
  container.add([base, hi, active, zone]);

  zone.on("pointerover", () => hi.setVisible(true));
  zone.on("pointerout", () => hi.setVisible(false));

  return { container, zone, setActive: (on: boolean) => active.setVisible(on) };
}
