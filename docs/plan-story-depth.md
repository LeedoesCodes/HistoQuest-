# Plan — Character Backstories + Living (animated) Backgrounds

**Status:** PLAN for a fresh session to execute. Nothing here is built yet.
**Why this doc exists:** Lee is migrating to a new chat. This captures the two
next features with enough context + design that a cold session can implement
them without re-deriving everything.

---

## 0. Context a fresh session needs first

Read **`CLAUDE.md`** (architecture + rules) and skim **`docs/story-mactan.md`**
before starting. Key facts:

- One Phaser scene: `src/game/scenes/GameScene.ts`. Its `runArc()` walks a JSON
  arc's `nodes` in order; each node is drawn by a **presenter** in
  `src/game/presenters/*`, which returns a Promise and owns a container it
  destroys on exit (the CRITICAL cleanup rule — leaks have bitten 4×).
- **Node types** (`src/game/content/types.ts`): `titlecard`, `character`,
  `story`, `decision`, `minigame`, `didyouknow`. All learner text is
  `LocalizedText { fil, en }`.
- **Dialogue speaker system ALREADY EXISTS** (this is the key reuse for Feature
  A). A `story` node can carry `speaker: { name, image, side }`; the story
  presenter (`src/game/presenters/story.ts`) pops the portrait in with a shake +
  `sfx.voice()` + a gold name tag. See Mactan beats `mac_s4b` (Lapu-Lapu, left),
  `mac_s3a` (Humabon, right), `mac_s4a` (Magellan, right).
- **Art**: images auto-load from `src/game/assets/img/<arc>/*.png`
  (`assets/images.ts`; key = path minus prefix/ext). Mactan has real art:
  `bg.png`, `char_ally`, `char_lapulapu`, `char_magellan`, `char_humabon`.
  `hasImage(key)` guards every draw site (game must run with zero art).
- **The arc backdrop** is created once per arc in `runArc()` via
  `createBackdrop(this, arcId)` in `src/game/ui/backdrop.ts` — real `<arc>/bg`
  image if shipped, else a generated scene. This is the hook point for Feature B.
- **Seeing the game** (essential — you cannot judge visuals from the object
  tree): `scripts/shoot.mjs` / `scripts/shoot_dlg.mjs` drive a real headless
  Chromium and write PNGs you open with Read. Build + `npx vite preview --port
  4174` first. ALWAYS screenshot after a visual change.

**Current state:** Mactan arc is content-complete and fully art'd (bg + 4
portraits + dialogue pop-ins + warm gold UI). Pugad Lawin is content-complete
(no art yet). Datu Bago is a stub pending adviser validation
(`docs/story-datu-bago.md`). The Mactan mini-game is a side-view combat
**prototype** (flat code-art) awaiting Lee's playtest.

---

## Feature A — Character backstories (purpose + journey)

**Goal:** each key figure gets a short, kid-friendly backstory — who they were,
what they wanted, the journey that brought them here. Lee asked specifically for
**Magellan** (his purpose and voyage); do the same for the others.

**Approach (no new node type needed):** insert a short sequence of **2–3 `story`
beats with `speaker` set to that character**, right AFTER their `character`
intro card. This reuses the existing pop-in dialogue system, so the portrait
appears while the backstory is told. Keep each beat 2–4 short lines (the panel
auto-sizes; over-long beats log a dev warning).

**Where:** the arc content files (`src/game/content/mactan.ts`, `pugadLawin.ts`,
`content/index.ts` for Datu Bago). Insert after the character node; the node id
convention is e.g. `mac_bs_magellan_1..3`.

### Magellan backstory — AUTHORED, ready to paste (Mactan, after `mac_char_magellan`)

