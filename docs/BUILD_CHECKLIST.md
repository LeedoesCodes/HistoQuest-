# Build Checklist

Use this checklist before a demo, release, or handoff. It does not authorize installing missing tooling or changing configuration.

## Required baseline

- [ ] `npm.cmd run typecheck` passes.
- [ ] `npm.cmd run build` passes.
- [ ] `git diff --check` passes.
- [ ] No unrelated worktree changes are included in the handoff.
- [ ] Relevant living documentation has been updated: status, roadmap, test log, bugs, architecture, assets, decisions, prompts, and research as applicable.

## Mactan gameplay changes only

Run all of these when a change affects Mactan state, spawning/completion, Hold, Fall Back, Advance, defense stages, breaches/repels, covered camera/HUD behavior, or result flow.

- [ ] `npm.cmd run test:mactan` passes.
- [ ] Generated Mactan screenshots were reviewed when the changed behavior is covered by them.
- [ ] Automated results are reported separately from manual playtests.

## Manual gameplay and presentation review

- [ ] English text reads correctly.
- [ ] Filipino text reads correctly and fits its UI.
- [ ] Desktop keyboard/mouse controls work.
- [ ] Touch controls work.
- [ ] Target viewport layout is readable; HUD, dialogue, controls, and result panels do not overlap.
- [ ] Camera bounds, transitions, and return flow behave correctly where relevant.
- [ ] New or changed gameplay is understandable and age-appropriate for Grade 5 learners.
- [ ] Asset changes were inspected at actual in-game scale and against the approved style guide.

## Before claiming completion

- [ ] State exactly which automated commands passed or failed.
- [ ] List remaining manual checks and known limitations.
- [ ] Do not claim an unperformed browser, touch, screenshot, or historical-authenticity review.
