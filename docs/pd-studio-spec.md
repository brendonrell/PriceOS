# PD Studio — Working Spec (v1)

> Brendon's brief, 2026-07-10: "the ultimate task." This file is the build
> plan of record for PD Studio. The public story is the PD-Docs "PD Studio"
> section (`content/docs/studio/*`) — keep the two consistent; this file
> carries the internals the docs don't.
>
> ⛔ **The two private layers (Sticker Studio, God Mode) are specced in
> ClickUp ONLY** (Brendon's call, 2026-07-10 — they are for him alone).
> This file names them and their gating, nothing more. Never document them
> in PD-Docs or anywhere public.

## Locked decisions (Brendon, 2026-07-10)

1. **One app**, at `studio.pricediscussion.com` — not three. The former
   "stickers studio" and "godmode" app ideas fold in as wallet-gated layers.
2. **Two sides**: the **upload side** (upload → unlimited test runs with real
   previews → final publish) and the **analytics/management side** (the
   artist dashboard — analytics with surprising depth; management of the
   mutable off-chain surround, e.g. changing/updating a Project's soundtrack).
3. **Runs on the existing UI menus** — REUSE, never reinvent (Rule #0):
   - The **connect menu** becomes the artist dashboard (the full
     `DropdownStack`/`UserDropdown` chrome, repurposed).
   - The **accordion** holds **Projects** where Notes live in the app
     (`AccordionBox` with a Projects box instead of `NotesBox`).
   - **Pings become artist pings** (`PingsBox`) — mints, listings, offers,
     sales, royalty payouts on the artist's work.
4. **Mobile-first, absolutely** — an artist uploads, tests, publishes, and
   manages ONLY with a phone, never touching desktop.
5. **Private layers, Brendon-only**: the upload side additionally shows the
   **Sticker Studio**, and the analytics side additionally shows **God
   Mode**, when the connected wallet is on the access list. Brendon can add
   wallets to that list as backup. Spec detail: ClickUp (see task noted in
   WIP/ClickUp; not in this repo).
6. **PD-Docs carries a comprehensive public PD Studio section** (shipped with
   this spec): overview, upload & testing, publishing, artist dashboard. No
   mention of the private layers.
7. **Artist edits are ALWAYS gated to the on-chain artist wallet (Brendon,
   2026-07-11).** Soundtrack changes and anything else artists may ever edit
   about a live Project authenticate the SIWE session address against the
   Project's on-chain artist address — never a handle mapping, never a
   registry entry. Unforgeable or it doesn't ship.

## Architecture call (CTO)

**Serve the Studio from the existing PriceOS Worker, host-routed.**
`studio.pricediscussion.com` points at the same Cloudflare Worker; middleware
branches on host to the Studio surface (an `app/studio/` route group). One
repo, one deploy, and the shell/menus/colorways are literally the same
components — which is the whole Rule #0 point of "runs on existing UI menus."
A separate app would mean copying the shell, and copies drift.

- Access: any wallet can connect and keep private drafts; publishing gates on
  the on-chain whitelist (unchanged).
- Drafts: Supabase (RLS: wallet-owner only) + R2 for uploaded assets.
  Nothing on-chain until deploy.
- Test runs: simulate token hashes with the contract's derivation shape
  (block entropy + tokenId + minter), render in the REAL `tokenURI` envelope
  (same HTML doc structure, same blessed-library build, same hash delivery)
  in a sandboxed iframe. Stored hashes make every simulated Output exactly
  reproducible. Previews are **PNG** (hard rule §9 — never WebP).
- Preflight before deploy: byte-identical script vs tested draft, bounds
  (supply 22–9,999, fixed price), library binding, whitelist, 60-day
  cooldown, final rehearsal render on the exact deploy package.
- Deploy: the artist signs `createProject` from their own wallet
  (wagmi/viem, mobile wallet). The Studio never holds keys.
- Dashboard data: the same Supabase the indexer feeds (mints, listings,
  offers, sales, transfers, royalty events), filtered to the artist's
  Projects; plus the mutable off-chain surround (soundtrack first).
- Private-layer gating: an access-list table (wallet allowlist) checked
  server-side; Brendon's wallet seeded, editable by him in God Mode.

## Build sequence

1. **Studio shell** — host routing, `app/studio/` group, connect-menu-as-
   dashboard with Projects accordion + artist pings (all reused chrome).
2. **Upload side** — drafts (Supabase/R2), script upload, library binding.
3. **Test engine** — hash simulation, real-envelope rendering, run grid,
   full-screen live render, stored hashes, PNG previews.
4. **Publishing** — preflight + `createProject` signing flow.
5. **Dashboard** — per-Project analytics (mint pace, holders, market,
   royalties) + soundtrack management.
6. **Private layers** — access list, Sticker Studio on the upload side, God
   Mode on the analytics side (build to the ClickUp spec).

Each phase ships to `dev` on its own approval; the docs section is already
written and stays the public contract for what v1 means.

## Open calls

- Sepolia-first: the Studio's publish path should point at the Sepolia
  factory until mainnet launch (it is the same rehearsal thesis the Studio
  sells). Recommended: yes.
- Draft asset limits (R2) — set a sane per-wallet cap when the upload side
  is built; decide the number then, against real R2 usage.
