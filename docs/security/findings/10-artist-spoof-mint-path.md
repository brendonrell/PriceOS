# 10 — Artist Spoof → Mint → Sellout Money Path

**Date:** 2026-06-14
**Auditor:** Senior web3 security auditor (adversarial money-path focus)
**Question hunted:** *Can a non-artist impersonate a real/allowlisted artist, get a
PROJECT created and minted, and SELL IT OUT — profiting off a fake identity?*
**Type:** Read-only. No contract, app, spec, or config modified. Findings derived
by reading the deployed contracts, the app routes, and the live Supabase schema
(RLS policies + the `app_mint` function), not by inference.

---

## VERDICT

**On the core money path — spoof a real artist, sell out their drop, pocket the
proceeds — the answer is NO. The path is closed end to end, on both layers.**

- **On-chain project creation is PERMISSIONED.** `PDFactory.createProject` reverts
  for anyone not on the contract's artist whitelist (`PDFactory.sol:211`,
  `if (!whitelistedArtists[artist]) revert ArtistNotWhitelisted()`). The whitelist
  is admin-only (`whitelistArtist`, `onlyAdmin`, `PDFactory.sol:272`). A random
  wallet cannot deploy a Project at all.
- **The artist address is bound immutably to `msg.sender`** at creation
  (`PDFactory.sol:208` → `PDProject.sol:192`, `address public immutable artist`).
  It is never a caller-supplied argument, never has a setter. A spoofer cannot
  stamp a real artist's address onto a project they deployed.
- **100% of primary proceeds are pushed to that immutable artist address inside
  the mint tx** (`PDProject.sol:266`, `_push(artist, artistShare)` = 95%; 5% to
  the factory platform wallet; storage fee to the storage wallet). There is no
  withdraw, no balance, no admin override. A spoofer cannot route a real artist's
  mint money to themselves even if they could deploy.
- **The app cannot be tricked into surfacing a fake on-chain project as a real
  artist's.** The site does NOT read on-chain PDProjects at all yet — display is
  driven entirely by a hardcoded in-repo registry (`lib/project/registry.ts`) and
  a Supabase `projects` table that has **no app write path** (no INSERT/UPSERT in
  any API route; the indexer that would ingest chain events is built but not
  running). There is no "trust the on-chain deployer" display logic to abuse.
- **The artist allowlist cannot be self-served.** `artist_allowlist` has only
  SELECT RLS policies (anon + authenticated) on the live DB — no INSERT/UPDATE/
  DELETE policy exists — and no API route writes it (grepped every service-role
  writer). Entry is out-of-band only (manual DB insert today; PDFactory whitelist
  on mainnet).

**The residual exposure is VISUAL, not financial, and is already documented** in
finding 04 (H1): the free-text display name (`ens_name`) lets an attacker *look*
like a real artist on their own profile. That is a phishing/confusion risk — it
does **not** let them create, attribute, or be paid for a spoofed drop. The
spoof-to-sellout *money* path is not reachable.

---

## Severity table

| # | Sev | Threat | Contract/File:line | Reachable? |
|---|-----|--------|--------------------|-----------|
| — | **PASS** | On-chain project creation is whitelist-gated (permissioned) | `PDFactory.sol:211, 272` | No (blocked) |
| — | **PASS** | Artist address immutable, bound to `msg.sender`, not caller-supplied | `PDFactory.sol:208` · `PDProject.sol:192` | No (blocked) |
| — | **PASS** | Primary proceeds pushed to immutable artist in-tx; spoofer cannot capture | `PDProject.sol:238-268` | No (blocked) |
| — | **PASS** | `artist_allowlist` is read-only app-wide (RLS SELECT-only; no writer) | live RLS · `lib/artists/allowlist.ts` | No (blocked) |
| — | **PASS** | Site shows registry/DB projects only — never raw on-chain deployer | `lib/project/registry.ts` · `app/api/project/*` | No (blocked) |
| L1 | **LOW** | Slug/handle land-grab: a squatter can claim a real artist's intended project @name before they do | `app/api/project-handle/check/route.ts` · `lib/slug.ts:42-45` | Partial (no $ today) |
| L2 | **LOW** | CREATE2/salt front-run is N/A — factory uses plain `new` (no deterministic address to race), but project order/identity is first-come on-chain | `PDFactory.sol:245-247` | Theoretical |
| INFO | — | Display-name (`ens_name`) visual impersonation — the real residual, already filed | finding 04, H1 | YES (visual only) |

