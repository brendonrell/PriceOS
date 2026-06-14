# Audit 03 — Sybil / Spam / Achievement Integrity (PriceRank / PriceScore)

**Date:** 2026-06-14 · **Type:** read-only verification audit (no app code modified)
**Auditor focus:** anti-abuse, sybil-resistance, reputation integrity
**Scope:** the PriceRank/PriceScore subsystem — `lib/achievements/*`, `app/api/achievements/*`,
`app/api/streak/ping`, `app/api/me`, `app/api/users/create`, `app/api/follows`,
`app/api/anoint`, `lib/anoint/levels.ts`, `app/api/project-follows`, `lib/social/relevance.ts`.

**Method:** read the current code line-by-line and traced every gaming vector against
the catalog trigger grammar. Line numbers are current as of this read.

---

## Verdict on the prior cluster

| Prior | Title | Status | Evidence (current) |
|---|---|---|---|
| **C1** | Self-grant curation category via `/api/me` settings blob | **FIXED (effective)** | `engine.ts:838` cap=10; `:845-852` distinct well-formed `slug:id` only; `:1175-1183` gameable score clamped |
| **H1** | Forgeable streak via client `localDate` | **FIXED (effective)** | `streak/ping/route.ts:59-69` bounds localDate ≤ UTC+1 day; streak no longer feeds score (`engine.ts:809` `streak.` is gameable-capped) |
| **H2** | Sybil-inflate followers/anoints/mutuals | **PARTIALLY FIXED** | Score impact neutralised (`engine.ts:797-826` all social prefixes capped). Sybil graph itself still free + only soft-throttled. Relevance row + anoint *levels* still 1-acct-1-vote |
| **M5** | `evaluate` / `streak ping` unthrottled | **PARTIALLY FIXED** | `middleware.ts:27-38` SENSITIVE_LIMIT=15/60s covers both — but in-memory & fails-open unless Upstash env set (`:72-75`, `:96-98`) |

---

## Severity table (this pass)

| # | Sev | Status | Finding | Where |
|---|-----|--------|---------|-------|
| C1 | CRIT→**RESOLVED** | Fixed | Curation self-grant — capped + key-validated | `engine.ts:838,845,1183` |
| H1 | HIGH→**RESOLVED** | Fixed | Streak forge — date-bounded + de-scored | `streak/ping:59-69` |
| H2 | HIGH→**MITIGATED** | Partial | Sybil graph free; score impact removed, but anoint *project levels* + relevance still unweighted | `levels.ts:38`, `anoint/route.ts:325` |
| S1 | **MED** | New | Rate-limit fails open + per-instance without Upstash (no env here) — sybil/spam throttle is best-effort only | `middleware.ts:72-75,96-98,136-139` |
| S2 | **LOW** | New (correctness→integrity) | ~15 catalog triggers reference paths that don't exist server-side or in the client-grant whitelist → permanently locked. Includes the 200-pt `og_founding`. Not exploitable; dead points | `catalog.ts:122,169-170,183-184,192-196,254,256,259-260` |
| S3 | **LOW** | New | `action.*` IS client-grantable (in `CLIENT_GRANTABLE`) → browser can self-grant `night_owl`/`four_twenty`, but both are gameable-capped so worth ~0 score | `engine.ts:766,824`; `catalog.ts` action.* |
| S4 | **INFO** | Verified safe | Pings/engagement do NOT feed the footprint — ping spam cannot move score | `engine.ts:86-178` (no ping field) |
| S5 | **INFO** | Verified safe | Tenure source (`created_at`) is not in the `/api/me` write whitelist → un-forgeable | `me/route.ts:118-137` |

No CRITICAL or HIGH remains exploitable for **score/rank** gaming. The residual risk is
(a) the throttle being soft (S1), and (b) sybil wallets still distorting **non-score**
social surfaces — anoint project levels and the "Collected/Followed by" face row (H2 residue).

---

## C1 — Self-grant curation category — **FIXED, effective**

**Claim:** counts only distinct well-formed `slug:id` keys; `GAMEABLE_SCORE_CAP=10`.

