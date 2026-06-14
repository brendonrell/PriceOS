# pd-contracts — Adversarial Security Audit

**Date:** 2026-06-14
**Auditor:** Independent read-only adversarial pass (senior smart-contract review)
**Scope:** `src/PDFactory.sol`, `src/PDProject.sol`, `src/PaymentSplitter.sol`, `src/PDLibraryRegistry.sol`, `src/PDStickers.sol`
**Deps (pinned, `foundry.lock`):** OZ `v5.6.1`, Solady `v0.1.26`, forge-std `v1.16.1`. Solc `0.8.24`, `via_ir=true`, optimizer 200.
**Tests run:** **None — could not.** Foundry is not installed in this container and `lib/` is not vendored (submodules unfetched), so `forge test` cannot execute here. Findings below are from manual review only. The existing suite is broad and well-targeted (see "Test coverage" note); it should be re-run in a real Foundry env as the corroborating step before mainnet.

---

## Severity table

| # | Sev | Contract:Line | Finding |
|---|-----|---------------|---------|
| C — | — | — | **None.** No critical issues found. |
| H — | — | — | **None.** No high issues found. |
| M — | — | — | **None.** No medium issues found. |
| L1 | LOW | PDProject.sol:266-268 | Shared live-read platform/storage wallet: a wallet that *becomes* a reverting/gas-griefing contract after acceptance halts minting across **every** Project, not just one. Known push-payment trade-off; mitigated by two-step accept + atomic rollback. |
| L2 | LOW | PDFactory.sol:387-399 | URL/non-determinism byte-scan is bypassable (chunk-boundary straddle, obfuscation, missed sources e.g. `crypto.getRandomValues`, `performance.now`, `Date.parse`). Acknowledged in-code; off-chain linter + curation are the stated real layers. |
| L3 | LOW | PDProject.sol:249-256 | Per-token seed is `blockhash(n-1)` + `prevrandao`, knowable to the block proposer/builder → trait-grinding by a sophisticated proposer within a block. Fairness only, no funds. Accepted "no-VRF" residual. |
| L4 | LOW | PDStickers.sol:230-249, 314-318 | `uri()`/`getStickerSVG` emit admin-supplied `name` + raw SSTORE2 SVG bytes with **no** JSON/SVG escaping or content guard. Admin-only input, so self-inflicted; but unlike PDProject there is no `_jsonEscape`/`_assertJsonSafe` equivalent. A stray `"` in a sticker name breaks the metadata JSON. |
| I1 | INFO | PDProject.sol:483-497 | `_reclaim` is deliberately not-memory-safe assembly (flagged for external review). Logic verified correct against current call sites; the README's external-firm + byte-equivalence recommendation still stands. |
| I2 | INFO | PDLibraryRegistry.sol:213-223 | `readLibrary` assembly verified safe against SSTORE2 v0.1.26 layout (1-byte STOP prefix, `extcodecopy` offset 1). Pre-sized buffer matches `totalSize`; no OOB. |
| I3 | INFO | PDProject.sol:295-325 / PDStickers.sol | `storageFeeWriter` compromise can only pin (write-once) thumbnails; canonical art unaffected. Re-confirmed. |

**Bottom line:** Nothing rises above LOW. The prior baseline ("no CRIT/HIGH/MED; only LOW/INFO") is **re-confirmed for all five contracts**, including the two not previously covered (PDLibraryRegistry, PDStickers). The single most novel observation is L4 (PDStickers has no metadata escaping where PDProject does) — admin-only, so LOW, but it is a real inconsistency.

---

## Mainnet-readiness verdict

**Code is mainnet-ready from a vulnerability standpoint — no exploitable flaw lets an attacker steal funds, mint beyond supply, seize admin, or strand another party's money.** Two gates remain, both already on record and neither a code bug:

1. **Run the test suite in a real Foundry env** (could not run here). The suite is strong; it just needs to actually pass on a clean checkout as the corroborating proof.
2. **External-firm audit + a byte-equivalence / symbolic proof of the two hand-rolled assembly blocks** (`PDProject._reclaim`, `PDLibraryRegistry.readLibrary`). The deploy is immutable and these are the only not-memory-safe surfaces; the README already flags this and I concur it is the right and necessary final step.

