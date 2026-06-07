# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context, so a new session recovers
> the thread without anyone re-explaining it. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** `claude/home-page-color-carousel-TNXd5`
- **Updated:** 2026-06-07

## Open task

Home page polish (two items):

1. **Home custom color = Attention Yellow (`#FFE600`).** Home must read as brand
   yellow as its custom colorway fill.
2. **Carousel left border fix.** On the "New Art" tab the first card in each
   `.home-carousel-track` bleeds to the screen's left edge (x=0) instead of
   aligning with the page's content margin (the head/title above it uses
   `padding: 0 40px`). Left edge needs to line up.

## State / decisions

- Branch is currently identical to `origin/dev` (no divergence) — prior
  yellow/carousel commits (#11, #12, #14) already merged to dev.
- Home only paints yellow when there is **no saved colorway pick**
  (`ColorwayContext` line ~399). A saved pick (e.g. orange) overrides it.
  Brendon reports the orange is **not** his local settings — treat as a real
  code path to fix, not stale localStorage.

## Next step

- Confirm the exact intended behaviour with Brendon (home ALWAYS yellow vs.
  default-only), then implement both fixes on this branch → PR into `dev`.