**Verified present:**
- `engine.ts:840-852` — `CURATION_KEY_RE = /^[^\s:]+:\d+$/` and `countCurationKeys()` dedupes
  into a `Set`, accepting only strings matching the regex. Raw integers (`[1,2,3]`) and
  duplicates are dropped. `stars.count` / `wishlist.count` / `albums.*` all route through it
  (`:538-549`).
- `engine.ts:545` — albums with zero valid keys don't count (`countCurationKeys(al.keys) > 0`),
  so empty-album spam can't mint album-count tiers.
- `engine.ts:797-826` — `GAMEABLE_TRIGGER_PREFIXES` includes `stars.`, `wishlist.`, `albums.`,
  `showcase.`, `targets.`. `engine.ts:1175-1183` sums gameable points separately and applies
  `Math.min(gameableScore, GAMEABLE_SCORE_CAP)` (=10).

**Bypass attempts — all fail:**
1. `PATCH /api/me {settings:{starred:["a:1","a:2",…500]}}` → the regex accepts these (they're
   well-formed) and the badges *unlock* for feedback, BUT every star/wishlist/album/target
   trigger is gameable-prefixed, so the combined contribution is clamped to 10 of ~12,000.
   Tier 1 needs 100 (`tiers.ts:37`). **Farming yields no rank.**
2. Fabricated `slug:id` that maps to nothing — still capped; the cap, not the key-validation,
   is the load-bearing control. The regex is defense-in-depth (stops the unlock looking
   absurd), the cap is what makes it pointless.
3. **The cap is applied to ALL free categories**, confirmed by enumerating every catalog
   prefix against `GAMEABLE_TRIGGER_PREFIXES`: social (`following/followers/mutuals/projectFollows`),
   curation (`stars/wishlist/albums/showcase/targets`), `streak`, `anoint`, `holdings.primeRelic`,
   `artist.projectFollowers`, and all client-asserted prefixes are covered.

**One residual seam (S2/S3, low):** a handful of "free" triggers (`profile.*`, `handle.claimed`,
`spells.*`, `session.*`) are NOT gameable-prefixed and WOULD score in full — but they never
unlock (S2: no footprint key, not client-grantable). So they contribute 0 today. **If a future
session wires those paths into the footprint or the client-grant whitelist without also adding
them to `GAMEABLE_TRIGGER_PREFIXES`, they would bypass the cap.** Recommend: add `profile.`,
`handle.`, `spells.`, `session.`, `follow.`, `joinedBefore.` to the gameable prefix list now,
pre-emptively, since none represent on-chain truth.

---

## H1 — Forge any streak length — **FIXED, effective**

**Claim:** `localDate` bounded to server `now()`.

**Verified present (`streak/ping/route.ts:54-69`):**
```
localMs - serverTodayMs > 24h  →  400 "too far in the future"
```
Max real timezone is UTC+14, but the check allows up to +24h, which is conservative and correct.

**Bypass attempts — all fail:**
1. **Fast-forward 365 days in 365 calls:** rejected — any `localDate` more than one day past
   server UTC is a 400. You can advance at most one calendar day per real day.
2. **Backward dates to "rebuild" a streak:** `streak.ts:88-93` — a date behind `lastActive`
   (or any gap >1 day) is a HARD reset to 1, not a continuation. No banked credit.
3. **Same-day replay:** `streak.ts:80-83` — `today === lastActive` is a no-op.
4. **Timezone abuse:** the ±1-day window is the only slack; you cannot chain it because
   `streak_last_active` is stamped to the accepted `localDate` (`:108`), so the next legitimate
   tick must be exactly +1 from that — you can't oscillate to gain days.
5. **Score impact:** moot anyway — `streak.` is gameable-capped (`engine.ts:809`), and streak
   only "activates" at 60 days conceptually (`tiers.ts:101`). Even a forged 365 = 0 meaningful score.

The day count is shown in UI, so keeping it honest still matters; the fix does that.

---

## H2 — Sybil-inflate the social graph — **PARTIALLY FIXED (score neutralised; graph still free)**

**Score path: FIXED.** Every social/anoint trigger is gameable-capped (`engine.ts:797-826`),
so N throwaway wallets following/anointing a target moves their PriceScore by **at most 10**.
The "inflate your own rank or a victim's rank" attack is dead for **rank**.

