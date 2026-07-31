# Plan — Mini-game character art (PixelLab pixel-art sprites)

**Status:** Hero DONE + verified in-game. This doc plans the rest so a fresh
session can execute efficiently without re-deriving the pipeline.
**Companion docs:** `docs/plan-story-depth.md` (Features A/B), and the memory
`mactan-minigame-sprites.md` (decisions + pipeline).

---

## 0. Where we are (done)

- The Mactan mini-game **hero is an animated PixelLab sprite**, replacing the
  flat code-art. States wired + screenshot-verified in the real game:
  **idle (fight stance), walk, jump, crouch, attack (spear thrust).**
- Pipeline built and working:
  - PixelLab exports per-frame PNGs → headless-canvas packer → horizontal strips
    in `src/game/assets/sprites/mactan/hero_{walk,idle,jump,crouch}.png`.
  - `src/game/assets/sprites.ts` = registry + `loadSpriteSheets` + `ensureMactanHeroAnims`.
  - `GameScene.preload` loads the sheets; `mactanDefense.ts` uses the sprite,
    falls back to code-art if sheets absent (zero-art rule honored).
- **Uncommitted** as of this plan: the sprite work + the Magellan/Lapu-Lapu
  backstories + Elcano DYK fact. (Commit when ready.)

## 1. PixelLab account reality (checked via MCP `get_balance`)

- On **trial**: 40 total generations, **~12 remaining** ($0 credits).
- **Each animation = 2 generations.** Trial won't finish the remaining art.
- **Plan:** subscribe **Tier 1 ($12) for ONE month**, generate everything, then
  cancel/downgrade. 2,000 gen/mo is effectively unlimited here; 320px ceiling is
  irrelevant (our sprites are 124px). Do NOT get Tier 2/3 (team/512px overkill).
- The **PixelLab MCP is connected** — a session can drive generation directly
  (`create_character`, `create_character_state`/`animate_character`, `get_*`).

## 2. Generation-efficiency rules (learned the hard way)

- **Reuse ONE character**, then add only the animation states it needs (PixelLab
  keeps the character consistent across states; don't re-create per animation).
- **East-facing, Sidescroller camera, ~124px, highly detailed, v3.** Freeze the
  character description (colors/clothing/features) — see the hero's in each
  export `metadata.json`.
- **Held weapons reliably DROP across animations.** Don't waste generations
  fighting it — pin the weapon as a separate object in-engine (as done for the
  hero's spear). Applies to the guardia's rifle too.
- **Only generate states the game actually uses** (see §3). Skip crouch/jump for
  enemies — they don't use them.
- Budget retries: expect ~1 re-roll per asset.

## 3. Remaining art — priority order

### P1 — Guardia civil enemy (biggest visual gap: pixel hero vs flat enemies)
Enemy logic in `mactanDefense.ts` only uses: **approach (walk), aim/shoot, die
(tween — no sprite needed).** So generate:
- `create_character`: "A late-19th-century Spanish guardia civil soldier, 1890s
  colonial uniform (dark blue/navy tunic, tricorn/leather hat), holding a rifle,
  stern but NOT gory, brown boots. Pixel art, east-facing, sidescroller." +
  frozen style words matching the hero's register.
- States: **idle/aim**, **walk**, **shoot** (~3 anims = ~6 gens).
- Rifle: try in prompt; if it drops, pin separately like the spear.
- Wire parallel to the hero: pack → add sheets to `sprites.ts` (generalize it
  beyond the hero, e.g. `MACTAN_ENEMY_SHEETS`) → swap the enemy shape block
  (`spawnEnemy`, lines ~162-179) for a sprite + anim state machine.

### P2 — Invader boat sprite
- Single static side-view sprite, facing LEFT (`mactan/boat_invader`, ~200×140,
  per `docs/asset-brief.md`). 1 image. Cheap. (Not yet placed in the mini-game;
  decide if the scene wants approaching boats.)

### P3 — Polish the hero (optional, low cost)
- Replace the code-art spear with a **cropped pixel spear** (crop from crouch
  frame_004, which kept it) or a `create_object` spear.
- Consider a real crouch down-transition (currently a single held frame).
- Tune hero scale slightly larger if desired.

### P4 — Other arcs' characters (Feature A art)
- **Pugad Lawin:** Bonifacio, Jacinto (portraits/characters). If that arc's
  mini-games get animated actors later, generate states then.
- **Datu Bago:** BLOCKED on adviser validation (see `docs/story-datu-bago.md` and
  asset-brief §8 — Bagobo material culture must be right). Backgrounds/landscape
  are lower-risk; human figures need the review.

## 4. Other open threads (not art — see plan-story-depth.md)

- **Feature A backstories:** Magellan ✅, Lapu-Lapu ✅, Humabon (already covered by
  `mac_s3a/s3b`). TODO: **Bonifacio + Jacinto** backstory beats in `pugadLawin.ts`.
- **Feature B (living backgrounds):** NOT started. Ken Burns drift + subtle
  overlay in `createBackdrop` (`src/game/ui/backdrop.ts`). Code-only, no art.
- **Backgrounds for Pugad Lawin + Datu Bago:** AI-generation prompts already
  written (in chat) — generate as flat `bg.png` when ready.

## 5. Suggested next-session order

1. Commit the current hero + backstory work (if not already).
2. (Subscribe Tier 1.) Generate + wire the **guardia enemy** — closes the biggest
   visual gap. Screenshot in-game.
3. Boat sprite + hero spear polish.
4. Feature B Phase 1 (living backgrounds) — cheap, high perceived value.
5. Pugad Lawin backstories + eventually its art.
