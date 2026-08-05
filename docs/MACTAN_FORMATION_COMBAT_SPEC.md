# Mactan Formation Combat — Authoritative Specification

**Status:** Approved design. Implementation has not started. **Phase 1 is unblocked.**
**Approved:** 2026-08-05
**Amended:** 2026-08-05 — Milestone 0D resolved the implementation-blocking open items (§21).
**Supersedes:** the relay-defense gameplay design and its freeze records.
**Rollback target:** commit `80208ef27e73f4f770efc511ba7fb2232a5e43a2`, branch `mactan-relay-fallback-baseline`, tag `mactan-relay-fallback`.

This document is the single authoritative gameplay design for the Mactan battle
mini-game. Where it conflicts with any older Mactan gameplay document, this
document governs.

## Annotation convention

Every substantive statement carries one of three marks. The distinction is
binding: it records what has been approved versus what still needs a decision.

| Mark | Meaning |
|---|---|
| **[FROZEN]** | Explicitly approved. Do not revise without a recorded design revision. |
| **[TUNABLE]** | Approved **starting value**, not frozen final balance. May be adjusted by playtest without a design revision. The surrounding *rule* is frozen; only the number moves. |
| **[DERIVED]** | Not stated in the approval, but mechanically entailed by a frozen decision or by existing repository architecture. Implementable; flag it if a playtest contradicts it. |
| **[OPEN]** | Not specified by the approved design. **Requires approval before it is implemented.** Do not resolve an `[OPEN]` item by inventing a mechanic. |

`[OPEN]` items are collected in §20. They are the known gaps in this
specification, recorded deliberately rather than filled in. §21 records which
of them have since been resolved by amendment.

---

## 1. Design intent and educational goals

**[FROZEN]** The story protagonist remains the child. The child is the narrative
point of view for the arc.

**[FROZEN]** During the battle only, the player controls one unnamed adult
Mactan defender. The child does not fight. There is no child combat.

**[FROZEN]** The player is the formation's only free agent. Allies fight
persistently and autonomously; the player moves between pressure points and
tips local skirmishes.

**[FROZEN]** The player tips local skirmishes through **positioning**, not
through stronger stats. The player is not a superior unit.

**[FROZEN]** Invaders are pushed and repelled **toward the sea**. They are not
killed for score. There is no gore and no kill counter.

**[FROZEN]** The historical result is fixed: **Mactan wins.** The village never
falls and Spain never wins. Player skill affects stars and decisiveness, never
the historical outcome.

**[DERIVED]** The educational proposition follows from the frozen combat math in
§10: one defender roughly holds one ordinary invader, and two defenders clearly
repel one. The learner should come to understand that Mactan's victory rests on
**numbers, local knowledge, and coordination** rather than on individual heroics
— which is why the player is a free agent who creates local advantage rather
than a stronger fighter who wins alone.

**[DERIVED]** The spatial reading of the battlefield (§4) is itself educational:
the invaders must cross deep water and coral to reach a defending line already
standing in the shallows. This is the same relationship established by the
approved historical gate in `docs/research/mactan_1521_battlefield_geography.md`.

**Constraint carried forward from the project brief.** Violence is implied, not
shown. The target learner is a Grade 5 pupil.

## 2. Superseded relay systems

The following systems belong to the relay-defense design. They remain intact and
verified at the rollback target and are **superseded, not deleted**. Their
historical context is preserved in `docs/DECISIONS.md`.

| Superseded system | What it was |
|---|---|
| Child-as-signaller support role in combat | The player controlled the child, who relayed signals to adults and never fought. |
| Hold relay with responder caps and timers | `HOLD_MAX_RESPONDERS`, `HOLD_RESPONSE_DURATION`, `HOLD_RESPONSE_EXTENSION`, `HOLD_COOLDOWN` — adults responded to a signal for a bounded time, then disengaged. |
| Timer-based ally disengagement | Allies returned to a default posture when a response expired. **Explicitly reversed** — see §8. |
| Three-stage retreating defense line | `DEFENSE_STAGES` = shoreline → beach → village edge, with a capped defense meter per stage. |
| Breach / recovery loop | `BREACH_LIMIT`, breach-driven recovery result, and repel-count victory (`six repels`). |
| Side-view platformer geometry | Jump and crouch as shot-dodging verbs, `SHOT_Y` high/low shot lanes, feet-on-ground side elevation. |
| Advance and Fall Back as one-shot relay events | Bounded responses with cooldowns rather than persistent postures. **Explicitly reversed** — see §11. |

**[FROZEN]** Jump is excluded from the initial implementation. It is **not**
permanently forbidden and may be reintroduced by a later approved revision.

**[DERIVED]** Because the side-view dodge geometry is superseded, the crouch verb
and the high/low shot-lane model have no role in the initial baseline. Ranged
threat is handled per §9 instead.

## 3. Preserved project architecture

Nothing in this redesign changes the following. They are repository facts and
remain binding.

- **React owns the page; Phaser owns the canvas.** The only boundary is
  `src/game/HistoryGame.tsx`.
- **One long-lived `GameScene`.** Formation Combat is a **presenter**, not a new
  Phaser scene. `GameScene.mainLoop()` continues to await one presenter at a
  time.
