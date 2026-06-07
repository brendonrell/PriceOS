# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** `claude/home-page-color-carousel-TNXd5`
- **Updated:** 2026-06-07

## Last task — home page (✅ root-caused + MERGED TO DEV, PR #17)

1. **Home = Attention Yellow in custom mode.** Real root cause: TWO paint paths
   (boot + server-hydration) and only boot honored home→yellow; the hydration
   handler repainted with the shared `pd_custom_color` slot (Brendon's #FF6600
   profile hex) on every load. Both now route through one `paintForPath`
   resolver (`ColorwayContext.tsx`) so they can't diverge. Verified via
   Brendon's settings screenshot: default colorway = custom, profile hex =
   #FF6600 — settings were correct; home was leaking the profile slot.
2. **Carousel left edge.** `scroll-snap` pulled card #1 to the screen edge,
   eating the track's left padding. Fix = `scroll-padding-left` (40px desktop /
   20px mobile) so the snap start respects the page inset. (`app/globals.css`)

Merged to `dev` via PR #17. dev deploy (23b4649) building → verify on
`https://price-os-git-dev-pricediscussion.vercel.app`.

## Hard rule added this session
- **Never blame Brendon's settings/cache/browser.** Default: it's our code/deploy.
  (CLAUDE.md §7.) Plus: Brendon's review surface = the dev URL above (CLAUDE.md §0).

## Process harness (live, in dev)
- SessionStart self-brief + branch-mismatch guard (`.claude/session-start.sh`).
- git-guard blocks all writes to `main` (`.claude/git-guard.sh`); escape hatch
  `PD_ALLOW_MAIN=1`. Segment-aware so "main" in a commit message doesn't false-block.
- Push rule: app pushes need Brendon's numbered-list approval; docs/process pre-approved.

## main / production — clean
- `main` tree == pre-promotion baseline (`5236c2e`); promote→revert netted out.
  Untouched on purpose. Home fixes live in `dev` only (not promoted).

## Next step
- Brendon verifies home (yellow + carousel) on the dev URL once 23b4649 is READY.
