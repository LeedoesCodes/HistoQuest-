# BasaQuest — Art Asset Brief (History Module)

**For:** the teammate producing art
**From:** the history-module build (specs pulled straight from the code)
**Goal:** a consistent, kid-friendly, historically respectful set of images that
drop into the game with zero code changes.

Read sections 1–4 first. Section 5 is the full shopping list. Section 8 is the
non-negotiable accuracy rules — read it before drawing any historical figure.

---

## 1. What the game is

A Grade 5 (10–11 y/o) history game. The pupil plays a **fictional ally** inside
three real events: **Mactan** (Lapu-Lapu, 1521), **Pugad Lawin** (Bonifacio,
1896), and **Datu Bago** (Bagobo resistance, Davao). Everything is 2D, runs in a
browser at a fixed **800 × 600** stage.

The single most important rule: **every image must look like it came from the
same illustrator.** One inconsistent asset makes the whole game look amateur.
Section 4 is how we guarantee that with AI. Do not skip it.

---

## 2. Technical specs (must match exactly)

| Thing | Value |
|---|---|
| Stage size | **800 × 600** px (4:3). The game scales to fit any screen. |
| Deliver art at **2×** | Draw/export at **1600 × 1200** (backgrounds) so it stays crisp when scaled up. |
| Format | **PNG**. Characters & sprites = **transparent background**. Backgrounds = opaque. |
| Color mode | sRGB, 8-bit |
| Max file size | Keep each PNG **under ~500 KB** (compress with tinypng.com). It ships to a browser. |
| No text baked in | Never draw words/labels into an image — the game adds all text (and it exists in Filipino **and** English). |

### The game's UI palette — your art must sit against this

The interface is **dark navy** with blue panels and a gold accent. Backgrounds
and characters should harmonize with these, not clash:

| Role | Hex |
|---|---|
| Background navy | `#0e1524` |
| Panel | `#14203a` |
| Panel edge | `#3d5a99` |
| Gold accent | `#ffd54a` |
| Success green | `#4caf50` |
| Danger red | `#e4572e` |

**Practical consequence:** the story text sits in a panel across the **bottom
~200 px** of the screen. So in every full-screen background, keep the important
subject in the **top two-thirds**; the bottom third can be simpler (it's often
covered). A gentle darkening toward the bottom edge helps text readability.

---

## 3. Art style (pick this one and lock it)

**Recommended direction: warm storybook / flat-illustration.**

- Clean, bold shapes; soft **cel shading** (2–3 tone steps), not photorealism.
- **Warm, earthy, saturated-but-not-neon** palette (ochre, terracotta, sea teal,
  warm greens) so scene art glows against the dark UI.
- Friendly, dignified faces — expressive but **not cartoony-goofy**, and **not
  anime**. Think a modern Filipino children's picture book.
- Subtle paper/canvas texture is welcome; heavy rendering/realism is not.

Why this style: it's warm and age-appropriate, it treats historical figures with
respect, and — crucially — **it is the easiest style to keep consistent across
many AI generations.** Photorealism and anime both drift badly.

> If the team prefers a different look, that's fine — but **decide once, write it
> down, and never mix.** Consistency matters far more than which style.

---

## 4. How to keep AI output consistent (the important part)

AI image tools drift — ask for "a Filipino warrior" ten times and you get ten
different art styles. Here's how to stop that. Follow all five.

**1. One tool, one model.** Pick a single generator and stay on it. Good free/
cheap options with the features we need: **Leonardo.ai** (has a free tier, style
reference + "character reference"), **Bing Image Creator** (free, DALL·E 3), or
**local Stable Diffusion** if you know it. Don't hop between tools — each has its
own "house look."

**2. A locked style suffix on EVERY prompt.** Append this exact text to every
single generation, no matter the subject:

```
STYLE: warm storybook illustration, flat 2D, soft cel shading with 2-3 tone
steps, bold clean shapes, thick soft outlines, warm earthy saturated palette,
subtle paper texture, friendly dignified Filipino children's-book art, NOT
photorealistic, NOT anime, NOT 3D render, flat neutral lighting, plain
background for cutout
```

**3. Make a "style key" image first.** Generate ONE image you love (e.g. the
Mactan shore). That becomes your reference. For every later asset, feed it back
as a **style reference / image reference** so new art inherits the same look.
This is the single biggest consistency lever.

**4. A character bible for recurring people.** The **ally** appears in ALL THREE
arcs and **must look identical** every time. Write down each recurring
character's fixed details and paste them verbatim into every prompt for that
character (see section 6). Reuse the tool's "character reference" feature if it
has one, and reuse the **same seed**.

**5. Fixed seeds for variations.** When you want small changes to the same
image, lock the seed and change only the prompt — don't reroll randomly.

