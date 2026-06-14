# 08 — Frontend / Client-Side Security Audit

**Date:** 2026-06-14
**Scope:** PriceOS Next.js 14 + React 18 frontend (`app/`, `components/`, `lib/`).
**Type:** Read-only adversarial audit. No code modified.
**Focus areas (per brief):** stored XSS via UGC/profile fields, the generative-art render sandbox, re-confirm/refute M2 (security headers) and L5 (`data-external` link handler), client-trust of localStorage, secrets in client bundle, Cloudflare Pages migration impact.

> **Bottom line, caveats up front:** No new Critical or High client-side findings. The XSS surfaces flagged in the prior audit are genuinely closed — the inline-markdown HTML renderer escapes `<>&` before emitting any tag, and the only `dangerouslySetInnerHTML` uses are either static constants or fed by that escaping renderer. **The art pipeline is clean** (pure-math canvas, no eval/SVG-string/DOM injection, only a numeric tokenId as input) — the "on-chain code execution in browser" concern is REFUTED. **M2 is PARTIALLY FIXED** (headers added, but CSP deliberately omits `script-src` — clickjacking is now covered, script-injection backstop is not). **L5 is CONFIRMED still present** but is defense-in-depth only (the render layer it depends on is sound, so it is not independently exploitable today). The one genuinely new note: the Alchemy API key ships in the client bundle (known/accepted, Alchemy-side concern), and **none of the security headers will carry over to Cloudflare Pages** without a `_headers` file.

---

## Severity table

| # | Sev | Area | Finding | Status |
|---|-----|------|---------|--------|
| F1 | **MED** | Config (M2) | Security headers added but CSP has NO `script-src`/`default-src` — no XSS backstop | PARTIAL FIX |
| F2 | **MED** | Migration | All headers live only in `next.config.mjs` `headers()`; will NOT carry to Cloudflare Pages without a `_headers` file | OPEN |
| F3 | **LOW** | Client (L5) | `data-external` click handlers open `anchor.href` via `window.open`/`location` with no scheme re-check | CONFIRMED (defense-in-depth gap) |
| F4 | **LOW** | Secrets | `NEXT_PUBLIC_ALCHEMY_API_KEY` shipped in client bundle | OPEN (known) |
| F5 | **INFO** | Client-trust | localStorage curation blob (stars/wishlist/albums) is server-trusted by the scoring engine | = C1 (already tracked) |
| — | — | XSS | Stored/reflected XSS via profile/UGC fields | **CLOSED (refuted)** |
| — | — | Art | On-chain/user-supplied script exec or SVG/HTML injection in art render | **CLOSED (refuted)** |

No Critical/High at the client layer. The live-critical risks remain the scoring subsystem (C1/H1/H2), which are server-side and tracked in the master audit.

---

## XSS surfaces — re-verified CLOSED

### Inline markdown (the historical worry) — safe
Two renderers exist:
- `lib/markdown.tsx` `renderInlineMarkdown()` returns **React nodes**, never an HTML string (`:66-78`). Cannot inject. Safe by construction.
- `lib/calendar/utils.ts` `renderNoteMarkdown()` returns an **HTML string** that IS fed to `dangerouslySetInnerHTML`, but it **escapes `&`, `<`, `>` first** (`:75-78`) before emitting any `<strong>/<em>/<code>/<a>` tag. The URL linkifier (`:80-83`) matches only `https?://[^\s&<>"]+`, so a linkified `href` cannot contain a quote/angle-bracket/`&` and cannot be a `javascript:`/`data:` scheme. **No injection path.**

`dangerouslySetInnerHTML` call sites (all accounted for):
- `app/layout.tsx:541` (`PREHYDRATION_SCRIPT`) and `:545` (`LOADER_HTML`) — **static module constants**, no user input.
- `components/ValuePromptModal.tsx:228` — fed by `emOnlyHtml()` (`:52-60`), which escapes `<>&` then re-allows ONLY the literal `<em>`/`</em>` pair (an attacker `<em onmouseover=…>` stays escaped because it never matches the exact `&lt;em&gt;` token). Safe.
- `components/CalendarPanel.tsx:223` and `components/NotePromptModal.tsx:212` — fed by `renderNoteMarkdown()` (escaping renderer above). Safe.

### Profile / UGC fields — rendered as escaped JSX text, and notes are local-only
- Handle, `ens_name`, and the identity line in `components/profile/ProfilePageBody.tsx` (e.g. `:168, :178-179, :756`) are rendered as **JSX text children** — React auto-escapes them. No XSS.
- `lib/project/types.ts:12` states **PD has no project descriptions** — that UGC field does not exist in render.
- `bio` exists in the API spec (`docs/api-spec.md:68,386`) but is **not surfaced in any component** today (no `bio` reference under `components/`). When it is wired, it must render as JSX text or via the escaping markdown renderer — flag for whoever adds it.
- **Notes/day-notes are localStorage-only, per-device** (`components/dropdown/NotesBox.tsx`, `pd_notes_*`, `pd_token_notes`). They are not stored server-side or shown on other users' screens, so even if the renderer had a hole, it would be self-XSS only — not a stored/cross-user vector.

