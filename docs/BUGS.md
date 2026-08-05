# Bug Tracker

Last repository review: 2026-08-03

Record reproducible defects here. Move a resolved item to **Fixed**; do not delete it. Deferred items are known issues intentionally not being addressed yet.

## Open

No currently confirmed open defects are recorded in the repository review.

## Fixed

| Issue | Area | Resolution | Verification / status |
|---|---|---|---|
| Mactan encounter could complete with no player influence | Mactan Defense Phase 1A | Added the local Hold relay and defensive adult response model in Phase 1B. | User accepted prototype behavior; no-input play reaches recovery rather than victory. |
| Rear nearby defender did not support a valid local Hold response | Mactan Defense | Added a 120 px anchor-based local support rule with a two-responder cap and shared valid target. | Approved correction; limits preserve local behavior. |
| Defenders immediately abandoned an immediate local threat at normal Hold expiry | Mactan Defense | Added one non-renewable 900 ms continuation when the assigned target remains an immediate local threat. | User accepted manual verification. |
| Battle could soft-lock after breaches when no enemies remained and spawning had stopped | Mactan Defense | Spawner now stops only after six successful repels and uses living enemy count for replacement spawning. | Automated Mactan baseline passed; mixed-outcome human checks were identified. |
| Advance responders could not reliably reach attack range | Mactan Defense Phase 4A | Advance-only forward boundary changed from `Defense Line + 120 px` to `Defense Line + 170 px`. | Automated verification passed; focused human feel check remains appropriate. |
| Phase 2 preparation prompt could overlap the decision timer | Mactan story decision UI | Shortened the Mactan content prompt; shared presenter was intentionally unchanged. | User accepted browser review. |
| Per-node story backgrounds visibly drifted and resampled while dialogue was static | Mactan story presentation | Removed the continuous per-node Ken Burns tween from `StoryBackdrop.buildSlide()` while retaining the existing cover scale, overscan, scrim, and cross-fade. | Browser sampled 90 frames and a 20-second idle interval with identical image x/y/scale/display values; typecheck/build/diff checks passed. |

## Deferred

| Issue / observation | Area | Why deferred | Revisit when |
|---|---|---|---|
| Wider Mactan battlefield does not yet visually distinguish all zones strongly | Mactan environment art | Visual-production work, not a Phase 2B gameplay defect. | Approved Mactan visual-art phase. |
| Current Mactan art families have style/authenticity inconsistencies | Assets | Requires approved asset replacement/harmonization, not gameplay changes. | Stage 1 visual production. |
| No lint script is configured | Engineering tooling | Dependency/configuration work requires separate approval. | Approved project-health task. |
| Phase 4B regroup visual polish and clearer desktop signal guide | Mactan presentation | Explicitly postponed under the gameplay feature freeze. | Approved visual/usability revision. |

## Maintenance rule

Add a bug only when a defect is observed or reproducibly evidenced. Include the relevant verification path. When fixed, move its existing history to **Fixed** and update `TEST_LOG.md` in the same task.
