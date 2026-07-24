# PD Full-App Security Review — 2026-07-24

Whole-app review across all four repos (PriceOS, pd-contracts, pd-price-token,
PriceOS-indexer), run via the Claude Security skill at whole-repo scope.

**Method:** 13 security cells, each read by a dedicated senior-security-engineer
agent against the real files, followed by adversarial verification passes in
which the verifier was instructed to *refute* each candidate finding by default.
Findings below survived that; two were downgraded or partly refuted by it and are
recorded as corrected. Every claim marked "verified live" was confirmed directly
against the deployed Worker or the live Supabase project
(`zspxpfwlwikdxwavffjn`) — not inferred from source.

**Result:** 1 CRITICAL, 4 HIGH, 7 MEDIUM, plus low-severity/hardening items.
Builds on `docs/security-review-2026-07-22.md`; the prior fixes' status is
recorded at the end.

---

## CRITICAL

### C1. `/api/auth/dev-login` is open on the live deploy — anyone can log in as the owner
`app/api/auth/dev-login/route.ts:41-57` · gate at `:42` · session write at `:51`
Also `app/layout.tsx:574` (renders the calling button to every visitor)

The route mints a full 14-day iron-session for the hardcoded owner address
`0x65c34afda745c12745db70ffa809311339279395` with **no signature, no nonce, no
secret, no existing session**. Its only gate is `DEV_LOGIN_ENABLED === '1'`, and
that variable is set on the Worker serving
`https://pricediscussion.pricediscussion.workers.dev`.

**Verified live (twice, independently):** a bare unauthenticated
`POST /api/auth/dev-login` returns `HTTP 200`,
`{"address":"0x65c34afda745c12745db70ffa809311339279395"}`, and
`Set-Cookie: pd_siwe_session=…; Max-Age=1209600; Secure; HttpOnly`. The public
homepage HTML also ships the "Login Brendon" button under the same flag.

**Impact:** complete account takeover of the platform owner against the
production database — every `requireAuth` route executes as him: `/api/me`
(returns his private row including `setup_codes`), the set-once Sigil forge,
handle/profile mutation, market listings/offers/accept, sticker market,
takeover, artist-push (notifies every holder), Discord rebind. It is also
genuine privilege escalation: `app/api/calendar/route.ts:50-52` grants
platform-wide `global` calendar authorship to whoever holds handle `brendon`.
Because the endpoint *sets* a cookie, it is additionally a login-CSRF.

The file's own comment asserts "Production remains hard-walled" and "a
hand-crafted POST to the live site still gets nothing." Both are currently false.
The comment at `:22-24` records that the secondary secret gate was deliberately
rolled back for testing convenience — that trade is what is live.

**Fix (no code change, no redeploy):** delete `DEV_LOGIN_ENABLED` from the
`pricediscussion` Worker's variables. The route already 404s without it. Then
remove the route + button, or restore a high-entropy secret compared with a
timing-safe equality **and** bind it to a non-public host.

---

## HIGH

### H1. Stored XSS — `outputs.scene` breaks out of the JSON-LD `<script>` on every Artwork page
Sink: `app/art/[slug]/[localId]/page.tsx:117` → `:151`
Write: `app/api/outputs/color/route.ts:104-105`

