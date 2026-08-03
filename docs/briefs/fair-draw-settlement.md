# Brief — Fair Draw settlement service (the off-chain half)

**Why this matters, in Brendon's words (2026-08-03):** *"This is a VERY
important thing — lack of fair draw was one of the reasons fxhash had to
shut down artcoins which led to them shutting down in general."* This is a
platform-survival feature, not a nice-to-have. Build it like the money path
it is.

## What already exists — DO NOT REBUILD

- **The chain half is DONE and reviewed** (2026-08-02 full pre-mainnet
  pass): PDProject's entry window — `closeWindow`, `closeWindowContested
  (winners, seats, sealSeconds, drawCommit)`, `addWinnerSeats`,
  `revokeWinnerSeats`, `finishSettlement`, `dropPhase()`, the ≤4h fail-open
  deadline, the ≤72h write-once transfer seal. 22 dedicated tests
  (`pd-contracts/test/PDProjectWindow.t.sol`).
- **The draw engine is DONE** — `lib/drops/draw.ts` + `tests/fair-draw.test.ts`
  (9 tests): bands → unbiased seeded shuffle (keccak counter-mode, rejection
  sampling) → full permutation whose head wins and whose tail IS the cascade;
  `entriesRoot` → `drawSeed(root, beaconHash)` → `drawCommitment` (what goes
  on-chain) → `verifyDraw` (what any stranger runs). ⛔ The engine is the
  fairness core: never reimplement it inline, never fork its logic into the
  service, and never bump `DRAW_ALGO` except with a genuinely new algorithm.
- **The behavior spec is the public docs** — `content/docs/fair-draw/*`
  (three pages). They were verified accurate against the contract on
  2026-08-03. If the build wants to contradict them, STOP and raise it.

## The build list (in order)

1. **Tables.** `drops` (project address, window open/close instants, status:
   WINDOW/QUIET-CLOSED/CONTESTED/SETTLED, beacon block + hash, commitment,
   transcript JSON) and `drop_entries` (drop id, wallet, the held signed
   mint order, band at snapshot, seats, status: HELD → EXECUTED / TORN-UP /
   VOIDED, tx hash when executed). RLS per the house pattern.
2. **Entry collection.** During the window the contract accepts no mints —
   an entry is a COMPLETE pre-signed mint transaction the app holds (the
   docs' "signed instruction, never funds"). One order per wallet per drop,
   enforced at insert. API route + the drop room's WINDOW state (the mint
   button signs-and-enters; continuous-motion law applies while held).
3. **The standing snapshot + banding.** Computed at window OPEN (never
   after — "you enter as whoever you already were"): the published ladder is
   holdings-first, then lifetime spend, then tenure/wallet age. Band
   BOUNDARY VALUES are Brendon's call — propose concrete cuts off real data
   in one line and get his word. Boundaries stay unpublished (the policy is
   public, the cuts are not).
4. **Close + draw.** At window close: count seats vs supply. Fits → sign
   `closeWindow()`, broadcast every held order (QUIET ending). Over →
   snapshot entries in canonical form, take the FIRST Ethereum block mined
   after close as the beacon, `runDraw`, then `closeWindowContested` with
   the winners/seats and the engine's commitment, then broadcast the
   winners' held orders.
5. **The cascade.** A held order that fails (balance gone, nonce burned) or
   an entry VOIDED as a bot: `revokeWinnerSeats` + `addWinnerSeats` to the
   next names in `result.order` — the drawn permutation IS the cascade, no
   second draw, no discretion. Then `finishSettlement()`; leftovers go
   first-come.
6. **The transcript surface.** A public page per contested drop: the full
   transcript JSON (downloadable), the on-chain commitment link, and
   `verifyDraw` running IN THE BROWSER so a stranger checks the draw with
   their own machine. This page is the trust product — it gets the same
   polish as the drop room.
7. **The settlement key.** A server-held key (worker secret), its address
   proposed + accepted on the factory (Brendon's Remix step — HIS action).
   Its only powers are the choreography calls above; the fail-open means a
   dead key can never strand a drop. ⛔ Never build anything that DEPENDS on
   the service being alive — the deadline rescue is the design, not an edge
   case.
8. **Sepolia rehearsal.** One windowed test project end-to-end: quiet close,
   then a forced contested close (more entries than supply), cascade, seal,
   transcript page verifying green. This is the gate before the feature is
   called done.

## Locks that bind

- Winners pay the exact same price through the exact same push-splits as any
  minter — the service never touches money, ever.
- Entries during the window are SIMULTANEOUS — nothing about arrival order
  may leak into banding, storage order fed to the draw, or the UI.
- The seal is set once at contested close and never extended; voiding +
  re-draw happens INSIDE the seal window, before the reveal.
- iOS Safari + PWA first (Rule #-0.5); the drop room's states ride the
  existing mint-room surfaces (Rule #0 — reuse, never reinvent).
- Fable sessions don't spawn subagents; this brief is sized for one focused
  build session with the engine already done.

## Brendon's calls (get the word, then build)

1. Band boundary cuts (propose off real collector data).
2. Default `windowSeconds` and `sealSeconds` per drop.
3. The settlement key ceremony (he creates/accepts on-chain when ready —
   the service ships dark behind the fail-open until then).