- **Mini-game registry.** `getMiniGame(key)` in
  `src/game/presenters/miniGames/index.ts` resolves a presenter by the content
  node's `key` and resolves a standard `MiniGameResult` (`score`, `attempts`,
  `msSpent`).
- **Arcs are data, not code.** Story and decision flow stay in
  `src/game/content/`. Only the mini-game is arc-specific.
- **The presenter cleanup rule (CRITICAL).** Every `scene.add.*` must live in a
  container destroyed on exit; every `scene.input.on` / `scene.events.on` must
  be paired with an `.off`; every DEV `window.*` hook must be deleted on exit.
  This rule has been violated four times in this repository's history.
- **Art is additive.** Every draw site degrades gracefully via `hasImage(key)`
  and code-art fallbacks. Formation Combat must be demo-able with zero new art.
- **Behavioral logging.** The presenter continues to emit `minigame_complete`
  and its existing behavioral events. The classifier contract is unchanged.
- **Localization.** Learner-facing strings use `t()` keys in
  `src/game/i18n/messages.ts`, authored Filipino and English.

**[DERIVED]** Formation Combat is registered as a **new presenter** rather than
an edit of `mactanDefense.ts`. The relay presenter stays registered and
functional until the vertical slice is accepted (§19).

## 4. Battlefield coordinate and camera model

### 4.1 World and axes

- **[FROZEN]** World is approximately **2400 × 600**.
- **[FROZEN]** The **long horizontal axis is the shoreline**.
- **[FROZEN]** The **short vertical axis is sea-to-village depth**.
- **[FROZEN]** **Sea at the top. Village at the bottom.**
- **[FROZEN]** Presentation is **shallow-oblique 3/4** — not a pure side view and
  not a pure top-down.
- **[FROZEN]** The battlefield must read as **one continuous shoreline**, never as
  separate combat arenas.

This is a full reorientation. Under the relay design the vertical axis was
elevation and gravity; here it is depth into the water. Nothing in the relay
presenter's geometry carries over unexamined.

### 4.2 Depth bands

**[FROZEN]** Terrain is represented as horizontal depth bands, ordered top to
bottom:

| Order | Band | `y` range | Role |
|---|---|---|---|
| 1 | Horizon / distant ships | **0–90** | Scenic only. Non-playable by any actor. |
| 2 | Deep-water approach | **90–210** | Enemy origin and entry. |
| 3 | Coral reef | **210–320** | Crossing band between approach and fighting zone. |
| 4 | Shallows / active fighting zone | **320–470** | The playable line. Defender formation stands here. |
| 5 | Village / home | **470–600** | Protected. **Never entered by enemies.** |

**[FROZEN]** The band ordering, their roles, and the rule that enemies never
enter the village band.

**[TUNABLE]** The `y` boundaries above are starting values and may be tuned
during playtest.

**[DERIVED]** Actor reachability follows from the frozen roles: enemies occupy
bands 2–4 and are removed seaward at the top of band 2; defenders operate in
band 4, with band 3 reachable only insofar as an approved Advance moves the
formation seaward (§11); no actor enters band 1; and no enemy enters band 5.

**[DERIVED]** The fighting zone is 150 px deep and the formation line sits
within it, which is what keeps a 600 px-tall world readable under fixed vertical
framing (§4.5) — the entire playable depth is always on screen.

### 4.3 Directional rules

- **[FROZEN]** Enemies wade **downward** from the sea.
- **[FROZEN]** Repelled enemies are pushed **upward** toward the sea.
- **[FROZEN]** Advance moves the formation **seaward** (up).
- **[FROZEN]** Fall Back moves the formation slightly **toward home** (down) but
  **never into the village**.

**[DERIVED]** A hard lower boundary is therefore required on formation position:
Fall Back must clamp above the village band. This is the structural guarantee
behind "the village never falls" (§16) and must not be left to tuning.

### 4.4 Formation span

- **[FROZEN]** Starting formation span is approximately **1600 px** within the
  2400 px coast, and **remains a playtest tuning value**.

**[DERIVED]** With 8 defenders across ~1600 px, nominal spacing is ~200 px. The
800 px camera viewport shows roughly 4 defenders at once, which is what makes
off-screen pressure cues (§4.5) necessary rather than decorative.

### 4.5 Camera

- **[FROZEN]** Horizontal semi-scroll **only**.
- **[FROZEN]** Fixed vertical framing.
- **[FROZEN]** Soft deadzone.
- **[FROZEN]** Gentle easing.
- **[FROZEN]** Slight directional or pressure look-ahead.
- **[FROZEN]** Screen-edge indicators for off-screen pressure points and
  overwhelmed allies.
- **[FROZEN]** Optional temporary zoom-out is **deferred to polish**. Not in the
  initial baseline.

### 4.6 Camera constants (Phase 1 / Phase 2 starting values)

