# BRIEF — Find the pathological art engine (desktop home crash)

**For a fresh Opus 4.8 session. Read CLAUDE.md first; subagents allowed and
RECOMMENDED — this is a fan-out bisection over ~100 engines.**

## Where the hunt stands (2026-07-03, Fable session — read before starting)

- Symptom: Windows desktop Chrome died loading the home page; iPhone always
  fine. Brendon: desktop handled the OLD home (pre-late-June) easily.
- Already ruled OUT / already fixed (do not re-litigate):
  - The SSR-500 recovery mode (wallet hooks outside the provider) — fixed +
    shipped 2026-07-03 (`lib/wallet/walletClientOnDemand.ts`). Crash persisted.
  - The prehydration boot-script SyntaxError — fixed same day. Crash persisted.
  - Canvas MEMORY at tile scale is trivial (200px tiles, LRU-capped
    virtualizer `lib/virtualization/canvasVirtualizer.ts`).
- The decisive experiment: **the zero-out** (all projects → 0 mints, applied
  live 2026-07-03) removed all minted tiles from home → **desktop loads
  great.** So the killer is in PAINTING minted tiles — overwhelmingly likely
  ONE (or a few) of the ~45 engines added 2026-06-28→07-01 (HALO cohorts —
  none ever ran on a desktop before the Cloudflare deploy; Vercel was paused
  the whole time they landed).
- Working theory: an engine whose paint hangs (unbounded loop / convergence
  that diverges) or allocates absurdly, on some seed/size/DPR combo that
  desktop hits and iPhone doesn't (desktop DPR is 1 / 1.25 / 1.5 — Windows
  display scaling gives NON-INTEGER DPR; iPhone is integer 3).

## The hunt (no DB needed — engines are deterministic client functions)

Engines live in `lib/art/engines/*.ts`, registered in `lib/art/registry.ts`,
painted via each ArtworkCard's render closure (see `components/ArtworkCard.tsx`
for the exact canvas sizing the home tiles use — `renderSize={200}`).

Build a headless harness (Playwright; chromium at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, launch with
`executablePath` + `--no-sandbox`): for EVERY registered engine × ~50 seeds ×
canvas widths {120, 200, 300} × DPR {1, 1.25, 1.5, 3}, paint one canvas with
a WATCHDOG (worker or per-paint timeout ~2s). Record per paint: wall time,
success/hang/throw, heap delta. A hang or a >1s tile paint = suspect;
reproduce it standalone, then fix THAT engine's math (bound the loop /
fix the convergence) — the OUTPUT for already-seen seeds must stay visually
identical wherever it already renders (deterministic art is the product;
Brendon's screenshots are the reference).

Also sweep the OLDER engines at non-integer DPR — the HALO cohorts are the
prime suspects but the DPR angle could implicate an old engine that never
met a 1.25× display.

## Constraints

- Fix the pathological engine(s) ONLY. No perf "improvements" to healthy
  engines, no virtualizer changes, no home-page changes.
- NO AMPUTATION: the art stays live and identical. Bound the computation,
  never simplify the visual result.
- Feature branch off latest `dev` → present Brendon the numbered list with
  the evidence (engine name, what diverged, before/after paint times) →
  merge to dev only on his explicit go.
- Local run recipe: `.env.local` with the Supabase URL + anon key (get via
  Supabase MCP `get_project_url` / `get_publishable_keys`; also set
  `SUPABASE_SERVICE_ROLE_KEY` to the anon key locally — reads-only stand-in)
  + any mainnet RPC URL as `NEXT_PUBLIC_ALCHEMY_RPC_URL`. `npm run build` +
  `npm run start`. NOTE: mints are ZERO now — the home carousels are empty,
  so tile-paint repro must go through the engine harness above (or sim-mint
  locally... do NOT mint against the live DB; it was just reset).
