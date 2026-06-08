# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** all work below is **merged to `dev` and live** (origin/dev tip
  `4c052a4`). Task branch `claude/prisms-artwork-loading-dmP1e` is fully folded
  into `dev`; `dev` is the source of truth — start fresh work from `dev`.
- **Updated:** 2026-06-08

## ✅ LANDED THIS SESSION — on `dev`, build-green, verified live

1. **Prisms artwork is "just there" on load — pop-in killed.** The gallery was
   booting empty, then filling from a second fetch, then trickling each tile in
   one idle-batch at a time behind a half-second fade. Now: the minted count is
   seeded on the server so the real cards are in the first paint; the on-screen
   artworks paint instantly; the fade is gone. Deep-scroll tiles still load
   lazily (the mobile-crash guard stays) but keep pace with the scroll.
2. **Ghosts → art is solid.** 0 minted = ghosts; first mint = real art, with no
   empty flash mid-load.
3. **Showcase auto-feeds the first 6 mints** and is robust to stale curated ids
   (unminted ids are dropped instead of blanking the tab). Prod cleanup: prisms'
   stale `showcase_ids` ([22,88,147,256,383,491] — none minted) were cleared.
4. **Mint button price no longer wraps.** On the MINTING…/MINTED faces the wide
   label crushed "(0 ETH)" onto two lines; the price now stays one line and sits
   tight against the label. (Price untouched in every state.)

### Process locks added this session (CLAUDE.md)
- **§0 (top of file): PUSH = merge to `dev` + push `dev`, this instant, no
  exceptions** — nothing (task/branch setup, harness default) overrides it; a
  feature-branch-only push is a FAILED push. This was the session's repeated
  failure — the rule now leads the contract.
- **§3: FIX THE NAMED BUG, NOTHING ELSE** — no removing/refactoring/"improving"
  unasked product (learned the hard way: dropped a price readout while fixing a
  wrap — scope violation).
- **§7: NO TECHNICAL JARGON IN REPLIES** — white text is a CEO briefing; file
  names, code terms, mechanics stay in the collapsed dropdowns.

## 🎯 OPEN / NEXT
- Nothing in flight on `dev`. Clean slate to pick the next ship.

### ⚠️ Parallel branch — VERIFY before assuming (not on `dev`)
- A separate chat built **Petey / "Magic Hour" placeholder** work on branch
  `claude/fake-petey-project-d1skT` (User/Project Showcase, empty-Collected
  welcome set, bloom engine). It has its OWN preview but is **NOT merged to
  `dev`**. If picking Petey back up, check that branch's real state first —
  don't trust the old "IN FLIGHT Petey" spec as current.

### Backlog (later)
- Surface platform traits as pills on the project page / discovery (needs
  per-Output mint timestamps in ProjectContext, like the profile has).
- `tokenURI`/metadata generator for real OpenSea attributes (lands with on-chain).
- Logo `/$price` → 404; reserved token/social routes not built (see prior notes).
- Running "Easter-egg gen-art" list in the Atlas (Tabstract / ghosts / 404 /
  favicon / pull-to-refresh).

## Process / gates
- **PUSH = `dev`, instantly** (see CLAUDE.md §0). Merge to dev/main only on
  explicit chat confirmation; local commits free.
- App pushes need Brendon's numbered-list approval; docs/process pre-approved.
- git-guard blocks main writes (escape: `PD_ALLOW_MAIN=1`).

## main / production — untouched