---

## Threat-by-threat detail

### 1. Reentrancy — CLEAN
- **PDProject.mint** uses strict CEI: `totalMinted` is committed (line 261) **before** any `_push` (266-268). A reentrant mint from a malicious artist's `receive()` therefore sees the already-incremented supply and cannot exceed `maxSupply`. Corroborated by `MintMathFuzz.testFuzz_ReentrantArtistCannotExceedSupply`.
- **`_mint` not `_safeMint`** (258): no `onERC721Received` callback mid-batch — closes the in-batch reentrancy hole the code comment describes. Correct and deliberate.
- **PaymentSplitter ETH path** has no lock but is reentrancy-safe by construction: `*Withdrawn += amount` lands before the external `.call` (134, 146), and pendings are recomputed from cumulative accounting, so a re-entrant withdraw computes `amount == 0` and reverts `NothingToWithdraw`. Read-only reentrancy: views (`pendingArtist` etc.) are pure functions of balance + withdrawn; an external integrator reading mid-withdraw sees a *consistent* (if transient) split, never a corrupt one. Corroborated by `PaymentSplitterInvariant` with an actively re-entrant receiver.
- **PaymentSplitter ERC-20 path** adds an explicit `_entered` guard (177-187, 191-203) because its split is balance-based and a token transfer hook could otherwise interleave the two pushes. Correct — this is the one path that genuinely needs the lock, and it has it.
- **PDStickers.purchaseSheet** mutates all state (`s.minted`, `sheet.sold`) before `_mintBatch` (215-223). `_mintBatch` to an ERC1155 receiver hands control to the buyer via `onERC1155BatchReceived` — but all effects are already committed and there is no payout in the call, so reentrancy yields nothing. `withdraw()` (264-269) sends full balance with effects-free accounting; re-entry just re-sends a now-zero balance path. Clean.

### 2. Access control — CLEAN
- All privileged transfers are two-step propose/accept where the **new** address must call accept (PDFactory admin/3 wallets/writer; PDStickers admin; registry one-shot `wireFactory`). A mistyped/dead destination can never go live. Re-confirmed against current lines.
- **Clone re-initialization:** N/A — these are **not** minimal proxies/clones. PDFactory deploys fresh PDProject + PaymentSplitter via `new` (CREATE, not CREATE2), each with a real constructor; there is no `initialize()` to front-run or re-call.
- **Registry admin** is a *live read* of `factory.admin()` (PDLibraryRegistry:108-113) — no second governance surface, rotation propagates instantly, and `wireFactory` is one-shot (`AlreadyWired`). The deployer key is powerless after wiring. Verified.
- **Direct PDProject deploy** (bypassing factory) is defended: constructor re-checks zero-addr/supply and the money math reads the factory interface, so a rogue direct deploy can't create a malformed money path. The factory whitelist+cooldown is the gate for *legitimate* projects.

### 3. Payment / splits math — CLEAN
- **Complement split** everywhere: `platformShare = mintPriceTotal - artistShare` (PDProject:241), and PaymentSplitter's platform pending is `total - artistCut - platformWithdrawn` (122-125, 167-169). No second bps product → zero rounding dust stranded. Corroborated by `MintMathFuzz` (down to 1-wei prices) and `PaymentSplitterInvariant.invariant_EthPendingsSumToBalance`.
- **Exact payment** required (`msg.value != mintPriceTotal + storageTotal` → revert); contract holds zero balance before/after; no refund surface to grief. Verified `invariant`/fuzz.
- **Overflow:** 0.8.x checked arithmetic; the only `unchecked` blocks are loop counters and `tokenId`/`minted`/`sold` increments provably bounded by prior checks (supply cap, tx cap 22). Safe.
- **Fee-on-transfer / reverting recipient:** push-payments mean a reverting recipient reverts the whole mint atomically — `PushPayments.t.sol` proves rollback for reverting platform, storage, AND artist wallets with no other party's funds moving. This is L1 (a shared platform wallet that turns hostile halts all mints) — a deliberate, documented push-payment trade-off, not a theft/loss vector.

