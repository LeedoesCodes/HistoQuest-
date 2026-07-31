# Plan — Mactan combat v2 + decision branching

**Status:** AGREED design, not yet built (as of 2026-07-31). Written for a cold
session to execute across ~1–2 weeks. Read `CLAUDE.md` and skim
`docs/story-mactan.md` first.

**Panel driver:** the **outline defense** needs **≥50% of the capstone built**,
due ~mid-August 2026 (1–2 weeks out). The **decision branching (Feature F)** is
the panel's headline "replayability" story, so its *structure* should land early
even if the two new mini-games are filled in progressively.

---

## 0. Where the code is now (facts a fresh session needs)

- **The combat mini-game:** `src/game/presenters/miniGames/mactanDefense.ts`.
  Side-view. All real-time logic is one `scene.events.on(UPDATE)` handler removed
  on exit; everything is in containers destroyed on finish (the CRITICAL cleanup
  rule — leaks bit 4×). Registry: `src/game/presenters/miniGames/index.ts`, keyed
  by the content node's `key` (`getMiniGame(key)`).
- **Current combat = a lone-survivor prototype:** `TOTAL_ENEMIES = 5`, player
  alone, no allies. This **inverts the history** — the arc's own `didyouknow`
  says Lapu-Lapu's warriors *greatly outnumbered* the few Spaniards who waded
  ashore. Fixing that is the spine of Feature D.
- **Sprites:** `src/game/assets/sprites.ts`. Hero sheets idle/walk/jump/crouch
  (frame 124); enemy walk (frame 148). Scale constants: `MACTAN_HERO.scale = 1.0`,
  `MACTAN_ENEMY.scale = 0.8`. Everything degrades to code-art if a sheet is
  missing (`ensureMactan*Anims` returns false → shape fallback). Art is additive.
- **The decision:** `mac_decision` in `src/game/content/mactan.ts` has 3 choices
  (`reef` / `warn`=evacuate / `spears`), each already carrying an (unused)
  `routeTo: "mactan_defense"`. `DecisionChoice.routeTo` exists in
  `content/types.ts`. `playNodes` in `GameScene.ts` walks nodes **strictly
  linearly** today.
- **⚠ Merge note:** `GameScene.ts` is also touched by the unmerged
  `feature/mactan-story-slideshow-backgrounds` branch. Land/merge that first, or
  expect a small conflict in `playNodes`.

## Locked decisions (from Lee, 2026-07-31)

1. Reef & evacuate mini-games are **full-weight**, not throwaway.
2. Dash = **guaranteed brief i-frames**, not a random dodge chance (kid-fair).
3. **Magellan = boss on the combat/spears path only**; reef & evacuate paths get
   their own interactive climax; all three converge on the shared narrated
   aftermath (`mac_s6a`→`mac_s7c`, `mac_dyk`). History stays identical.
4. Build order = the sequence in §Sequencing.

---

## Feature C — geometry pass (crouch fix + kid scale). ✅ DONE 2026-07-31
Touches only `sprites.ts` + `mactanDefense.ts`. No new art. Hero scale 1.0→0.72,
enemy 0.8→0.9 (kid now ~2/3 the adults' height). Crouch hitbox recut
(`halfH` 20→16, stand 46→33, `halfW`→11) and shot heights centralised in
`SHOT_Y = {high:-52, low:-14}` so ducking clears HIGH and jumping clears LOW.
Verified deterministically via a DEV-only `__mg.testShot(kind)` hook +
`scripts/verify_combat.mjs` (4/4 dodge cases pass) plus a size screenshot.

**Crouch bug (confirmed):** crouched hitbox is `center = py-20, halfH = 20` →
spans **py-44…py+4**; a HIGH shot is fired at **py-40**, which is *inside* that
range, so crouching never clears it. Fix: shrink/lower the crouched box so its
**top sits below the high-shot line** (e.g. crouch `halfH ≈ 13`, center `py-13`),
and/or raise the high shot. Then re-verify: HIGH must be duckable, LOW
(`yOff -12`) must still hit a stander but be jumpable.

**Kid too big:** hero renders ~as tall as the armored adults. He's ~10. Drop
`MACTAN_HERO.scale` to ~**0.72** and bump `MACTAN_ENEMY.scale` to ~**0.9** so an
adult clearly towers (≈133px vs ≈89px). This **ripples** into: standing hitbox
`halfH` (currently 46 → ~33), `ATTACK_RANGE` (58), and the shot `yOff`s — all
must be re-derived from the new hero height so dodging still reads. **Tune by
screenshot** (`scripts/shoot.mjs`), not by eye on the object tree.

## Feature D — combat rebalance. ✅ DONE 2026-07-31 (numbers tune-by-playtest)
The core redesign. Reframes the fantasy from "lone survivor vs 5" to **"you lead
a crowd of Mactan warriors driving a few heavy invaders back into the surf."**

**Built:** `TOTAL_ENEMIES=6`, `MAX_CONCURRENT=3` (only a few ashore at once);
`NUM_ALLIES=3` code-art warriors (round-robin target spread so they mob, not
dogpile). `damageEnemy(e,dmg,fromX,canFinish,knockV)` — player hits finish
(floor 0), ally hits can't drop below `ALLY_FLOOR≈9`; every hit knocks back +
`KB_STUN` stuns. Allies soak shots (bodyblock → stagger + knockback), don't die.
Verified via `scripts/verify_combat_allies.mjs`: allies floor enemies to `[9,9,9]`
with `defeated=0` while idle, then the player advancing finishes them (`0→3`) and
the cap refills — all 4 checks pass.

**Tuning left for playtest / Feature G:** ally knockback (×3) can drift enemies
toward the right wall; ally code-art → real sprites (Feature G); consider allies
holding a frontline instead of chasing to the edge; enemy HP-bar sits a touch
high over the bigger sprite (cosmetic).

### Original design notes

- **Flip the numbers to history:** only ~**2–3 armored Spaniards ashore at once**
  (few, slow, heavy); on your side **you + ~3–4 allied Mactan warriors**. Reads
  as outnumbering.
- **Allies assist, they don't finish** (fixes the "NPCs solo it, I idle" problem
  from past attempts): ally attacks **chip damage but cannot land the kill** —
  clamp enemy HP from ally damage at ~25%; **only the player's hits go below**.
  Allies mainly **stagger, knock back, and body-block bullets**. So the crowd
  makes pressure + openings; the player is the spearpoint. A soft fail/quota +
  time keeps idling from winning.
