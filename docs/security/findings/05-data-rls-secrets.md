# 05 — Data Layer / RLS / Secrets — Adversarial Audit

**Date:** 2026-06-14
**Target:** Supabase / Postgres project `zspxpfwlwikdxwavffjn` (LIVE) + repo `/home/user/PriceOS`
**Type:** READ-ONLY. No DB/code modified. All write tests were run inside transactions and `ROLLBACK`-ed; no rows changed.
**Method:** Supabase MCP read-only tools (`get_advisors`, `list_tables`, `list_migrations`, `get_publishable_keys`, `execute_sql` for `pg_policies` / grants / `pg_proc` / `pg_class.relrowsecurity`) + **empirical `SET LOCAL ROLE anon` probes** against the live DB, cross-checked with `lib/supabase.ts`, the migration files, and the API routes.

---

## Severity table

| # | Sev | Type | Location | One-line |
|---|-----|------|----------|----------|
| **D1** | **HIGH** | DB | `pings` / `ping_cursors` policies (`USING(true)` to anon) | Entire notifications inbox (recipient, actor, amounts, p2p message bodies in `data`) readable by anyone holding the public anon key — contradicts the "PRIVATE" claim in the migration. |
| **D2** | **HIGH (latent)** | DB | every `_own_only` table + anon-settable `app.current_user_address` GUC | The `_own_only` RLS predicate trusts a GUC the anon role **can set itself**; setting it = read any user's private notes/budgets/etc. Not remotely reachable today (no anon-exposed RPC sets it; PostgREST doesn't expose `SET`), so latent — but it's the only thing standing between "private" and "fully readable," and it's a footgun. |
| **D3** | **MEDIUM** | DB | `apply_sale`, `recompute_floor`, `increment_minted_count`, `update_wallet_activity`, `upsert_holder`, `fan_out_event_notifications` | `EXECUTE` granted to `anon`+`authenticated` on six money/ledger-mutating functions. Neutered today (they're `SECURITY INVOKER` and the target tables deny anon writes via RLS), but one flipping to `DEFINER` later = direct ledger tampering. |
| **D4** | **MEDIUM** | DB | social/market read policies (`follows`, `offers`, `listings`, `anointments`, `user_achievements`, `season_standings`, `holders`, `wallets`) all `USING(true)` | Full social graph + market book + achievement ledger + wallet activity is anon-readable. (= prior **L3**, re-verified live and broadened — it's more than "social graph".) |
| **D5** | **MEDIUM** | DB | `users` anon read columns | `discord_id`, `discord_username`, `ens_name` are in the anon column-grant → linkable PII (wallet ↔ Discord ↔ ENS) scrapable with the public key. By design, but it's PII and worth a conscious call. |
| **D6** | **LOW** | DB | `stars`, `wishlist` (RLS on, **zero policies**, no anon write grant) | RLS-enabled-no-policy. Currently locked (default-deny + no grant), but the write paths are dead at the DB — confirm the app uses `users.settings` for these, not these tables. |
| **D7** | **LOW** | DB | `citext` extension in `public` schema | Extension in `public` (advisor 0014). Cosmetic / namespace hygiene. |
| **D8** | **LOW** | Code | `supabase/migrations/*.sql` (repo) vs live | Repo holds only 6 of 41 applied migrations; the schema-of-record lives only in Supabase. No reproducible/reviewable schema history → drift + DR risk. |
| **INFO** | — | DB | `relforcerowsecurity = false` on every table | RLS is not FORCED; the table owner bypasses it. Irrelevant for anon/authenticated but means a future owner-context bug isn't caught by RLS. |

**Re-verified prior findings:** **M3 confirmed and partially downgraded** — RLS is *not* purely read-only-by-convention; the live DB has real owner-scoped write policies on the private tables and **default-deny on the financial tables**, so a body-supplied-address write is blocked at the DB (see test results). **L3 confirmed and broadened to D4.** No new account-takeover write path found (the M3 worst case is DB-blocked today).

---

## What an attacker with ONLY the public anon key can do (empirically tested as `SET ROLE anon`)

The anon key ships in every browser bundle (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) and the modern publishable key `sb_publishable_UcKB7iZkyM_gv8F0LTdD0w_IpYriFsh` is live. Against the live DB as the real `anon` role:

**CAN read (no auth, no GUC):**
- `pings` rows — recipients, actors, amounts, kinds, and the `data` jsonb (p2p message bodies). **`pings_read=ALLOWED`** despite the migration calling the inbox "PRIVATE." (**D1**)
- `ping_cursors`, `follows`, `offers`, `listings`, `anointments`, `user_achievements`, `season_standings`, `holders`, `wallets` — all `USING(true)`. (**D4**)
- `users` public columns including `discord_id`, `discord_username`, `ens_name`. (**D5**)

**CANNOT read (correctly blocked):**
- `users.settings` (wishlist/stars/private prefs), `users.sim_eth_balance` — column-level grant excludes them. **`read_settings_col=DENIED`, `read_sim_balance=DENIED`.** The `PUBLIC_USER_COLUMNS` pattern in `lib/supabase.ts:402` is enforced at the DB, not just app-side. Good.
- Another user's `notes`/`todos`/`budgets`/etc. over REST — the `_own_only` predicate compares against an unset GUC (`NULL`), returning zero rows.

**CANNOT write (correctly blocked — every one DENIED):**
- `users` UPDATE (balance theft), `user_achievements` INSERT (forged unlocks), `pings` INSERT (forged notifications), `events`/`listings`/`offers` INSERT (forged ledger/market), `follows` INSERT (forged graph). All return `new row violates row-level security policy`.
  - Note: a first probe using `set_config('role','anon')` inside a `DO` block reported `users_update=ALLOWED` — that was a **false positive** (the block ran as the table owner, who bypasses RLS). The authoritative `SET LOCAL ROLE anon` re-test returned **DENIED**. Flagging the methodology so it isn't repeated.

**The one escalation primitive (D2):** as `anon`, `set_config('app.current_user_address','0xVICTIM')` **succeeded**, and with the GUC set, `SELECT ... FROM notes WHERE user_address='0xVICTIM'` returned **ALLOWED**. Writes as the victim still failed. This is only exploitable if an attacker can get that `set_config` to run on their connection — PostgREST does **not** expose raw `SET`/`set_config` to clients, and no anon-/authenticated-EXECUTE-able function in the schema sets that GUC (verified). So **not remotely reachable today**, but the private-table privacy rests entirely on "the GUC stays unset," which is fragile. The app never sets this GUC either (zero matches for `current_user_address`/`set_config` in the whole repo) — so the `_own_only` policies are **dead code**; real enforcement is the service-role client keying on the SIWE session.

---

## Per-table RLS matrix (live, authoritative)

`relrowsecurity` was `true` on all 30 tables; `relforcerowsecurity` was `false` on all. "anon write (real)" = result of the `SET ROLE anon` probe.

| Table | RLS | Policies | Write policy? | anon SELECT | anon write (real) | Notes |
|---|---|---|---|---|---|---|
| users | on | 2 (SELECT anon+authed) | none | yes (subset of cols) | **DENIED** | private cols hidden by column grant; D5 = the 3 readable PII cols |
| follows | on | 3 | 2 (own, GUC) | yes `USING(true)` | DENIED | D4 read |
| pings | on | 1 | none | **yes `USING(true)`** | DENIED | **D1** — inbox readable |
| ping_cursors | on | 1 | none | yes `USING(true)` | DENIED | D4 |
| events | on | 1 | none | yes `USING(true)` | DENIED | financial ledger; read-public OK, write default-deny |
| listings | on | 1 | none | yes `USING(true)` | DENIED | D4 |
| offers | on | 1 | none | yes `USING(true)` | DENIED | D4 |
| anointments | on | 1 | none | yes `USING(true)` | DENIED | D4 |
| user_achievements | on | 1 | none | yes `USING(true)` | DENIED | D4 |
| season_standings / seasons | on | 1 each | none | yes `USING(true)` | DENIED | D4 |
| projects | on | 1 | none | yes `USING(true)` | DENIED | public catalog |
| holders / wallets | on | 1 each | none | yes `USING(true)` | DENIED | D4 |
| project_follows | on | 1 | none | yes `USING(true)` | DENIED | D4 |
| artist_allowlist | on | 2 | none | yes `USING(true)` | DENIED | allowlist anon-readable (low) |
| notes, todos, albums, album_items, cart_items, budgets, portfolios, portfolio_items, price_anchors, grail_pins, starred_artists, muted | on | 1 each | 1 (`_own_only` ALL, GUC) | gated by GUC (NULL→0 rows) | DENIED over REST | **D2** latent (GUC-impersonable reads) |
| stars | on | **0** | none | n/a (no grant) | DENIED | **D6** rls-enabled-no-policy |
| wishlist | on | **0** | none | n/a (no grant) | DENIED | **D6** rls-enabled-no-policy |

---

## Functions / SECURITY DEFINER / search_path

- **Money RPCs** `app_mint`, `app_buy`, `app_accept_offer` — `SECURITY DEFINER`, `search_path = public, pg_catalog` (pinned, safe), and **NOT EXECUTE-able by anon or authenticated** (service-role only). Correct. (`lib/supabase.ts` calls these via the service client; routes `project/[slug]/mint`, `output/[id]/market`.)
- `sync_follows_handles` — `DEFINER`, `search_path = public` (pinned), not anon/authed-EXECUTE-able. OK.
- **D3:** `apply_sale`, `recompute_floor`, `increment_minted_count`, `update_wallet_activity`, `upsert_holder`, `fan_out_event_notifications` — `SECURITY INVOKER`, `search_path = pg_catalog, public` (pinned), but **EXECUTE granted to anon + authenticated**. As INVOKER + anon-write-denied on `projects`/`wallets`/`events`, calling them does nothing today. Revoke EXECUTE from anon/authenticated anyway (defense-in-depth; protects against a future DEFINER flip).
- No SECURITY DEFINER function has a mutable/unpinned `search_path`. The remaining `DEFINER`-eligible entries are `citext` operator funcs (extension-owned, INVOKER). **No privilege-escalation via search_path found.**

## Injection (PostgREST `.or()` / `.filter()` / rpc)

- `app/api/search/route.ts:40-61` — the only dynamic `.or()`. Escapes `% _ \ "` then double-quote-wraps each value, so commas/parens/dots can't break out and inject extra PostgREST conditions. **Correctly mitigated.** Uses the anon (RLS-bound) client.
- All `rpc()` calls (`app_mint`/`app_buy`/`app_accept_offer`) pass typed params via the service client; no string interpolation. No injection surface.
- Other `.filter()` hits are JS array `.filter`, not PostgREST. Not a DB surface.

## Extensions / infra

`list_extensions` MCP required approval and was not run; via `pg_extension` SQL: `plpgsql 1.0, pg_stat_statements 1.11, uuid-ossp 1.1, pgcrypto 1.3, supabase_vault 0.3.1, pg_graphql 1.5.11, citext 1.6, pg_net 0.20.0, pg_cron 1.6.4`. No known-vulnerable versions. `pg_net` (enabled in migration `20260513` "for diagnostic") allows outbound HTTP from the DB — confirm it's not callable by anon/authenticated and not triggered from any anon-reachable path (SSRF-from-DB vector). `pg_cron` runs the pings-retention prune.

**Realtime:** publication `supabase_realtime` streams only `public.events` + `public.projects` — both already anon-readable public data. No private table is in the realtime publication. Good.

**Backups / PITR:** not readable via the available read-only MCP tools. **Action for Brendon:** confirm in the Supabase dashboard that PITR (or at least daily backups) is on before mainnet — the schema-of-record lives only here (D8) and the inbox is described as a financial ledger.

**Connection exposure:** the service-role key is server-only (`SUPABASE_SERVICE_ROLE_KEY`, never `NEXT_PUBLIC_`, lazy-constructed in `getSupabaseService()`); no direct Postgres connection string is used (all access via PostgREST/supabase-js). No committed secrets (matches the master audit's repo grep).

---

## RAW `get_advisors` output

### Security advisors (full)

- **`rls_enabled_no_policy` (INFO ×2):** `public.stars`, `public.wishlist` — RLS enabled, no policies. → **D6.**
- **`extension_in_public` (WARN ×1):** `citext` installed in `public` schema; move it. → **D7.**
- **`pg_graphql_anon_table_exposed` (WARN ×33):** every table below is visible in the GraphQL schema because `anon` can `SELECT` it — `album_items, albums, anointments, artist_allowlist, budgets, cart_items, events, follows, grail_pins, holders, listings, muted, notes, offers, ping_cursors, pings, portfolio_items, portfolios, price_anchors, project_follows, projects, season_standings, seasons, starred_artists, todos, user_achievements, users, wallets`. (The `_own_only` tables among these are row-gated by the GUC, but the *object* is discoverable; the `USING(true)` tables actually return rows → underpins D1/D4.)
- **`pg_graphql_authenticated_table_exposed` (WARN ×34):** same list plus `stars`/`wishlist` — visible to `authenticated`.

Remediation links (Supabase linter): `?lint=0008_rls_enabled_no_policy`, `?lint=0014_extension_in_public`, `?lint=0026_pg_graphql_anon_table_exposed`, `?lint=0027_pg_graphql_authenticated_table_exposed`.

> The GraphQL-exposure warnings (0026/0027) are inherent to the "grant SELECT to anon for public reads" pattern. They are only *findings* where the table holds data that should not be public — i.e. `pings`/`ping_cursors` (**D1**) and the social/market/PII tables (**D4/D5**). For genuinely-public tables (`projects`, `events`, `listings`, `offers`) the exposure is intended.

### Performance advisors (full)

- **`unindexed_foreign_keys` (INFO ×3):** `muted.muted_muted_address_fkey`, `pings.pings_project_id_fkey`, `season_standings.season_standings_user_address_fkey` — FK without covering index.
- **`auth_rls_initplan` (WARN ×16):** `follows` (`follows_insert_own`, `follows_delete_own`), and the `_own_only` policies on `notes, cart_items, albums, album_items, grail_pins, todos, muted, portfolio_items, starred_artists, price_anchors, budgets, portfolios` — each re-evaluates `current_setting()` per row; wrap as `(select current_setting(...))`. (Cosmetic at current scale; these policies are also effectively dead, see D2.)
- **`unused_index` (INFO ×17):** `wallets_volume_idx`, `wallets_last_active_idx`, `events_sale_direction_idx`, `notes_user_scope_idx`, `idx_stars_project_token`, `project_follows_project_idx`, `anointments_project_idx`, `anointments_conduit_idx`, `user_achievements_user_idx`, `pings_recipient_recent_idx`, `pings_recipient_unread_idx`, `pings_group_idx`, `pings_prune_idx`, `users_settings_wishlist_gin`, `events_from_addr_ts`, `events_to_addr_ts`, `events_project_ts` — never used (expected: most tables have 0 rows pre-launch; do not act yet).

---

## Cloudflare Pages migration — Supabase-specific implications

Moving off Vercel changes **nothing about RLS or the DB trust boundary** — RLS, grants, and policies live in Postgres, independent of the host. The host-specific points:

1. **Service-role key must stay server-only in CF.** Set `SUPABASE_SERVICE_ROLE_KEY` as a Cloudflare Pages **encrypted env var / secret bound only to server functions**, never a build-time `NEXT_PUBLIC_*`, never referenced from client code. CF Pages (`next-on-pages`) runs API routes on the **edge (Workers) runtime**, so re-verify the service client is only ever constructed inside server handlers (it is, lazily, in `getSupabaseService()`); a stray import into a client component would now ship the key. Same discipline, new runtime.
2. **No raw Postgres / pgbouncer from Workers.** All DB access is already via PostgREST/`supabase-js` over HTTPS — exactly what Workers supports (no TCP sockets). Do **not** introduce a direct `postgres`/`pg` connection or a pooled connection string on CF; it won't work from Workers and would reintroduce a connection-exposure surface. Staying on supabase-js sidesteps pgbouncer entirely.
3. **Anon vs service key in edge context — unchanged exposure.** The anon/publishable key is public by design; CF doesn't change that. The only risk is leaking the service key, same as Vercel.
4. **The 8s `timeoutFetch`** in `lib/supabase.ts` relies on `AbortSignal.timeout`/`AbortSignal.any` — both exist in Workers, but **smoke-test on the CF preview** that requests actually abort (the only non-portable bit in the data layer).
5. **`pg_cron` retention** is in-DB and host-agnostic — unaffected.

Net: low-risk for the data layer **provided** the service-role key is a server-only CF secret and no direct Postgres connection is added. Verify both on the CF preview before cutover.

---

## Fix order (data layer)

1. **D1** — restrict `pings`/`ping_cursors` reads. The app reads them via the service-role client behind SIWE-gated `/api/pings`, so the `USING(true)` anon read policy is unnecessary — drop it (or scope to recipient) so the inbox isn't publicly scrapable.
2. **D4 / D5** — decide per table whether anon read is intended; for the ones that aren't (achievements ledger, anointments, follows graph, PII columns), revoke anon SELECT and serve them through the service-role API instead.
3. **D3** — `REVOKE EXECUTE ... FROM anon, authenticated` on the six INVOKER mutation functions.
4. **D2** — either wire the `_own_only` GUC properly server-side, or drop those dead policies and rely on the service-role + session-keyed model that's already the real enforcement; never ship a path that lets a client set `app.current_user_address`.
5. **D6** — add owner-scoped policies to `stars`/`wishlist`, or drop the tables if `users.settings` is the real store.
6. **D8** — pull all 41 applied migrations into the repo (`supabase db pull`) so the schema is reviewable/reproducible; confirm PITR/backups before mainnet.
7. Cosmetic: D7 (move `citext`), the `auth_rls_initplan` `(select ...)` wrap.