**Post-processing (free tools):**
- Remove background → **remove.bg** or **photoroom.com** (for characters/sprites).
- Upscale if needed → the tool's own upscaler, or **upscayl** (free, offline).
- Compress → **tinypng.com** before handing over.
- Put every character/sprite on the **same canvas size** so they line up in game.

---

## 5. The asset list

File names and folders below are what the code will load — **use them exactly**.
Everything goes under **`src/game/assets/img/`** in the repo (the folders already
exist). Files are picked up automatically: drop a PNG in and it appears in the
game with no code change.

> Naming maps directly to the in-game key:
> `src/game/assets/img/mactan/char_lapulapu.png` -> key `mactan/char_lapulapu`
>
> Each arc's full-screen background must be named exactly **`bg.png`**
> (e.g. `mactan/bg.png`). Until it exists the game draws a generated scene in
> that arc's colours, so nothing looks broken while art is in progress.

Legend: **BG** = opaque full-screen · **CHAR** = transparent bust portrait ·
**SPRITE** = transparent object/figure.

### 5a. Shared (`assets/common/`)

| File | Type | Size | Notes |
|---|---|---|---|
| `char_ally.png` | CHAR | 400×500 | **The pupil's character. Used in all 3 arcs — the anchor of consistency.** An unnamed young Filipino seafarer child, ~11, brown skin, simple pre-colonial-to-rural clothing that reads as "ordinary kid," warm and brave, not a warrior. See bible §6. |

### 5b. Mactan — 1521 (`assets/mactan/`)

| File | Type | Size | Notes |
|---|---|---|---|
| `bg.png` | BG | 1600×1200 | Mactan shoreline at dawn, calm shallow sea, coral reef hinted, distant tall foreign sails on the horizon. Quiet, tense. |
| `char_lapulapu.png` | CHAR | 400×500 | Datu of Mactan. Dignified Visayan warrior — see §8 accuracy. Calm, watchful, older. |
| `char_magellan.png` | CHAR | 400×500 | 16th-c. Iberian captain — morion helmet / breastplate era. Determined, weathered. **Not evil-looking, not a villain caricature.** |
| `char_humabon.png` | CHAR | 400×500 | Rajah of Cebu. Pre-colonial Visayan noble/datu attire, a bit more adorned than a common person. |
| `char_amihan.png` | CHAR | 400×500 | The ally's younger sibling, ~7, same world/clothing family as the ally. |
| `boat_invader.png` | SPRITE | 200×140 | A small foreign landing boat with 1–2 armoured soldiers, side view, facing **left** (they move toward the shore on the left). |

### 5c. Pugad Lawin — 1896 (`assets/pugad_lawin/`)

| File | Type | Size | Notes |
|---|---|---|---|
| `bg.png` | BG | 1600×1200 | A grassy clearing/hillside, many Katipuneros gathered, overcast hopeful morning, August 1896. |
| `char_bonifacio.png` | CHAR | 400×500 | Andres Bonifacio, 1896 — see §8. Holding/raising a cedula fits the story. |
| `cedula.png` | SPRITE | 720×440 | A 19th-c. Spanish community-tax certificate (aged paper, official-looking header, a red seal). The game tears it, so make it a clean single document. |
| `recruit_villager.png` | SPRITE | 160×200 | A 1890s rural Filipino (barong/camisa, salakot ok), friendly — someone to recruit. Full body, front. |
| `recruit_guard.png` | SPRITE | 160×200 | A Spanish *guardia civil*, 1890s uniform + rifle. Full body, front. **Reads as "avoid me"** but not gory. |

### 5d. Datu Bago — Davao (`assets/datu_bago/`) — see §8, most care needed

| File | Type | Size | Notes |
|---|---|---|---|
| `bg.png` | BG | 1600×1200 | The Davao River / gulf area, lush, warm. |
| `char_datubago.png` | CHAR | 400×500 | Datu Bago, Bagobo/Davao leader. **Requires real Bagobo reference — see §8.** |
| `char_bagobo.png` | CHAR | 400×500 | A Bagobo community member. Same accuracy bar. |

### 5e. Arc-select thumbnails (optional, nice-to-have)

`assets/common/thumb_mactan.png`, `thumb_pugad_lawin.png`, `thumb_datu_bago.png`
— small 480×200 banners for the menu cards. Can be cropped from the backgrounds.

**Priority order if time is short:** (1) `char_ally.png` + the 3 backgrounds →
(2) the named historical characters → (3) mini-game sprites → (4) Amihan &
thumbnails. Even backgrounds alone transform the feel.

---

## 6. Character bible (paste these into prompts, keep them fixed)

Write the exact same descriptor every time a character recurs. Example format —
**fill in and freeze once you generate the first version:**

- **Ally (the pupil):** young Filipino child ~11, warm brown skin, short black
  hair, [exact clothing + 1 signature detail, e.g. a woven band], barefoot,
  curious brave expression. *Same in Mactan, Pugad Lawin, Datu Bago.*
