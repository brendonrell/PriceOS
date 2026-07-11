# BRIEF — PD Studio phase 2 (for a fresh Opus session)

> Written by the 2026-07-11 Fable session. Read `docs/pd-studio-spec.md`
> first (the plan of record) and `PriceOS/CLAUDE.md` (the operating
> contract). Everything below builds on what is ALREADY LIVE on `dev`.

## What is already built (don't rebuild)

- **Studio workbench** (`app/studio/page.tsx`): drafts (device-local),
  mandatory PriceSprite vibe + custom colorway + YouTube playlist (public
  check via `/api/studio/playlist`), test runs 8/22/88/222 in the real
  tokenURI envelope, full-width live page preview (real Hero + scoped
  colorway vars + tab/trait pills), publish preflight → `/studio/publish`.
- **Analytics v1** (`components/studio/StudioAnalytics.tsx`): per-Project
  cards from the indexer-fed pipeline via the public API
  (`/api/project/[slug]/outputs` + `/feed`): minted/supply, collectors,
  followers, listings + floor, sales + volume, 14-day mint-pace strip,
  last 3 ledger moments. Artist-scoped by registry `artistHandle` ==
  signed-in handle; access-list wallets with no own Projects get the
  PLATFORM VIEW (whole catalog). House style classes: `pd-studio-ana*` in
  `styles/studio.css`.
- **Studio connect menu** (LinksView studio branch): Dashboard / Analytics
  / Docs / MCP / Support (Stickers for the access list).

## Phase-2 work orders (in priority order)

1. **Royalty accounting on the analytics cards.** Per-Project royalties
   earned: rate lives on-chain (EIP-2981 / PaymentSplitter), sales in
   `events` (priced rows). Decide: compute royalty = rate × sale price per
   SALE event; splitter payout verification is a later chain read. Surface
   as one line per card: `ROYALTIES ≈ X ETH`.
2. **Artist pings** (`PingsBox` on /studio): mints, listings, offers,
   sales, royalty payouts on the artist's Projects — filter the existing
   pings pipeline by the artist's project slugs. Spec locked decision #3.
3. **Soundtrack management (the mutable off-chain surround).** OPEN CALL
   for Brendon first: ownership model for writes — on-chain artist address
   vs registry handle mapping. Then a `requireAuth` route that lets the
   verified artist update `projects.soundtrack` (+ label), and a Studio
   management row per live Project. Normalise via
   `lib/project/soundtrack.ts`; reuse the `/api/studio/playlist` public
   check.
4. **Cross-device drafts**: Supabase store (RLS wallet-owner only) + R2
   for uploaded assets, replacing localStorage v1 (keep local as offline
   cache). Spec architecture section names the shape.
5. **Library-bound test envelope**: registry-bound library block in
   `buildEnvelope` (lib/studio/drafts.ts) so library Projects test
   byte-identically.
6. **Sticker catalog wiring** (Brendon-only layer — ClickUp spec
   `86bavucbz`; never document publicly).

## Verification bar

iPhone-viewport screenshots via the dev-login rig (see WIP/session notes:
local `next start` + Playwright at `/opt/pw-browsers/chromium`, dev-login
POST, live Supabase anon env in `.env.local` — never commit it). Real
build + compiled-asset inspection before any "done".