**No CRITICAL, HIGH, or MEDIUM on the money path.** Every financial gate holds.

---

## The five questions, answered explicitly

### 1. Is on-chain project creation permissioned or permissionless?

**PERMISSIONED.** Exact authority: `PDFactory.createProject` (`PDFactory.sol:199`)
checks `if (!whitelistedArtists[artist]) revert ArtistNotWhitelisted();` at
**line 211**, where `artist = msg.sender` (line 208). The whitelist mapping
(`PDFactory.sol:106`) is written only by `whitelistArtist(address)` /
`removeArtist(address)`, both `onlyAdmin` (`PDFactory.sol:272, 280`; modifier at
157-160). No public, signature-gated, or self-service add path exists. A
non-whitelisted wallet's `createProject` call reverts before any deployment.

### 2. If permissionless, what stops a fake "Tyler Hobbs" project?

N/A on-chain (it's permissioned), but the full-stack answer matters because the
*display* layer is where a fake could masquerade. Three independent gates:

1. **Contract gate:** the attacker can't deploy at all without being whitelisted
   (Q1). Even an admin-whitelisted *attacker* wallet deploys a project whose
   immutable `artist` is the **attacker's** address, not Tyler's — provenance is
   the deployer key, which Tyler controls and the attacker doesn't.
2. **Name collision is not impersonation:** `name`/`symbol` are free strings on
   the contract (`PDFactory.sol:227-228`, only JSON-safety enforced), so two
   contracts *can* share the string "Fidenza". But the canonical identity is the
   immutable `artist` address baked into every token's metadata
   (`PDProject.sol:504`, Artist trait = `artist.toHexString()`), not the name.
3. **App display gate:** the site never enumerates on-chain PDProjects. It renders
   only the hardcoded registry (`lib/project/registry.ts`, ~45 fixed projects) and
   the Supabase `projects` table, which **no API route writes** (verified: zero
   `.from('projects').insert/upsert` across `app/api`; the Ponder indexer that
   would ingest `ProjectCreated` events is built but not running per CLAUDE.md §2).
   So a fake on-chain project simply does not appear on PD, under any artist,
   today. When the indexer lands, attribution will key off the immutable on-chain
   `artist` + the allowlist — not an arbitrary display string — so the design
   carries the gate forward.

### 3. Where do sold-out mint proceeds go? Can a spoofer capture another's?

**Primary mint** (`PDProject.mint`, `PDProject.sol:225`): per tx, ETH is split and
**pushed atomically inside the mint** (`PDProject.sol:266-268`):
- 95% of mintPrice → `artist` (the immutable address, line 266)
- 5% of mintPrice → `factory.platformWallet()` read live (line 267)
- storage fee → `factory.storageFeeWallet()` read live (line 268)

If any push fails, the whole mint reverts (`_push`, `PDProject.sol:272-276`); the
contract holds zero ETH before and after. **Secondary royalties** (5% via
EIP-2981, `PDProject.sol:559`) route to a per-project `PaymentSplitter`, which can
only ever pay the immutable `artist` (60% → 3%) or the factory platform wallet
(40% → 2%) — withdrawals are permissionless but the destinations are fixed
(`PaymentSplitter.sol:131-150`), so a third-party caller gains nothing.

**Can a spoofer capture another artist's proceeds? NO.** Every payout address is
either the immutable `artist` (set to the deployer at creation, no setter) or the
admin-controlled platform wallet (two-step rotation, `PDFactory.sol:315-352`).
There is no field a spoofer controls that redirects another artist's money.

### 4. Can an attacker get onto the artist_allowlist through any code path?

**NO.** Two layers:
- **On-chain whitelist:** writable only by `whitelistArtist`/`removeArtist`, both
  `onlyAdmin` (Q1). No self-service.
- **App `artist_allowlist` table:** live RLS confirms only two policies, both
  SELECT (`allowlist readable (anon)` and `(authenticated)`, qual `true`); there is
  **no INSERT/UPDATE/DELETE policy**, so anon/authenticated clients cannot write
  it. The only key that bypasses RLS is the server service-role key, and **no API
  route uses it to touch the allowlist** — `artist_allowlist` is referenced in
  exactly one app file (`lib/artists/allowlist.ts`), and only via `getSupabaseAnon()`
  reads. Population is out-of-band (manual insert by the founder today; the
  PDFactory whitelist on mainnet). 24 rows present, all seeded out-of-band.

### 5. Front-running: can an attacker pre-claim a legit artist's project?

**On-chain: effectively NO.** The factory uses plain `new PDProject(...)`
(`PDFactory.sol:247`) and `new PaymentSplitter(...)` (line 245) — **no CREATE2, no
salt** — so there is no deterministic address for an attacker to front-run or
squat. Project order is first-come, but only whitelisted artists can call
`createProject` at all, so a non-artist cannot pre-deploy anything. A *malicious
whitelisted* wallet could deploy a same-name contract, but it carries the
attacker's address as `artist`, so it never reads as the victim's work (Q2).

**App handle/slug: a narrow LOW (L1).** The shared `/@name` pool means a project
@name, once derived from a display name, must be free across `users.handle` AND
`projects.handle` (`app/api/project-handle/check/route.ts`). Since the upload UI
doesn't exist yet and no API creates projects, the live exposure is only that a
squatter could pre-claim a *user handle* matching a famous artist's intended
project @name, blocking them later (overlaps finding 04 M1/M2). **No money flows
from this** — it's a naming nuisance, not a proceeds-capture. Fix is already
planned: reserve allowlisted-artist handles/intended slugs to their wallet (04 M2)
and wire the live `projects.handle` join when the indexer lands (04 L1).

---

## Detail on the LOW items

### L1 — LOW · Project @name / handle land-grab before the real artist registers

**Where:** `app/api/project-handle/check/route.ts` (uniqueness across the shared
pool) + `lib/slug.ts:42-45` (static 2-entry bare-slug reservation set).

**Issue:** handles/project @names are first-come and there is no reservation tying
an allowlisted artist's expected name to their wallet. A squatter can register a
user handle (or, once upload ships, a project @name) that a real artist intended.

**Exploit (today, limited):** attacker SIWE-claims `@fidenza` as a user handle;
when the real Tyler-Hobbs-equivalent artist is whitelisted and tries to launch a
"Fidenza" project, the derived slug `fidenza` is taken in the shared pool and
rejected (`reason: 'taken'`, no auto-suffix). Nuisance/forced-rename, not theft.

**Payoff:** none financial — the squatter cannot mint, be attributed, or receive
proceeds. Pure naming friction / mild extortion potential.

**Fix:** reserve every allowlisted artist's handle + intended project slug to their
wallet at allowlist time, blocking the name for everyone else (already specified in
finding 04, M2/L1). Wire the live `projects.handle` join when the indexer runs.

### L2 — LOW · No CREATE2 means no deterministic-address race (documented, not a bug)

**Where:** `PDFactory.sol:245-247` (plain `new`). Logged only so a future move to
CREATE2 (e.g. for vanity/pre-announced addresses) is flagged as the moment to add
salt-based front-run protection. No action needed today.

---

## What is VERIFIED SAFE (the strong parts)

- **Creation is admin-gated** and the **artist address is immutable** = provenance
  cannot be forged on-chain.
- **All proceeds are pushed to fixed addresses in-tx**; the contracts hold no
  balance and have no admin money reach (`PDFactory.sol:30-35` admin-scope note;
  `PDProject` has no withdraw).
- **Allowlist is read-only app-wide** (RLS SELECT-only, no writer) and the **site
  never trusts an arbitrary on-chain deployer** for display (registry/DB-driven;
  indexer not yet live).
- **Mint path (chainless sim)** keys every write on the SIWE wallet and reads
  price/supply from the trusted registry, not from any user-deployable source
  (`app/api/project/[slug]/mint/route.ts`, `app_mint` SECURITY DEFINER, row-locked).

---

## Bottom line for the founder

The thing you'd fear most — someone pretending to be a real artist, spinning up
their drop, selling it out, and walking with the ETH — **cannot happen.** Three
independent locks each stop it alone: only you can add artists, the artist's wallet
is burned into the project permanently, and 100% of the money is shipped to that
wallet the instant a piece is bought. The only real remaining gap is cosmetic — a
faker can make their *own profile* read like an artist's name (already filed as
finding 04, H1) — but that buys them a convincing-looking page, never a project,
never an attribution, and never a single wei of someone else's sale.

*No contract, app, spec, or config was changed in producing this audit.*