The Artwork page injects `JSON.stringify(jsonLd)` raw into
`<script type="application/ld+json">` via `dangerouslySetInnerHTML`.
`JSON.stringify` escapes `"` and `\` but **not** `<` or `/`, and the HTML
tokenizer terminates the script element on the literal bytes `</script`.

Every other field in that object is dev-authored registry data. `scene` is the
only DB-sourced field, and it is written with a length check only —
`typeof body?.scene === 'string' && length > 0 && length <= 140` — no charset
validation, by **any wallet that can complete SIWE** (permissionless).

**Verified:** the JSON-LD block renders unescaped in the live HTML for
`/art/prisms/1`, and the response headers show `content-security-policy:
frame-ancestors 'self'` only — `script-src` is **Report-Only and permits
`'unsafe-inline'`**, so there is no backstop.

**Permanence:** the first-viewer-wins guard at `:130-138` only short-circuits
when `dominant_color` is already set. The attacker's upsert sets both fields at
once, so every later legitimate sample returns `{ok:true, already:true}` and can
never overwrite it. The file's header notes healing is manual DB work.

**Reachability:** `outputs` currently holds 45 rows platform-wide, all pinned —
but the catalog is 11,322 tokens across 68 projects, and any `(slug, tokenId)`
**without a row is plantable**, because the write is an upsert that creates it.
Effectively the whole catalog is open.

**Impact:** script executes same-origin on a public page. The session cookie is
`httpOnly`, but injected script can drive authenticated `fetch()` against every
`requireAuth` route with the cookie riding along, and can manipulate
wallet-connection UI on a page where users sign transactions.

**Fix:** escape the serialized JSON for script context (`<` → `<`, `>` →
`>`, `&` → `&`, plus U+2028/2029) at both `[localId]/page.tsx:151` and
`app/art/[slug]/page.tsx:97`. Constrain `scene` on write to the generated
sentence charset. Promote the Report-Only `script-src` to blocking without
`'unsafe-inline'`.

### H2. `confirm_offer_fill` books an offer as filled with no proof — and no token binding
`app/api/market/orders/route.ts:573-608`

The branch requires `body.txHash` to be *present* but never reads it: no
`verifySeaportFill`, no sender check, no order-hash match. `"0xdead"` passes.

Worse than first reported: the offer row select at `:580` fetches only
`bidder_address, price_eth, status, source, project_id` — **not** `token_id`,
`scope`, `criteria`, or `order_hash`. Ownership is checked against the
*caller's own chosen* `tokenId` (`:590-591`), so holding **any** token in a
project lets you close **any** open offer in that project, including an item
offer on someone else's token. Line `:594` then overwrites the offer's
`token_id` with the attacker's.

The correct pattern sits 40 lines above in `confirm_fills` (`:541-563`), and
`decline_offer` (`:463-470`) has the scope/token guard this branch lacks.

**Impact:** the bidder's live offer disappears from every book surface; they can
no longer withdraw through PD (`cancel_offer` requires status `open`) while their
signed Seaport order stays live on-chain with WETH approved; they receive a
false `OFFER_ACCEPTED` ping with a fabricated tx hash; token history is polluted.
No funds or score move — book/notification forgery and griefing.

**Fix:** mirror `confirm_fills` (verify fill, `fill.from === address`, stored
order hash present in the receipt), and add the missing scope/token binding and
an `end_time` liveness check.

### H3. Seaport `order_hash` is stored verbatim from the client — the fill proof is replayable
`app/api/exchange/route.ts:253` (store), `:341-359` (accept)
Also `app/api/market/orders/route.ts:258, :346`; `app/api/output/[id]/market/route.ts:464, :490`

The 2026-07-22 fixes correctly verify "was order hash H fulfilled by this wallet
in this tx" — but **H is whatever string the proposer/seller posted**. The hash
is computed only in the browser (`lib/market/seaportClient.ts:105-108`) and
written straight to the row. `checkTradeOrder`/`checkListingOrder` verify the
order's structure and signature but `verifyTypedData` returns a boolean and its
digest is discarded — the hash is never derived or compared server-side. No DB
constraint covers it, and **`trades` has no index on `order_hash` or `tx_hash`**
(confirmed live: `trades_pkey`, `trades_proposer_open_idx`,
`trades_counterparty_open_idx` only — while `listings`/`offers`/`gnome_deals` all
carry the uniqueness indexes `trades` lacks).

`lib/market/verifyFill.ts:40-56` checks only that the hash is well-formed, mined
and successful — no recency bound, no confirmation depth, no binding to any PD
record. So **any past Seaport fill the accepting wallet ever made** (any OpenSea
buy, public on Etherscan) is a valid proof, reusable without limit.

**Impact:** two attacker-controlled wallets settle fabricated trades at will.
`bookChainSettle` (`:264-279`) flips `holders` **unconditionally** — no
`.eq('owner_address', from)` guard, unlike the sim RPC and the gnome flip — and
writes `XFER`/`TRADE` events. The reconcile sweep replays chain logs and never
audits `holders` for rows lacking a chain event, so the desync is permanent and
feeds counterparties, story timelines, feeds and wrapped. Related: a seller can
fake-sell their *own* listing and spray `SOLD @ N ETH` at every wishlister.

Not third-party theft — `buildProposal:209-217` requires both sides to hold their
pieces, so both wallets must be the attacker's.

**Fix:** derive the hash server-side and compare before storing — the EIP-712
types are already in `lib/market/chain.ts:55`; `hashTypedData` over
`OrderComponents` *is* the Seaport order hash. Add a unique index on
`trades.tx_hash` and a confirmation-depth bound, matching the gnome-deal rigor.

### H4. Indexer: the sale handler never validates the emitting contract
`PriceOS-indexer` branch `claude/indexer-alchemy-setup-tuezqu` —
`src/indexer/process.ts:137` (contrast `:97`)

`handleTransfer` gates on the emitter (`slugForContract(log.address)`).
`handleOrderFulfilled` never reads `log.address` at all — its only gate is
`slugForContract(nft.token)` at `:153`, where `nft.token` is decoded from the
**non-indexed data section** of the log, i.e. a field the emitting contract
chooses freely. The sale path authenticates the payload against itself, not its
origin, so any contract can emit an `OrderFulfilled`-shaped log and be treated as
a real Seaport fill.

**Impact:** forged sale prices booked into `volume_eth` and `all_time_high_eth`,
and forged `SALE` pings to any named user. Permanent —
`enrichXferWithPrice` only writes while `price_eth IS NULL`, and `applySale` is
non-idempotent with no recompute path.

**Reachability:** blocked today by the Alchemy-side address filter under the
documented primary config, but `docs/ALCHEMY_SETUP.md:52-53` explicitly declares
that filter "an optimization, not a correctness requirement" — true for
transfers, false for sales. Fix before cutover.

**Fix:** one line, mirroring the transfer path —
`if (log.address.toLowerCase() !== SEAPORT_ADDRESS.toLowerCase()) return false;`
then correct the doc claim.

---

## MEDIUM

### M1. Unauthenticated defacement of stored artwork images and ASCII backups
`app/api/preview/[slug]/[id]/route.ts:36` (handler), write at `:83`
Sibling: `app/api/ascii/[slug]/[id]/route.ts:27`, write at `:73`

> **Severity note:** first reported as HIGH; the adversarial verification pass
> downgraded it to the top of MEDIUM and refuted two sub-claims. Both
> corrections are folded in below.

`POST` has no authentication of any kind. The only content check is the 8-byte
PNG signature at `:51`; the remaining ≤1.2 MB is arbitrary attacker bytes.
Nothing verifies the upload is the deterministic engine render — the header's
justification ("there is nothing to fake") is not enforced anywhere. Write-once
at `:60` means the **first** body to land at a key wins and the legitimate
self-heal upload afterwards silently no-ops.

**Verified live:** `prisms/1.v2.png` → 200 (pinned); `prisms/110`/`111` → 404
(claimable). A 20-key sample across two projects returned **3 pinned / 17
claimable**; the verification pass probed the pinned frontier and found several
projects (boreal, reliquary, bulletin, gridlock, nave, ballast, stillrain) with
**nothing pinned at all**. Roughly **90% of ~11,322 master keys are unclaimed**,
plus a thumbnail and an ASCII key each — on the order of 30,000 free keys.

**Display reach (broader than first reported).** `NEXT_PUBLIC_ART_IMAGE_BASE` is
hardcoded to `/preview` (`next.config.mjs:13`), so stored bytes are the display
path on cards, grids, home, profile thumbs, search, **and the artwork modal**
(`components/OutputPreview.tsx:459-469` is a plain `<img>` of the stored master;
the comment at `registry.ts:1353` claiming the feature page live-renders is
stale). It also reaches **social unfurls** — verified: `og:image` for
`/art/cabinet/25` resolves to the R2-served URL, so defacement propagates to
every Twitter/Discord/iMessage share card. Critically, the 2026-07-07 change at
`registry.ts:1495-1514` **removed the live-engine fallback**: a missing or bad
stored image paints a transparent placeholder, never the engine.

**Corrections to the initial report:**
- **Not permanent** — correctable out-of-band by deleting the R2 object (the
  healer then re-pins on next view). But `app/preview/[...key]/route.ts:41-44`
  checks the Workers edge cache *before* R2 with `max-age=31536000, immutable`,
  so cleanup needs an R2 delete **and** a Cloudflare cache purge. There is no
  path from inside the app.
- **The Dispatch newsletter is NOT affected** — Resend has no contacts and the
  cron bails with `skipped: 'no subscribers yet'`; separately the digest builds
  root-relative `/preview/...` srcs, which no email client would render anyway.
  (That last part is an unrelated latent bug worth its own fix.)
- **No script execution** — `X-Content-Type-Options: nosniff` is set globally and
  verified live, and the writer hardcodes `contentType: 'image/png'`, so a
  polyglot cannot execute. Not an XSS path.

**ASCII sibling:** shape validation is genuinely strict, but `text` is free-form
(up to 256×256 chars) and ASCII Art Mode is a site-wide display mode, so a
poisoned artifact renders attacker-chosen words over every artwork for users in
that mode. The ASCII key carries **no `ART_REV`**, so unlike the PNGs it cannot
be rotated by a revision bump — these are the genuinely unrotatable ones.

**Escalation condition:** the moment real money is on the catalog, the stored PNG
is what a buyer sees when they bid. The same bug becomes HIGH without a line of
code changing.

**Fix:** require a session on both writers, and verify the payload against a
server-side derivation (or a build-time per-`{slug, tokenId, ART_REV}` digest
manifest). If the open first-viewer heal must survive, let an authenticated write
beat an anonymous one instead of write-once. Add `ART_REV` to the ASCII key.

### M2. Sim-rail payment fails open for wallets with no `users` row
`supabase/migrations/20260720_the_exchange.sql:100-113` (`app_execute_trade`);
same shape in `app_buy` (`20260702_market_sim_expiry_and_criteria_accept.sql:29-39`)
and `app_sticker_buy` (`20260716_sticker_market_fee.sql:81-87`)

The payer debit and the entire balance check sit inside `if found`, with no else
branch — no row means no debit and no error, and execution falls through to the
ownership transfer. A SIWE session does **not** create a `users` row (verified:
the sign-in route touches no database at all; `/api/me` 404s without a row; only
`/api/users/create` writes one), so a handle-less authenticated wallet is a payer
that cannot be charged.

`app_buy` is worse than the trade path and needs no accomplice: the ownership
flip is unconditional and sits outside the guard entirely, so a row-less wallet
buys any sim listing at any price for free, in one request.

**Impact:** free pieces and minted sim-ETH produce `holders` and `events` rows
feeding `holdings.*`, `volume.totalEth`, `trades.count`, `buy.count`,
`sale.count` — none of which are in `GAMEABLE_TRIGGER_PREFIXES`, so they bypass
the `GAMEABLE_SCORE_CAP` and convert into leaderboard position. Sim rail only;
no real funds. Deflator: new accounts already receive a 1,000,000 sim-ETH grant,
so the minting itself is less interesting than the free-buy path.

**Fix:** treat a missing payer row as failure, not exemption —
`if not found then return jsonb_build_object('error','insufficient_balance'); end if;`
in all of `app_execute_trade`, `app_buy`, `app_sticker_buy`, and the sibling
offer-accept RPCs carrying the same `v_bhas` pattern.

### M3. `/api/stone/wrapped` has no authorization
`app/api/stone/wrapped/route.ts:57` (bare `export async function GET`), address from `:58`

Runs on the service role (bypasses RLS) and scopes everything to a
caller-supplied `?me=0x…` with no session check. **Verified live:** an
unauthenticated request with an arbitrary address returns HTTP 200 with that
wallet's summary.

Most of the payload is already public via `/api/feed`. The real exposure is
`best_call`, read from `price_predictions` — a table whose own migration marks it
"SEALED BY DESIGN: RLS enabled with NO anon or authenticated policies"
(`20260713_price_predictions.sql:1-6`, confirmed live: RLS on, zero policies).
Its own route only ever reveals closed windows in aggregate, and an individual
call only to its owner. `wrapped` returns one named wallet's individual call, and
since project floors are public the exact call inverts trivially.

Latent today (`price_predictions` is empty); the authorization gap is live now.

**Fix:** wrap in `requireAuth` and drop the `me` parameter — use the session
address.

### M4. `ens_name` is a self-asserted public identity label
`app/api/me/route.ts:97-106`

Accepted from any authenticated caller after a length + control-character check
only. No server-side ENS resolution exists anywhere (the only lookup is
client-side, `lib/engines/ensEngine.ts`), no trigger validates it, and there is
no uniqueness constraint — unlimited users can hold the same name. It renders as
the profile identity row in place of the wallet address
(`components/profile/ProfilePageBody.tsx:333-334`, `:1265`) and is matched by
search.

**Severity honestly bounded:** cosmetic impersonation / phishing setup. Nothing
authorizes off `ens_name`; the `@handle` is unique and immutable, the Etherscan
link still resolves to the real address, and search rows label handle-first (so
the "spoofed search result" half of the original claim is refuted — it is
ranking pollution). The 2026-06-14 sweep logged this as S-I1 and only the
unicode-filter half of its fix shipped.

**Fix:** reverse-resolve the session address and accept only a name in that set.

### M5. PriceStreak can be walked to any value with backdated dates
`app/api/streak/ping/route.ts:67`, `lib/achievements/streak.ts:84-87`

The only clock comparison bounds the *future* (`localMs - serverTodayMs > 24h`).
`computeStreakUpdate` never reads a clock — it increments whenever the submitted
date is exactly one day after the **stored** anchor, and the route writes the
submitted date verbatim. Walking 2020-01-01, 2020-01-02, … increments once per
call; 365 calls yields a permanent `streak_best` of 365 and unlocks the whole
streak badge ladder (achievements are seeded from the already-unlocked set and
never revert). Publicly readable via `/api/achievements/[address]`.

Score impact is capped — `streak.` is in `GAMEABLE_TRIGGER_PREFIXES` with a
10-point ceiling — so this is forged badges and a forged public count, not rank.
`docs/security/findings/03-sybil-spam-achievements.md` marks this "FIXED
(effective)"; only the fast-forward direction was closed.

**Fix:** also reject dates more than ~24h in the past.

### M6. pd-contracts — three findings on `PDStickers` (pre-deploy)
No deployed addresses are on record for these contracts; the contested-mint
window itself verified clean.

- **F-1 (conf 9)** — `PDStickers.sol:450` `_peelFixed` is `view` and mints with
  **zero supply accounting**. FIXED sheets reserve `maxSupply` only at purchase.
  `addSticker`/`setSheetPull` require only `!sheet.active` and never check for
  outstanding sealed sheets, so the documented restock workflow lets 1,000
  outstanding sheets peel a `maxSupply=10` rare 1,000 times. The mode-flip
  variant (PACK → FIXED) is worse: every outstanding sheet peels the entire pool.
  **Fix:** `if (sheet.sold != sheet.peeled) revert SealedOutstanding();` on both
  mutators.
- **F-2 (conf 7)** — `purchaseSheet` has no quantity bound (unlike `peel`'s 10
  and `mint`'s 22). With `priceWei == 0` and `maxSheets == 0` — both unguarded
  admin settings — `quantity` is free; `sheet.sold` overflows permanently,
  bricking that sheet's primary sales with no admin recovery.
- **F-3 (conf 8)** — the pack draw is decided in the committing transaction from
  `blockhash`/`prevrandao`. The `tx.origin` gate blocks a same-contract wrapper
  but not an atomic Flashbots bundle (`tx1` = peel, `tx2` = revert unless a rare
  landed), giving free per-block re-rolls. Either move to commit/reveal or VRF,
  or correct the code comment and the SWC-115 audit row — the immutable deploy
  will carry the inaccurate claim forever.

### M7. Indexer — ownership mirror has no repair path
`PriceOS-indexer` `sql/0002_holders.sql:61-63`, `src/indexer/process.ts:109-129`

`upsert_holder` overwrites unconditionally with no monotonicity guard, so an
out-of-order Transfer silently reverts ownership to a previous holder. And
`insertEvent` is the idempotency gate but runs *before* the dependent writes, so
if a dependent write throws, the swallowed error is never retried — the event row
already exists and every replay short-circuits. `holders` backs holder-only
feature gating, so a former owner can retain access while the true owner is
denied. The claim in `config.ts:26-30` that the sweep corrects reorged writes is
inaccurate — the sweep only inserts.

---

## Low / not filed (hardening)

- **Unsubscribe override** — `app/api/newsletter/subscribe/route.ts:76-82`
  clears `unsubscribed: false` on an unauthenticated request, so anyone who knows
  an address can re-subscribe someone who opted out. Also a membership oracle.
- **Gnome waking threshold has no secret** —
  `app/api/project/[slug]/gnome/route.ts:30-35` seeds `mulberry32` from the
  public slug + supply. Not derivable from the client bundle, so it holds by
  obscurity today, but gnomes settle in real ETH. One-line fix: mix in a
  server-only salt.
- **Push endpoint is an unvalidated outbound host** — `lib/push/transport.ts:209`
  POSTs to a user-supplied `sub.endpoint` with no allowlist. Deliberately not
  filed: response never returns to the caller, errors land in an RLS-denied
  table, and Workers have no metadata service to pivot to. Blind relay only.
- **Digest images are root-relative** — `lib/newsletter/digest.server.ts:265,305`
  emit `/preview/...` rather than absolute URLs, contradicting the file's own
  header. Latent: no subscribers exist yet, but every image would break on send.
- **Default privileges** — five of thirteen `SECURITY DEFINER` functions were
  default-open at some point, and five have no `CREATE` in the repo, so a future
  signature change would mint a new default-public function that existing
  (signature-bound) revokes would not cover. One durable line:
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;`
- **RLS convention drift** — five SELECT policies are `TO public` rather than
  `TO anon, authenticated`. Not exploitable (a policy grants nothing without a
  table privilege) but contradicts the stated convention.
