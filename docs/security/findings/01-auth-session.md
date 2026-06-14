# Auth / Session Deep Audit — PriceOS

**Date:** 2026-06-14
**Scope:** SIWE login, nonce, dev-login, Discord OAuth link, iron-session cookie, middleware session reading, service-role usage, privilege model.
**Type:** READ-ONLY. No app code modified. Single write = this file.
**Method:** Re-verified each relevant prior finding (`docs/SECURITY_AUDIT_2026-06-14.md`) against current line numbers, then dug deeper on the threat list.

> **Caveat up front:** `node_modules` is not installed in this container, so the
> `siwe@^2.3.2` and `iron-session@^8` internals were assessed from the documented
> v2 API, not by reading the installed source. Every finding below that depends on
> library behavior is flagged where that matters. Everything about *our* code is
> read directly from the files.

---

## Severity-ranked findings

| # | Sev | Area | Finding | File:line | Prior |
|---|-----|------|---------|-----------|-------|
| A1 | **HIGH** | dev-login | `dev-login` is gated on `VERCEL_ENV !== 'production'`, so on the **public dev preview anyone can become Brendon** with one unauthenticated POST — no wallet, no signature | `app/api/auth/dev-login/route.ts:33-49` | confirms L1, **re-rated up** |
| A2 | **MEDIUM** | SIWE | **chainId is never bound/verified.** A signature for any chain verifies; the session `chainId` field is declared but never written or checked | `lib/auth/siwe.ts:104-125`, `app/api/auth/siwe/route.ts:82-92` | new |
| A3 | **MEDIUM** | SIWE | **`uri`/`statement`/`resources` are never validated** server-side. Only domain+nonce are enforced; a signature minted on a malicious page that reuses our domain string is accepted | `lib/auth/siwe.ts:112-116` | new |
| A4 | **MEDIUM** | Session | Cookie `secure` flag keys off `NODE_ENV==='production'`, **not** the deployed env. Correct on Vercel, but fragile — any prod-like deploy with `NODE_ENV` unset ships the session cookie over plain HTTP | `lib/auth/siwe.ts:60` | refines prior "secure in prod" claim |
| A5 | **LOW** | Discord | `redirect_uri` derived from `req.nextUrl.origin` on both legs. Not exploitable today (Discord allowlists the redirect), footgun if a second origin is ever allowlisted | `app/api/auth/discord/route.ts:24,41`, `callback/route.ts:21,51` | confirms L4 |
| A6 | **LOW** | SIWE | No explicit `notBefore`/`issuedAt` sanity bound and no server-side expiry clamp; relies entirely on siwe lib auto-checking `expirationTime` **only if the client included it** | `lib/auth/siwe.ts:104-125`, `lib/wallet/siweClient.ts:62-76` | new |
| A7 | **INFO** | Privilege | No admin/role system exists at all. Brendon's address is hardcoded **only** in dev-login. No route grants elevated privilege by address — confirmed by full-repo grep | `app/api/auth/dev-login/route.ts:31` | new (positive) |
| A8 | **INFO** | CSRF | All state-changing POSTs rely on SameSite=Lax + same-origin fetch + httpOnly cookie. No CSRF token. Adequate for top-level-navigation-immune verbs; one real gap is the Discord GET (see A1/A5 note) | `lib/auth/siwe.ts:58-64` | adjacent to M-class |

**Re-confirmed SAFE from prior audit:** nonce single-use, domain binding, cookie httpOnly+encrypted, secret length-checked ≥32, Discord one-time state CSRF, address lowercased consistently (no checksum confusion), service-role key server-only, no body-supplied address in identity writes, no signature replay across domains.

---

## Details

### A1 — HIGH · dev-login = "become Brendon" on the public dev preview
**Where:** `app/api/auth/dev-login/route.ts:33-49`; UI gate `app/layout.tsx:460`.

```
function devLoginAllowed(): boolean {
  return process.env.VERCEL_ENV !== 'production';   // L34
}
...
session.address = BRENDON_ADDR.toLowerCase();        // L43
```

**Verified:** the gate works exactly as documented — on `main` (`VERCEL_ENV==='production'`) the route 404s. The button is also hidden in prod (`layout.tsx:460`). So **production is safe.** This is correctly NOT a prod vulnerability.

**Why I rate it HIGH (prior audit rated L1 "by design"):** the CLAUDE.md contract states plainly that **the dev preview IS the app** — Deployment Protection is OFF and the preview is publicly reachable. On that preview, `VERCEL_ENV==='preview'`, so `devLoginAllowed()` returns true. **Any anonymous internet user** can:

```
curl -X POST https://price-os-git-dev-pricediscussion.vercel.app/api/auth/dev-login
```

