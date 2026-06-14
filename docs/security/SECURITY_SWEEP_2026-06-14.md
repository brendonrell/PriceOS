# PriceOS / PD — Comprehensive Security Sweep (Master Report)

**Date:** 2026-06-14
**Scope:** EVERYTHING — `PriceOS` (frontend + API), `pd-contracts` (5 Solidity contracts),
`PriceOS-indexer` (legacy Ponder + the serverless Alchemy rebuild), Supabase data layer
(audited against the LIVE project `zspxpfwlwikdxwavffjn`), the PriceRank/achievements system,
auth/SIWE, anti-bot/sybil, artist-imposter/verification integrity, DDoS/cost-amplification,
and NFT longevity ("forever") robustness vs Art Blocks / fxhash / SuperRare.
**Type:** Read-only adversarial audit. No app code, specs, contracts, or DB rows were modified.
**Method:** 10 independent parallel auditors, each writing a detailed findings file under
`docs/security/findings/`. This document is the executive index + consolidated severity ranking.
**Builds on:** `docs/SECURITY_AUDIT_2026-06-14.md` (the earlier sweep). This one is far wider:
it adds the indexer, a live-DB Supabase probe, the artist-spoof money path, and the longevity benchmark.

> **Both repos confirmed PRIVATE** (GitHub), so this exploit-detail report is safe to keep in-repo.

---

## Bottom line (truth-first)

The foundation is genuinely strong and was built right: **the smart contracts are clean
(no critical/high/medium across all five), the spoof-an-artist-and-sell-out money path is
closed by three independent locks, the scoring/sybil exploits from the last sweep are really
fixed, and the art is genuinely fully on-chain (forever-grade A−).** There is no
account-takeover write path, no committed secrets, no admin/privilege-by-address system to abuse.

The real, live issues are concentrated in **two places**, both introduced or amplified by recent
shipping, neither touching real money (pre-mainnet, sim-ETH):

1. **Privacy + perimeter on the off-chain app** — a new live leak (the notifications inbox,
   including private DM bodies, is readable by anyone holding the public key) and a set of
   cheap cost-amplification / DDoS vectors that the rate limiter doesn't currently stop.
2. **The "become Brendon" dev-login** on the public preview, and **visual impersonation** via an
   unconstrained free-text profile name.

The indexer's forge-fake-data vectors are real but **not yet live** (the indexer is built, not
running) — they are pre-launch must-fixes, not active exposures.

**One thing only Brendon can verify:** whether the shared rate-limiter (Upstash) env vars are
actually set in the deployed environment. If not, there is effectively *no* rate limit today,
which upgrades several MEDIUMs in practice. (Moot after the Cloudflare move if WAF rate-rules
are configured there — see §Cloudflare.)

---

## Consolidated severity ranking (live-exploitable first)

