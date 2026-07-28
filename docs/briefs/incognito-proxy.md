# INCOGNITO PROXY ⚇ — build brief (queued 2026-07-27, Brendon's order)

> **BUILT 2026-07-28 (v1, overnight session — Brendon's "build and push as
> you go" pre-approval).** Engine grew the proxy identity, the pill input
> resolves (@handle · name.eth · 0x…), `useEffectiveAddress()` is the one
> read, adopted: PriceBooks/Portfolios · project-gallery My Network ("Me",
> Following/Followers/Mutuals = the lens's circle) · Friend Inspector
> default target · Completionism. **The two open questions were answered
> with the conservative calls, flagged for Brendon's morning edit:**
> (1) identity area stays YOU — the lens is in the bar, not the mirror
> (the brief's own lean); (2) writes DISABLE while proxied on adopted
> surfaces (Completionism's ⌂ Pal door toasts `Incognito: READ ONLY`) —
> nothing ever acts as the proxy OR silently as you from a proxied view.
> **Consciously out (v1):** Starred/Wishlist (§Scope 3) — their stars live
> in the private settings envelope with NO public read path; lifting them
> would need a new API and a privacy call. Brendon's word before building.

## What exists now (verified against the code, 2026-07-27)

- `lib/incognito/incognitoEngine.ts` — a session-only boolean with pub/sub
  (no localStorage, resets on reload). Toggling ON deactivates Hammer mode.
- **Door ON:** the ⚇ button in wallet settings (`WalletSection`) toggles the
  engine and lights/underlines itself.
- **Door OFF:** the bar-centre pill (`TopBarRow`, `#incognitoPill`) shows
  `⚇ Wallet: [input]` with an × that toggles the engine off.
- **The input does NOTHING.** `#incognitoEnsInput` (placeholder
  `brendon.eth`) is focused on activate and read by nobody. No surface
  changes while the mode is on. That's the whole gap.

## What it should be (the sim's intent, refs 12506–12524)

**Browse PD through another wallet's eyes — read-only, session-only.**
Type any @handle / ENS name / 0x address into the pill; while the proxy is
on, the app's *viewer-personal* reads resolve against THAT wallet instead of
yours. × or reload returns you to yourself. No writes ever happen as the
proxy — it is a lens, not a login.

## Scope — surfaces that honor the proxy identity (v1)

1. **Portfolios / PriceBooks** — their holdings, spent, at-floor.
2. **Collected facets + galleries "Me" network filters** — "Me" = the proxy.
3. **Starred / Wishlist views** — theirs (public-read paths only; see §Data).
4. **Completionism / The Close** — their months.
5. **Friend Inspector defaults** — your circle views open on theirs.
6. The **connect-menu identity area** flags the disguise: the pill already
   shows `⚇ Wallet: @x`; the sprite/badge SHOULD NOT change (you are still
   you — the lens is in the bar, not the mirror). CONFIRM with Brendon.

Out of scope v1: anything auth-gated private (their pings, notes, to-dos,
drafts, sim-ETH balance) — the proxy only sees what a public profile visit
could already derive. **No writes, no exceptions:** buy/list/offer/follow
buttons either act as YOU (never as the proxy) or disable while proxied —
ASK BRENDON which, before building.

## Mechanics (reuse, never reinvent)

- The **Friend Inspector view-as** already does this pattern once:
  `FollowersModal` takes a target address via the modal slug and keys its
  loads on `targetAddrLc ?? siweAddress`. Generalise that idea: the engine
  grows `proxyAddress: string | null`; a resolver turns the pill's input
  (@handle → `/api/user/by-handle`, ENS → ensEngine, 0x → as-is) into an
  address and stores it.
- Surfaces read one hook (`useEffectiveAddress()` — session address unless
  the proxy is set). Adopt it surface by surface in the §Scope order; each
  adoption is small and testable.
- Enter in the pill = resolve + toast (`Incognito: @HANDLE` /
  `Incognito: NOT FOUND`). While resolved, the pill shows the @handle solid
  (full-strength — Rule #2), not placeholder-grey.
- Session-only stays the law (no persistence — deliberate, matches sim).

## Gates

- Doors are already Brendon-confirmed and shipped (⚇ on, pill × off) — no
  new chrome needed, so no door questions. The two open questions above
  (identity-area behavior; act-as-you vs disabled writes) are HIS calls —
  ask before building, per Rule #-0.4.
- Estimated size: engine + resolver + hook ≈ small; the surface adoptions
  are the real work. Ship v1 with §Scope 1–2 if the batch runs long; the
  hook makes the rest incremental.