- **`x-pd-bare-route` is not stripped** in `middleware.ts`, so the comment
  claiming a client cannot forge it is inaccurate. Cosmetic only.

---

## Reviewed and clean (no findings)

- **$PRICE ERC-20** — deployed runtime bytecode fetched from
  `0x173a012c7c8ca3cfb531dcad84a40c53dbe74638` and recompiled locally: a
  **byte-for-byte exact match (1,824 bytes incl. metadata hash)**. Complete
  external surface is 9 standard ERC-20 functions. No hidden mint (`_mint` is
  internal, called once in the constructor), no owner/admin role at all, no
  pause/blacklist/fee-on-transfer, no upgradeability, no seizure path. On-chain
  `totalSupply()` = exactly 100,000,000 × 10¹⁸.
- **Contested-mint entry window** (`PDProject.sol:370-587`) — the fail-open
  property holds. `windowDeadline` is immutable, constructor-set, capped at 4h;
  every window path is guarded by it, and past the deadline the mint gate is
  skipped regardless of settlement state. A lost or hostile settlement key can
  delay minting by ≤4h and cannot halt it. The transfer seal is written once,
  bounded to 72h, never captures a pre-existing token, and cannot grow to cover
  a normal mint.
- **Fund safety in `PDProject`/splitters** — strict CEI, complement arithmetic
  (no stranded wei), exact-equality payment, reentrancy-safe withdraws. The
  `_reclaim` assembly is not memory-safe by annotation but its precondition holds
  at all three call sites.
