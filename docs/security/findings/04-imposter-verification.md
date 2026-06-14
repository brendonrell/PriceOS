# 04 — Identity Integrity / Artist Impersonation Audit

**Date:** 2026-06-14
**Auditor:** Senior security auditor (identity-integrity focus)
**Scope:** Verification/artist badge, handle squatting/takeover, homoglyph/unicode
spoofing, profile copycat, project-handle impersonation, address-confusion in
identity lookups.
**Type:** Read-only. No app code, specs, or config modified. Findings derived by
reading the actual files, not inference.

---

## VERDICT (the founder's #1 fear, answered directly)

**Can an attacker obtain a verification/artist badge they shouldn't? — NO.**
The artist badge is NOT a database flag and is NOT client-settable. It is derived
entirely from the `artist_allowlist` table, which is read-only from the entire app
surface: **no API route, no SIWE action, no client path ever INSERTs/UPDATEs/
UPSERTs `artist_allowlist`** (verified by grepping every write in `app/api`). The
`users` table has **no `verified`, `is_artist`, or `badge` column at all**
(`lib/supabase.ts` `UserRow`), so there is nothing for `/api/me` or `/api/users/
create` to flip. To get the badge you must be added to the allowlist out-of-band
(today: manual DB insert by Brendon; on mainnet: the PDFactory whitelist). This is
the correct design and it holds.

**Can an attacker steal/squat a real artist's HANDLE? — NO (takeover) / mostly NO
(squat).** Handles are unique at the DB (`citext UNIQUE`), are immutable after
claim (`/api/users/create` returns `already_claimed` on any change), and the
claim is bound to the SIWE session wallet. You cannot take a handle already held,
and you cannot change yours to a victim's. The residual squat risk is the absence
of a name-confusability ("skeleton") check — see M1.

**Can an attacker VISUALLY impersonate an artist? — YES, partially, and this is
the real exposure.** The **display name (`ens_name`) is free-text, user-settable
through `PATCH /api/me` with no ownership check, no charset restriction, no
uniqueness, and no homoglyph/unicode normalization.** An attacker can set their
profile's display label to a real artist's exact ENS / name (or a Cyrillic-
homoglyph version), giving a convincing copycat profile. The wallet/handle differ,
but the prominent label a visitor reads can be identical. See H1 (the headline
finding).

---

## Severity table

| # | Sev | Threat | File:line | Exploitable today? |
|---|-----|--------|-----------|--------------------|
| H1 | **HIGH** | Display-name (`ens_name`) spoofing — claim any artist's name; no ownership/homoglyph/uniqueness check | `app/api/me/route.ts:81-87` · `lib/supabase.ts:160-171` | YES (dev) |
| M1 | MED | Handle squatting via confusable look-alikes — no skeleton/homoglyph collision check on claim | `lib/handle/validate.ts:46-76` · `app/api/users/create/route.ts` | YES (dev) |
| M2 | MED | Reserved-handle list has gaps (`official`, `mod`, `verified`, `root`, real artist names) | `lib/reserved-handles.ts:62-106` | YES (dev) |
| M3 | MED | Homoglyph search poisoning — spoofed `ens_name` is searchable, surfacing copycats in user search | `app/api/search/route.ts:57-59` | YES (dev) |
| L1 | LOW | Project-handle pool shares users.handle but bare project-slug-at-root T4 reservation is a static 2-entry set | `lib/slug.ts:42-45` | Partial |
| L2 | LOW | Two profiles may share an identical `ens_name` (no uniqueness) — copycat enabler, downstream of H1 | `lib/supabase.ts` (no constraint) | YES (dev) |
| INFO | — | Artist-status helpers (`getArtistStatus`, `artistGlyph`) are partly dead/duplicated; `/artists` reads the live allowlist correctly | `lib/data/artistStatus.ts`, `lib/artists/allowlist.ts` | n/a |

**No CRITICAL.** The badge itself cannot be forged (verdict above). The exposure is
visual impersonation via the unconstrained display name, not badge theft.

---

## Detail

### H1 — HIGH · Display name (`ens_name`) is unconstrained, user-settable, unverified