### 4. Hand-rolled library-reader assembly — VERIFIED SAFE (still recommend external proof)
- **PDLibraryRegistry.readLibrary (213-223):** allocates `data = new bytes(lib.totalSize)` then per-chunk `size := sub(extcodesize(pointer),1)` and `extcodecopy(pointer, dst, 1, size)`. This matches **SSTORE2 v0.1.26** exactly: `write` prepends a single `0x00` STOP byte, so code length = data+1 and the payload starts at offset 1. `totalSize` is the maintained sum of appended chunk lengths, so the destination buffer is exactly sized — no OOB write, no chunk-boundary gap, byte-for-byte concat. `finalize` requires ≥1 chunk and each chunk is ≥1 byte, so `extcodesize-1` is never an underflow on a real entry. Corroborated by `PDLibraryRegistryTest.test_ReadLibrary_ConcatenatesChunksInOrder` (full-ceiling chunks + short tail).
- **PDProject._reclaim (483-497):** slides a `bytes` down to a captured free-memory mark and rewinds `0x40`, to keep the quadratic-memory high-water mark near the final answer size. Traced every call site:
  - `_libraryBlock` takes its mark *before* its own allocations and reclaims its result — correct (mark ≤ data).
  - `_animationField` takes a mark, builds `html` (which internally calls `_libraryBlock`+`getScript` above that mark), reclaims `html` to mark, then base64-encodes (allocating above the now-lower free ptr) and reclaims the base64 over the dead `html`. The base64 buffer is strictly above `mark`, and `html` is dead after encoding — the safety precondition ("nothing at/above mark referenced afterward except the returned data") holds.
  - `tokenURI` takes its mark before `abi.encodePacked`, which embeds `_animationField`'s already-reclaimed return; final `_reclaim` slides the envelope down. No live buffer is clobbered.
  - The word count `shr(5, add(len, 63))` copies the length word + payload rounded up — correct, and a zero-length `data` still copies the length word. No path produces zero-length here anyway.
  - This is genuinely not-memory-safe assembly. Logic is correct under current call order, but it is fragile to refactor and is exactly the surface an external symbolic/equivalence proof should cover. **I concur with the README's gate.** (I1)

### 5. PDStickers — CLEAN except L4
- ERC-1155 sticker shop, admin-curated, sheet-only primary. Sheet creation validates non-empty, ≤64 ids (O(n²) dedup bounded), existence, and active. `purchaseSheet` re-checks active + per-sticker maxSupply at buy time, exact ETH, then `_mintBatch`. Supply caps hold (corroborated by `StickersInvariant.invariant_CappedSupplyRespected`). Balance conservation holds (`invariant_BalanceEqualsPaid`).
- **Who can write whose tokens:** only `admin` creates stickers/sheets; buyers only mint sheets to themselves. No spoofing — buyer is always `msg.sender`. No griefing/storage-exhaustion lever for non-admins.
- **DoS:** `MAX_STICKERS_PER_SHEET = 64` caps the per-purchase batch and the O(n²) dedup. No unbounded loop reachable by an attacker.
- **L4 (the one real gap):** `uri()` (230-249) interpolates `s.name` (admin string) and the raw SVG bytes into JSON **without escaping**, and `getStickerSVG` returns raw bytes. PDProject solved exactly this with `_jsonEscape` + factory `_assertJsonSafe`; PDStickers has neither. Admin-only input keeps it LOW (self-inflicted, no external attacker), but a `"` or control byte in a sticker name silently breaks marketplace metadata. **Fix:** apply a `_jsonEscape` to `name` in `uri()` (mirror PDProject), or validate sticker names at `createSticker` the way the factory validates project names. SVG bytes are inside a base64 data URI so they don't break the JSON, but consider rejecting `</svg`-escaping content at create time for parity with the project URL-guard ethos.

### 6. Factory / deploy pattern — CLEAN
- Not CREATE2, not clones — plain `new` per drop, so **no salt front-running and no impersonation**: `artist = msg.sender` is bound at `createProject`, gated by `whitelistedArtists`. Anyone can deploy a Project *only if whitelisted*, and it is always attributed to their own address. The 60-day cooldown clock starts at creation (262), correctly preventing whitelist-spam drops.
- `isProject` registry + `artistProjects` mapping are write-only-by-factory; no external mutation path.
- Library binding: `createProject` requires `isFinalized(libraryId)` for non-zero ids, and the registry's `isFinalized` is total (never reverts on unknown/sentinel), so the check is safe with caller-supplied ids. PDProject copies `inflaterId` at construction (never live) — a later registry re-designation can't reach deployed art (corroborated by `LibraryAssembly.test_InflaterRedesignation_NeverReachesDeployedProjects`).

