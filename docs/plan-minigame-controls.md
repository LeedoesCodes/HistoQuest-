# Plan — Mactan mini-game controls / input refactor

**Status:** PLAN only. Nothing built yet. Scope is `mactanDefense.ts` input.
**Goal (Lee's words):** hide the on-screen buttons on a computer and only pop
them on phone/tablet; add Space→jump and Ctrl→crouch (keeping the current binds
too); attack on left-click on desktop, but on touch the ATAKE button is required.

---

## 1. Target binding matrix

| Action | Keyboard | Mouse (desktop) | Touch (phone/tablet) |
|---|---|---|---|
| Move L / R | `A`/`D`, `←`/`→` | — | ◀ ▶ buttons |
| Jump | `W`, `↑`, **`Space`** (new) | — | ⤒ button |
| Crouch | `S`, `↓`, **`Ctrl`** (new) | — | ⤓ button |
| Attack | `F` (keep as fallback) | **Left click** (new) | ATAKE button |

**Critical conflict to resolve:** `Space` is **currently the attack key** — it
moves to **jump**. So attack must be removed from `Space` and driven by
**left-click** (desktop) + `F` (keyboard fallback) + the ATAKE button (touch).

## 2. Desktop vs touch — detection strategy

Don't hard-gate on a static "isMobile" check (touchscreen laptops break it).
Use an **adaptive** model, which is also the nicest UX:

- **Initial state:** controls hidden if the device looks like a desktop —
  `window.matchMedia('(hover: hover) and (pointer: fine)').matches` → hide;
  otherwise show.
- **Dynamic switch (the robust part):** Phaser pointers expose `pointer.wasTouch`.
  - On a `pointerdown` where `wasTouch === true` → **show** the touch controls.
  - On mouse move / any key / `wasTouch === false` pointer → **hide** them.
  This means a 2-in-1 laptop shows buttons only once the user actually touches.

Keep the touch buttons inside the existing `controls` container so visibility is
one call. When hidden, ALSO disable their input (invisible ≠ non-interactive in
Phaser): `controls.setVisible(v)` **and** iterate children `.disableInteractive()` /
`.setInteractive()` — or simplest, only `.setInteractive()` them while shown.

## 3. Attack on left-click (desktop only)

Add a scene pointer handler:

```
scene.input.on('pointerdown', (pointer) => {
  if (pointer.wasTouch) return;          // touch uses the ATAKE button only
  if (pointer.leftButtonDown()) attackQueued = true;
});
```

- Touch taps are ignored here (they hit the buttons instead), satisfying "on
  touch it is needed to touch the screen buttons."
- On desktop, a click anywhere on the canvas attacks (buttons are hidden anyway).

## 4. Implementation touchpoints in `mactanDefense.ts`

Reference by symbol (line numbers will drift):

1. **`addKeys(...)`** — add `CTRL` to the list (`"...,SPACE,F,CTRL"`).
2. **Keyboard capture** — `scene.input.keyboard.addCapture(['SPACE','CTRL','UP','DOWN'])`
   so Space doesn't scroll the page and arrows/Ctrl don't trigger browser
   behavior. (New — current code doesn't need it because Space wasn't a
   page-scroll concern the same way; verify.)
3. **input→intent block** (the `if (keys)` section in `update`):
   - jump: `JustDown(W) || JustDown(UP) || JustDown(SPACE)`
   - attack: `JustDown(F)` only (REMOVE `SPACE` from attack)
   - crouch: `keys.S.isDown || keys.DOWN.isDown || keys.CTRL.isDown` (fold into the
     existing `crouching = grounded && (...)` expression, plus `held.crouch`).
4. **Left-click attack** — add the `pointerdown` listener from §3.
5. **Control pad** (`mkButton` block) — build as today but gate visibility via the
   adaptive model in §2 (start hidden on desktop).
6. **Device-switch listeners** — the `pointerdown`/mousemove/keydown that toggle
   control visibility.

## 5. Cleanup (CRITICAL — the rule that's bitten 4×)

Every new listener/hook MUST be removed in `finish()`, alongside the existing
`scene.events.off(UPDATE, ...)`:
- `scene.input.off('pointerdown', <attack handler>)`
- any `scene.input.off('pointerdown'/'pointermove', <visibility toggler>)`
- any `matchMedia` change listener if one is added
- keep the existing `delete window.__mg` (DEV) and container `.destroy(true)`

The on-screen buttons already live in the `controls` container that
`finish()`/exit destroys — keep it that way.

## 6. Edge cases & notes

- **Space page-scroll / Ctrl shortcuts:** handled by `addCapture` (§4.2). Test
  that Ctrl-crouch doesn't clash with browser (Ctrl alone is fine; Ctrl+key is
  rare in play).
- **Result screen:** `finish()` must remove the left-click handler BEFORE showing
  the star/overlay UI, or a click on the results would fire a phantom attack.
- **DEV `__mg` hook** is unaffected (drives intents directly) — keep for tests.
- **Verification:** screenshot at desktop viewport (buttons hidden, click attacks)
  and at a mobile viewport / after a synthetic touch (buttons visible). The
  Playwright driver can emit touch via `hasTouch: true` context + `wasTouch`.
- Consider a tiny on-first-load hint ("WASD/Space/Ctrl, Left-click to attack")
  swapped for touch — optional polish, not required.

## 7. Suggested order

1. Rebind keyboard (Space→jump, Ctrl→crouch, drop Space-attack) + `addCapture`.
2. Add left-click attack (desktop) with `wasTouch` guard.
3. Adaptive show/hide of the `controls` container + input enable/disable.
4. Wire cleanup in `finish()`; screenshot desktop + touch.