**Where:** `app/api/me/route.ts:81-87` (the PATCH handler's `sanitisePatch`):

```ts
if ('ens_name' in body) {
    const v = body.ens_name;
    if (v !== null && !(typeof v === 'string' && v.length > 0 && v.length <= 255)) {
        return { ok: false, reason: 'ens_name must be a non-empty string (max 255) or null' };
    }
    patch.ens_name = v === null ? null : (v as string);   // ← stored verbatim
}
```

`ens_name` is in `PUBLIC_USER_COLUMNS` (`lib/supabase.ts:402-403`) and is rendered
as the **primary identity label** on the profile (`components/profile/
ProfilePageBody.tsx:178-180, 756-757` → `viaLabel`) and in user search results
(`app/api/search/route.ts:57`).

**What's missing:** the only validation is "non-empty string ≤ 255 chars."
There is:
- **no ownership check** — the server never verifies the SIWE wallet actually owns
  that ENS. (The Settings UI only offers on-chain-resolved ENS as pills via
  `lib/engines/ensEngine.ts`, but that is a *client-side cosmetic restriction*; the
  API accepts any string. An attacker bypasses the UI and POSTs directly.)
- **no charset / unicode filter** — Cyrillic `а`/`е`/`о`, Greek lookalikes,
  zero-width chars (U+200B/U+200C/U+FEFF), combining marks, and RTL override
  (U+202E) all pass.
- **no normalization** (no NFC, no confusable folding).
- **no uniqueness** (see L2) — N profiles can carry the identical label.

**Exploit walkthrough:**
1. Attacker connects any wallet, completes SIWE, claims any unrelated handle (e.g.
   `@xc0py`) via `/api/users/create`.
2. Attacker sends `PATCH /api/me` with `{"ens_name":"xcopy.eth"}` (or
   `{"ens_name":"хcopy.eth"}` using Cyrillic х) — owning no such ENS.
3. The attacker's profile now renders **`xcopy.eth`** as its headline identity,
   appears under that name in search, and is a plausible copy of the real artist.
   A casual visitor reading the big label is deceived; the differing wallet/handle
   are secondary cues most users won't check.

**Why it matters:** this is *exactly* the founder's stated fear ("visually
impersonate an artist") realized through the one identity field that is both
prominent and unconstrained. The badge is safe; the *name shown next to where the
badge would be* is not.

**Fix (in priority order):**
1. **Verify ENS ownership server-side** before storing: on PATCH, reverse-resolve
   the claimed `ens_name` on-chain (viem `getEnsAddress`) and reject unless it
   maps to the session wallet. Store only verified ENS. This is the real fix and
   matches the "on-chain = source of truth" doctrine.
2. If full verification is deferred, at minimum: restrict `ens_name` to a strict
   charset (ASCII or an explicit allowed-script set), reject zero-width/combining/
   bidi-control codepoints, NFC-normalize, and run a confusable-skeleton check
   against existing allowlisted-artist names/handles, rejecting near-collisions.
3. Display-side defense-in-depth: render display names with a confusable/
   mixed-script warning indicator, and never present an unverified `ens_name`
   with the same visual weight as a verified one.

---

### M1 — MEDIUM · Handle squatting via confusable look-alikes (no skeleton check)

**Where:** `lib/handle/validate.ts:46-76` + claim path `app/api/users/create/
route.ts`. Format allows `^[a-z0-9][a-z0-9_-]{2,19}$`. Uniqueness is exact-match
`citext` only.

**Issue:** handles are ASCII-only (good — no Cyrillic squat *inside* a handle), but
there is no *confusability* check across the visually-equivalent ASCII space:
`@xcopy` vs `@xc0py` (zero-for-o), `@xcopy` vs `@xcopy_`, `@snowfro` vs
`@snowfr0`, `@brendon` vs `@brendоn` is blocked (Cyrillic rejected) but `@brend0n`
is not. A squatter can register the look-alike before the real artist does, or
alongside them, and pair it with the H1 display-name spoof for a complete copy.

**Exploit:** register `@xc0py`, then `PATCH ens_name` to `XCOPY` (H1). Two
independent cheap steps produce a convincing fake on a distinct-but-confusable
handle.

**Fix:** on claim, compute a confusable skeleton (digit-folding `0→o 1→l 5→s`,
strip `_`/`-`, Unicode confusable map) and reject if it collides with an existing
handle OR any allowlisted-artist handle. Reserve confusable variants of
allowlisted-artist handles at claim time.

---

### M2 — MEDIUM · Reserved-handle list gaps

**Where:** `lib/reserved-handles.ts:62-106`.

The list covers system/brand/route words and is reasonable, but **missing
authority-impersonation words** that a fake would want: `official`, `mod`, `mods`,
`moderator`, `verified`, `root`, `system`, `owner`, `pd-team`, `pdteam`,
`announcements`, `billing`, `security`. (`admin`, `staff`, `support` ARE present —
good.) Also, **real allowlisted-artist handles are not auto-reserved** against
claim by non-owners (the T4 "live project slug join" is still a static stand-in,
and there is no equivalent artist-handle reservation), so a squatter can claim a
not-yet-registered real artist's handle.

**Exploit:** claim `@official` or `@verified` → instant authority cosplay; or
claim a famous artist's handle before they sign up.

**Fix:** add the authority words above to `RESERVED_T2`/`RESERVED_T3`; and wire the
allowlist so every allowlisted artist's intended handle is reserved to their wallet
even before they claim it (block the handle for everyone else).

---

### M3 — MEDIUM · Homoglyph search poisoning

**Where:** `app/api/search/route.ts:57-59` searches `ens_name`, `handle`, `address`
with `ilike`. Because `ens_name` is unconstrained (H1), a spoofed homoglyph display
name is **indexed and returned in search**, so a user searching for the real artist
can be shown the copycat in the same result set.

**Fix:** falls out of H1 — once `ens_name` is verified/normalized, this closes.
Interim: rank verified-ENS / allowlisted artists above free-text matches and flag
mixed-script results.

---

### L1 — LOW · Project-slug T4 reservation is a static stand-in

**Where:** `lib/slug.ts:42-45` — `PROJECT_SLUGS` is a hardcoded 2-entry set
(`prisms`, `oracle`). `app/api/project-handle/check/route.ts` *does* correctly
check uniqueness across **both** `users.handle` and `projects.handle` (the shared
`/@name` pool), and `projects.handle` is `citext UNIQUE` (`supabase/migrations/
20260614_pricerank_social.sql:18`), so live project-name takeover is blocked at the
DB. The gap is only the bare-root-slug *reservation* set being static until the
indexer join lands — low impact today (no end-user write path creates projects yet;
project creation is on-chain/allowlist-gated).

**Fix:** replace the static set with the live `projects.handle` join when the
indexer is wired (already the documented plan).

---

### L2 — LOW · `ens_name` has no uniqueness constraint

Two profiles can store the identical `ens_name`. This is the DB-level enabler that
makes the H1 copycat indistinguishable in lists. Downstream of H1; resolving H1
(verified ENS) makes duplicates legitimate (one ENS → one owner) so a UNIQUE
constraint on verified ENS becomes safe to add.

---

### INFO — Dead/duplicated artist-status helpers (not a vulnerability)

`lib/data/artistStatus.ts` hardcodes a static `@XCOPY`/`@snowfro`/`@claude` glyph
map and `lib/artists/allowlist.ts` exposes `getArtistStatus`/`getAllowlistedArtists`.
`getArtistStatus`, `artistGlyph`, and `artistGlyphVS15` have **no consumers** (grep
found none). The live `/artists` page (`app/artists/page.tsx`) correctly reads the
allowlist table via `getAllowlistedArtists()` and derives the active/cooldown glyph
from real cooldown data. No security impact — flagged only so the static stand-in
isn't later mistaken for an authority source. The `ArtistsView` dropdown
(`components/dropdown/ArtistsView.tsx`) renders `MOCK_ARTISTS`, also not an
authority surface.

---

## What is VERIFIED SAFE (so the founder knows the strong parts)

- **Badge cannot be forged.** No `verified`/`is_artist`/`badge` column exists;
  artist status is allowlist-derived and the allowlist is read-only app-wide.
- **No client-supplied address in identity writes.** `/api/me` and
  `/api/users/create` key every write on the SIWE-session wallet
  (`me/route.ts:163-166`, `users/create` via `requireAuth`), never a body address.
  No IDOR on profile writes.
- **Handle is immutable + unique.** Post-claim changes return `already_claimed`
  (`users/create/route.ts:129-145`); `citext UNIQUE` blocks duplicate claims;
  `23505` → `handle_taken`.
- **Handles reject non-ASCII** at format validation (`HANDLE_FORMAT_RE`), so the
  handle *itself* can't be a Cyrillic homoglyph (the display name can — H1).
- **Identity lookups are confusion-safe.** `lib/slug.ts` matches a 40-hex address
  before the handle regex (so an address can't be read as a handle), rejects
  leading-zero numerics, decodes `%40` once, and `/api/artist/[address]` +
  `/api/user/by-handle/[handle]` both regex-validate input. No IDOR/confusion found.
- **SIWE identity is sound** (per baseline audit): nonce single-use, domain-bound,
  address recovered server-side from the encrypted httpOnly cookie.

---

## Recommended fix order

1. **H1** — server-side ENS ownership verification on `PATCH /api/me`
   (the headline; closes M3 and enables L2's fix too). *The one that matters.*
2. **M2** — add authority words + reserve allowlisted-artist handles.
3. **M1** — confusable-skeleton check on handle claim.
4. **L1** — live project-slug join when the indexer lands (already planned).

*No app code was changed in producing this audit.*
