# Design Decisions

Last repository review: 2026-08-03

Record intentional choices here when they affect future implementation. Entries record only decisions evidenced by repository code or approved project direction.

| Decision | Reasoning | Alternatives considered | Status |
|---|---|---|---|
| Use one long-lived Phaser `GameScene` with async presenters | Arc flow is linear; awaiting presenters keeps sequencing visible and avoids cross-scene lifecycle handoffs. | Multiple Phaser scenes per screen/minigame. | Accepted |
| Keep story data in `src/game/content/` | Bilingual text, assessments, and node order can be authored as data while reusable presenters stay shared. | Hardcode story flow inside presenters. | Accepted |
| Keep Mactan decisions convergent | Choices support reflection and behavioral logging without changing the documented historical outcome or requiring branching progression. | Alternate story branches. | Accepted |
| Keep the Mactan child in a support role | The child is fictional and Grade-5-aged; adults and warriors remain responsible for actual defense. | Child weapon use or direct combat. | Accepted |
| Use local relay signals for Mactan defense | Hold, Regroup/Fall Back, and Advance represent relaying nearby information to adults, not commanding an army. Their range, response limits, and validity rules prevent automatic victory. | A single cosmetic signal; global command controls. | Accepted, gameplay frozen |
| Treat `TOTAL_ENEMIES` as successful repels needed for victory | Breached enemies must be replaceable after one or two breaches so a mixed outcome cannot deadlock the encounter. | Cap all historical enemy instances at six. | Accepted |
| Use dynamic optional asset discovery and procedural fallbacks | The game remains runnable while art is delivered gradually; no presenter should require an asset just to function. | Mandatory predeclared asset manifests with no fallback. | Accepted |
| Use runtime-generated sound effects for now | Web Audio feedback requires no audio files and does not block gameplay if unavailable. | Require prerecorded audio assets. | Accepted, revisit only with approved audio work |
| Keep Supabase optional in development | Developers can run the game without service credentials; logging flushes when configuration exists. | Require Supabase for every local run. | Accepted |
| Use parallel pre/post assessment forms | Equivalent learning-objective coverage reduces memorization while preserving comparable assessment difficulty. | Fixed repeated questions; unconstrained random questions. | Accepted |
| Freeze Mactan gameplay after Phase 4A | Prevent feature creep; allow only explicit design revisions or specific regression fixes. | Continue adding mechanics/polish opportunistically. | Accepted |
| Use `ART_PRODUCTION_GUIDE.md` as visual source of truth | Ensures prompt, palette, historical, tool, and export consistency across future assets. | Per-asset ad hoc visual direction. | Accepted |
| Defer linting/tooling changes | There is no configured lint script; adding packages/configuration requires a separate approved task. | Install/configure linting during gameplay work. | Deferred |
| Defer Phase 4B regroup visual polish and desktop control guide | They are scoped visual/usability follow-ups, not reasons to reopen frozen gameplay. | Bundle them into Phase 4A. | Deferred |

| Freeze STYLE-001 as the default visual reference | [`docs/references/STYLE-001.png`](references/STYLE-001.png) gives every future asset one approved benchmark for palette, pixel treatment, detail, historical tone, and UI treatment. | Continue using inconsistent current assets; select references ad hoc per prompt. | Accepted |

## Entry rule

For a meaningful approved choice, append a concise row before closing the relevant task. Mark alternatives as **Deferred** or **Rejected** only when that status was explicitly decided; do not invent a decision record from a passing suggestion.
