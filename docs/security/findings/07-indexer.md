# 07 — Indexer Security Audit (Alchemy webhook → Supabase)

Read-only adversarial audit. Scope: PriceOS-indexer.
- **Branch A (legacy Ponder):** current checkout — `src/index.ts`, `src/handlers/*`, `src/lib/*`, `ponder.config.ts`. Being replaced; chain-sourced (RPC subscription), so untrusted-input vectors below mostly don't apply to it. Audited for completeness only.
- **Branch B (serverless rebuild — WHAT WILL RUN):** `origin/claude/indexer-alchemy-setup-tuezqu`. Alchemy Custom Webhook → Next.js route → Supabase, with a Vercel Cron reconcile sweep backstop. **Deepest analysis here.**

Date: 2026-06-14. Auditor: senior security review.

---

## HEADLINE: Can an attacker forge platform data by abusing the indexer?

**NO — not via a forged webhook, provided `ALCHEMY_WEBHOOK_SIGNING_KEY` is set.** Every delivery is HMAC-SHA256 verified over the raw bytes with a constant-time compare *before* any parsing or write (`handleWebhook.ts` → `verify.ts`). A forged POST with no/invalid signature returns 401 and writes nothing. This is the single most important control and it is correctly implemented.

**BUT there is one real data-integrity hole that does not require forging anything (F1), and two config-dependent failure modes that silently disable protections (F2, F3).** Details below.

---

## Severity table

| ID | Sev | Branch | File | Issue |
|----|-----|--------|------|-------|
| F1 | HIGH | B | `src/indexer/process.ts:75` (`handleTransfer`) | Webhook MINT/XFER path does **not** verify `log.address` is a tracked PD Project. A signed-but-unfiltered webhook (or a misconfigured Address-Activity webhook) writes mints/ownership/holders for **arbitrary contracts** → fake mints, inflated `minted_count`, fake ownership/notifications. |
| F2 | HIGH | B | `transplant/.../cron/indexer-reconcile/route.ts:18` | Cron auth is bypassed when `CRON_SECRET` is unset: `if (secret && ...)`. No secret ⇒ endpoint is **public** ⇒ anyone triggers unbounded RPC sweeps (cost/DoS). |
| F3 | HIGH | B | `src/alchemy/verify.ts:13` / `config.ts:18` | Signing key has a silent empty-string default. If `ALCHEMY_WEBHOOK_SIGNING_KEY` is unset, `verify` returns `false` (fail-closed — good), but there is **no startup assertion**: a missing key takes the whole webhook offline silently rather than refusing to boot. Fail-safe direction is correct; the risk is silent total outage + no guard that the key is actually present in prod. |
| F4 | MED | B | `src/alchemy/parse.ts:18-30` | Untrusted payload parsing trusts attacker-influenced shape *after* HMAC, but `blockNumber`/`blockTimestamp`/`logIndex` go through `Number()` with no NaN/range validation; `topics`/`data` are passed unchecked to viem. Post-auth (Alchemy-only) so low exploitability, but a malformed Alchemy delivery throws → 5xx → retry storm. |
| F5 | MED | B | `src/alchemy/registry.ts` | `registerProjectAddress` can add **any** address to the live webhook filter. Not attacker-callable from the indexer itself (server-only env token), but if the PriceOS deploy flow ever exposes it on an unauthenticated route, an attacker could enroll arbitrary contracts → feeds F1. Flagged as a wiring hazard for the transplant. |
| F6 | MED | B | `src/indexer/process.ts:140` (`handleOrderFulfilled`) | Sale price/parties are taken from the Seaport `OrderFulfilled` event verbatim. Tracked-set filter prevents *other* collections inflating PD volume, but a real on-chain wash trade (self-buy at any price) inflates `volume_eth`/`all_time_high_eth`. Inherent to trusting marketplace events; note for scoring/ATH logic, not a code bug. |
| F7 | LOW | B | `src/indexer/process.ts` / `reconcile.ts` | No per-request payload size cap and reconcile fans out `getBlock` per distinct block with `Promise.all` (unbounded). Bounded in practice by Alchemy block size + a 50-block lookback, but no explicit limit ⇒ memory/RPC-burst exposure if window or block size grows. |
| F8 | LOW | A | `src/handlers/seaport.ts` (legacy) | Same wash-trade trust as F6; legacy is chain-sourced so no forgery vector. Informational — being retired. |
| F9 | INFO | B | `src/lib/supabase.ts` | Service-role key used correctly (server-only, RLS-bypass, never returned to client). `.gitignore` excludes real `.env`; only `.env.example` (empty values) committed. No committed secrets found. Good. |

---

## Detailed findings

### F1 — HIGH — Webhook transfer path does not allow-list the contract address (B)

`src/indexer/process.ts`, `handleTransfer`:

```ts
const { from, to, tokenId } = decodeTransfer(log);
const projectId = log.address.toLowerCase();   // <-- trusted verbatim
...
const eventId = await insertEvent({ type: isMint ? "MINT" : "XFER", project_id: projectId, ... });
if (isMint) await bumpMintedCount(projectId);
... await upsertHolder(projectId, tokenIdStr, to, ...);
```