### 7. Metadata / tokenURI — CLEAN
- **JSON injection:** double-defended — factory `_assertJsonSafe` rejects control/quote/backslash bytes in name/symbol/description at create; `tokenURI` re-escapes via RFC-8259 `_jsonEscape` (handles `"`, `\`, named control escapes, `\u00XX`, UTF-8 passthrough). Corroborated by `JsonEscapeFuzz` + `TokenURIFuzz`.
- **Malformed UTF-8:** passes through verbatim (bytes ≥0x80 untouched) — a self-inflicted artist concern, not a contract vuln (prior INFO, re-confirmed).
- **Gas-griefing / DoS in tokenURI:** the worst case (≈250KB library) is bounded under ~30M gas by the `_reclaim` memory discipline — `LibraryAssembly.test_WorstCase_FullSizeLibrary_TokenURIStaysReadable` asserts `<30M` and `>300KB` output. No attacker-controlled unbounded loop (script chunks are artist-set at immutable create, capped by curation/gas at upload). 
- **Predictable seed / trait-grinding:** L3 above — `blockhash`+`prevrandao`, proposer-visible within the block. Fairness only.

### 8. tx.origin / delegatecall / selfdestruct / signatures / MEV — CLEAN
- No `tx.origin`, no `delegatecall`, no `selfdestruct`, no signature verification anywhere in the five contracts — entire classes of bug absent by construction.
- **MEV on mint:** exact-payment + per-tx cap (22) + supply cap; a contested drop is first-come gas-auction (the documented "grief floor"), no sandwich/price-manipulation surface since price is fixed-immutable per Project and the storage fee is a bounded dial that, if changed mid-flight, only causes a clean `IncorrectPayment` revert + re-quote (no value leak).

---

## Re-confirmation of prior LOW/INFO items (baseline `SECURITY_AUDIT_2026-06-14.md`)

| Prior item | Status now | Line(s) |
|---|---|---|
| Malformed-UTF-8 metadata (self-inflicted) | **Confirmed** LOW/INFO | PDProject `_jsonEscape` passes ≥0x80 through (513-548) |
| URL-guard bypassable across chunk boundaries | **Confirmed** (L2) | PDFactory:387-399 |
| Contract artist reverting on receive strands its own royalties | **Confirmed** — and additionally halts its own mints (PushPayments tests) | PaymentSplitter:136-137 / PDProject:266 |
| Predictable per-token seed → cross-block trait-grinding | **Confirmed** (L3) | PDProject:249-256 |
| Compromised `storageFeeWriter` defaces unpinned thumbnails only | **Confirmed** (I3) | PDProject:295-325 |
| Hand-rolled library-reader assembly flagged for external audit | **Confirmed** (I1/I2) — logic verified correct, external proof still recommended | PDProject:483-497, PDLibraryRegistry:213-223 |

**New vs. baseline:** L4 (PDStickers metadata has no JSON escaping, unlike PDProject) and L1 framed precisely (shared platform wallet → platform-wide mint halt if it turns hostile, not just per-project). Neither rises above LOW.

## Test coverage note
The suite is genuinely strong and targets the right adversarial cases: reentrant artist on mint (supply cap), reentrant receiver on splitter (both paths), exact-payment + zero-dust conservation fuzz down to 1-wei prices, full-size-library tokenURI gas ceiling, reverting platform/storage/artist rollback, append-only registry invariants, inflater-redesignation isolation, JSON-escape fuzz, stickers capped-supply + balance invariants. **Thin spots:** (a) no test asserts PDStickers `uri()` behavior with a quote/control byte in a sticker name (would surface L4); (b) `_reclaim` is fuzzed for structural integrity but not formally proven byte-equivalent (the external-proof gate). Re-run all of it in a real Foundry env before mainnet — it could not be executed in this container.