| # | Sev | Surface | Finding | Live? | File |
|---|-----|---------|---------|-------|------|
| **S-D1** | **HIGH** | Supabase | Notifications inbox (`pings`/`ping_cursors`) readable by ANYONE with the public anon key — recipient, actor, amounts, **p2p message bodies**. Policy is `USING(true)` despite "PRIVATE" label. | **YES** | 05 |
| **S-A1** | **HIGH** | Auth | `dev-login` returns a full session as Brendon's wallet with no signature; gated only against `production`, so it works on the **public dev preview**. Highest-value identity, no admin tier above it. | **YES (preview)** | 01 |
| **S-P1** | **HIGH** | API/DDoS | `price/[address]` uses the address as cache key → iterating random addresses bypasses the cache; each = 2 Alchemy calls, unauth. Cheapest way to burn the Alchemy budget. | **YES** | 02 |
| **S-P2** | **HIGH** | API/DDoS | `home` (uncached), `stats`, `feed`, `anoint`, project `outputs` read whole tables and aggregate in JS — egress/CPU cliff that worsens as data grows; `home` hammerable now. | **YES** | 02 |
| **S-I1** | **HIGH** | Imposter | `ens_name` (prominent profile label) is free-text via `PATCH /api/me` — no ownership check, no charset/unicode filter, no uniqueness → convincing artist copycat (e.g. `xcopy.eth` / Cyrillic homoglyph). | **YES** | 04 |
| **S-X1** | **HIGH** | Indexer | Mint/transfer webhook path doesn't verify the contract is a tracked PD project (only the *sale* path does) → a broadly-scoped signed webhook writes fake mints/ownership/holders for ANY contract. | Not yet (indexer offline) | 07 |
| **S-X2** | **HIGH** | Indexer | Reconcile cron is public when `CRON_SECRET` is unset (`if (secret && …)` skips auth) → anyone loops it and burns the Alchemy RPC budget. | Not yet | 07 |
| **S-X3** | **HIGH(op)** | Indexer | No boot assertion that the webhook signing key exists → a missing key silently 401s the whole feed. | Not yet | 07 |
| **S-D2** | HIGH(latent) | Supabase | `_own_only` private-table policies trust `app.current_user_address`, which the anon role can set itself. Dead code today (no path sets it), but it's the *only* thing notionally guarding those tables. | Latent | 05 |
| **S-A2** | MED | Auth | SIWE `chainId` declared but never bound/checked — a signature for any chain verifies. Matters once Sepolia is live. | YES | 01 |
| **S-A3** | MED | Auth | SIWE `statement`/`uri`/`resources` unvalidated → a phishing-crafted consent text still logs in against our domain. | YES | 01 |
| **S-A4** | MED | Auth | `secure` cookie flag keyed on `NODE_ENV`, not transport → ships auth cookie over HTTP on any prod build with `NODE_ENV` unset. | Latent | 01 |
| **S-R1** | MED | Infra | Rate limiter **fails open** + **per-instance** without Upstash (prior M1). If env unset → no real limit. Make the SENSITIVE bucket fail-closed; money-writes (`market`,`mint`) + Alchemy reads are in the loose 100/min tier, not 15/min. | YES | 02,03 |
| **S-R2** | MED | Infra | `x-forwarded-for` spoofable (prior M4); mitigated on Vercel via `req.ip`, but that mitigation **does not carry to Cloudflare** as-is. | YES | 02 |
| **S-P3** | MED | API | No request body-size limit on any POST; `me` PATCH + `evaluate` accept arbitrarily large/deep JSON. | YES | 02 |
| **S-P4** | MED | API | `gas`/`rpc-ping` are param-less but cache-bustable via query string → forced cold Alchemy fetches. | YES | 02 |
| **S-DB3** | MED | Supabase | Six money/ledger-mutating functions have EXECUTE granted to `anon` — neutered today (INVOKER + RLS deny), but a landmine. | Latent | 05 |
| **S-DB4** | MED | Supabase | Full social graph, market book, achievement ledger, wallet activity + discord/ENS **PII** are anon-readable (prior L3, broadened). | YES | 05 |
| **S-I2** | MED | Imposter | No confusable/skeleton check on handle claim → `@xc0py` look-alike squatting. | YES | 04 |
| **S-I3** | MED | Imposter | Reserved-handle list missing authority words (`official`,`verified`,`mod`,`root`,`support`) and doesn't pre-reserve real artists' handles. | YES | 04 |
| **S-I4** | MED | Imposter | Spoofed `ens_name` is searchable → copycats surface in user search. | YES | 04 |
| **S-X4** | MED | Indexer | No post-auth payload validation → malformed signed delivery throws → retry storm. | Not yet | 07 |
| **S-X5** | MED | Indexer | Address auto-registration helper can enroll any address — wiring hazard for the PriceOS transplant. | Not yet | 07 |
| **S-X6** | MED | Indexer | Sale price/volume/ATH trusted from Seaport events → wash trades inflate volume/ATH (feeds scoring). | Not yet | 07 |
| **S-F1** | MED | Frontend | Security headers live in `next.config.mjs` only → they **silently vanish on Cloudflare Pages** unless a `public/_headers` file is added before migration. | At migration | 08 |
| **S-LOWs** | LOW | various | Streak/dead-catalog triggers, `action.*` self-grant (score-capped to ~0), Discord `redirect_uri` from origin, `data-external` scheme re-check (defense-in-depth), `NEXT_PUBLIC_ALCHEMY_API_KEY` in bundle, handle/slug land-grab, PDStickers `uri()` no JSON escaping, CSP has no `script-src`. | mixed | 01–10 |

---

## Answers to Brendon's specific concerns

**DDoS / cost-amplification.** The cheapest live attacks are the Alchemy-budget burns (S-P1, S-P4)
and the whole-table reads (S-P2), all unauthenticated and not stopped by the current limiter
(S-R1). None take the site fully down, but they cost money and degrade. The single biggest
resilience win is the Cloudflare move *with WAF rate-rules + bot management turned on* — see below.
Free/native first: confirm Upstash is set, make the SENSITIVE bucket fail-closed, add a body-size
guard, widen the SENSITIVE route list, and set Vercel + Alchemy budget alerts.

**Bots / spam account creation.** Account creation is still **free** (no funds/captcha/PoW/on-chain
gating in `users/create`). The crucial mitigation already shipped: **sybil reputation is dead** —
`GAMEABLE_SCORE_CAP` neutralizes all free/off-chain/social score, so farmed accounts gain nothing
rank-worthy (the prior C1/H1/H2 are verified fixed). Residual: bots can still inflate *cosmetic*
counts (raw follower number, anoint level badge) and spam is only softly throttled. The brake is
the rate limiter → set Upstash / configure Cloudflare.

**Artist imposter / verification badge.** Cannot be forged. The badge is **not a DB flag** — there
is no `verified`/`is_artist` column; status derives only from a read-only `artist_allowlist` table
that **no code path writes** (entry is manual/out-of-band). Handles are unique, immutable, and
wallet-bound. The full **spoof-an-artist → deploy a project → sell it out** money path is **closed
end-to-end**: project creation is permissioned (`onlyAdmin` whitelist), the artist address is
burned in as `msg.sender` at deploy, 100% of proceeds push to that wallet in-tx, and the site only
surfaces your curated registry — a fake on-chain project never appears. The **only** real residual
is *visual*: the free-text `ens_name` (S-I1) lets a faker's own profile *read* like a famous
artist — phishing flavor, no project, no money, no attribution.