**What remains exploitable (non-score surfaces):**

1. **Account creation is free (`users/create/route.ts`).** No funds, no captcha, no PoW, no
   on-chain gating — a SIWE signature from any wallet + a unique handle creates a full row.
   Handle is the only scarce resource (`:171` 23505 → handle_taken). **Sybil cost = gas-free
   off-chain.** Confirmed: nothing in the route checks balance/holdings/age.

2. **Anoint project LEVELS are still 1-account-1-vote (`levels.ts:38`, `:18` "v1 ships
   UNWEIGHTED").** `anoint/route.ts:325` counts rows. 100 sybil wallets each pledging a project
   → "The Cult"; 500 → "The Egregore" (`levels.ts:39-41`). This is prestige/visual only
   (`levels.ts:11` "NEVER gates platform features") and the badge points are capped — but a
   project's *displayed standing* is sybil-forgeable. Low impact today, becomes real if level
   ever gates anything or drives discovery.

3. **The "Collected by / Followed by" relevance row (`lib/social/relevance.ts`)** ranks by
   `mutual` then `priceScore` then jitter. Sybils have priceScore≈0 so they rank LOWEST — good.
   But a target's raw **follower count** (shown elsewhere) is still sybil-inflatable, and a
   sybil that *mutuals* a victim (`:44` strength weight) outranks a real one-way follower of
   higher score. Minor display distortion, not a score exploit.

4. **Throttle (S1, below)** is the only thing slowing mass-creation, and it's soft.

**Fix (for when it matters):** weight anoint/follow credit by the source wallet's on-chain
presence (a mint/hold) or its own PriceRank; gate `users/create` behind any on-chain footprint;
make the Upstash limiter real. The score cap already removed the *urgent* damage; this is the
deferred "PriceRank-weighted votes / Sybil resistance" item, now correctly downgraded from HIGH.

---

## S1 — MEDIUM · Rate limiter fails open + per-instance without Upstash

`middleware.ts` applies `SENSITIVE_LIMIT=15/60s` to `users/create`, `follows`,
`project-follows`, `anoint`, `streak`, `achievements/evaluate`, `auth`, handle checks
(`:28-38`) — the right routes. **But:**
- `:72-75` — if `UPSTASH_REDIS_REST_URL`/`_TOKEN` are unset, `upstashIncr` returns null and
  the code falls to the in-memory counter (`:136-139`), which is **per-warm-instance** —
  serverless spreads requests across instances, so the effective limit is `15 × instances`.
- `:96-98` — any Upstash error → null → **fails open** (request allowed).
- `req.ip` is preferred over spoofable XFF (`:53`) — correct on Vercel.

**Impact:** without the env keys actually set in the deployed environment, sybil/spam mass
account+follow creation is only loosely capped. The WIP baton notes Upstash isn't configured
("deprioritized — score cap makes farming pointless"). That reasoning holds for **rank**, but
NOT for: handle-squatting, Alchemy/DB cost burn, ping/notification spam to a victim, and
distorting the non-score surfaces in H2. **Action:** set the Upstash env in the deployed env
(no code change needed), and consider fail-closed on `auth` + `users/create`.

---

## S2 — LOW · Dead triggers (correctness bug with an integrity edge)

These catalog triggers reference paths that are neither footprint keys nor in the client-grant
whitelist, so `evalTrigger` (`engine.ts:993,1002`) returns false forever — they can never unlock:
- `handle.claimed` (catalog.ts:122, 25pt)
- `joinedBefore.foundingCutoff` / `joinedBefore.yearOneCutoff` (`:169-170`, **200pt + 100pt**)
- `targets.count>=N` / `targets.hit>=1` (`:183-184`, ladders `:225-226`) — no `targets.*`
  footprint key exists
- `profile.spriteSet/plateExported/colorSet/discordLinked/complete` (`:192-196`)
- `follow.inDay>=20` (`:254`), `session.returnedAfterDays>=30` (`:256`)
- `spells.allToggled` / `spells.tarotPulled` (`:259-260`) — note the client prefix is `spell.`
  (singular) but the catalog uses `spells.` (plural), so these miss the whitelist too

Not exploitable (they grant nothing), but they're dead product. The integrity edge: when these
are eventually wired, several (`profile.*`, `joinedBefore.*` if forgeable, `targets.*`) are
free/self-asserted and must land in `GAMEABLE_TRIGGER_PREFIXES` or they'll score uncapped. Flag
for whoever implements them. (`og_founding` at 200pt is the one to watch — tenure should derive
from the immutable `created_at`, which is safe per S5; if `joinedBefore` is later mapped to
`created_at` it's fine. If it's ever client-asserted, it's a 200pt forge.)

---

## S3 — LOW · `action.*` is client-grantable but capped

`CLIENT_GRANT_PREFIXES` (`engine.ts:759-768`) includes `action.`, so `CLIENT_GRANTABLE`
(`:780-782`) contains `night_owl` (`action.lateNightCount>=50`) and `four_twenty`
(`action.time==4:20`). A scripted `POST /api/achievements/evaluate {clientGrants:["night_owl"]}`
**will unlock them with no proof** (`engine.ts:1138-1142`). Acceptable because: (a) these are
flavour lore eggs, (b) `action.` is gameable-capped (`:824`) so they're worth ~0 score, (c) they
only affect the caller's own row. This is the intended trade-off (client eggs trust the browser),
just documenting that the whitelist is genuinely browser-grantable — keep ALL client-grantable
ids inside the gameable cap (currently true). Do not ever move a point-bearing on-chain
achievement to a client-grant prefix.

---

## Verified-safe (no action)

- **Scores recomputed, not incremented** (`engine.ts:1175-1190`) — full re-sum every call;
  no add-points replay. Confirmed.
- **Unlock inserts PK-deduped** (`engine.ts:1162-1167` upsert `ignoreDuplicates`) — race-safe.
- **Every write keyed to the SIWE session address**, never a body address: `me` (`:163-166`),
  `follows` (`:57` address from auth, target validated, self-follow blocked `:69`), `anoint`
  (`:114` address from auth), `project-follows` (`:152`), `streak` (`:41`), `evaluate` (`:43`).
  No IDOR for score writes.
- **Anoint one-pledge-per-wallet** (PK `user_address`, upsert `onConflict:'user_address'`
  `anoint/route.ts:188`) + **60-day lock on the SERVER clock** (`:146,163-164,222-223` use
  `new Date()`/`Date.now()`, not a client value) — not forgeable, unlike the old streak date.
- **Pings never feed the footprint** — `UserFootprint` (`engine.ts:86-178`) has no ping/engagement
  field; ping spam cannot move score or rank.
- **Tenure un-forgeable** — `created_at` is excluded from the `/api/me` write whitelist
  (`me/route.ts:118-137` lists only settings envelopes + display fields); set by DB default at
  `users/create`. The `tenure.*` badges read it safely.
- **`meta.*` completion badges** depend on the base unlock set, which includes capped gameable
  unlocks — but meta badges are not gameable-prefixed, so they score in full. This is acceptable
  because reaching `meta.unlockedCount>=N` / `categoryComplete` still requires unlocking the real
  on-chain achievements; a pure free-grinder can unlock the gameable ones but those alone won't
  complete non-gameable categories. No feedback loop (score is recomputed, not fed back into
  triggers except `score.total`/`rank.tier`, which only rise on un-capped on-chain points).

---

## Recommendations (priority)

1. **Set the Upstash env keys** in the deployed environment (S1) — the only urgent residual;
   makes the sybil/spam throttle real. No code change.
2. **Pre-emptively add** `profile.`, `handle.`, `spells.`, `session.`, `follow.`, `joinedBefore.`
   to `GAMEABLE_TRIGGER_PREFIXES` (S2) so the cap holds when those triggers are eventually wired.
3. **When anoint levels or follower counts start gating/driving anything** (discovery, roles),
   weight them by source on-chain presence/PriceRank (H2 residue) — currently safe only because
   they're cosmetic.
4. Fix the `spells.`/`spell.` plural mismatch and the dead `og_founding` 200pt trigger (S2) —
   product correctness.

*No app code was changed in producing this audit.*