- **Knockback** on the player's hits shoves enemies **toward the sea** — literally
  driving them into the shallows (on-theme + satisfying). Keep the existing small
  player-knockback on being hit.
- Ally sprites can start as **tinted reuse** of existing hero/enemy art (code-art
  fallback holds); real ally sprites land in Feature G.

## Feature E — skills: dash + charged heavy
Add to the update loop (it already tracks `attackCd`; add `dashCd` + a charge
state machine). Both are **sprite-gated** (Feature G) but work on code-art first.

- **Dash:** short burst reposition with **guaranteed i-frames** for the dash
  window (locked decision #2), short cooldown. A readable third dodge option
  alongside crouch/jump.
- **Charged heavy:** long-press (pointer/key hold timer) to wind up → a lunging
  high-damage strike with a dash-like step, **long** cooldown. Exposed while
  charging = risk/reward. Do this AFTER Feature D so it tunes against real combat.

## Feature F — decision branching (the panel's replayability feature)
Make the 3 choices route to 3 different **full-weight** mini-games, then converge.

- **Architecture (minimal, no full node-graph):** in `playNodes`, remember the
  chosen `routeTo` from the decision; when reaching the Mactan mini-game node,
  run `getMiniGame(chosenRoute ?? node.key)`. Register three presenters:
  `mactan_defense` (spears/combat), `mactan_reef`, `mactan_evacuate`. Point the
  three `mac_decision` choices' `routeTo` at those keys. Reuses CLAUDE.md rule 5
  (mini-games are the arc-specific code; story/decision are shared data).
- **The three POVs (all converge on `mac_s6a`→`mac_s7c` + `mac_dyk`):**
  - **spears →** the combat game (Features D/E/G), climaxing in the **Magellan
    boss**.
  - **reef →** a positioning/targeting game: mark the coral so the heavy ships
    run aground — the literal teachable ("mababaw ang tubig"). Climax = ships
    grinding onto the reef.
  - **evacuate →** an escort/pathing game: lead Amihan + villagers to safety past
    hazards while the battle rages behind. Climax = the last child reaches safety.
- Replay already exists (arc-select loop), so 3 routes = 3 distinct playthroughs.
- Behavioral logging + parallel-forms assessment are unaffected (still logs
  `minigame_complete`; the classifier features are decisions + mini-games).

## Feature G — distinct fighters: Lapu-Lapu ally + Magellan boss
- **Lapu-Lapu** = the **lead ally** in the combat crowd (ties into Feature D).
- **Magellan** = a **mini-boss** ending the combat path: more HP, a telegraphed
  pattern, driven **down/back** and **defeated — not killed on-screen** (brief's
  "violence implied, not shown" bar). Historically he led the assault and fell at
  Mactan; a "downed" beat then hands off to the narrated aftermath.
- Portraits exist (`char_lapulapu`, `char_magellan`) but game **sprites are new**.

## Asset list (PixelLab sheets, priority order) — the long pole, queue early
1. Hero skills: `hero_dash` (or roll), `hero_charge` (windup), `hero_heavy` (strike).
2. Generic **Mactan warrior ally**: walk + a chip-attack.
3. **Lapu-Lapu** battle sprite (ally lead): walk + attack.
4. **Magellan** boss: walk + attack + a "downed" frame.
5. Branch art (can start on code-art + the scene backgrounds): evacuate
   (villagers/children, hazards), reef (ships, aground/targeting markers).

Match the existing hero sheet conventions in `sprites.ts` (square PixelLab
frames, feet-origin, NEAREST filter). Add new `SpriteSheetDef`s + `ensure*Anims`.

---

## Sequencing (agreed)
1. **Feature C** — geometry pass (crouch + kid scale). Quick correctness win.
2. **Feature D** — combat rebalance (outnumber + assist-allies + knockback).
3. **Feature E** — skills (dash + charged heavy).
4. **Feature G** — Lapu-Lapu ally + Magellan boss.
5. **Feature F** — decision branch (reef + evacuate mini-games). May pull the
   *branching architecture* forward for the panel even if the two games fill in
   after, since it's the replayability headline.

Do the small correctness fixes first so the game is *right* while the ambitious
parts are built. Screenshot-verify every combat change (`scripts/shoot.mjs`;
frame-pumping lies about tween speed — see CLAUDE.md).

## Open specifics to resolve during build
- Exact enemy/ally counts + HP/DPS numbers (tune by playtest).
- Whether the ally "can't finish" clamp is 25% or a flat "allies stagger only,
  never damage-kill" (cleaner). Decide when Feature D is playable.
- Reef & evacuate mechanics detail (targeting model; escort pathing/hazards).
- Magellan boss pattern (keep it readable for a 10-year-old).
