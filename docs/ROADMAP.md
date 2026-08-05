# Roadmap

Last repository review: 2026-08-05

## Status key

- **Complete**: implemented and accepted in the recorded project workflow.
- **Frozen**: no changes without an explicit design revision or a specific regression.
- **Superseded**: replaced by an approved design revision. Preserved as a fallback or as historical record; not deleted.
- **Deferred**: intentionally postponed; not an implementation request.
- **Planned**: approved production sequence, not yet implemented.

## Mactan gameplay direction

The relay-defense gameplay freeze is **lifted**, superseded on 2026-08-05 by the
approved [`MACTAN_FORMATION_COMBAT_SPEC.md`](MACTAN_FORMATION_COMBAT_SPEC.md).

The relay build remains the live, routed implementation and the rollback target
(commit `80208ef`, branch `mactan-relay-fallback-baseline`, tag
`mactan-relay-fallback`) until the Formation Combat vertical slice is accepted.
Implementation has not started; Phase 1 is the next milestone.

## Current roadmap

| Area | Status | Depends on | Scope / boundary |
|---|---|---|---|
| Core game shell and bilingual story framework | Complete | — | React/Phaser boundary, content model, presentations, assessment flow. |
| Mactan story decisions (Phases 1–3) | Complete, Frozen | Story content model | Three convergent, child-safe decisions; do not revise absent a playtest defect. |
| Mactan Defense Phases 1A–4A (relay design) | Complete; **Superseded**, retained as fallback | — | Child support role, Hold relay, 2400 x 600 world, defense stages, Fall Back, Advance. Remains the routed implementation and rollback target until the Formation Combat vertical slice is accepted. Change only for a regression in the fallback itself. |
| Mactan Defense Phase 4B | **Superseded** | — | Relay regroup visual polish. Moot once the relay presenter is retired; do not start. |
| Mactan Formation Combat — specification | Complete | Approved design revision | [`MACTAN_FORMATION_COMBAT_SPEC.md`](MACTAN_FORMATION_COMBAT_SPEC.md) recorded as the authoritative gameplay design. Documentation only; no gameplay code changed. |
| Mactan Formation Combat — Phase 1 | **Planned; next milestone** | Spec §20.2 open items for depth bands, camera values, presenter key | New presenter, reoriented world, depth bands, camera model, movable player. No combat. Relay presenter stays routed. |
| Mactan Formation Combat — Phases 2–6 | Planned | Phase 1 | Formation and allies; Standard enemies and combat resolution; postures and pressure points; remaining archetypes; phases, rally, stars, HUD. See spec §18. |
| Mactan Formation Combat — Phase 7 cutover | Planned | Accepted vertical slice | Route the arc to Formation Combat and retire the relay presenter. The last step, not the first. |
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

Verified relay fallback (tag mactan-relay-fallback)
  -> approved Formation Combat specification
  -> Phase 1 world + camera + player
  -> Phases 2-6 formation, combat, postures, archetypes, result
  -> accepted vertical slice
  -> Phase 7 cutover, relay presenter retired
```

## Intentionally postponed improvements

- Mactan gameplay work outside the approved Formation Combat specification. The blanket postponement of "new Mactan combat mechanics" is superseded for work the spec covers, and still applies to everything it does not — including Magellan, boss encounters, and decision-branched alternate mini-games.
- Resolving a spec §20.2 open item by implementer judgement rather than approval.
- Responsive decision-presenter layout redesign; the approved Mactan prompt shortening is the current targeted correction.
- New packages, linting configuration, and expanded test infrastructure.
- Prompt writing, image generation, and runtime integration until a separately approved production milestone authorizes them.
- Optional Mactan props, scenery, effects, and visual polish that are not required by an approved P0–P3 parent asset.

## Future-task rule

Before changing an existing system, search for its established presenter, content structure, asset family, utility, and verification path. Extend the existing pattern with the smallest necessary change. Update this roadmap only when an approved phase changes status.
