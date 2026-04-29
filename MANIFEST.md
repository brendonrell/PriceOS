# PriceOS · Phase 2 · Step 1 (foundation)

**Branch to push to:** `dev` (NOT `main`).

## What this step does

Lays the foundation everything else rides on. No visible UI yet beyond
the homepage colour change. The point of this step is to get state plumbing
in place so steps 2+ have somewhere to read/write from.

After deploy, you should see:

- `price-os-bay.vercel.app` (and `bayshaffer.com`) renders a flat **Hothurt
  red** background instead of the indigo random-gradient from Phase 1.
- The PD wordmark and tagline render in dark text on top.
- Browser dev tools should show three things in localStorage after a few
  seconds: `pd_settings_notifs`, `pd_settings_theme` (both as JSON blobs).
- No console errors. No hydration warnings.

If any of those don't happen, something went wrong — flag it before step 2.

## Files

All paths are relative to the repo root. **Replacement** = drop-in over an
existing file. **New** = create the file (and any parent dirs).

| File | Type | Path |
|---|---|---|
| globals.css | **REPLACEMENT** | `app/globals.css` |
| layout.tsx | **REPLACEMENT** | `app/layout.tsx` |
| page.tsx | **REPLACEMENT** | `app/page.tsx` |
| PdNotifsContext.tsx | NEW | `lib/state/PdNotifsContext.tsx` |
| ThemeContext.tsx | NEW | `lib/state/ThemeContext.tsx` |
| ModalContext.tsx | NEW | `lib/state/ModalContext.tsx` |
| useBodyClass.ts | NEW | `lib/hooks/useBodyClass.ts` |
| useLocalStorage.ts | NEW | `lib/hooks/useLocalStorage.ts` |
| PriceOSShell.tsx | NEW | `components/shell/PriceOSShell.tsx` |

The zip mirrors the destination paths under their parent dirs, so dragging
the contents over the repo root from GitHub's web UI should land them in
the right places. Worth eyeballing in the GitHub diff view before merging.

## How to push (library-machine GitHub web UI)

1. Make sure you're on the **`dev`** branch (the branch dropdown should
   say `dev`, not `main`). Phase 1's last step ran a PR `dev → main`, so
   `dev` should still exist. If it doesn't, create it from `main`.
2. For each replacement file, navigate to it and use the pencil icon to
   replace the contents. Don't try to drag-drop a replacement on top —
   the web UI sometimes resolves the conflict weirdly.
3. For the new files, use **Add file → Create new file** and paste paths
   like `lib/state/PdNotifsContext.tsx` (the `/`-separated path is what
   creates the parent dirs).
4. Commit each file with a message like `step 1: <filename>`. After the
   last commit, Vercel auto-deploys `dev` to a preview URL. Wait for the
   green check.
5. Side-by-side compare: production (`price-os-bay.vercel.app` = main)
   should still show the indigo placeholder; the dev preview should show
   Hothurt red.
6. If the dev preview looks right, open a PR `dev → main` and merge.

## What's deferred

Step 1 is intentionally barebones. Things you might expect to see but
won't yet:

- The navbar, ticker, Connect Menu, footer — all in step 2.
- Any actual styling beyond the page reset and brand tokens.
- The Collection page — that's steps 5+.

## Sanity checks for the deploy

- `view-source:price-os-bay.vercel.app` should show `<meta name="theme-color" content="#FF0055">`
  in the HTML head.
- The pre-hydration script tag should be present right after `<body>`.
- After a hard reload, no white flash before the Hothurt red paints.

## If the build fails on Vercel

Most likely culprit: a relative import path I got wrong (different repo
layout than I assumed). Vercel's build log will point at the file. Send
me the log and I'll fix it in a tiny patch zip.

— Opus 4.7