| Constant | Value | Mark |
|---|---|---|
| World size | 2400 × 600 | **[FROZEN]** |
| Base viewport | 800 × 600 | **[FROZEN]** |
| Horizontal soft deadzone | ~**240 px** wide | **[TUNABLE]** |
| Horizontal camera lerp | **0.10** | **[TUNABLE]** |
| Directional / pressure look-ahead | ~**100 px** | **[TUNABLE]** |
| Vertical framing | Fixed | **[FROZEN]** |
| Camera bounds | Clamped to world edges | **[FROZEN]** |
| Temporary multi-pressure zoom-out | Deferred to polish | **[FROZEN]** |

**[FROZEN]** **Phase 1 may use a static camera window**, because the Phase 1
sandbox does not yet need coastline patrol. **Semi-scrolling begins when the
formation spans the coast** — that is, from the phase in which the line is
present across the shoreline.

**[DERIVED]** A 240 px deadzone inside an 800 px viewport leaves 280 px on each
side before the camera moves, so ordinary attacking and repositioning near a
pressure point will not scroll the view — the camera reacts to travel along the
coast, not to local footwork.

**[OPEN]** The visual form of the screen-edge indicators.

## 5. Formation data model

**[FROZEN]** The formation contains **8 total defenders including the player**.

**[FROZEN]** The formation holds a **line along the shoreline** in the shallows.

**[FROZEN]** The player is the formation's only free agent. The other 7 defenders
are bound to the formation.

**[DERIVED]** The formation therefore needs, at minimum:
- an ordered set of **slots** along the horizontal axis;
- a **formation depth** (the current `y` of the line), moved by Advance and Fall
  Back and clamped per §4.3;
- a **posture** (the current standing command, per §11);
- per-slot occupancy, so a slot whose defender is knocked down is recognisable as
  a gap.

**[OPEN]** Whether slots are fixed positions or relative offsets; whether the
player occupies a slot or is fully unbound; how a knocked-down defender's slot is
represented and whether neighbours shift to cover it.

## 6. Pressure-point rules

**[FROZEN]** Pressure points identify **local sections of the line that need
player help**.

**[FROZEN]** At most **one strong pressure cue during onboarding**, and **at most
two later**.

**[DERIVED]** The cue cap is a legibility guarantee for a 10-year-old, not a
spawn cap. It constrains how many pressure points may be *signalled as strong* at
once; it does not by itself constrain how many line sections are under load.

**[DERIVED]** Pressure points are the navigational spine of the mode: they are
what the free agent moves *between*, and what the screen-edge indicators (§4.5)
point at when off-screen.

**[OPEN]** How a pressure point is computed (local invader-to-defender ratio,
defender composure, slot gaps, or a combination); its severity thresholds; how it
is signalled on-screen; and how long a cue persists after the condition clears.

## 7. Player state machine

**[FROZEN]** Player abilities in the initial baseline are exactly:

1. **Movement**
2. **Deliberate attack**
3. **Brace / block**
4. **Short repositioning dash**
5. **Formation commands** — Hold / Advance / Fall Back (§11)

**[FROZEN]** Jump is **excluded** from the initial implementation.

**[FROZEN]** "Deliberate attack" — the attack is a committed action, not a
spammable one. The player wins by positioning, not by output.

**[DERIVED]** The minimum state set is therefore: `idle`, `moving`, `attacking`,
`bracing`, `dashing`, `knocked_down`, `recovering`. Formation commands are issued
from any non-committed state and do not interrupt the player's own action.

**[DERIVED]** The player is subject to footing/composure and knockdown like any
other defender (§10) — the player has no separate survival model, because the
player is not a stronger unit.

**[OPEN]** Attack windup/active/recovery timings; whether brace is a hold or a
timed parry; dash distance, duration, cooldown, and whether it grants
invulnerability; whether attack and dash may be cancelled into each other;
player knockdown recovery duration.

> Note: the relay-era baseline used a guaranteed-i-frames dash (an explicit
> child-fairness decision at the time). That decision belonged to the superseded
> design and is recorded here as precedent only — it is **not** carried forward
> automatically.

## 8. Ally state machine

**[FROZEN]** Allies fight **persistently and autonomously**.

**[FROZEN]** Allies remain **locally bounded** — they hold their section of the
line and do not chase across the battlefield.

**[FROZEN]** Allies **do not disengage after a short timer.** This explicitly
reverses the relay design's timed-response model. An ally engaged with an invader
stays engaged.

**[DERIVED]** The minimum state set is: `holding` (at station, no local threat),
`engaged` (fighting a local invader), `repositioning` (returning to station or
moving with a formation command), `knocked_down`, `recovering`.

**[DERIVED]** Ally target selection must be **local** — bounded by the ally's
station, not by global proximity — or the "locally bounded" guarantee is lost.
The relay build's ally implementation drifted toward chasing; that failure mode
is a known risk (§19).

**[OPEN]** Station leash radius; target-selection rule within that radius;
whether two allies may engage the same invader; knockdown recovery duration; and
whether a knocked-down ally's neighbours adjust.

## 9. Enemy state machine

**[FROZEN]** Initial enemy archetypes are exactly three:

| Archetype | Role |
|---|---|
| **Standard** | The ordinary invader that §10's combat math is defined against. |
| **Pusher / Heavy** | Applies heavy forward pressure against the line. |
| **Ranged / Skirmisher** | Threatens at distance rather than in contact. |

