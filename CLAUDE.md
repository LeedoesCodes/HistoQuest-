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

## Scene structure

- `src/game/gameConfig.ts` — Phaser config + scene list
- `src/game/scenes/TitleScene.ts` — arc select (current entry scene)
- `src/game/scenes/BootScene.ts` — **not wired yet.** Reserve for a real
  Preloader once assets exist. NOTE: in Phaser 3.90, starting the next scene
  from inside `create()` stalled the target at INIT; when a Preloader is added,
  verify the handoff on a clean load (make the preloader the FIRST scene).

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
