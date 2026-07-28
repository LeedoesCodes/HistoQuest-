# BasaQuest — History Module

The gamified Philippine & Davao local-history track of BasaQuest (IT capstone).
Grade 5 pupils play as a **fictional ally** through three historical arcs.
This repo is **one of three independent tracks**; it is built solo by Lee and
merges with the reading modules + teacher dashboard via shared contracts.

## Tech stack

- **Phaser 3** (game) + **React 18** (thin shell only) + **TypeScript**
- **Vite** (build/dev)
- **Supabase** (shared Postgres + auth) — optional in dev (offline-mock mode)
- Engagement classifier: **logistic regression**, trained offline (Colab),
  inference in plain JS (ship weights as JSON — no ML runtime).

## Architecture rules (do not break)

1. **React owns the page; Phaser owns the canvas.** The only React↔Phaser
   boundary is `src/game/HistoryGame.tsx`. Never build game UI in React.
   Scenes communicate outward by emitting on `this.game.events`; React
   listens in `HistoryGame.tsx`.
2. **One entry point:** the shell mounts `<HistoryGame {...HistoryGameProps} />`
   (see `src/shared/types.ts`). Keep that signature stable — it is the merge seam.
3. **`src/shared/` is a team contract.** `types.ts` and `schema.sql` are agreed
   with teammates. Do not change shapes there without noting it's a shared change.
4. **Everything writes through the shared `pupils` table** (`pupil_id`), so the
   dashboard can unify a pupil across all three modules.
5. **Arcs are data, not code.** Story/decision flow is driven by JSON content so
   the three arcs reuse the Story and Decision scenes; only the *mini-games* are
   arc-specific (Mactan defense; Pugad Lawin cedula-tear / recruit / unscramble;
   Datu Bago community-defense).

## The three arcs (ArcId)

- `mactan` — Labanan sa Mactan (Lapu-Lapu, 1521): defense sequence
- `pugad_lawin` — Sigaw sa Pugad Lawin (Bonifacio, 1896): 3 mechanics
- `datu_bago` — Paglaban ni Datu Bago (Davao del Norte): community defense

## Scene structure — ONE scene

- `src/game/gameConfig.ts` — Phaser config + scene list
- `src/game/scenes/GameScene.ts` — **the only scene.** Its `mainLoop()` is
  `arc select → run arc → summary → repeat`, awaiting one presenter at a time.
- `src/game/presenters/*` — every screen (arcSelect, story, decision, quiz) and
  `presenters/miniGames/*` (registry keyed by the content's `key`).

**Presenter rule (important):** a presenter must draw into a container it
creates on entry and destroys on exit, and resolve a Promise when done. Drawing
straight onto the scene leaks UI onto the next screen — this has bitten twice
(quiz header, code-unscramble instructions).

## Testing gotcha (cost hours once)

Phaser drives everything from `requestAnimationFrame`. If the preview tab is
hidden (`document.visibilityState === "hidden"`), rAF never fires, so the scene
clock, timers, and tweens are all frozen — while synthetic `obj.emit(...)` still
works because it bypasses the loop. Symptoms look like game bugs (scenes stuck
at INIT, spawners not spawning). To test in a hidden tab, pump frames manually:

```js
let t = performance.now();
for (let i = 0; i < 15; i++) { t += 16.7; game.step(t, 16.7); }
```

## Art assets (additive — never required)

Images live in `src/game/assets/img/<arc|common>/*.png` and are auto-discovered
at build time (`assets/images.ts`, Vite glob). Path → key:
`img/mactan/char_lapulapu.png` → `"mactan/char_lapulapu"`. `GameScene.preload()`
loads whatever exists.

**Rule: every draw site must degrade gracefully** (`hasImage(key)`), because art
lands gradually and the game must stay demo-able with zero assets. Each arc's
background is `<arc>/bg.png`; without it `ui/backdrop.ts` paints a generated
scene in that arc's palette. Author-facing spec: `docs/asset-brief.md`.

## Behavioral logging → classifier

Scenes emit `BehaviorEvent`s (see `types.ts`): decision choices + `msElapsed`,
mini-game attempts/score. Buffer locally (IndexedDB), batch-flush to Supabase so
it survives connectivity drops. Features derive from these events; classifier
output is `learnerLabel` (`surface`/`deep`) + confidence.

## Commands

- `npm run dev` — dev server (HMR). NOTE: HMR can leave zombie Phaser instances;
  for reliable manual testing do a full page reload, or use `npm run preview`.
- `npm run build` — typecheck + production build
- `npm run preview` — serve the production build (no HMR)

## Dev/merge notes

- Copy `.env.example` → `.env.local` with your own Supabase project to test the
  cloud path; leave blank for offline-mock. Swap to the team's shared project at
  merge time — config change only, no code change.
- `React.StrictMode` is intentionally omitted (it double-mounts and leaks a
  Phaser `<canvas>` in dev). See `src/main.tsx`.