**[FROZEN]** **4–5 active invaders**, with a **hard enemy concurrency cap of 5**.

**[FROZEN]** Enemies wade downward from the sea and are pushed back upward when
repelled.

**[DERIVED]** The minimum state set is: `wading` (crossing the approach and reef
bands), `engaging` (closing on a defender), `fighting`, `staggered`,
`pushed_back` (moving seaward under repulsion), `repelled` (removed at the sea
boundary).

**[DERIVED]** The concurrency cap is described as **hard** — it is a correctness
invariant to be asserted in tests (§17), not a soft pacing target.

**[FROZEN]** Reef and deep-water crossing behaviour is resolved: invaders are
slowed by band and recover more slowly from push and stagger while in coral
(§12.1). Enemy movement speed is therefore always the archetype's base speed
multiplied by its current band multiplier.

**[DERIVED]** A **leader** participates in Phase 3 only (§13.3). It is a scripted
encounter actor, not a fourth spawnable archetype, and does not count against the
three-archetype rule above.

**[OPEN]** Per-archetype behaviour: Pusher/Heavy's pressure mechanic and its
counter; Ranged/Skirmisher's threat model, range, telegraph, and the counter
(brace, positioning, or closing distance); spawn cadence and archetype mix.

## 10. Combat resolution

**[FROZEN]** Defenders use **footing / composure and knockdown**, not lethal HP.

**[FROZEN]** Invaders are **pushed and repelled toward the sea**, not killed.

**[FROZEN]** The core balance targets:
- **One defender roughly holds one ordinary invader** — a stalemate, not a win.
- **Two defenders clearly repel one ordinary invader** — decisive.

**[FROZEN]** The player tips local skirmishes through positioning, not stats.

**[DERIVED]** These two targets are the load-bearing equation of the whole mode.
Together they mean the player's contribution is to **create local 2-against-1**,
by joining a held section or by freeing an ally to double up. They also mean a
single defender must never lose outright while unaided — one-on-one is a hold,
so an unattended section degrades slowly enough for the free agent to reach it.

**[DERIVED]** Because there is no lethal HP on either side, the resolution
currency is positional: a contest moves an invader seaward (progress) or moves
the contested point homeward (pressure). Knockdown is a temporary removal from
the contest, not a death.

**[OPEN]** The composure model itself: composure scale, what depletes and
restores it, knockdown threshold, knockdown duration, recovery behaviour, and
whether composure is shared or per-actor. The numeric expression of "roughly
holds" versus "clearly repels". Whether the player's brace protects neighbours.

## 11. Formation commands

**[FROZEN]** Commands are **persistent postures**, not one-shot events. This
explicitly reverses the relay design's bounded-response-with-cooldown model.

| Command | Approved behaviour |
|---|---|
| **HOLD** | **[FROZEN]** Remains active until replaced by another command. |
| **ADVANCE** | **[FROZEN]** Remains active **while safe and cohesive**. Moves the formation seaward (§4.3). |
| **FALL BACK** | **[FROZEN]** Performs a **short organized regroup**, then **returns to HOLD**. Moves the formation slightly homeward, never into the village. |

**[DERIVED]** HOLD is the default and terminal posture: Fall Back resolves into
it, and Advance falls out of it when its safe-and-cohesive condition breaks. The
posture state machine is therefore `HOLD ⇄ ADVANCE` and `HOLD → FALL BACK →
HOLD`.

**[DERIVED]** Advance ending on its own when the line stops being safe or
cohesive is a *self-correcting* rule — the player is not punished for a
mistimed Advance, which suits the age bracket.

**[OPEN]** The definitions of "safe" and "cohesive" as evaluable conditions; the
Fall Back regroup duration and distance; whether commands have any cooldown or
input debounce; whether a command applies to the whole line or to a section.

## 12. Terrain behavior

**[FROZEN]** The five depth bands of §4.2 are the terrain model.

**[FROZEN]** The coral reef sits between the deep-water approach and the
shallows, on the invaders' path.

**[FROZEN]** Fall Back never enters the village band.

**[DERIVED]** The reef is the environmental expression of the arc's central
teachable ("mababaw ang tubig" — the water is shallow) and of the approved
historical gate: large craft could not reach dry shore.

### 12.1 Terrain effects

**[FROZEN]** Terrain acts on invaders through **movement and recovery
multipliers keyed to the depth band**, and nothing more.

- **[FROZEN]** Invaders move **more slowly** in the deep-water and coral bands.
- **[FROZEN]** Invaders recover **more slowly** from push and stagger while in
  the coral band.
- **[FROZEN]** Concentrated defender pressure is therefore **more effective**
  while an invader has poor footing in coral or shallow water.
- **[FROZEN]** Defenders move **normally** within the approved fighting area.
- **[FROZEN]** **Coral does not automatically damage anyone.** No chip damage, no
  environmental hazard.

**[FROZEN]** The purpose is to let the player feel that shallow water and coral
weakened the landing force.

### 12.2 Implementation constraints

**[FROZEN]** Terrain is implemented as **readable horizontal bands with simple
multipliers**. Explicitly excluded from the baseline:

- per-tile terrain
- pathfinding
- procedural obstacles
- complex collision

