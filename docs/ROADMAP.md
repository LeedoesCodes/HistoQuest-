# Roadmap

Last repository review: 2026-08-03

## Status key

- **Complete**: implemented and accepted in the recorded project workflow.
- **Frozen**: no changes without an explicit design revision or a specific regression.
- **Deferred**: intentionally postponed; not an implementation request.
- **Planned**: approved production sequence, not yet implemented.

## Current roadmap

| Area | Status | Depends on | Scope / boundary |
|---|---|---|---|
| Core game shell and bilingual story framework | Complete | — | React/Phaser boundary, content model, presentations, assessment flow. |
| Mactan story decisions (Phases 1–3) | Complete, Frozen | Story content model | Three convergent, child-safe decisions; do not revise absent a playtest defect. |
| Mactan Defense Phase 1A | Complete, Frozen | Existing Mactan mini-game | Child-safe support conversion. |
| Mactan Defense Phase 1B | Complete, Frozen | Phase 1A | Hold relay, local adult response, breach/recovery loop. |
| Mactan Defense Phase 2A | Complete, Frozen | Phase 1B | 2400 x 600 world, camera, world-coordinate migration, fixed HUD. |
| Mactan Defense Phase 2B | Complete, Frozen | Phase 2A | Data-driven defense stages, meter, regrouping, and approved expiry polish. |
| Mactan Defense Phase 3 | Complete, Frozen | Phase 2B | Tactical Fall Back / Regroup signal and pressure validation. |
| Mactan Defense Phase 4A | Implemented; gameplay Frozen | Phase 3 | Advance relay and coordinated formation. Latest automated pass is recorded; focused manual confirmation remains a human-review item. |
| Mactan Defense Phase 4B | Deferred | Phase 4A | Regroup idle-facing reset and staggered tween visual polish only. |
| Mactan approved location family | Complete, Frozen | STYLE-001 | STYLE-001 and BG-001 through BG-008 are approved; reuse them where the narrative-art plan identifies them as sufficient. |
| Mactan story-first research and character gates | Planned | Approved narrative-art review | Resolve historically specific battle/diplomacy details and approve the shared child, leader, defender, and landing-party visual family before event art. |
| Mactan narrative art P0 | Planned | Research and character gates | Defense-world spatial foundation plus the plan → constrained boats → wading-party educational sequence. No gameplay change. |
| Mactan narrative art P1 | Planned | P0 continuity and relevant research | Humabon agreement, demand, refusal, child recognition, and restrained aftermath. |
| Mactan narrative art P2 | Planned | Approved location family and relevant research | Expedition motivation, territorial-claim transition, and opening/closing visual bookends. |
| Mactan narrative art P3 | Planned | Parent P1/P2 scenes | Post-refusal and post-battle continuity variations only. |
| Pugad Lawin visual foundation | Planned | Era reference approval | Forest background and referenced portraits before any chapter-specific gameplay art. |
| Datu Bago playable chapter | Deferred | Content and gameplay approval | Current content is a stub and its mini-game key has no presenter registration. |

## Dependency flow

```text
Approved STYLE-001 + BG-001 through BG-008
  -> historical research and shared character-design gates
  -> P0 cause-and-effect sequence
  -> P1 political and emotional turning points
  -> P2 motivation and narrative bookends
  -> P3 continuity variations
  -> Pugad Lawin era reference
  -> Pugad Lawin visual foundation

Frozen Mactan mechanics
  -> only regression fixes or explicitly approved design revisions
```

## Intentionally postponed improvements

- New Mactan combat, signal, scoring, territory, enemy-role, Magellan, or ending mechanics.
- Responsive decision-presenter layout redesign; the approved Mactan prompt shortening is the current targeted correction.
- New packages, linting configuration, and expanded test infrastructure.
- Prompt writing, image generation, and runtime integration until a separately approved production milestone authorizes them.
- Optional Mactan props, scenery, effects, and visual polish that are not required by an approved P0–P3 parent asset.

## Future-task rule

Before changing an existing system, search for its established presenter, content structure, asset family, utility, and verification path. Extend the existing pattern with the smallest necessary change. Update this roadmap only when an approved phase changes status.
