import type { ArcId } from "@shared/types";

/**
 * Image registry — auto-discovers every PNG under assets/img/ at build time.
 *
 * Drop a file in and it becomes available; no code change, no manual list to
 * keep in sync. Vite rewrites the paths for both dev and production builds, so
 * hashed filenames and subpath deployments both work.
 *
 *   assets/img/mactan/char_lapulapu.png  ->  key "mactan/char_lapulapu"
 *
 * Nothing here assumes an asset exists. Every draw site must degrade gracefully
 * (see hasImage) because art lands gradually — the game must stay playable and
 * demo-able with zero assets present.
 */

const modules = import.meta.glob<string>("./img/**/*.{png,jpg,jpeg,webp}", {
  eager: true,
  import: "default",
  query: "?url",
});

/** key (e.g. "mactan/char_lapulapu") -> resolved URL */
export const IMAGE_URLS: Record<string, string> = {};

for (const [path, url] of Object.entries(modules)) {
  // "./img/mactan/char_lapulapu.png" -> "mactan/char_lapulapu"
  const key = path.replace(/^\.\/img\//, "").replace(/\.(png|jpe?g|webp)$/i, "");
  IMAGE_URLS[key] = url as string;
}

export const IMAGE_KEYS = Object.keys(IMAGE_URLS);

/** Was this image actually shipped? Call before drawing anything optional. */
export function hasImage(key: string | undefined): key is string {
  return !!key && key in IMAGE_URLS;
}

/** Per-arc full-screen background, by convention `<arc>/bg`. */
export function arcBackgroundKey(arc: ArcId): string {
  return `${arc}/bg`;
}