- **Amihan:** younger sibling ~7, same skin/hair family, [smaller version of the
  ally's world].
- **Lapu-Lapu / Magellan / Humabon / Bonifacio / Datu Bago:** lock each one's
  face, hair, and outfit in one line after the first good generation.

The point: a character should be recognisably the **same person** every time
they appear, even across different scenes.

---

## 7. Voiceover / audio (separate track, FYI)

Narration is planned via **edge-tts** (free, has good Filipino neural voices) —
that's a script-to-MP3 job, not art, and can happen later. The current sound
effects (typing, taps, the battle) are synthesized in code. **No audio assets
are needed from the art task** unless the team decides to record real VO.

---

## 8. Historical & cultural accuracy — READ BEFORE DRAWING PEOPLE

This is a school history tool. Wrong-era or disrespectful costume is the kind of
thing an Araling Panlipunan teacher (or panelist) will catch immediately.

**General**
- Filipino characters must **look Filipino** — brown skin, Southeast-Asian
  features. AI defaults often whitewash; state skin tone explicitly and check.
- No anachronisms: no modern clothing, no wrong-century weapons or uniforms.
- Violence is **implied, not shown** — no blood, no gore. It's for 10-year-olds.

**Mactan (1521)**
- **Lapu-Lapu / Visayan warriors:** pre-colonial Visayan dress — *bahag*
  (loincloth), possible *pintados* tattoos, a *kampilan* or *kalasag* shield.
  Dignified, not a generic "tribal savage" trope. (His exact appearance is
  genuinely unknown historically — aim respectful and plausible, not the
  shirtless-bodybuilder statue cliché unless the adviser prefers it.)
- **Magellan & Spaniards:** **16th-century** Iberian — *morion* helmets,
  breastplates, that era's swords. NOT 1800s uniforms (a very common mistake).

**Pugad Lawin (1896)**
- **Bonifacio & Katipuneros:** 1890s rural Filipino clothing (*barong/camisa de
  chino*, some with *salakot*), bolos, red kerchiefs/KKK motifs. Bonifacio is
  often shown with a bolo and the red Katipunan flag.
- **Guardia civil:** late-19th-c. Spanish colonial uniform.
- **Cedula:** a 19th-century document, not a medieval scroll.

**Datu Bago (Davao) — the one needing the most care**
- This is exactly the local history your study says is **missing** from digital
  materials, which also means **reference images are scarce and easy to get
  wrong.** Do not let the AI invent generic "tribal" costume.
- Use **real Bagobo material culture** as reference: distinctive **abaca ikat
  (t'nalak-adjacent) textiles, intricate beadwork, brass ornaments, bells**.
  Look up museum/Mindanao cultural references first.
- **This arc's art must be validated** by the adviser / an Araling Panlipunan
  teacher / a Davao cultural source before it's considered final. Flag it as
  provisional until then.

**All dialogue and the ally/Amihan are fictional** (the game says so on-screen).
But the real figures and their material culture must be depicted accurately.

---

## 9. Handoff checklist (what to give back to Lee)

For each asset:
- [ ] Correct **file name + folder** from section 5.
- [ ] Correct **size**, PNG, transparent where required, under ~500 KB.
- [ ] No text baked in.
- [ ] Matches the locked **style** (section 3).
- [ ] Recurring characters look **identical** to their other appearances.
- [ ] Passes the **accuracy** rules (section 8); Datu Bago flagged for review.

Also hand over, so more can be made consistently later:
- [ ] The **style-key reference image** and the exact **tool + base prompt + seed**
      used, and the frozen **character-bible** lines (section 6).

Drop finished files in `src/game/assets/img/<arc>/…` (or a shared Drive folder
and Lee will place them). **No code change is needed** — the loader discovers
files automatically and the story/character nodes already reference these keys,
so art appears the moment the file lands.

---

## 10. Quick copy-paste starter prompts

Use these as starting points; **always** append the section-4 style suffix.

> **Mactan shore (style key — generate this first):**
> "A calm tropical shoreline at dawn on Mactan island, shallow turquoise water
> over a coral reef, palm trees, distant tall European sailing ships on the far
> horizon, quiet and tense mood, no people in front, wide scene, empty lower
> third. " + STYLE suffix

> **The ally:**
> "Full-body character, a brave curious 11-year-old Filipino seafarer child,
> warm brown skin, short black hair, simple woven pre-colonial clothing, barefoot,
> friendly determined expression, standing, plain background. " + STYLE suffix

> **Lapu-Lapu:**
> "Portrait of a dignified older Visayan datu and warrior, warm brown skin,
> pre-colonial Filipino dress with bahag and traditional tattoos, holding a
> kampilan sword, calm watchful expression, proud but not aggressive, plain
> background. " + STYLE suffix

> **Magellan:**
> "Portrait of a determined weathered 16th-century Portuguese-Spanish sea
> captain, morion helmet and steel breastplate, short beard, serious not evil
> expression, plain background. " + STYLE suffix
