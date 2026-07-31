import Phaser from "phaser";
import type { ArcId } from "@shared/types";
import { arcBackgroundKey, hasImage } from "../assets/images";

/**
 * The scene backdrop behind every story/decision/character screen.
 *
 * If the arc's background art has shipped (`<arc>/bg.png`) we draw it. If not,
 * we draw a generated scene in that arc's colours — a sky gradient, a horizon,
 * a ground band and a few silhouettes. That keeps the game looking deliberate
 * while art is still being produced, instead of flat navy, and it means the art
 * handoff is purely additive: drop the PNG in and it takes over.
 *
 * Drawn at depth 0 and dimmed slightly so foreground text always stays legible.
 */

interface Palette {
  skyTop: number;
  skyBottom: number;
  sun: number;
  horizon: number;
  ground: number;
  silhouette: number;
}

const PALETTES: Record<ArcId, Palette> = {
  // Dawn over the shallows — cool blue lifting into warm gold at the waterline.
  mactan: {
    skyTop: 0x14243f,
    skyBottom: 0xe08a4a,
    sun: 0xffd27a,
    horizon: 0x2a5d6e,
    ground: 0x1b6b6b,
    silhouette: 0x0b1a22,
  },
  // Overcast hopeful morning in a clearing outside Manila.
  pugad_lawin: {
    skyTop: 0x1a2438,
    skyBottom: 0x7d7f6a,
    sun: 0xd8d3a8,
    horizon: 0x3f4a35,
    ground: 0x35502c,
    silhouette: 0x111a12,
  },
  // Lush river valley, warm and green.
  datu_bago: {
    skyTop: 0x15283a,
    skyBottom: 0xcf9a5a,
    sun: 0xf3c987,
    horizon: 0x2f5140,
    ground: 0x24462f,
    silhouette: 0x0d1a14,
  },
};

/**
 * Create the backdrop. Returns a container the caller destroys when the arc
 * ends (the presenter container rule applies here too).
 */
export function createBackdrop(scene: Phaser.Scene, arc: ArcId): Phaser.GameObjects.Container {
  const { width, height } = scene.scale;
  const layer = scene.add.container(0, 0).setDepth(0);

  const key = arcBackgroundKey(arc);
  if (hasImage(key) && scene.textures.exists(key)) {
    const img = scene.add.image(width / 2, height / 2, key);
    // Cover the stage without distorting the artwork. A little overscan beyond
    // cover leaves margin so the Ken Burns drift never reveals an edge.
    const cover = Math.max(width / img.width, height / img.height);
    const base = cover * 1.06;
    img.setScale(base);
    layer.add(img);
    addKenBurns(scene, img, layer, base, width, height);
  } else {
    layer.add(paintScene(scene, arc));
  }

  // Keep text readable over whatever is behind it.
  layer.add(scene.add.rectangle(width / 2, height / 2, width, height, 0x0e1524, 0.28));
  return layer;
}

/**
 * A slow, looping pan + zoom ("Ken Burns") that makes a still background feel
 * alive behind the story/dialogue and mini-game — subtle enough not to distract
 * a 10-year-old. Skipped for motion-sensitive users. The tween is removed when
 * the backdrop container is destroyed (the cleanup rule).
 */
function addKenBurns(
  scene: Phaser.Scene,
  img: Phaser.GameObjects.Image,
  layer: Phaser.GameObjects.Container,
  base: number,
  width: number,
  height: number
): void {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  if (reduce) return;

  const tween = scene.tweens.add({
    targets: img,
    scale: base * 1.05,
    x: width / 2 + width * 0.015, // drift kept well inside the overscan margin
    y: height / 2 - height * 0.015,
    duration: 16000,
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  });
  layer.once(Phaser.GameObjects.Events.DESTROY, () => tween.remove());
}

/** Procedural stand-in scene, used until the arc's background art lands. */
function paintScene(scene: Phaser.Scene, arc: ArcId): Phaser.GameObjects.GameObject[] {
  const { width, height } = scene.scale;
  const p = PALETTES[arc];
  const horizonY = Math.round(height * 0.58);
  const out: Phaser.GameObjects.GameObject[] = [];

  // Sky: a vertical gradient built from thin bands (no shaders needed).
  const bands = 48;
  const top = Phaser.Display.Color.IntegerToColor(p.skyTop);
  const bottom = Phaser.Display.Color.IntegerToColor(p.skyBottom);
  for (let i = 0; i < bands; i++) {
    const tt = i / (bands - 1);
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, 1, tt);
    const bandH = horizonY / bands + 1;
    out.push(
      scene.add
        .rectangle(width / 2, (i * horizonY) / bands + bandH / 2, width, bandH, Phaser.Display.Color.GetColor(c.r, c.g, c.b))
        .setOrigin(0.5)
    );
  }

  // Low sun near the horizon.
  out.push(scene.add.circle(width * 0.74, horizonY - 46, 34, p.sun, 0.85));

  // Water / far band, then the near ground.
  out.push(scene.add.rectangle(width / 2, horizonY + 34, width, 68, p.horizon).setOrigin(0.5));
  out.push(
    scene.add
      .rectangle(width / 2, (horizonY + 68 + height) / 2, width, height - horizonY - 68, p.ground)
      .setOrigin(0.5)
  );

  // A few silhouettes so the scene reads as a place, not a gradient.
  if (arc === "mactan") {
    // Distant sails on the horizon — the hook of the whole arc.
    [0.18, 0.3, 0.4].forEach((x, i) => {
      const sx = width * x;
      const sy = horizonY - 10 - i * 3;
      out.push(scene.add.triangle(sx, sy, 0, 16, 0, -16, 13, 8, p.silhouette, 0.75));
      out.push(scene.add.rectangle(sx, sy + 16, 22, 5, p.silhouette, 0.75));
    });
    out.push(palm(scene, width * 0.9, horizonY + 40, p.silhouette));
  } else if (arc === "pugad_lawin") {
    // A ridge of hills.
    [0.15, 0.45, 0.8].forEach((x, i) =>
      out.push(
        scene.add.triangle(width * x, horizonY + 6, -120 - i * 20, 0, 120 + i * 20, 0, 0, -70 - i * 16, p.silhouette, 0.6)
      )
    );
  } else {
    // River mouth + palms.
    out.push(scene.add.ellipse(width * 0.5, height * 0.86, width * 0.9, 120, p.horizon, 0.85));
    out.push(palm(scene, width * 0.14, horizonY + 52, p.silhouette));
    out.push(palm(scene, width * 0.86, horizonY + 64, p.silhouette));
  }

  return out;
}

/** Simple palm silhouette: trunk plus radiating fronds. */
function palm(scene: Phaser.Scene, x: number, y: number, color: number): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  c.add(scene.add.rectangle(0, -46, 8, 92, color, 0.8));
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI + (i * Math.PI) / 5;
    const frond = scene.add.ellipse(Math.cos(a) * 26, -92 + Math.sin(a) * 12, 58, 16, color, 0.8);
    frond.setRotation(a * 0.35);
    c.add(frond);
  }
  return c;
}
