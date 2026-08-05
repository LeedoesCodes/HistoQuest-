# Architecture

Last repository review: 2026-08-03

## Overview

HistoQuest’s history module is a React-hosted Phaser game. React owns the page-level mount and completion callback; Phaser owns the 800 x 600 canvas, game loop, input, and all learner-facing screens. The project uses one long-lived `GameScene` rather than many Phaser scenes. Screen-specific presenters create and destroy their own containers while `GameScene` awaits them in a linear flow.

```text
React shell
  -> HistoryGame (React–Phaser boundary)
  -> Phaser Game / GameScene
  -> arc selector -> pre-assessment -> content nodes -> post-assessment -> summary
  -> `arc-finished` event -> React `onComplete(result)`
```

## Project structure

| Location | Responsibility |
|---|---|
| `src/main.tsx`, `src/App.tsx` | Development shell and React entry. |
| `src/game/HistoryGame.tsx` | Single public React entry; creates/destroys Phaser and bridges completion events. |
| `src/game/gameConfig.ts` | Phaser configuration and fixed logical 800 x 600 design resolution. |
| `src/game/scenes/GameScene.ts` | Main runtime orchestrator for arc selection, assessments, node playback, logging, and summary. |
| `src/game/content/` | Bilingual arc data and node/assessment types. |
| `src/game/presenters/` | Reusable screen presenters; each owns its transient Phaser container. |
| `src/game/presenters/miniGames/` | Mini-game registry and arc-specific mini-game presenters. |
| `src/game/assets/` | Dynamic image/spritesheet discovery and animation registration. |
| `src/game/i18n/` | Module-level Filipino/English selection and keyed UI messages. |
| `src/game/ui/` | Theme, panels, backdrops, juice, and runtime-generated sound effects. |
| `src/shared/` | Cross-module contracts and optional Supabase schema/client. Changes require team sign-off. |
| `scripts/` | Asset-packing and verification utilities, including `verify_mactan.mjs`. |

## Scene and story flow

`GameScene.mainLoop()` repeatedly awaits the arc selector, then calls `runArc(arcId)`.

1. Read the selected `ArcContent` through `getArcContent`.
2. Construct a per-session `BehaviorLogger` and seeded parallel quiz forms.
3. Render the pre-assessment.
4. Walk `content.nodes` in authored order with `playNodes`.
5. Dispatch each node to its reusable or arc-specific presenter.
6. Render the equivalent-coverage post-assessment.
7. Classify engagement from recorded events, emit `arc-finished`, and show a summary.
8. Return to arc selection.

The Mactan, Pugad Lawin, and Datu Bago arc definitions live in `src/game/content/`. A decision’s choices record experience and behavior but are convergent: the node list remains the historical sequence. `routeTo` exists in the content type as future metadata; current `GameScene.playNodes()` does not run branches from it.

## Mini-game architecture

`MiniGameNode.key` is resolved by `getMiniGame()` in `src/game/presenters/miniGames/index.ts`. Registered presenters resolve a standard `MiniGameResult` (`score`, `attempts`, `msSpent`); unregistered keys use `playMiniGamePlaceholder` so incomplete arcs remain playable.

`mactanDefense.ts` is the current largest gameplay presenter. It owns its world, camera, HUD, entities, local relay signals, defense-stage state, spawning, and result overlay. It is not a separate Phaser scene. Mactan’s gameplay is feature-frozen: only explicit approved revisions or regression fixes may change it.

## Localization

- Narrative content uses `LocalizedText` values authored as `{ fil, en }` in content files.
- Reusable UI chrome uses keys in `src/game/i18n/messages.ts` and `t()`.
- `src/game/i18n/index.ts` stores the active language for Phaser presenters; `HistoryGame` initializes it from props, and open screens can subscribe to language changes.
- Filipino is the default and English is the supported alternate language.

## Progress, sessions, and persistence

There is no repository evidence of resumable local save/load or persistent checkpoint restoration.

Each arc run creates a `BehaviorLogger` session, records story/decision/assessment/mini-game events, builds a `HistorySessionResult`, and emits it through the React boundary. `logger.flush()` is best-effort. The game runs in offline-mock mode when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are absent.

When configured, `src/shared/schema.sql` defines `pupils`, `history_sessions`, and `history_behavior_logs`. The schema explicitly notes that Row Level Security has not yet been enabled; authentication is not wired in this repository.

## Asset loading and fallback behavior

- `assets/images.ts` discovers PNG/JPG/JPEG/WebP files beneath `assets/img/` with Vite `import.meta.glob` and exposes stable slash-separated keys.
- `assets/sprites.ts` separately discovers PNG sheets beneath `assets/sprites/`, supplies frame metadata, and registers animations only when all required sheets are present.
- `GameScene.preload()` loads available art, not an assumed mandatory catalog. Presenters must degrade to code-art or an arc backdrop if an image is absent.
- `ui/sfx.ts` synthesizes sounds with the Web Audio API; no committed audio files are currently required.

## Important runtime relationships

```text
ArcContent nodes
  -> GameScene.playNodes
  -> presenter / mini-game registry
  -> BehaviorLogger events
  -> classifier + HistorySessionResult
  -> React onComplete and optional Supabase flush

asset files
  -> Vite globs
  -> Phaser texture/spritesheet loader
  -> presenter fallback rendering when absent
```

## Change boundaries

- Treat `src/shared/types.ts` as a team contract; coordinate changes before editing it.
- Preserve `GameScene`’s sequential orchestration unless an approved architectural change requires otherwise.
- Extend node data and existing presenters before adding a parallel story or mini-game path.
- Update this document whenever architecture, runtime relationships, persistence, asset loading, or localization behavior changes.