- **SIWE / sessions** — nonce server-generated and cleared on success (no
  replay), domain bound and enforced, address recovered and compared. Cookies
  `Secure; HttpOnly; SameSite=lax`, host-scoped, iron-session encrypted.
  Host-header spoofing rejected at the Cloudflare edge (verified: 403).
- **Discord OAuth** — state in the encrypted session, cleared before validation,
  strict compare; `discord_id` is display-only.
- **All 10 cron routes** — identical `Bearer $CRON_SECRET` gate before any work,
  all fail closed on an unset secret, `?force=1` sits inside the gate. The
  worker's scheduled handler mirrors it.
- **Alchemy webhook** — HMAC over the raw body (`req.text()`, never
  `req.json()`), length pre-check then `timingSafeEqual`, throws on unset key,
  rejects before parse.
- **Database** — all 13 `SECURITY DEFINER` functions live-verified with EXECUTE
  false for anon/authenticated/PUBLIC, all with pinned `search_path`. All 61
  public tables have RLS enabled. `app_merge_user_state` is SECURITY INVOKER and
  revoked. Column grants on `users` exactly match `PUBLIC_USER_COLUMNS`; the
  private set (`settings`, `setup_codes`, `sim_eth_balance`, …) is ungranted.
  No client-side `.rpc(` calls exist anywhere.
