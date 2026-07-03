# BRIEF — Snappiness pass (transitions + tap response)

**For a fresh Opus 4.8 session. Read CLAUDE.md first; subagents allowed.
Run AFTER the desktop-crash fix has merged — same rendering territory.**

## The ask (Brendon, 2026-07-03)

On the new Cloudflare deploy the app already feels snappier than Vercel ever
did — he wants MORE: "any way we can make the page transitions even smoother?
Make link/button taps/clicks respond even more immediately? It's already
great to be clear, but presumably now is the time to optimize."

## Ground already held (do not regress it — read the WIP.md history)

- Internal links route client-side via a global interceptor; page never
  tears down; theme bg glides between routes; `<main key={pathname}>`.
- Prefetch on POINTERDOWN only — hover/scroll prefetch caused a server-choke
  freeze once; NEVER reintroduce it.
- Client-nav cache re-pinned to Next-14 feel (staleTimes 30s/300s).
- Profile colour paints first-frame from the server-known hex.
- Carousel tiles pre-paint ~2 over via the track-rooted observer.

## The known open item (queued in WIP as "button-flash polish")

On nav, the background is instant but the new page's buttons/content lag
until its data loads (force-dynamic fetch window). The named fix direction:
render the page frame instantly and stream data in, so interactive elements
land WITH the background. **The bg staying instant is a hard constraint
(Brendon).** Start here — it's the biggest remaining perceived-speed win.

## Other avenues (investigate, keep what measures well)

- First-tap feedback: every tappable should visually respond <100ms even
  when its action is async (the §9 "always feel moving forward" rule).
- Server response times on the Workers runtime for the hot APIs (home,
  project, output, search) — measure, then tune the timed caches (KV-backed)
  if a hot read is doing full work per request.
- Font/asset loading on cold start (PWA + first web visit).
- Measure on BOTH: iPhone (his primary) + desktop Chrome.

## Constraints

- Look/feel identical — this pass changes TIMING, not pixels, motion
  designs, or affordances. No new spinners/skeletons Brendon didn't ask for
  (ghosts/loaders that already exist are the vocabulary — reuse them).
- Present measured before/after numbers with the CEO list.
