# BRIEF — Sticker store buys move server-side (print-run caps become real)

**For a fresh Opus 4.8 chat. Read `CLAUDE.md` first and obey all of it.
Origin: Architect Report round 2 §3.3 + Brendon's decision of record
(2026-07-16, ClickUp `86bayvczh`): launch keeps all 18 sheets but ALL become
LIMITED print runs. Run AFTER `rpc-test-rig.md` (and ideally after
`money-logic-pass.md` so the debit rule exists).**

## Today's shape (why this exists)

The sticker MARKET (secondary) is server-atomic with real fees. The STORE
(primary) is not: buying a sheet grants ownership client-side
(`lib/stickers/owned.ts` — localStorage, synced to `users.sticker_state`).
Two consequences: print-run caps are unenforceable (any client can grant
itself anything), and the sim ledger never sees primary purchases. The
contract side is already done (PDStickers has `maxSheets`/`SheetSoldOut`,
platform 5% verified on Sepolia) — this brief brings the SIM side to parity
so cutover is a rail-swap, not a redesign.

## The build

1. **Config**: per-sheet print-run caps — extend the existing sticker config
   surface (`sticker_fee_config` precedent; one row per sheet or a jsonb
   map). Cap values are BRENDON'S numbers — collect them as one numbered
   list before applying anything.
2. **RPC `app_sticker_claim`** (service-only, same family as the audited
   market RPCs): atomically — count claimed for sheet < cap (else
   `SHEET_SOLD_OUT`), debit the buyer's sim-ETH at the sheet price (buyer
   row REQUIRED — the money-pass rule), insert the `sticker_holdings` grant,
   emit a `sticker_events` CLAIM row, honor an Idempotency-Key like the
   other five money routes.
3. **Route**: POST action on the existing stickers API surface, SIWE +
   idempotency, standard error envelope.
4. **Client swap**: the store's buy action calls the API; ownership
   hydrates from the account row (server = truth, localStorage stays the
   paint-fast cache — the house persistence pattern). The ACTIVE layer
   (sheets/stickers toggled off) stays device-local, deliberately. Sold-out
   sheets render the store's existing print-run language — reuse the exact
   states/classes the store already has (Rule #0); if a sold-out treatment
   doesn't exist yet, present options to Brendon, don't invent silently.
5. **Migration of the installed base**: existing owned sheets in
   `users.sticker_state` are legitimate grants — backfill them into
   `sticker_holdings` (no charge, no cap check — they predate caps) so
   nobody loses their binder. This backfill is a live-data write =
   Brendon's explicit word before applying.

## Gates

- Sheet prices/caps + every migration + the backfill: present, wait for his
  word, then apply. Mirror migrations same-session.
- Do NOT touch the market RPCs (audited), binder UX, placements, the peel,
  or fees. Nothing extra.
- Rig tests: cap boundary (last sheet claims, next rejects) · double-submit
  idempotent · debit + event row exact · backfill idempotent.
- Cutover note for the file: at chain go-live, ownership reads swap to
  ERC-1155 balances (`owned.ts` was written for this swap); the claim RPC
  is the sim rail only.

## Done when

Print runs enforce server-side to the exact cap · store buys debit the sim
ledger and appear in `sticker_events` · existing binders unchanged ·
completionism/binder/market all read correctly from the new truth · comment
the ship on `86bayvczh`. Brief deleted in the completing PR.