**"Forever NFT" / longevity (vs Art Blocks, fxhash, SuperRare).** Verdict: **YES, fully on-chain
and self-sufficient today, grade A−.** The generative script, per-token seed, and even the
p5.js/three.js dependency libraries are stored on-chain; a token re-renders from Ethereum alone —
no servers, no IPFS, no CDN — and no admin/upgrade/pause can alter minted art. That puts PD beside
Art Blocks (A) and the Nouns/Chain Runners on-chain cohort, well above fxhash (C+, IPFS-pinning
dependent) and SuperRare (D, centralized/IPFS media). **Two honest asterisks before the boldest
claims:** (1) the marketplace *thumbnail* starts as an on-chain placeholder until a platform key
pins the full preview — so *art* is forever from mint, the *preview* depends on one platform
action; (2) per-token dependency-freeness is enforced by off-chain curation, not the contract.
Marketing-safe to claim **now:** "fully on-chain, regenerates from Ethereum forever, no IPFS/no
servers, immutable — no admin can change the art." See finding 09 for "the lever" steps to reach A.

**Cloudflare migration — is it better for security?** Yes for the *perimeter* (DDoS absorption,
WAF, bot management, edge rate-limiting) — genuinely the cheapest "set-and-forget" win for the
DDoS/bot/spam fears — but it does **not** offload app/data/contract liability (S-D1, S-A1, the
scoring logic, Supabase rules, the contracts and keys are all still ours). Two concrete migration
gotchas: security headers won't carry without a `_headers` file (S-F1), and the rate-limiter's
Vercel `req.ip` trust won't carry (S-R2) — re-implement limiting as Cloudflare edge rules.
Keep the Supabase service-role key a server-only CF secret; stay on `supabase-js` (don't open a
direct Postgres/pgbouncer connection from Workers).

---

## Smart contracts — clean (Fable-5-authored main contract held up)

No CRITICAL/HIGH/MEDIUM in any of the five contracts (PDFactory, PDProject, PaymentSplitter,
PDLibraryRegistry, PDStickers). Strict CEI, push-payments with zero stored balance, complement
splits that strand no dust, two-step privilege transfers, `_mint` not `_safeMint`, no `tx.origin`,
no delegatecall/selfdestruct/signatures/upgradeability, no CREATE2 front-run surface. The two
hand-rolled assembly blocks (`_reclaim`, `readLibrary`) were verified correct by manual review.
**Non-code gates before mainnet (unchanged):** (1) run the full Foundry suite in a real env
(couldn't run here — Foundry not installed), (2) external-firm audit + symbolic byte-equivalence
proof of the assembly, (3) post-deploy Etherscan bytecode verify. Only new nit: PDStickers `uri()`
lacks the JSON escaping PDProject has (admin-only input; LOW).

---

## Prioritized fix order

**Now (live, off-chain, no money but real exposure):**
1. **S-D1** — make the pings/notifications tables genuinely private (drop `USING(true)`; scope reads to the recipient via the service-role app layer, off the anon grant). *Privacy of DM bodies — fix first.*
2. **S-A1** — hard-gate `dev-login` to a non-preview flag (or remove it from preview), so the public preview can't mint a Brendon session.
3. **S-P1 / S-P2 / S-P4** — cap/curtail the Alchemy-budget burns and whole-table reads (cache by a bounded key, add row caps + pagination).
4. **S-I1 (+S-I3/S-I4)** — constrain `ens_name` (server-side ENS-ownership verify or drop the free-text label), add reserved authority words + pre-reserve real artists' handles.
5. **S-R1** — confirm Upstash is set in the deployed env; fail-closed the SENSITIVE bucket; widen it to money-writes.

**Before the Cloudflare switch:**
6. **S-F1 / S-R2** — add `public/_headers`; re-implement rate-limiting as Cloudflare edge rules; turn on WAF + bot management.

**Before the indexer goes live:**
7. **S-X1/2/3** — gate the transfer handler to tracked PD projects; fail-closed the cron; assert the signing key at boot. Verify the `events (tx_hash, log_index)` unique constraint exists in live Supabase (the whole no-double-count model depends on it).

**Before mainnet:**
8. Contracts — run the suite for real + external audit + assembly byte-equivalence proof + Etherscan verify.

**Hygiene / defense-in-depth:**
9. SIWE `chainId`/consent binding (S-A2/A3), cookie `secure` by transport (S-A4), owner-scoped RLS as defense-in-depth, tighten CSP `script-src`, get the 35 unversioned migrations into the repo, confirm Supabase PITR/backups.

*No app code, contracts, specs, or DB rows were modified in producing this sweep.*
