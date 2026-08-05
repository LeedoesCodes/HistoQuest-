# Project Status

Last repository review: 2026-08-05

## Current development phase

**Mactan Formation Combat redesign — approved, not started.**

The previous Mactan gameplay feature freeze is **superseded**. It was lifted on
2026-08-05 by an explicit approved design revision. The approved replacement
direction is [`MACTAN_FORMATION_COMBAT_SPEC.md`](MACTAN_FORMATION_COMBAT_SPEC.md),
which is the authoritative gameplay design for the Mactan battle mini-game.

**Implementation has not started.** No gameplay code has changed. Phase 1 of the
spec's migration plan (§18) is the next milestone.

## Fallback baseline

The relay-defense mini-game remains the **live, routed implementation** and the
verified rollback target until the Formation Combat vertical slice is accepted.

| Reference | Value |
|---|---|
| Commit | `80208ef27e73f4f770efc511ba7fb2232a5e43a2` |
| Branch | `mactan-relay-fallback-baseline` (pushed to `origin`) |
| Tag | `mactan-relay-fallback` (annotated, pushed to `origin`) |

Verified in an isolated clean checkout on 2026-08-05: `npm run typecheck`,
`npm run test:mactan`, `npm run build`, and `git diff --check` all pass without
any excluded asset or documentation change.

## Completed systems

- React, TypeScript, Vite, and Phaser game shell.
- Bilingual Filipino/English story-content model, dialogue, decisions, assessments, and mini-game presenter registry.
- Mactan chapter story flow, including the three reviewed decision points.
- Mactan Defense mini-game (relay design — now the **fallback**, superseded as future direction): child support role, Hold, Tactical Fall Back, Advance, defense stages, Defense Line HUD, visible regrouping, and success/recovery results.
- Scrollable 2400 x 600 Mactan world with fixed HUD and controls.
- Mactan regression automation: `npm.cmd run test:mactan`, including state checks and screenshots.
- Pugad Lawin story content and three registered mini-games.
- Optional/offline-safe Supabase integration and shared schema.

## Systems in progress

- Mactan Formation Combat: specification recorded and approved; implementation not begun.
- Visual asset production for a consistent Mactan presentation. The approved source of truth is [`ART_PRODUCTION_GUIDE.md`](../ART_PRODUCTION_GUIDE.md).
- Asset inventory and production planning, recorded in [`ASSET_TRACKER.md`](ASSET_TRACKER.md).

## Known issues

- The 2400 x 600 Mactan battlefield uses procedural/temporary zone visuals; environment art and clearer zone presentation are deferred visual work.
- Current Mactan story art, portraits, and sprites do not yet form one fully consistent approved visual family. See [`ART_AUDIT.md`](../ART_AUDIT.md).
- Pugad Lawin content references image assets that are absent from `src/game/assets/img/pugad_lawin/`.
- The project has no configured lint script. This is a deferred project-health improvement; do not add tooling without separate approval.
- The most recent Advance geometry correction passed automated verification. A focused human playtest is still the appropriate confirmation of its moment-to-moment feel.

## Deferred ideas

- Mactan visual-art and environment polish, including broader background-zone readability.
- Phase 4B regroup visual polish and a clearer desktop signal-control guide.
- Expansion of Mactan test hooks only when an approved future state cannot be verified through the current interface.
- Pugad Lawin era reference, asset foundation, and any unapproved gameplay work.
- Datu Bago arc flow and its `datu_bago_defense` mini-game, which currently falls back to the placeholder presenter.

## Recently completed work

- Per-node Mactan story backgrounds are now static after placement; their existing cross-fades, cover scale, overscan, and readability scrim remain unchanged. The fallback arc-background motion was intentionally left out of scope.
- Mactan Advance formation was limited to an Advance-only forward boundary of `Defense Line + 170 px`; its other accepted values were preserved.
- Mactan automated verification baseline was established: typecheck, `test:mactan`, production build, and `git diff --check`.
- [`ART_PRODUCTION_GUIDE.md`](../ART_PRODUCTION_GUIDE.md) and [`ART_AUDIT.md`](../ART_AUDIT.md) were created as visual-production references.
- [`ASSET_PRODUCTION_PLAN.md`](ASSET_PRODUCTION_PLAN.md) now sequences the approved Mactan asset backlog without authorizing asset generation or integration.
- The Mactan reef background production package and finalized prompt are recorded; generation and runtime replacement have not started.
- STYLE-001 is approved and frozen as the non-runtime master visual baseline; BG-001 has not started.
- The living documentation set, architecture map, decision log, bug tracker, build checklist, prompt-history folder, and research folder were established from the current repository.

## BG-001 production status

BG-001 candidate 02 is approved and integrated at `src/game/assets/img/mactan/scene_reef.png`. The former runtime image is archived under `art_source/mactan/backgrounds/bg_001_reef/previous_runtime/`. Filipino and English dialogue-overlay screenshots are stored under `art_source/mactan/backgrounds/bg_001_reef/review/`. The approved source remains a flattened 1672 x 941 GPT Image output; no resample or layer work was requested.

## Mactan story-background integration

BG-001 through BG-008 are approved and integrated. BG-002 through BG-008 were generated against STYLE-001, approved after manual review, copied unchanged to their established runtime paths, and validated in Filipino and English through the story presenter. Their prior runtime files are archived under their corresponding `art_source/mactan/backgrounds/<asset>/previous_runtime/` folders. The review and provenance index is [`art_source/mactan/backgrounds/REVIEW_INDEX.md`](../art_source/mactan/backgrounds/REVIEW_INDEX.md).

## Official visual baseline

[`STYLE-001.png`](references/STYLE-001.png) is approved and frozen as the non-runtime master visual baseline for HistoQuest. Every future production prompt uses it by default unless a newer explicitly approved `STYLE-*` reference is named.

## Next recommended task

**Phase 1 of the Formation Combat migration plan** (spec §18): register a new
presenter with the reoriented 2400 × 600 world, depth bands, camera model, and a
movable player — no combat. The relay presenter stays registered and routed, so
the game remains playable throughout.

Before Phase 1 begins, the open items in spec §20.2 that Phase 1 depends on need
resolution — the depth-band `y` ranges, the camera values, and the new presenter
key and filename. The spec deliberately leaves them open rather than inventing
them.