- **Mass-assignment on `/api/me`** — genuine double allow-list (route
  `sanitisePatch` + the RPC's explicit column list). `handle`, `account_level`,
  `price_*`, `user_number`, `granted_tags`, `sim_eth_balance` are physically
  unreachable. CEO tag is address-gated server-side and not forgeable.
- **User numbers / reserved handles** — `assign_user_number` fires only when the
  column is NULL and anon cannot INSERT into `users`; the reserved-handle owner
  exception is server-side and compares against the SIWE session address. #1 and
  #22 are not stealable; brand handles are not claimable by non-owners.
- **Secrets** — import-reachability graph over all 348 client entry points plus a
  grep of all 219 emitted client chunks from a real production build: **zero**
  occurrences of any secret. No `NEXT_PUBLIC_` prefix on a genuine secret. No
  committed credential literals (the two hardcoded Supabase keys decode to
  `anon`/publishable). Diagnostic endpoints leak nothing.
- **XSS sinks** — all 8 `dangerouslySetInnerHTML` sites traced; only H1 is
  reachable. Artist-uploaded scripts run in `sandbox="allow-scripts"` **without**
  `allow-same-origin` (zero occurrences repo-wide), so they cannot reach the
  parent origin, cookies or session. No `eval`/`new Function` in app code;
  `lib/stone/mathEval.ts` is a genuine tokenizer/shunting-yard parser behind a
  character whitelist.
- **PostgREST filter injection** — the primitive in `takeover`/`feed` is real
  (address is only lowercased) but was re-examined hard and remains
  non-exploitable: `URLSearchParams` encoding prevents parameter breakout, `or()`
  cannot alter the projection, neither query embeds a resource, and both tables
  are already anon-readable. Search is properly escaped and tokenized.
- **Artist-ownership gating** — correct on every mutating project/studio route,
  including the new showcase config.
- **$PRICE holdings / rank** — written only by the cron behind the secret gate,
  balances read from the token contract; not user-influenceable.
- **Gnome deals** — rigorous on-chain verification (payer, payee, exact value,
  deal tag in calldata, confirmation depth) plus a unique `tx_hash` index. This is
  the rigor H3 should match.
- **Read endpoints** — no private-column over-exposure found; seals and
  owner-scoping correct on targets, history and calendar.

---

## Status of the 2026-07-22 fixes

| # | Fix | Status |
|---|---|---|
| 1 | Exchange chain-rail `accept` verifies the on-chain fill | **Held structurally** — but undercut by H3 (the hash it verifies against is client-supplied) |
| 2 | `confirm_fills` verifies sender + stored order hash | **Held** — correctly binds the listing's *stored* hash, so de-listing others' pieces is genuinely closed. Undercut only for the seller's own listings (H3) |
| 3 | `record_output_view` revoked to service_role | **Held** — live-verified: EXECUTE false for anon/authenticated/PUBLIC |
| 4 | `output_view_stats` revoked to service_role | **Held** — live-verified |

The systemic gap behind #3/#4 remains: new `SECURITY DEFINER` functions still
ship with Postgres' default public EXECUTE and are caught only by audit. See the
default-privileges item under hardening.

`confirm_offer_fill` (H2) is the sibling of #2 that was never given the same
treatment.