**[DERIVED]** A band lookup is therefore a function of `y` alone — the actor's
current band selects its multipliers. No terrain geometry, grid, or navmesh is
required, and none should be introduced.

### 12.3 Starting multipliers

**[TUNABLE]** Starting playtest values, **not frozen final balance**:

| Multiplier | Value |
|---|---|
| Invader movement — deep water | **0.50** |
| Invader movement — coral | **0.65** |
| Invader movement — shallows | **0.80** |
| Invader stagger/push recovery duration — coral | **× 1.35** |
| Defender movement — fighting zone | **1.00** |

**[DERIVED]** The gradient runs 0.50 → 0.65 → 0.80: invaders accelerate as they
close, so the crossing reads as a costly approach that eases only once they
reach the defenders — and the coral, where they are both slow and slow to
recover, is the band where a doubled-up defender pair is most decisive. This is
the frozen "two defenders clearly repel one" (§10) expressed through terrain
rather than through a separate mechanic.

**[OPEN]** Whether tide or any dynamic terrain state exists. Not required for the
vertical slice; assume static bands.

## 13. Phase progression

**[FROZEN]** An onboarding period exists and is distinguished by its cue budget:
at most **one** strong pressure cue during onboarding, at most **two** later
(§6).

**[FROZEN]** Maximum **2** automatic rally recoveries (§16).

**[FROZEN]** The encounter runs **three phases**.

### 13.1 Phase 1 — Hold the waterline

- **[FROZEN]** Begins with **Standard** invaders only.
- **[FROZEN]** Completes after **4 total invaders have been repelled**.

**[DERIVED]** This is the onboarding phase, so it carries the 1-strong-cue budget
of §6.

### 13.2 Phase 2 — Break the landing

- **[FROZEN]** Permits the **broader initial enemy set** — Standard,
  Pusher/Heavy, and Ranged/Skirmisher (§9).
- **[FROZEN]** Completes when **both** conditions hold:
  1. **8 total invaders** have been repelled (cumulative across the encounter);
  2. the formation has **successfully advanced seaward at least once** to the
     approved advance threshold.

**[DERIVED]** The second condition is what makes Advance a required verb rather
than an optional one: the player cannot finish Phase 2 by attrition alone, so
the posture system must be understood before the leader arrives.

**[OPEN]** The **advance threshold** — the seaward formation depth that counts as
a successful Advance. It is referenced by the frozen completion rule but not yet
given a value. Needed before Phase 4 of the migration plan, not before Phase 1.

### 13.3 Phase 3 — Repel the leader

- **[FROZEN]** The **leader** enters with **limited supporting enemies**.
- **[FROZEN]** Completes when the leader's **repel stability is exhausted**.
- **[FROZEN]** The leader and the remaining landing force **withdraw seaward**.
- **[FROZEN]** **No graphic death is shown.**

**[DERIVED]** "Repel stability" is the leader's analogue of defender composure
(§10) — a pool that concentrated pressure exhausts, resolving in withdrawal
rather than in a kill. This keeps the leader consistent with the frozen rule that
invaders are repelled, never killed for score, and with the project's
violence-implied-not-shown bar.

**[DERIVED]** The leader is a **fourth encounter actor** alongside the three
initial archetypes of §9. §9's "exactly three archetypes" governs the ordinary
landing force; the leader is a single scripted Phase 3 participant, not a fourth
spawnable archetype.

**[OPEN]** The leader's repel-stability magnitude, its behaviour pattern, its
telegraphs, and the composition of its limited support. Needed before migration
Phase 6, not before Phase 1.

### 13.4 Completion

**Normal completion — [FROZEN]:** Phase 3 completion produces a historically
correct **Mactan victory**.

**Soft-fail completion — [FROZEN]:**

- A **severe cohesion collapse** triggers an **automatic rally**.
- Maximum automatic rallies: **2**.
- A **third** severe collapse **auto-resolves the encounter as a modest one-star
  Mactan victory**.
- **Spain never wins. The village never falls. The narrative always continues.**

**[DERIVED]** This closes the gap flagged in the previous revision: the third
collapse now has a defined resolution, so the fixed-victory guarantee holds under
every input path including sustained failure. Failure costs stars and
decisiveness, never the outcome or the story.

**[OPEN]** The definition of **severe cohesion collapse** as an evaluable
condition, and the per-phase spawn pacing and enemy mix. Needed before migration
Phase 6, not before Phase 1.

## 14. HUD and controls

**[FROZEN]** Five control affordances, matching §7: move, attack, brace, dash,
and the three formation commands.

**[FROZEN]** Screen-edge indicators for off-screen pressure points and
overwhelmed allies (§4.5).

**[FROZEN]** No kill counter.

**[DERIVED]** Carried forward from the existing build as binding constraints:
the game targets a fixed logical 800 × 600 canvas; controls must work on
**both** desktop keyboard/mouse and touch; all learner-facing strings must be
authored in Filipino and English; and the HUD is fixed to the camera, not the
world.

**[DERIVED]** Three persistent postures plus four action verbs is a larger
control surface than the relay build presented. The current posture must be
continuously visible, since it persists until replaced.