**Conclusion:** the stored-XSS-via-UGC concern is REFUTED for the current codebase. The escaping renderer + JSX-text rendering + local-only notes close it.

---

## Art render pipeline — REFUTED (no injection, no eval, no sandbox needed)

Audited `lib/art/rng.ts`, `lib/art/engines/{prisms,prismsCore,magicHour,oracle}.ts`, `lib/art/engines/ai/*`, `lib/art/outputColor.ts`, and every call site.

1. **Canvas, not SVG/HTML strings.** Every engine paints via the Canvas 2D context (`prismsCore.ts:150-163`, `oracle.ts:225,366-374`, `magicHour.ts:137-139`, `ai/core.ts` `getContext('2d')` throughout, `ai/index.ts:28-35`). No engine builds an SVG or HTML string; the only `createElement` is `createElement('canvas')` (`ai/index.ts:28`); all `drawImage` calls are canvas→canvas. Nothing markup-shaped reaches the DOM, so sanitization is moot.
2. **No code execution.** Repo-wide search of the art pipeline found NO `eval(`, `new Function`, `Function(`, runtime `import()`, or `createElement('script')`. The `import(...)` hits in `lib/state/TraitsContext.tsx:137-139` are type-only.
3. **Sandbox.** Art renders in the main app DOM (no `<iframe sandbox>`). This is acceptable HERE because the engines are first-party compiled TypeScript with no untrusted-code path — fundamentally unlike fxhash/Art Blocks, which execute artist-uploaded JS and therefore must sandbox. PD does not upload/execute artist scripts.
4. **Input surface.** The only input to every engine is a numeric `tokenId` (`lib/project/types.ts:71-78`, `registry.ts:236-244`), hardened with `tokenId >>> 0` then a Knuth hash before any math (`rng.ts:23-25`). No trait string, metadata blob, or owner-supplied value ever reaches the RNG or a draw call — traits flow OUT of the seed, never in. Not attacker-controllable.

**Verdict:** the generative-art surface has no client-side code-exec or markup-injection risk. Should PD ever move to artist-supplied/uploaded render scripts, this verdict reverses and an `<iframe sandbox>` + strict CSP becomes mandatory.

---

## F1 — MED · M2 PARTIALLY FIXED: headers present, but no script CSP

- **Where:** `next.config.mjs:13-33` now ships, on every response: `X-Frame-Options: SAMEORIGIN`, `Content-Security-Policy: frame-ancestors 'self'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, and a locked `Permissions-Policy`.
- **What changed vs the master audit's M2:** M2 said "no HTTP security headers." That is now stale — clickjacking (frame-ancestors/X-Frame-Options), MIME-sniff, HSTS, referrer, and permissions ARE covered. **Correct the M2 status to PARTIAL.**
- **The remaining gap:** the CSP is `frame-ancestors 'self'` ONLY — there is **no `default-src`/`script-src`** (the code comment at `:7-12` says a blocking script CSP is deferred to avoid breaking wallet/3rd-party scripts). So there is no backstop against a future HTML-injection bug, no `connect-src` allowlist, no inline-script restriction.
- **Severity:** MED. Today the app has no live XSS hole (see above), so the missing script CSP is a defense-in-depth gap, not an active exploit. It becomes load-bearing the moment any future `dangerouslySetInnerHTML` or rendered-HTML path takes untrusted input.
- **Fix:** add a tuned `script-src`/`default-src`/`connect-src`/`object-src 'none'`/`base-uri 'none'` CSP. Wallet libraries (wagmi/WalletConnect) generally work with a nonce/strict-dynamic CSP plus `connect-src` for the RPC/WC relay endpoints; this needs one tuning pass against the live preview, not avoidance.

---

## F2 — MED · Cloudflare Pages migration will DROP every security header

- **Where:** all headers live in `next.config.mjs` `headers()` (`:13-33`); there is **no `public/_headers` file and no `wrangler`/CF config** in the repo today.
- **Impact:** Next.js `headers()` is a Vercel/Node-server feature. On the Cloudflare Pages adapter, `next.config.mjs` `headers()` is **not reliably honored** — static/edge responses are served by CF's pipeline, which reads a `public/_headers` (or `_redirects`) file instead. After the move, the clickjacking/HSTS/nosniff/referrer/permissions protections added for M2 **silently disappear** unless replicated. `middleware.ts` also behaves differently on the CF adapter (runs as a Pages Function / Edge runtime with its own constraints) — confirm the rate-limiter middleware still executes post-migration.
- **Severity:** MED — it's a regression that happens automatically and invisibly during the platform move; the protections look present in the repo but won't ship.
- **Fix:** before/with the CF migration, add a `public/_headers` file mirroring the six headers (and the eventual CSP), and verify `middleware.ts` runs under the CF Pages adapter. Treat the header set as platform-portable config, not Vercel-only.

---

## F3 — LOW · L5 CONFIRMED: `data-external` handlers open `href` without re-checking scheme

- **Where (current lines):**
  - `components/NotePromptModal.tsx:213-220` — onClick reads `target.closest('a[data-external]')` then `window.open((target as HTMLAnchorElement).href, '_blank', 'noopener,noreferrer')`. No scheme check on `href`.
  - `components/CalendarPanel.tsx:229` — identical pattern, same missing check.
- **Why it is NOT independently exploitable today:** the only producer of `data-external` anchors is `renderNoteMarkdown()`'s linkifier (`lib/calendar/utils.ts:80-83`), which (a) escapes `<>"&` and (b) matches **only** `https?://…`. So a `javascript:`/`data:` href cannot be injected into the rendered DOM in the first place. The handler's missing check is purely a redundancy gap — IF a future code path ever creates a `data-external` anchor from a different (un-validated) source, these handlers would open whatever scheme it carries.
- **Note — the shell's global handler DOES re-check** (`components/shell/PriceOSShell.tsx:180`: `if (!/^https?:\/\//i.test(href)) return;`), so the centralized standalone-PWA interceptor is already guarded. The two modal handlers are the inconsistent ones.
- **Severity:** LOW (defense-in-depth).
- **Fix:** in both modal handlers, gate on scheme before opening: `if (!/^https?:\/\//i.test(href)) return;` — mirroring the shell handler. One line each.

