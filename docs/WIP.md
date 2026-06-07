# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context, so a new session recovers
> the thread without anyone re-explaining it. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** `claude/home-page-color-carousel-TNXd5`
- **Updated:** 2026-06-07

## Last task — home page polish (✅ MERGED TO DEV via PR #16)

1. **Home custom color = Attention Yellow (`#FFE600`).** Home paints yellow for
   both cold-start AND an explicit `custom` pick, using ATTENTION directly
   instead of leaking the shared `pd_custom_color` slot (`ColorwayContext.tsx`
   ~L399). Light/dark/orange picks still work on home.
2. **Carousel left edge.** Carousel head + track match the page's responsive
   edge inset — 40px desktop, **20px mobile** (the missing mobile rule was the
   cause). `app/globals.css` after `.home-carousel-track`.

Merged to `dev` (squash, PR #16). dev preview rebuilt with both fixes.

## Process hardening shipped this session

- SessionStart self-brief (`.claude/session-start.sh`) prints WIP + starter +
  branch-mismatch guard into every chat.
- `git-guard` PreToolUse hook (`.claude/git-guard.sh`) hard-blocks any git write
  to `main`. Escape hatch: `PD_ALLOW_MAIN=1 <cmd>` after explicit approval.
- CLAUDE.md §0 (session protocol, dev-only rule) + §7 (concise CEO-level comms).

## main / production — RESOLVED, clean

- Verified: current `main` tree == pre-promotion `main` tree (`5236c2e`), i.e.
  the promote→revert churn netted out. **Production is the correct pre-fuckup
  baseline.** Left untouched on purpose (no prod write for a no-op; guard blocks
  main anyway). The two promote/revert commits remain in history; content clean.

## Next step

- Nothing open. Home fixes live in dev; main clean. Pick the next task from the
  Sepolia test phase (§8 of CLAUDE.md) when ready.
