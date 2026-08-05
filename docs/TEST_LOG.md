# Test Log

This log records only results evidenced by repository scripts or reported playtests. Where the precise date is unavailable, it is stated rather than inferred.

| Date | Feature tested | Automated tests passed | Manual tests performed | Bugs discovered | Resolution | Remaining issues |
|---|---|---|---|---|---|---|
| Exact date not recorded | Mactan dialogue decisions, timers, bilingual layout, and mini-game transition (Phases 1–3) | Typecheck/build/diff checks reported as passing during implementation | User accepted browser review of the two added decisions and final support-and-coordination decision | Initial context and prompt-spacing issues were found and corrected before acceptance | `mac_s1b` context node and shorter preparation prompt added; decisions then frozen | Revisit only on a specific later playtest defect |
| Exact date not recorded | Mactan Defense Phase 1B through Phase 2B | Typecheck/build/diff checks reported as passing during implementation | User accepted Hold, local group support, recovery, scrollable world, defense stages, regrouping, and response-expiry behavior | Auto-victory, local coordination, response expiry, and stage-regroup presentation defects were found | Approved scoped fixes completed; Phase 1B/2B frozen | Wider-world visual background/zone polish deferred |
| Exact date not recorded | Mactan Defense Phase 3 | Typecheck/build/diff checks reported as passing during implementation | Tactical Fall Back was manually reviewed as part of later playthroughs | A terminal soft-lock was observed at Village Edge after mixed outcomes | Spawner now uses successful repels and living-enemy count rather than historical spawned count; breached enemies can be replaced | User planned mixed-outcome manual confirmations; keep watching for terminal-state regressions |
| 2026-08-02 (recorded implementation cycle) | Mactan regression suite and Phase 4 Advance | `npm.cmd run typecheck`, `npm.cmd run test:mactan`, `npm.cmd run build`, and `git diff --check` passed | Browser automation captured shoreline, fallback tutorial, beach, village edge, advance tutorial, success, and recovery states | Advance formation initially could not reliably reach attack range before the target aimed | Advance-only forward boundary changed from `Defense Line + 120 px` to `Defense Line + 170 px`; no other accepted values changed | Focused human playtest of latest Advance moment-to-moment behavior remains appropriate |

| 2026-08-03 | BG-001 Mactan reef story background integration | `npm.cmd run typecheck` and `npm.cmd run build` passed; final `git diff --check` pending documentation update | Playwright captured the integrated `mac_s1b` reef story node with Filipino and English dialogue overlays | First capture reached a later character card; corrected by tracing the pre-test/title/node sequence | Approved candidate 02 was copied unchanged to `mactan/scene_reef.png`; old runtime file archived in `art_source/` | Review the top-left arc-title contrast against bright cloud areas on target devices; no dialogue-panel overlap observed |

| 2026-08-03 | BG-002 through BG-008 Mactan story-background candidate previews | `npm.cmd run typecheck`, `npm.cmd run build`, and `git diff --check` passed; browser preview itself produced no console or page errors | Each staged candidate was shown through its real Mactan story beat in Filipino and English; 14 screenshots captured | No runtime/presenter error observed; review concerns are recorded in `art_source/mactan/backgrounds/REVIEW_INDEX.md` | Each original runtime image was backed up, checksummed, restored in a `finally` cleanup path, and verified byte-for-byte | Human approval or regeneration choice is still required for every candidate; no unapproved image is integrated |

| 2026-08-03 | BG-002 through BG-008 permanent story-background integration | `npm.cmd run typecheck`, `npm.cmd run build`, and `git diff --check` are run after integration; post-integration browser captures have no console or page errors | Fresh Filipino and English in-presenter screenshots were captured for all seven approved backgrounds | No scaling, stretching, clipping, dialogue-readability, or title-readability regression observed in the 900 × 680 review viewport | Each approved source was copied unchanged to its current runtime filename; former runtime images were archived; source/runtime SHA-256 values match | Validate only on target device sizes if a specific visual issue is reported |

| 2026-08-03 | Static per-node Mactan story backgrounds | `npm.cmd run typecheck`, `npm.cmd run build`, and `git diff --check` passed | Playwright sampled the Reef story slide over 90 frames and after 20 seconds; the existing Filipino/English integrated-scene screenshots retain the same initial framing | Continuous background drift was visible during dialogue scenes | Removed only the `StoryBackdrop.buildSlide()` motion tween | Cross-fades and all target-device image/title/dialogue checks remain appropriate if a specific regression is reported |

## Required Mactan automated baseline

Run after any change affecting Mactan mini-game state, spawning/completion, Hold, Fall Back, defense stages, breaches/repels, covered camera/HUD behavior, or result flow:

1. `npm.cmd run typecheck`
2. `npm.cmd run test:mactan`
3. `npm.cmd run build`
4. `git diff --check`

Report those automated results separately from manual playtests. Do not expand hooks or tests unless an approved future state cannot be verified through the current interface.

## Manual checks that remain valuable

- Readability and fit of Filipino and English text at target desktop and touch sizes.
- Moment-to-moment pacing, player comprehension, and Grade 5 appropriateness.
- Sprite animation, camera feel, collision feel, and visual clarity in a real browser.
- The latest Advance geometry correction: coordinated exchange, cancellation on aim/pressure, and return-to-anchor feel.
- Mixed breach/repels paths through to success or recovery, if not already manually confirmed after the soft-lock correction.