Historically grounded; humanising, not villainising (keeps our "hard on
colonisation, fair to the person" line). Speaker = Magellan, side right.

```
{
  id: "mac_bs_magellan_1",
  type: "story",
  speaker: { name: { fil: "Ferdinand Magellan", en: "Ferdinand Magellan" }, image: "mactan/char_magellan", side: "right" },
  text: {
    fil:
      "Si Magellan ay naglayag para sa hari ng Espanya.\n" +
      "Pangarap niya: makahanap ng bagong daan patungo sa mga pulo ng pampalasa,\n" +
      "at angkinin ang mga lupaing kanyang madaraanan.",
    en:
      "Magellan sailed for the King of Spain.\n" +
      "His dream: to find a new route to the spice islands,\n" +
      "and to claim the lands he passed along the way.",
  },
},
{
  id: "mac_bs_magellan_2",
  type: "story",
  speaker: { name: { fil: "Ferdinand Magellan", en: "Ferdinand Magellan" }, image: "mactan/char_magellan", side: "right" },
  text: {
    fil:
      "Noong 1519, umalis siya sa Espanya dala ang limang barko.\n" +
      "Mahigit isang taon silang naglakbay sa dagat —\n" +
      "gutom, bagyo, at karagatang tila walang katapusan.",
    en:
      "In 1519 he left Spain with five ships.\n" +
      "They journeyed the seas for more than a year —\n" +
      "hunger, storms, and an ocean that seemed to have no end.",
  },
},
{
  id: "mac_bs_magellan_3",
  type: "story",
  speaker: { name: { fil: "Ferdinand Magellan", en: "Ferdinand Magellan" }, image: "mactan/char_magellan", side: "right" },
  text: {
    fil:
      "Siya ang unang naglayag nang ganito kalayo pakanluran.\n" +
      "Ngunit sa Mactan, may hindi niya inakala:\n" +
      "na isang maliit na pulo ang tatayo laban sa kanya.",
    en:
      "He was the first to sail this far to the west.\n" +
      "But at Mactan, one thing he did not expect:\n" +
      "that a small island would stand against him.",
  },
},
```

### The others (same pattern — author 2–3 beats each)

- **Lapu-Lapu** (real, sources thin — keep general, no invented biography):
  guardian of Mactan for years; refused to bow to a distant king; chose to defend
  his people rather than pay tribute. Speaker left.
- **Rajah Humabon** (real): leader of Cebu who chose alliance and trade with the
  strangers, and was baptised — a *different, reasonable* choice, not treachery.
  Speaker right.
- **Pugad Lawin arc** — do the same for **Bonifacio** (humble Tondo worker,
  self-taught, founded the Katipunan for every Filipino's freedom) and **Jacinto**
  (the young "Brain," wrote the Kartilya). Content lives in `pugadLawin.ts`.
- **Datu Bago** — only after adviser validation (see `docs/story-datu-bago.md`).

### Historical notes / cautions

- Magellan **did not** complete the circumnavigation — he died at Mactan;
  **Elcano** brought the last ship home in 1522. Great candidate for the arc's
  `didyouknow` `real` list (don't imply Magellan circled the globe).
- All dialogue is dramatised (the game already says so via the title card +
  `didyouknow`). Keep new lines factual in substance.
- Keep beats short so the arc doesn't drag — see "Pacing" below.

### Pacing decision (raise with Lee)

Adding 2–3 backstory beats per character = ~9 extra beats in Mactan alone. That
deepens context but lengthens the arc. Options: (a) keep all (richest), (b) trim
to 2 beats each, or (c) consider a future "skip backstory" affordance. Recommend
starting with 2 beats each and screenshotting the full run to judge length.

---

## Feature B — Living (slightly animated) backgrounds

**Goal (Lee's words):** "for each story dialogue there would be a slightly
animated background." The arc `bg.png` is currently a single static image. Make
it feel alive — **subtly** (kids shouldn't be distracted or made queasy).

### Phase 1 — code-only, no new art (do this first)

Animate the existing single `bg` image inside `createBackdrop`
(`src/game/ui/backdrop.ts`). Two cheap, reusable effects:

1. **Ken Burns drift** — a slow, looping pan + zoom on the bg image
   (e.g. scale 1.0↔1.06 and a few px of x/y drift over ~14s, yoyo, ease
   Sine.easeInOut). Instantly makes any still image feel cinematic. Applies to
   every arc automatically.
2. **Gentle overlay motion** (optional, layered on top of the bg, below the UI):
   - drifting particles for sea sparkle / dust motes (reuse the particle system
     in `ui/juice.ts`), and/or
   - a slow horizontal cloud drift using a second semi-transparent strip.

Implementation sketch:
- `createBackdrop` currently returns a container/object destroyed at arc end.
  Have it start the Ken Burns tween on the bg image and add the overlay; ensure
  all of it is inside the returned container so `backdrop.destroy(true)` cleans
  up (the cleanup rule).
- Keep amplitude SMALL. Add a `prefers-reduced-motion` check (or a constant) to
  disable for sensitive users.
- The story/character/quiz presenters already dim the backdrop with a scrim, so
  the motion reads as subtle life behind the text — good.

**Verify** with `scripts/shoot.mjs`: take two screenshots a second apart on the
same beat and confirm the bg shifted slightly (and nothing else jitters).

### Phase 2 — parallax layers (needs layered art, optional)

Real depth = split the background into **layers** (far sky/clouds, sea, near
foreground/palms) and drift them at different speeds. This needs the *artist* to
deliver the bg as separate transparent PNG layers, not one flat image. If Lee
wants this, add a spec to `docs/asset-brief.md`:
- `mactan/bg_sky.png`, `mactan/bg_sea.png`, `mactan/bg_fore.png` (aligned,
  transparent, same canvas). Backdrop composits + parallax-drifts them.
Only pursue if the flat Ken Burns version isn't enough — Phase 1 likely suffices
for "slightly animated."

---

## Suggested execution order

1. **Feature A backstories** (content only, low risk, high value). Magellan is
   authored above — paste it, then write Lapu-Lapu, Humabon (and Pugad Lawin's
   Bonifacio/Jacinto). Screenshot the full Mactan run; judge pacing with Lee.
2. **Feature B Phase 1** (Ken Burns + subtle overlay in `createBackdrop`).
   Screenshot to confirm subtle motion.
3. Decide with Lee whether **Phase 2 parallax** (layered art) is worth it.

## Open decisions for Lee / the fresh session

1. Backstory length: 2 or 3 beats per character? Skippable later?
2. Add Magellan-didn't-finish-the-voyage (Elcano) as an "Alam Mo Ba?" fact?
3. Animation intensity for the living background (how subtle).
4. Whether to commission **layered** backgrounds for true parallax (Phase 2).
