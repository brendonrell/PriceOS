# PriceOS · Phase 2 · Step 2 (navbar shell + footer + backgrounds)

**Branch to push to:** `dev` (same as Step 1).

## What this step does

Adds the visible chrome that wraps every page:

- Sticky **navbar** at the top with three slots: rotating Petey logo (left),
  empty Tape lane (middle, fills with live activity later), and the user
  menu cluster (right) — cart button (hidden until cart has items),
  PriceSprite face, level badge ❹❷, and the @brendon connect button.
- **Footer** at the bottom: `PriceOS 1.0 · Connected · 0.044 gwei · Blk 22,140,887 · About · Discord · Docs · Support`.
- **Background mounts** for the starfield (Stargazing spell) and the
  Digital Familiar — both rendered in the DOM but hidden by default
  via CSS, so when their toggles land they just need to flip a body
  class rather than mount/unmount React subtrees.

The Connect Menu **dropdown contents** (Profile / Discord / Artists /
Portfolio / Settings / Spell Book / Pings / Todos / Notes / Tape) are
**not** in this step — that's Step 3. The connect button in Step 2
hovers-to-expand but doesn't open anything when clicked.

## What to expect after deploy

Looking at the dev preview URL after this commit lands:

- Navbar at top: Petey speech-bubble logo on the left, then a wide
  empty space in the middle (the Tape lane), then `(ง •̀_•́)ง ❹❷ ⟠`
  cluster on the right. The connect button is collapsed by default
  showing just the wallet glyph — hover over it and it expands to
  reveal `@brendon`.
- The PRICE DISCUSSION wordmark from Step 1 is now **vertically
  centred between the navbar and footer** instead of floating in the
  middle of the page.
- Footer at the bottom in faint dark text.
- Click the Petey logo: it rotates 90° counter-clockwise and a dotted-
  border speech bubble appears next to it with HOME and $PRICE links.
  Click again to unrotate.

Things that should still be working from Step 1:
- Hothurt red bg, Rubik Mono One on the wordmark, dark text, no
  console errors, no white flash on hard reload.

## Files

| File | Type | Path |
|---|---|---|
| globals.css | **REPLACEMENT** | `app/globals.css` |
| PriceOSShell.tsx | **REPLACEMENT** | `components/shell/PriceOSShell.tsx` |
| Backgrounds.tsx | NEW | `components/shell/Backgrounds.tsx` |
| Navbar.tsx | NEW | `components/shell/Navbar.tsx` |
| PeteyLogo.tsx | NEW | `components/shell/PeteyLogo.tsx` |
| Ticker.tsx | NEW | `components/shell/Ticker.tsx` |
| UserMenuButtons.tsx | NEW | `components/shell/UserMenuButtons.tsx` |
| Footer.tsx | NEW | `components/shell/Footer.tsx` |

8 files. 2 replacements (globals.css and PriceOSShell.tsx), 6 new.

## How to push

1. **Branch dropdown says `dev`.** Verify before doing anything else.
2. Replace the two files via the pencil icon (don't drag-drop replacements
   on top — GitHub web UI sometimes resolves conflicts unpredictably).
3. Drag-drop the 6 new files into `components/shell/` (or use
   "Add file → Create new file" and paste each path).
4. Commit message: `step 2: navbar shell + footer + backgrounds`.
5. Wait for Vercel green check on the dev preview URL.
6. Eyeball the preview against the expectations above.

## What's still deferred

- Connect button click → dropdown open. **Step 3.**
- Cart button click, PriceSprite click, level badge click. **Step 7.**
- Tape population with live events. After indexer wires up.
- Top Bar (grail pins, hammer, incognito, RPC ping) row above the
  main navbar. Lands with the spell toggles that summon it.
- Starfield star generation, Familiar sprite + animation. Step 4+
  with Spell Book wiring.
- "PriceOS 1.0" → changelog modal, "About PD" → about modal. Step 7.

## If the build fails

Most likely culprit: relative import paths if my assumed repo layout
differs. Send me the Vercel build log and I'll patch.

— Opus 4.7