**[OPEN]** Key bindings and touch layout; how the three commands are presented
without crowding an 800 × 600 canvas; what line state the HUD shows given there
is no HP and no kill counter; and the tutorialisation of postures.

## 15. Initial balancing targets

**[FROZEN]** Vertical-slice scale:

| Quantity | Value |
|---|---|
| Total defenders (including player) | **8** |
| Active invaders | **4–5** |
| Hard enemy concurrency cap | **5** |
| Starting formation span | **~1600 px** within the 2400 px coast (tunable) |
| Maximum automatic rally recoveries | **2** |
| Strong pressure cues — onboarding | **1** |
| Strong pressure cues — later | **2** |
| Encounter phase 1 completion | **4** invaders repelled |
| Encounter phase 2 completion | **8** invaders repelled (cumulative) **and** ≥1 successful Advance |
| Third severe collapse | Auto-resolves as a **one-star** Mactan victory |

**[TUNABLE]** Terrain multipliers are tabled in §12.3 and camera constants in
§4.6. Both are starting playtest values.

**[FROZEN]** One defender ≈ holds one ordinary invader; two defenders clearly
repel one.

**[DERIVED]** At 8 defenders against a cap of 5 invaders, the defenders
outnumber the invaders — which is the historically correct relationship and the
inverse of the pre-relay lone-survivor prototype. But the ratio is under 2:1, so
the line **cannot** double up everywhere at once. That gap is precisely the
player's job.

**[OPEN]** All timing and rate values throughout this document. Every number in
this section is a starting point for playtest, except the concurrency cap and
the rally-recovery maximum, which are stated as hard limits.

## 16. Fixed victory and star-result model

**[FROZEN]** The historical result is fixed: **Mactan wins.**

**[FROZEN]** **The village never falls. Spain never wins.**

**[FROZEN]** Player skill affects **stars and decisiveness**, not the outcome.

**[FROZEN]** Maximum **2** automatic rally recoveries.

**[FROZEN]** No kill counter.

**[DERIVED]** "Automatic rally recovery" is the mechanism that makes the fixed
outcome honest rather than fake: when the line would otherwise fail, it rallies
— at most twice. Each rally consumed is the natural signal for a lower star
result, so the fixed victory is preserved while performance still reads
differently.

**[DERIVED]** The presenter must still resolve the existing `MiniGameResult`
contract (`score`, `attempts`, `msSpent`) and continue emitting behavioral
events; the star model maps onto that contract rather than replacing it.

**[FROZEN]** The third-collapse case is resolved (§13.4): after both rallies are
spent, a third severe cohesion collapse **auto-resolves the encounter as a modest
one-star Mactan victory**. The fixed outcome therefore holds under every input
path, including sustained failure and idling.

**[DERIVED]** One star is the floor, not a loss state. The star scale is
anchored at the bottom by that auto-resolution and at the top by a Phase 3
completion with rallies unspent.

**[OPEN]** The star thresholds between those anchors; whether rallies are the
sole star input or are combined with time, cohesion, or ground held; and what
"decisiveness" is as a measured quantity. Needed before migration Phase 6, not
before Phase 1.

## 17. Automated testing strategy

**[FROZEN by project process]** The required baseline after any Mactan gameplay
change is: `npm run typecheck`, `npm run test:mactan`, `npm run build`,
`git diff --check`.

**[DERIVED]** The existing `scripts/verify_mactan.mjs` verifies the **relay**
design — stages, breaches, responder caps, relay validity. It is the fallback's
suite and must keep passing for as long as the relay presenter remains
registered. Formation Combat needs its **own** suite; the relay suite is not
adapted or replaced while the fallback is live.

**[DERIVED]** The established and proven verification pattern in this repository:
a DEV-only `window.__mg` hook exposing state plus deterministic action methods,
driven by Playwright in a real headless browser. This is used because
**frame-pumping misreports tween speed** — real rAF is required for anything
positional. Screenshots are mandatory for visual/geometry claims; an object-tree
assertion is not proof that something looks right.

**[DERIVED]** Invariants that should be asserted rather than eyeballed, because
each is stated as a hard rule:
- enemy concurrency never exceeds 5;
- the formation never enters the village band;
- rally recoveries never exceed 2;
- the encounter always resolves as a Mactan victory;
- strong pressure cues never exceed the phase budget (1 onboarding / 2 later);
- one-on-one resolves as a hold; two-on-one resolves as a repel;
- presenter teardown leaves no leaked objects, listeners, or `window` hooks.

**[OPEN]** The new suite's filename and npm script name; the DEV hook's exact
surface; and whether the two suites run under one command once the fallback is
retired.

## 18. Migration and implementation phases

**[FROZEN]** Implementation has **not** started. Phase 1 is the next milestone.

### 18.1 Presenter and registry strategy

**[FROZEN]** The redesign is built **beside** the verified relay fallback.

| Item | Value |
|---|---|
| New presenter file | `src/game/presenters/miniGames/mactanFormationCombat.ts` |
| Temporary registry key | `mactan_formation_combat` |

**[FROZEN]** Do **not** replace or rename `mactanDefense.ts` or the
`mactan_defense` key during the initial vertical-slice phases.

