import Phaser from "phaser";

/**
 * Character animation sprite sheets (PixelLab exports, packed into horizontal
 * strips by scripts tooling). Deliberately kept OUT of the `img/` glob so they
 * load as SPRITESHEETS (with a frame config), not flat single textures.
 *
 * Same additive philosophy as `images.ts`: discovered by glob, guarded before
 * use, never required. If a sheet isn't shipped the caller falls back to
 * code-art, so the game still runs and stays demo-able with zero character art.
 *
 *   assets/sprites/mactan/hero_walk.png  ->  key "mactan/hero_walk"
 */

const modules = import.meta.glob<string>("./sprites/**/*.png", {
  eager: true,
  import: "default",
  query: "?url",
});

/** key (e.g. "mactan/hero_walk") -> resolved URL */
export const SPRITE_URLS: Record<string, string> = {};
for (const [path, url] of Object.entries(modules)) {
  const key = path.replace(/^\.\/sprites\//, "").replace(/\.png$/i, "");
  SPRITE_URLS[key] = url as string;
}

export interface SpriteSheetDef {
  key: string;
  /** Square frame size in px (PixelLab pads to a square; hero 124, enemy 148). */
  frame: number;
  frames: number;
  frameRate: number;
  repeat: number;
}

/** The Mactan hero (young seafarer). One sheet per animation state. */
export const MACTAN_HERO_SHEETS: SpriteSheetDef[] = [
  { key: "mactan/hero_walk", frame: 124, frames: 8, frameRate: 12, repeat: -1 },
  { key: "mactan/hero_idle", frame: 124, frames: 8, frameRate: 8, repeat: -1 },
  { key: "mactan/hero_jump", frame: 124, frames: 9, frameRate: 14, repeat: 0 },
  { key: "mactan/hero_crouch", frame: 124, frames: 5, frameRate: 12, repeat: 0 },
  { key: "mactan/hero_attack", frame: 124, frames: 3, frameRate: 16, repeat: 0 },
];

/** The guardia civil enemy. Only a walk (idle/aim reuses a paused frame). */
export const MACTAN_ENEMY_SHEETS: SpriteSheetDef[] = [
  { key: "mactan/enemy_walk", frame: 148, frames: 6, frameRate: 10, repeat: -1 },
];

/** Allied Mactan warrior (fights beside the player). 180px canvas from PixelLab. */
export const MACTAN_ALLY_SHEETS: SpriteSheetDef[] = [
  { key: "mactan/ally_walk", frame: 180, frames: 6, frameRate: 10, repeat: -1 },
  { key: "mactan/ally_attack", frame: 180, frames: 3, frameRate: 14, repeat: 0 },
  { key: "mactan/ally_idle", frame: 180, frames: 1, frameRate: 1, repeat: -1 },
];

const ALL_SHEETS = [...MACTAN_HERO_SHEETS, ...MACTAN_ENEMY_SHEETS, ...MACTAN_ALLY_SHEETS];

/**
 * Draw metrics from the packed-frame bbox measurements. Origin puts the feet on
 * the container origin so `y = groundY` lands them on the shore.
 *
 * Sizes are matched to the ALLY warrior as the reference adult (~104px on
 * screen). The Spanish soldiers are adults too, so they scale to ~101px; the
 * hero is a ~10-year-old, kept clearly shorter at ~78px (≈0.75× the adults).
 * Measured figure heights in-canvas: hero 60, enemy 72, ally 144 — hence the
 * different scale numbers. mactanDefense's hitbox/shot geometry is derived from
 * the ~78px hero.
 */
export const MACTAN_HERO = { originX: 0.5, originY: 92 / 124, scale: 1.3 };
export const MACTAN_ENEMY = { originX: 0.5, originY: 110 / 148, scale: 1.4 };
// Ally: feet at 162/180 (measured). The reference adult on screen (~104px).
export const MACTAN_ALLY = { originX: 0.5, originY: 162 / 180, scale: 0.72 };

/** Load every shipped sheet as a spritesheet. Call from a scene `preload()`. */
export function loadSpriteSheets(loader: Phaser.Loader.LoaderPlugin): void {
  for (const def of ALL_SHEETS) {
    const url = SPRITE_URLS[def.key];
    if (url && !loader.scene.textures.exists(def.key)) {
      loader.spritesheet(def.key, url, { frameWidth: def.frame, frameHeight: def.frame });
    }
  }
}

/**
 * Register Phaser animations for a set of sheets (idempotent). Returns false if
 * any sheet in the set wasn't shipped, so the caller can fall back to code-art.
 */
function ensureAnims(scene: Phaser.Scene, defs: SpriteSheetDef[]): boolean {
  if (!defs.every((s) => scene.textures.exists(s.key))) return false;
  for (const s of defs) {
    // Crisp pixels — no linear blur when drawn over the detailed backdrop.
    scene.textures.get(s.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    const animKey = animKeyFor(s.key);
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: scene.anims.generateFrameNumbers(s.key, { start: 0, end: s.frames - 1 }),
        frameRate: s.frameRate,
        repeat: s.repeat,
      });
    }
  }
  return true;
}

export function ensureMactanHeroAnims(scene: Phaser.Scene): boolean {
  return ensureAnims(scene, MACTAN_HERO_SHEETS);
}

export function ensureMactanEnemyAnims(scene: Phaser.Scene): boolean {
  return ensureAnims(scene, MACTAN_ENEMY_SHEETS);
}

export function ensureMactanAllyAnims(scene: Phaser.Scene): boolean {
  return ensureAnims(scene, MACTAN_ALLY_SHEETS);
}

/** "mactan/hero_walk" -> "anim_mactan/hero_walk" (stable, collision-free). */
export function animKeyFor(sheetKey: string): string {
  return "anim_" + sheetKey;
}