and receive a full iron-session cookie authenticated as Brendon's wallet `0x65c3…9395`. From there they hit every `requireAuth` route AS Brendon: `PATCH /api/me` (rewrite his settings/showcase/profile), Discord link/unlink on his row, follows/anoint/streak/achievements under his identity, and — since there is no admin tier — Brendon's account is the highest-value identity on the platform. It also seeds the C1/H1/H2 scoring exploits already on dev *as Brendon specifically*.

**Real impact to Brendon:** no money (sim-ETH, no mainnet), but his live identity on the public preview is takeable by anyone who guesses or finds the route name. The route name is in client JS shipped to every visitor, so it's not even obscure.

**This is "by design" only in the sense that the convenience was intended; the public reachability of the preview is what turns it into a real exposure.**

**Fix (pick one):**
- Tighten the gate to `VERCEL_ENV !== 'production' && VERCEL_ENV !== 'preview'` (i.e. localhost-only via `=== undefined`), **or**
- Require a shared secret header/env token the button injects, **or**
- Turn Vercel Deployment Protection ON for the dev preview (defeats the "preview IS the app, publicly reachable" workflow, so probably not Brendon's choice).
Recommended: gate to localhost-only and give Brendon a local dev-login; the preview then requires a real wallet sign-in like everyone else.

---

### A2 — MEDIUM · chainId is never bound or verified
**Where:** `lib/auth/siwe.ts:104-125` (verify), `app/api/auth/siwe/route.ts:82-92` (caller), `lib/wallet/siweClient.ts:65-76` (client sets chainId from wagmi).

The session type declares `chainId?: number` (`lib/auth/siwe.ts:38`) but **nothing ever writes it** (grep: only declaration, no assignment) and `verifySiweMessage` passes only `{ signature, nonce, domain }` to `siwe.verify()` — chainId is omitted, so the lib does not check it.

**Exploit walkthrough:** the SIWE message includes a `Chain ID:` line the client populated from the connected wallet. Because the server never pins an expected chainId, a message signed declaring `Chain ID: 1` and one declaring any other chain both verify identically. wagmi is mainnet-only (`wagmiConfig.ts:74`), so today the client always sends 1 — but the *server* accepts anything. If the app ever becomes multi-chain (Sepolia test phase is active per `docs/sepolia-test-phase.md`), a signature scoped to a throwaway testnet identity could be presented to the mainnet origin. Low likelihood today, but it's a missing binding that the spec's own SIWE message advertises as enforced.

**Fix:** pass the expected chainId to `siwe.verify({ ..., chainId: 1 })`, or read `result.data.chainId` and reject anything not in an allowlist. Persist it to `session.chainId` so downstream can trust it.

---

### A3 — MEDIUM · uri / statement / resources unvalidated
**Where:** `lib/auth/siwe.ts:112-116`.

```
const result = await siwe.verify({ signature, nonce: expectedNonce, domain: expectedDomain });
```

Only `domain` and `nonce` are enforced. The client builds `uri`, `statement: 'Sign in to Price Discussion.'`, and `resources: [origin]` (`siweClient.ts:68-75`), but the server validates **none** of them.

**Why it matters:** domain binding stops a *different-domain* signature being replayed. It does **not** stop a signature whose `domain` field equals our host but whose `statement`/`uri`/`resources` were crafted by an attacker page. SIWE's defense-in-depth model expects the verifier to also confirm the `statement` the user agreed to and the `uri` match what the server intended — otherwise a phishing flow that shows the victim a *different* statement (e.g. "Approve transfer of all assets") while signing against our domain still produces a session-valid signature here. The user-visible consent text is the attacker's, but our server treats it as a clean login.

**Fix:** after verify, assert `result.data.statement === 'Sign in to Price Discussion.'` and `result.data.uri`/`resources` match the expected origin; reject on mismatch. Cheap, no library change.

---

### A4 — MEDIUM · `secure` cookie flag keyed on NODE_ENV, not deploy env
**Where:** `lib/auth/siwe.ts:60`: `secure: process.env.NODE_ENV === 'production'`.

On Vercel, `NODE_ENV` is `'production'` for both the prod and preview builds, so the session cookie **is** `Secure` on the dev preview and prod today — the prior audit's "secure in prod" is correct. The finding is the *coupling*: `secure` should track "is this served over HTTPS," and `NODE_ENV` is a build-mode flag, not a transport flag. Any future self-host, container, or edge runtime that runs the production bundle with `NODE_ENV` unset (a common misconfig) would ship the auth cookie **without** `Secure`, allowing it to leak over plain HTTP. Domain/nonce binding limits replay value, but a leaked session cookie is a full account takeover for its 14-day life.

**Fix:** drive `secure` off `VERCEL_ENV` presence / an explicit `COOKIE_SECURE` env, defaulting to `true` and only `false` for an explicit localhost flag.

---

### A5 — LOW · Discord redirect_uri derived from request origin (confirms prior L4)
**Where:** `app/api/auth/discord/route.ts:24,41` and `app/api/auth/discord/callback/route.ts:21,51`.

Both legs compute `redirect_uri` as `${req.nextUrl.origin}/api/auth/discord/callback`. The authorize leg and the token-exchange leg must match, and they do (both off origin), so the flow works and Discord's own redirect-URI allowlist is the real guard. **Confirmed not exploitable today.** It stays a footgun: if a second origin is ever added to Discord's allowlist (e.g. a vanity domain), an attacker who can get a victim to start the flow from an attacker-influenced origin could steer the code delivery. Pin `redirect_uri` to a single configured env value rather than deriving it.

**Discord CSRF re-confirmed solid:** `randomBytes(16)` state stored in session (`discord/route.ts:34-37`), checked and cleared on callback whatever happens (`callback/route.ts:31-36`), constant-equality compare `state !== savedState`. Account-link confusion is closed: the linked row is keyed on `session.address` (`callback/route.ts:73`), never on anything Discord returns, so you can only ever link a Discord account to **your own** wallet. Token is used once and never stored (`callback/route.ts:55-67`), scope is `identify` only.

---

### A6 — LOW · No server-side expiry clamp; expiry enforcement depends on the client
**Where:** `lib/auth/siwe.ts:104-125`, `lib/wallet/siweClient.ts:62-76`.

The client sets `expirationTime` = issuedAt + 10 min (`SIWE_EXPIRY_MINUTES`). `siwe.verify()` in v2 auto-rejects an expired message **when the message contains `expirationTime`** — so the happy path is fine. But the server passes no `time`/expiry of its own and does not require `expirationTime` to be present. A hand-crafted client that simply omits `expirationTime` produces a message with no expiry, and verify accepts it indefinitely (bounded only by nonce single-use, which is itself bounded by how long the nonce sits on the session — and the nonce cookie's own 14-day ttl). `notBefore` is likewise unchecked beyond the lib default.

**Impact:** marginal — the nonce is single-use and cleared on success, so a captured (message,signature) can't be replayed once consumed, and an unconsumed nonce is one specific cookie. But "the message must carry a near-term expiry" should be a server invariant, not a client courtesy.

**Fix:** after verify, require `result.data.expirationTime` present and within, say, 15 min of `issuedAt`; reject otherwise.

---

### A7 — INFO · Privilege model: there is none (this is good, with one note)
Full-repo grep for `admin`, `isAdmin`, `allowlist`, `isOwner`, and Brendon's address found **zero** privilege checks. No route does anything special for any address. The only place Brendon's address appears is the dev-login constant (`dev-login/route.ts:31`). So "can a normal session reach admin actions?" — there are no admin actions to reach. **Positive finding.**

The one connected risk: because there's no admin tier, **Brendon's own account is the most valuable identity**, which is exactly what A1 hands out for free on the preview. Identity escalation isn't "normal user → admin," it's "anonymous → Brendon" via dev-login.

---

### A8 — INFO · CSRF posture
All state-changing endpoints are POST/PATCH/DELETE reading the httpOnly SameSite=Lax cookie, called via same-origin `fetch` with JSON content-type. SameSite=Lax blocks cross-site cookie attachment on non-top-level requests, and the JSON body / fetch path isn't reachable from a cross-site HTML form. No CSRF token, but for these verbs the Lax cookie + non-simple-request shape is the standard accepted mitigation. **The exception is the Discord *GET* authorize leg** (`discord/route.ts:23`): it's a GET that mutates session (`session.discordState`) and is reachable by top-level navigation, which Lax *does* send the cookie for. Worst case a cross-site link could overwrite a victim's pending `discordState` — harmless (it only seeds a CSRF token for a flow the victim then has to complete and consent to). Noted for completeness; no fix required.

---

## Verdict vs. prior audit

- **Confirmed:** SIWE nonce single-use + domain binding (solid), Discord one-time state CSRF (solid), cookie httpOnly + encrypted + secret≥32 (solid), no body-supplied-address writes, service-role server-only, address normalization consistent (no checksum confusion), no signature replay across domains.
- **Re-rated:** L1 (dev-login) → **HIGH (A1)** because the preview is public and the route is anonymous; it's the single most actionable auth issue.
- **New gaps:** chainId unbound (A2), statement/uri/resources unvalidated (A3), `secure` flag coupled to NODE_ENV (A4), no server expiry invariant (A6).
- **EIP-1271 (contract wallets):** not handled — `siwe.verify()` is called without a `provider`, so only EOA (ECDSA) signatures verify; Safe/contract wallets cannot sign in. Not a vulnerability (fails closed), just a capability note for the wallet roster.

*No app code was changed in producing this report.*