**[FROZEN]** The relay presenter remains **playable and testable** until the
Formation Combat vertical slice is accepted.

**[FROZEN]** Switching the story route from `mactan_defense` to
`mactan_formation_combat` **requires a later explicit approval**. It is not part
of any phase's completion criteria until that approval is given.

**[DERIVED]** Because the arc content still routes to `mactan_defense`, the new
presenter is unreachable through normal play during Phases 1–6. It is reached by
its registry key from the verification harness. That is intentional: it is what
keeps the game demo-able throughout the redesign.

**[FROZEN process]** Implementation proceeds in small playable milestones. Each
milestone leaves the game playable, and each ends with build, automated
verification, documentation update, and a stop for review.

**[DERIVED]** Proposed phase sequence. This is a **process** proposal, not a
gameplay design, and it is offered for approval rather than assumed:

| Phase | Deliverable | Leaves the game playable because |
|---|---|---|
| **1** | New presenter registered under a new key, with the reoriented 2400 × 600 world, depth bands, camera model (§4), and a movable player — no combat. | The relay presenter stays registered and is what the arc still routes to. |
| **2** | Formation data model and 7 autonomous allies holding a line (§5, §8). | Phase 1 plus a standing line; still reachable only by explicit dev routing. |
| **3** | Enemies, Standard archetype only, with the composure/knockdown resolution and the 1v1-holds / 2v1-repels targets (§9, §10). | First genuinely playable loop. |
| **4** | Formation postures and pressure points (§6, §11). | The mode's decision layer. |
| **5** | Pusher/Heavy and Ranged/Skirmisher archetypes (§9). | Full enemy composition. |
| **6** | Phase progression, rally recoveries, star result, HUD (§13, §14, §16). | Complete vertical slice. |
| **7** | Route the arc to Formation Combat; retire the relay presenter. | The cutover. Only after acceptance **and a separate explicit approval** (§18.1). |

**[FROZEN]** Until the vertical slice is accepted, the relay-defense presenter
remains the live implementation the arc routes to.

**[OPEN]** Approval of this phase breakdown. The presenter filename and registry
key are resolved in §18.1.

> **Terminology warning.** "Phase" is used for two different things in this
> document. **Encounter phases 1–3** (§13) are in-game pacing stages. **Migration
> phases 1–7** (this section) are implementation milestones. They are unrelated;
> migration Phase 1 builds no encounter phase at all.

## 19. Risks and rollback strategy

### Rollback

The verified relay-defense baseline is preserved at:

| Reference | Value |
|---|---|
| Commit | `80208ef27e73f4f770efc511ba7fb2232a5e43a2` |
| Branch | `mactan-relay-fallback-baseline` (pushed to `origin`) |
| Tag | `mactan-relay-fallback` (annotated, pushed to `origin`) |

That commit was verified in an isolated clean checkout: `typecheck`,
`test:mactan`, `build`, and `git diff --check` all pass without any excluded
asset or documentation change. It is the rollback target until the Formation
Combat vertical slice is accepted.

### Risks

| Risk | Why it is credible | Mitigation |
|---|---|---|
| **Allies drift from "locally bounded" into chasing.** | This exact failure occurred in the relay build; ally knockback pushed enemies toward the wall and allies followed. | Assert station leash in the new suite (§17). |
| **A full spatial reorientation invalidates reused geometry.** | The vertical axis changes meaning entirely — elevation becomes depth. Silently reusing relay constants would produce subtly wrong space. | Derive all geometry fresh; do not port constants. |
| **Presenter leaks.** | Four recorded leaks in this repository. The new presenter is larger than any prior one. | Follow the §3 cleanup rule; assert teardown in the suite. |
| **The fixed-victory guarantee is asserted only in prose.** | "The village never falls" is a design promise that must hold under all inputs, including idling. | Enforce structurally: clamp formation position (§4.3), cap rallies, assert in tests. |
| **Scope: many `[OPEN]` items remain.** | ~14 systems are unspecified, including the reef's mechanics and the encounter end condition. | Resolve by approval before the phase that needs them — not during implementation. |
| **The panel deadline.** | The outline defense needs ≥50% of the capstone built by ~mid-August 2026. | The fallback stays live and demo-able throughout; the cutover (Phase 7) is the last step, not the first. |
| **Two live presenters diverge.** | The relay presenter stays registered during development. | The cutover retires it in one step; the relay suite keeps passing until then. |

## 20. Explicit frozen decisions and open playtest tunables

### 20.1 Frozen decisions

Every **[FROZEN]** statement above is binding. In summary: the child remains the
narrative protagonist and never fights; the player controls one unnamed adult
defender during the battle only; allies are persistent, autonomous, and locally
bounded with no timed disengagement; the player is the only free agent and wins
through positioning, not stats; defenders use footing/composure and knockdown
rather than lethal HP; invaders are repelled seaward and never killed for score;
the historical outcome is fixed with Mactan victorious, the village never falling
and Spain never winning; skill affects only stars and decisiveness; commands are
persistent postures; the world is a ~2400 × 600 continuous shoreline with sea at
the top and village at the bottom in shallow-oblique 3/4; the camera scrolls
horizontally only with fixed vertical framing; the vertical slice is 8 defenders,
4–5 invaders, a hard cap of 5, and at most 2 rally recoveries; the three
archetypes are Standard, Pusher/Heavy, and Ranged/Skirmisher; jump is excluded
from the initial baseline but not permanently forbidden; and there is no gore, no
kill counter, and no child combat.

