# BRIEF — Desktop home-page crash (diagnose + fix)

**For a fresh Opus 4.8 session. Read CLAUDE.md first — every rule applies.
Subagents are allowed in your session (you are Opus, not Fable).**

## The bug (reported by Brendon, 2026-07-03, on the new Cloudflare deploy)

- **Windows desktop + Chrome: the HOME PAGE crashes the tab.** His words:
  "desktop is crashing on the home page, I guess too much live art? I would
  have thought a windows machine+chrome could handle 3 carousels visible?"
- iPhone 12 / iOS 26 (PWA + Safari): fine — in fact snappier than ever.
- Surface: `https://pricediscussion.pricediscussion.workers.dev` (Cloudflare
  Workers deploy of `dev` — this IS the app now; Vercel is paused/legacy).

## What the home page is (verified in code, start here)

- `app/page.tsx` → server-seeds `components/home/HomePageBody.tsx` (~1,100
  lines) — stats + NOW MINTING carousels in the first paint.
- Carousel tiles are **live generative-art canvases**: engines in
  `lib/art/engines/*` painted through `lib/virtualization/canvasVirtualizer`
  (IntersectionObserver-gated; carousels pre-paint tiles ~2 over via
  `forceRenderKeys`, observer rooted on the track — see notes at
  `components/home/HomePageBody.tsx:130-230`).
- Comment at `HomePageBody.tsx:971`: painted canvases deliberately SURVIVE tab
  switches (no repaint). Check whether that retention accumulates on desktop.
- There are ~45+ registered projects now (registry: `lib/art/registry.ts`) —
  the home page shows multiple carousel rows; a wide desktop viewport shows
  FAR more tiles simultaneously than a phone.

## Diagnosis leads (verify in code/profile — do NOT assume)

1. How many canvases ANIMATE simultaneously on a wide viewport, and whether
   engines run continuous animation loops per tile with no cap/pause when
   offscreen or when the count is high.
2. Per-canvas memory (tile count × canvas buffers, devicePixelRatio scaling
   on desktop monitors can 4× the pixels per tile).
3. WebGL context limits if any engine uses WebGL (browsers cap ~8-16 live
   contexts, oldest gets killed → possible crash path).
4. The NPC cast layer + other home overlays compounding with the carousels.
5. Reproduce headless: Playwright + Chromium is preinstalled in the container
   (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`); build locally (`npm run
   build` + `npx opennextjs-cloudflare build` optional) and profile memory /
   long tasks on a desktop-size viewport (e.g. 2560×1440, DPR 1 and 2).

## Hard constraints (from CLAUDE.md — non-negotiable)

- **NO AMPUTATION**: the art stays LIVE and animated. Throttling/virtualizing
  /pausing offscreen or capping concurrent animation is fine; killing the
  liveness, downgrading to static images, or removing tiles is NOT.
- Look/feel must stay pixel-identical on phone (Brendon's prime directive
  for the migration era).
- Fix the named bug, nothing else. Smallest change that ends the crash.
- Work on a feature branch off `dev`. Present Brendon the numbered CEO list;
  merge to `dev` ONLY on his explicit chat approval ("push"/"approved").
- Verify with the real production build before claiming done.

## Related (same bundle, do NOT build unless Brendon says so in your chat)

Queued after this fix, in order: wallet/auth/ENS reliability review →
architecture/tech-debt audit → snappiness pass (page transitions, tap
response) + re-enable the two disabled pollers the Cloudflare-cheap way
(cached responses, poll only while app visible; flags: `RPC_PING_DISABLED`
in `lib/rpc/rpcEngine.ts`, `PINGS_POLL_DISABLED` in
`lib/state/PingsContext.tsx`).