---

## F4 — LOW · Alchemy API key ships in the client bundle

- **Where:** `NEXT_PUBLIC_ALCHEMY_API_KEY` / `NEXT_PUBLIC_ALCHEMY_RPC_URL` are referenced in client-reachable code (`app/api/price/[address]/route.ts:30-34`, `app/api/gas/route.ts:62-63`, `app/api/rpc-ping/route.ts:51-52`) and, being `NEXT_PUBLIC_`, are embedded in the browser bundle.
- **Impact:** anyone can extract the key from the JS and burn the Alchemy compute budget (denial-of-wallet on the API quota). The Supabase **anon** key is also public but that is by design (RLS-gated). No service-role key, no Discord secret, no private key is client-exposed (corroborated by `docs/security/findings/05-data-rls-secrets.md:73-74`).
- **Severity:** LOW — known/accepted, and it's an Alchemy-side budget concern, not a session/data breach. "Cost" here would be real Alchemy spend if abused.
- **Fix (optional):** proxy Alchemy strictly through the server routes and stop exposing the raw key client-side, or set an Alchemy domain/referrer allowlist + spend cap on the key. Not urgent pre-mainnet.

---

## F5 — INFO · Client-trust of localStorage (= C1, already tracked)

The `lib/pins/*` stores (`starStore`, `wishlistStore`, `albumStore`, `grailStore`, `userShowcaseStore`, etc.) persist curation state to **localStorage**, and that same shape is written to the server `settings` blob and **counted directly by the scoring engine** — this is exactly the master audit's **C1** (self-grant the curation category). No NEW client-trust path beyond C1: the SIWE session is server-verified (httpOnly encrypted cookie), and ownership/badge decisions key on the session wallet, not on any localStorage value. Wallet signature-request surface is sound: the SIWE message is built client-side (`lib/wallet/siweClient.ts:65-76`) but the **server re-verifies domain + nonce** (`app/api/auth/siwe/route.ts:23-24`, `verifySiweMessage`), so a phishing origin cannot forge a valid session. Statement string is a fixed constant — no user-controlled text in the signed message.

---

## Status corrections to the master audit (`SECURITY_AUDIT_2026-06-14.md`)

- **M2** ("No HTTP security headers") → **change to PARTIAL FIX.** Six headers are now live in `next.config.mjs:13-33`; only the `script-src` CSP remains absent. See F1.
- **L5** ("`data-external` handler opens DOM href without re-checking scheme") → **CONFIRMED still present** at `NotePromptModal.tsx:213-220` and `CalendarPanel.tsx:229`; downgraded in practice to defense-in-depth because the only href producer is `https?://`-only. See F3.
- The master audit's line-100 claim "XSS surfaces closed" is **CONFIRMED accurate** with the current code.
- **New, not in master audit:** F2 (headers won't survive the Cloudflare Pages move).

---

## Prioritized client-side fixes

1. **F2** — add `public/_headers` (mirror the six headers + future CSP) and verify `middleware.ts` runs before/with the Cloudflare Pages migration. *Otherwise M2's protections silently vanish on the move.*
2. **F1** — add a tuned `script-src`/`default-src`/`connect-src` CSP (one tuning pass vs the live wallet scripts). Closes the last piece of M2.
3. **F3** — add the `^https?://` scheme guard to the two modal `data-external` handlers (one line each). Closes L5 fully.
4. **F4** — (optional) proxy Alchemy server-side or domain-lock + cap the key.

*No app code was changed in producing this audit.*
