# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context, so a new session recovers
> the thread without anyone re-explaining it. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** `claude/home-page-color-carousel-TNXd5`
- **Updated:** 2026-06-07

## Open task — home page polish (DONE on branch, pending merge to dev)

1. **Home custom color = Attention Yellow (`#FFE600`).** Fixed: home now paints
   yellow for both cold-start AND an explicit `custom` pick, using ATTENTION
   directly instead of leaking the shared `pd_custom_color` slot
   (`ColorwayContext.tsx` ~L399). Light/dark/orange picks still work on home.
2. **Carousel left edge.** Fixed: carousel head + track now match the page's
   responsive edge inset — 40px desktop, **20px mobile** (the missing mobile
   rule was the cause). `app/globals.css` after `.home-carousel-track`.

Build passes locally. Pushed to the feature branch; branch preview deploying.

## Process hardening shipped this session

- SessionStart self-brief (`.claude/session-start.sh`) prints WIP + starter +
  branch-mismatch guard into every chat.
- `git-guard` PreToolUse hook (`.claude/git-guard.sh`) hard-blocks any git write
  to `main`. Escape hatch: `PD_ALLOW_MAIN=1 <cmd>` after explicit approval.
- CLAUDE.md §0 (session protocol, dev-only rule) + §7 (concise CEO-level comms).

## ⚠️ Open item for Brendon — production/main is in a REVERTED state

- A prior session: Brendon promoted dev→main (`d28fe44`, "all session work"),
  then a **Claude session committed a revert directly to main** (`44078c7`).
  Current **production = the revert** — home/yellow/carousel work is NOT on main.
- dev itself is healthy and has all the work.
- Decision needed: leave main reverted (clean until a deliberate promotion, per
  the dev-only rule) or re-promote. **Do not touch main without explicit
  approval** (guard blocks it anyway).

## Next step

- Merge this branch's home fixes into `dev` (Brendon's approval) → PR record.
- Then decide main/production posture (above).