The **sale** path (`handleOrderFulfilled`) calls `getTrackedProjects()` and drops anything not in the `projects` table. The **transfer** path does **not**. It writes a `MINT`/`XFER` row, bumps `minted_count`, and upserts a holder for **whatever `log.address` the log carries.**

Why this matters even with HMAC:
- The spec/runbook (`ALCHEMY_SETUP.md`) treats the webhook GraphQL address filter as *"an optimization, not a correctness requirement"* and explicitly offers an **Address-Activity webhook fallback** that streams *all* of a watched address's activity. The code's only correctness backstop for transfers is the GraphQL filter being configured perfectly — there is no server-side check.
- If the webhook is ever set to Address-Activity, mis-filtered, or set to a broad topic with no address narrowing, **any ERC-721 Transfer on Sepolia/mainnet** flows in and creates PD rows: a brand-new `project_id` appears in `events`, `minted_count` is incremented on a `projects` row that may not even exist (depends on the RPC's behavior — see below), holders are written, and the `events` INSERT trigger fans out notifications.
- `bumpMintedCount`/`upsertHolder` call RPCs (`increment_minted_count`, `upsert_holder`) keyed by `p_project_id`. Whether an untracked project_id silently creates/zero-updates depends on those SQL functions (not in this repo's `sql/` for the increment/upsert RPC bodies — verify them in Supabase). Either way, junk `events` rows + notifications fire regardless.

**Exploit:** Does not require forging the HMAC. Requires only that the webhook be (a) an Address-Activity type, (b) mis-scoped, or (c) later widened — all plausible operational states the docs themselves green-light as "correctness unchanged." Result: fake mints / inflated counts / fake ownership / spurious follower notifications for arbitrary contracts.

**Fix:** Mirror the sale path — in `handleTransfer`, gate on `getTrackedProjects()`:
```ts
const tracked = await getTrackedProjects();
if (!tracked.has(projectId)) return false;
```
Place it before `insertEvent`. Makes the tracked-`projects`-table the single source of truth for *both* paths and removes all dependence on the webhook filter being correct. (Also fixes the doc's claim that the address filter is "not a correctness requirement" — for transfers it currently *is*.)

Secondary: the `getTrackedProjects()` cache is module-level and never invalidated within a warm serverless instance except via the unused `invalidateTrackedProjects()`. A newly deployed Project won't be tracked until the instance recycles; with F1's fix this also means a legit new Project's first transfers get dropped until cache refresh. Add a short TTL or invalidate on the deploy-flow registration call.

### F2 — HIGH — Cron endpoint is public when `CRON_SECRET` is unset (B)

`transplant/app/api/cron/indexer-reconcile/route.ts`:
```ts
const secret = process.env.CRON_SECRET;
if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
```
If `CRON_SECRET` is empty/unset, the guard is **skipped entirely** and the route is world-callable. Each call runs `reconcile()` → `eth_getLogs` over the lookback window + a `getBlock` per block via Alchemy RPC. An attacker hammering the URL burns Alchemy compute units (the free-tier cap the cost posture relies on) and can DoS the sweep budget.

**Exploit:** `GET /api/cron/indexer-reconcile` in a loop if the secret was never set. No auth needed.

**Fix:** Fail closed — if `CRON_SECRET` is missing, **reject** (500/401), don't open the door:
```ts
const secret = process.env.CRON_SECRET;
if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
```
`.env.example` lists `CRON_SECRET=` (empty) — easy to deploy without it. The fail-open default makes that omission silently dangerous.

### F3 — HIGH (operational) — No startup assertion that the signing key is present (B)

`config.ts` defaults `webhookSigningKey` to `""`. `verify.ts` returns `false` when `signingKey` is falsy — **fail-closed**, which is the correct safety direction (a missing key rejects all webhooks rather than accepting all). The risk is the inverse of F2: an unset key silently takes the entire real-time feed offline (everything 401s) with no boot-time error, and there's no positive assertion that prod actually has the key. Combined with the reconcile sweep still running, data still flows, masking the misconfiguration.

**Fix:** Assert presence at the webhook route boundary (or a config validator) so a missing signing key is a loud 500 with a clear message, not a silent total rejection. Contrast with `supabase.ts`, which correctly throws on missing creds — apply the same pattern to the signing key in the webhook path.

### F4 — MED — Post-auth payload parsing has no field validation (B)

`parse.ts` runs only after HMAC passes, so the payload is Alchemy-authenticated — exploitability is low. But there is no validation that `block.number`/`timestamp`/`log.index` are finite (`Number(undefined)` → `NaN`), and `topics`/`data` are passed straight into viem's `decodeEventLog`. A malformed-but-signed delivery (Alchemy schema drift, the exact risk `HANDOFF.md` item 5 calls out as untested) throws inside `decodeTransfer`/`decodeOrderFulfilled` → `handleWebhook` propagates → host 5xx → Alchemy retry storm on the same poison payload. The Transfer ABI has all three args `indexed`, so `data` is `0x` and from/to/tokenId come from `topics`; a log with fewer than 4 topics (wrong-shape delivery) throws in viem rather than being skipped.

**Fix:** Validate/guard in `parse.ts` (drop logs with `NaN` numbers or `< expected` topic count) and wrap per-log decode in try/catch in `processLogs` so one bad log is skipped + logged, not fatal. Prevents a single malformed delivery from wedging the feed.

### F5 — MED — Arbitrary-address registration helper (transplant wiring hazard) (B)

`registry.ts` `updateWebhookAddresses`/`registerProjectAddress`/`setWebhookAddresses` add any address to the live webhook filter. Inside the indexer this is safe (needs server-only `ALCHEMY_AUTH_TOKEN`). The hazard is the transplant: the docs say "call it from the Project-deploy flow." If that call site is reachable from an unauthenticated or weakly-authenticated PriceOS route, an attacker enrolls an arbitrary contract → its Transfers stream in → directly feeds F1. There's also no validation that the input is a 20-byte hex address (only `.trim()`).

**Fix:** When wiring into PriceOS, ensure the deploy flow that calls this is gated by the same authz as Project creation, validate the address format, and (with F1 fixed) the tracked-`projects` gate becomes the real authority anyway — registration only affects stream volume, not what gets written.

### F6 / F8 — MED / LOW — Marketplace events trusted for price & parties (B, A)

`handleOrderFulfilled` derives `price_eth`, direction, and the sale into `volume_eth`/`all_time_high_eth` straight from the Seaport `OrderFulfilled` event. The tracked-set filter (F1's gate, already present here) stops *other* collections inflating PD numbers, and on-chain ETH/WETH amounts are real value moved — but a wash trade (same actor self-buying via two wallets at an arbitrary price) inflates volume and sets a fake ATH. This is inherent to trusting marketplace events and can't be fully solved at the indexer; flag it for any scoring/ranking/ATH-ping logic that consumes these numbers (don't treat ATH/volume as sybil-resistant). Bundle sales (one event, multiple ERC-721s) also book the full price against every same-tx XFER row (known limitation in the spec).

### F7 — LOW — No payload-size cap; unbounded reconcile fan-out (B)

`handleWebhook` reads the full raw body with no size limit before HMAC (a large body is hashed in full — minor compute), and `reconcile()` issues `getBlock` for every distinct block via `Promise.all` with no concurrency cap. Bounded today by Alchemy block sizes + a 50-block window, but no explicit guard if the lookback is raised or block density grows.

**Fix:** Cap raw-body length before processing; batch/limit the `getBlock` fan-out (or use a multicall/block-range with timestamps) in the sweep.

### F9 — INFO — Secrets handling is correct (B)

Service-role key is server-only, RLS-bypassing, never returned to the client; `supabase.ts` throws on missing creds. `.gitignore` excludes real `.env*`, commits only `.env.example` with empty values. No committed secrets. Good posture — the gaps are the *fail-open* defaults in F2/F3, not leakage.

---

## Idempotency / replay / reorg assessment (B) — solid

The exactly-once model is well designed and correct under replay:
- `events` insert is the idempotency gate (unique `(tx_hash, log_index)`, `23505` → `null` → all side effects skipped). The non-idempotent `minted_count += 1` is correctly gated on a *fresh* insert.
- Sale volume is booked strictly on the `price_eth` `NULL → set` transition (`enrichXferWithPrice` matches once), so the sweep can't double-count an already-priced sale.
- Ordering: all Transfers processed before any OrderFulfilled so the XFER row exists before the price patch; split deliveries re-pair on the next sweep.
- Reorgs: sweep treats only logs `INDEXER_CONFIRMATIONS` deep as final; webhook writes on orphaned blocks are corrected by the canonical re-read. Deep unwind (deleting a row for a transfer a reorg erased) is **not** implemented — acknowledged limitation, acceptable at test volume, must be revisited before high-value mainnet.

No replay/double-count vector found. The one thing replay-safety *depends* on is the unique `(tx_hash, log_index)` constraint actually existing on `events` — verify that constraint is present in the live Supabase schema (migrations `0001`/`0004` claim it); if it's missing, the entire idempotency model collapses to double-counting. **Verify before mainnet.**

## Signature-verification detail (B) — correct

`verify.ts`: `signature`/`signingKey` falsy → `false`; length mismatch → `false` (avoids `timingSafeEqual` throw); equal length → `timingSafeEqual`. Constant-time. Compares the hex strings as UTF-8 bytes on both sides (consistent). HMAC is over the **raw** body and the route reads `req.text()` (not `req.json()`), so the verified bytes are the exact bytes — correct. No timing leak, no bypass.

---

## Priority fixes before go-live

1. **F1** — add the tracked-Project gate to `handleTransfer` (removes all dependence on the webhook filter being perfect). *Highest impact.*
2. **F2** — make the cron endpoint fail closed when `CRON_SECRET` is unset.
3. **Verify** the unique `(tx_hash, log_index)` constraint exists on `events` in live Supabase (idempotency depends on it entirely).
4. **F3** — assert the signing key is present at boot (loud failure, not silent outage).
5. **F4/F5/F7** — harden parsing, gate the registration call site, cap fan-out during the PriceOS transplant.