### 20.2 Open items requiring approval before implementation

These are **not** playtest tunables. Each is a design decision the approved
specification does not cover, and none may be resolved by inventing a mechanic.

Items are grouped by the earliest **migration phase** (§18) that cannot proceed
without them. Nothing in this table blocks migration Phase 1.

| § | Open item | Blocks from |
|---|---|---|
| 4.5 | Visual form of the screen-edge indicators. | Phase 4 |
| 5 | Slot model; whether the player occupies a slot; gap handling on knockdown. | Phase 2 |
| 6 | Pressure-point computation, thresholds, signalling, and cue persistence. | Phase 4 |
| 7 | Attack timings; brace as hold or parry; dash distance/cooldown/invulnerability; cancel rules. | Phase 3 |
| 8 | Ally leash radius; local target selection; double-engagement; recovery. | Phase 2 |
| 9 | Per-archetype behaviour and counters; spawn cadence and mix. | Phase 3 (Standard) / Phase 5 (others) |
| 10 | The composure model; knockdown threshold and duration; the numeric expression of hold-vs-repel. | Phase 3 |
| 11 | Evaluable definitions of "safe" and "cohesive"; Fall Back duration/distance; command scope. | Phase 4 |
| 12.3 | Whether tide or dynamic terrain state exists (assume static for the slice). | Not blocking |
| 13.2 | The **advance threshold** referenced by encounter-phase-2 completion. | Phase 4 |
| 13.3 | Leader repel-stability magnitude, pattern, telegraphs, and support composition. | Phase 6 |
| 13.4 | Definition of **severe cohesion collapse**; per-phase spawn pacing and mix. | Phase 6 |
| 14 | Bindings and touch layout; posture presentation; what the HUD shows. | Phase 6 |
| 16 | Star thresholds between the one-star floor and a clean Phase 3 completion; the meaning of "decisiveness". | Phase 6 |
| 17 | New suite filename, script name, and DEV hook surface. | Phase 1 — **resolve at implementation time with the milestone's verification plan** |
| 18 | Approval of the migration phase breakdown. | Phase 1 — process approval, not a design gap |

### 20.3 Playtest tunables

Values expected to move during playtest without a design revision: the depth-band
`y` boundaries (§4.2); all camera constants except the world and viewport sizes
(§4.6); all terrain multipliers (§12.3); formation span (~1600 px) and slot
spacing; movement, attack, brace, and dash timings; enemy spawn cadence and base
speed; composure rates and knockdown durations; pressure-point thresholds; the
encounter-phase repel counts (4 and 8); and phase pacing.

The following are **not** tunable: the world size of 2400 × 600 and the 800 × 600
viewport; fixed vertical framing; the depth-band ordering and their roles; the
enemy concurrency cap of 5; the maximum of 2 rally recoveries and the one-star
auto-resolution on a third collapse; the cue budget of 1 onboarding / 2 later;
the fixed Mactan victory; the rule that enemies never enter the village band and
the formation never falls back into it; and the rule that coral never damages
anyone.

---

## 21. Amendment record

### 2026-08-05 — Milestone 0D: implementation blockers resolved

Resolved the open items that blocked migration Phase 1, plus the two systems
previously flagged as the largest gaps. No frozen decision was reopened, no
mechanic was added beyond the approved amendments, and the combat model is
unchanged.

| § | Resolved |
|---|---|
| 4.2 | Depth-band `y` ranges (0–90 / 90–210 / 210–320 / 320–470 / 470–600) and actor reachability. |
| 4.6 | Camera constants; Phase 1 may use a static camera window; semi-scrolling begins when the formation spans the coast. |
| 9 | Reef/deep-water crossing behaviour; leader recorded as a scripted Phase 3 actor, not a fourth archetype. |
| 12 | **The coral reef's mechanical role** — band-keyed movement and recovery multipliers, no damage, no per-tile terrain or pathfinding. |
| 13 | **The encounter's end condition** — three encounter phases with explicit completion criteria. |
| 13.4 / 16 | Soft-fail path completed: a third severe collapse auto-resolves as a one-star Mactan victory. |
| 18.1 | Presenter filename `mactanFormationCombat.ts` and temporary registry key `mactan_formation_combat`; relay presenter and route preserved; cutover needs separate approval. |

**Newly opened by this amendment** (each entailed by an approved rule that did
not carry a value): the advance threshold (§13.2); the leader's repel-stability
magnitude and pattern (§13.3); and the definition of severe cohesion collapse
(§13.4). None blocks migration Phase 1.

**Phase 1 readiness: unblocked.** Migration Phase 1 delivers the reoriented
world, depth bands, camera, and a movable player. Every input it requires — world
size, band boundaries, camera constants, presenter filename, registry key, and
the rule that the relay route is untouched — is now recorded. The remaining open
items all belong to Phase 2 or later.
