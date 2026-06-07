# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** `claude/mint-button-flow-GIrXA` (pushed to `dev`)
- **Updated:** 2026-06-07

## ✅ LANDED THIS SESSION (mint-button-flow) — pushed to `dev`, build-green

1. **In-button mint flow finished.** Tap MINT → the same-size **224px** pill
   SPLITS down the dead centre (single hairline divider) into **qty | CONFIRM**
   tabs, mirroring the artwork modal CTA (`modal-action-btn-wrap`). CONFIRM is
   stacked over the ETH amount, all-Courier; **no box** around CONFIRM; ✕ floats
   in the corner so the split stays centred. Only the choosing face splits — idle
   MINT stays one solid button. (`components/project/MintButton.tsx`;
   `.mint-chooser/.mint-seg/.mint-confirm/.mint-cancel` in `globals.css`.)
2. **Soundtrack is DB-driven.** `projects.soundtrack` → `/api/project/[slug]/outputs`
   → ProjectContext → page (registry = pre-reconcile fallback only). Prisms' DB
   soundtrack set to Tycho — "Dive" (`OLAK5uy_nwyosntuUVkKzTCteWIdw0SJZi-XSJeTs`).
   Edit the column and the SOUNDTRACK button updates; no code change per project.
3. **Empty-state ghost grid.** An unminted project renders 18 placeholder frames
   (6 flagged for Showcase) whose aspect ratios are SAMPLED from the project's own
   palette (`ProjectDef.aspects`, exported from each engine). No art, no phantom
   seeds (honours the Genome lock). Gone the instant the first Output mints.
   (`components/project/GhostCard.tsx`.)
4. **Showcase auto-feeds the first 6 mints** until the artist curates `showcase_ids`.
5. Pre-mint trait filter bar hidden (no trait spoilers in the ghost state).

### Process locks added this session (CLAUDE.md)
- **PUSH/APPROVED = merge to `dev` + push `dev`** — never stop at the feature branch.
- **KNOW, never guess**; check own work via real `npm run build` + compiled-asset
  inspection; confirm the deploy is current via Vercel MCP before pointing Brendon
  at it (preview 403s from the container — curl-from-here is not a valid check).
- It's a two-person shop — keep the loop tight, no babysitting.

Also pushed to `dev` this session: CONFIRM/price/✕ size bumps (15/13/22px);
soundtrack button next to MINT.

## 🔧 COMMITTED LOCALLY, NOT PUSHED — local commit `c376091` (on top of `dev`)

Two things sit in a local commit; decide per item before pushing:
1. **No-highlight fix (READY — Brendon asked for it).** `user-select:none` +
   `-webkit-touch-callout:none` platform-wide on tappable glyphs (buttons,
   `[role=button]`, `.mint-step`, icons) so the +/− and glyphs don't trigger the
   iOS text-selection / Copy·Look-Up popup. Real text stays selectable.
   (`app/globals.css`.) Safe to push on its own.
2. **Petey placeholder art engine (WIP, NOT wired).** `lib/art/engines/petey.ts`
   — pure-JS canvas, 6 soft styles (bloom/wash/rings/haze/horizon/dust), muted +
   low-contrast. Just the engine; nothing consumes it yet.

## 🎯 IN FLIGHT — the **Petey placeholder** feature (next session, start here)

**The ask (Brendon, verbatim intent — I misread it 3× this session, READ THIS):**
- Build a **fake placeholder "project"** that fills a USER's **empty "Collected"
  tab** (when they hold nothing) — UI-only "welcome" pieces; vanish the moment
  they collect anything real.
- **Petey is ONLY the artist** on it. NOTHING else. Do **NOT**: add a "Collected
  by @petey" row on the project page, add any `/petey` routing/redirect, or
  **touch the existing empty-state ghosts** (those are done + loved — leave them).
- **Pure-JS art** (no SVG — SVG was rejected). Soft / inert / **~half-opacity** so
  it reads as a placeholder, not a real Output.
- **Give Brendon OPTIONS to pick the visual.** He wants to **review them himself
  in a standalone HTML file** (built off `petey.ts`, with an opacity slider) —
  was mid-build when we stopped. Generate it and send it (SendUserFile); he picks
  a style, THEN wire the chosen one in.

**Integration point (verified):** `components/profile/ProfilePageBody.tsx` ~L594
— the Collected tab maps `collectedByProject` (real holdings); empty when
`holdings.length === 0`. That empty branch is where the placeholder renders
(a small `PeteyPlaceholderCard` painting via `renderPetey`, half-opacity, meta
`@petey`). Keep it isolated from the registry/ProjectProvider (it's fake).

**Process reminder for next session:** PRESENT a numbered list + get approval
BEFORE building/pushing (I skipped this and Brendon called it). Don't go token-
drunk — small steps, confirm scope.

### Backlog (later)
- Running **"Easter-egg gen-art"** list in the Atlas (Tabstract / ghosts / 404 /
  favicon / pull-to-refresh) so they're seeded deliberately.

## ✅ LANDED — PRIOR SESSION (platform traits / Collected facets) — merged to `dev`

1. **orange-in-custom colourway bug** — decoupled (details below).
2. **SOLD-OUT-at-zero** — project page fetched a stale mock `/outputs` route
   hardcoding `total: 500` → always sold out. Wired the real DB route into
   `/api/project/[slug]/outputs`, deleted the mock + the redundant base route.
   Now reads real minted/supply (0/256). Applies to both projects.
3. **Address profile URLs** — `/0x…` and `/@0x…` now resolve → 301 to canonical
   `/{handle}` (`lib/slug.ts` + `getHandleByAddress`). Fixes the settings
   profile link (it points at `/{siweAddress}`).
4. **Profile shows REAL data** — Collected = the wallet's real `holders` rows
   (`/api/user/[address]/outputs`), Created = real authored Projects, hero stat =
   real owned count. Empty at fresh state, fills as you mint. Mock arrays gone.
5. **PLATFORM TRAITS (model change — see lock note)** — every Output now carries,
   in birth-order: **Artist · Project · PriceDay · Natal (Sun/Moon/Rising) ·
   Fate**, merged in `registry.outputTraits(slug,id,mintMs?)`. Single source for
   PD's UI **and** token metadata (→ OpenSea attributes — that's why they're real
   traits). `lib/project/natal.ts` = deterministic Sun/Moon/Rising from the mint
   timestamp over **Montreal** (Schlyter low-precision; sign-level). PriceDay via
   `lib/priceday`. Artist/Project/Fate deterministic; PriceDay/Natal need mint ts.
6. **Collected facets** (`components/profile/ProfileFacetBar.tsx`) — Artist ·
   Project · PriceDay · Sun · Moon · Rising · Fate · **Status (Listed/Held)**,
   value pools drawn from what you OWN, + search (@artist/@project/id) + price +
   sort. A collection spans independent projects, so it filters on the platform
   facets every Output shares — NOT any one project's trait schema.

### ⚠️ LOCK CHANGE (Brendon, this session): "Fate is the ONLY platform trait" is
superseded. Platform traits are now **Artist, Project, PriceDay, Natal, Fate**
(all real per-Output, in metadata for OpenSea). Celestial layer beyond Natal is
still Spell Book, not traits.

### Follow-ups (not done this session)
- Surface the platform traits as pills on the **project page / discovery** (needs
  per-Output mint timestamps plumbed into ProjectContext, like the profile has).
- **`tokenURI`/metadata generator** for real OpenSea attributes — `outputTraits()`
  is the source it will read (lands with the on-chain work).
- Natal is approximate (sign-level) by design — fine for a flavour trait.
- Profile per-user **volume** still `—` (not tracked); Hold-Time as a sort idea.

## ✅ FIXED — orange-in-custom colourway bug (merged to dev, VERIFY on dev)

Was: default colorway **custom** painted the same orange as orange mode because
the **custom colorway** was driven by the user's **`profile_hex`** (#FF6600).
Per Brendon's locked intent, `profile_hex` (personal profile colour) and the
Custom colorway and Haze Mode are now THREE separate features — decoupled.

**What shipped (PRs on this branch → dev):**
- Profile colour renamed off the generic "custom" identity: `useCustomColor` →
  **`useProfileHex`**, own slot **`pd_profile_hex`**, own event
  **`pd:profile-hex-changed`**, CSS var `--profile-hex`. Still writes
  `profile_hex` server-side.
- `userState.hydrateFromRow` writes `profile_hex` → `pd_profile_hex` only (NOT
  `pd_custom_color`); fires only `pd:profile-hex-changed`. The login bleed is gone.
- **Profile Colorway now renders:** a profile page paints in ITS OWNER's
  `profile_hex` under the default/Custom colorway (`ColorwayContext` +
  `ProfilePageBody.setActiveProfileHex`). Visitor's explicit pick still wins;
  own-profile edits repaint live; prehydration boots the Custom default (violet)
  so no yellow flash.
- **Naming/decouple guard comments** added across all three features citing each
  by name so they can't be re-welded. Custom (`pd_custom_color`) + Haze Mode
  (`pd_haze_color`) untouched.

⚠️ Brendon: declared fixed ~5× before — confirm on the dev URL with YOUR
logged-in account (`profile_hex=#FF6600`) before closing. Custom should now be
violet, your profile should show your orange, and they move independently.

## DONE earlier this session — merged to dev (PRs #19–26), all build-green
Clean platform + 2 real Projects + chainless market + follow + artist profile:
- Project **registry** (`lib/project/`), Kiki fully ripped, **Prisms** reborn
  (256, violet #5A2EA6) + **Oracle** (333, gold #C4902A) — both via per-project
  art engines (`lib/art/engines/`). Artist = `opus4-6` on both.
- **Fate** platform trait (I Ching King Wen 64) on every Output —
  `lib/project/fate.ts`. Trait/subtrait system schema-driven (TraitsUI/Context).
- **Chainless marketplace**: `POST /api/project/[slug]/mint` (qty ≤ 22 per
  PDProject contract), `/api/output/[id]/market` (list/cancel/buy/offer/accept),
  Seaport-style. Mint price + **mint fee** plumbed, both **$0** now
  (`MINT_FEE_ETH` in registry). In-button mint flow (`MintButton`): pick qty →
  confirm → progress → toast → revert. Button flips MINT→BUY(floor→cart) at sold-out.
- **Both projects 0-minted** in DB (fresh mint phase). Real hero stats
  (collectors/volume/floor) + follow-graph "Collected by". **Follow button** on
  profiles + live counts (`/api/follows`). Artist profile Created tab shows real
  Projects (`ProjectCard`).
- Output stats (owner/last-sale/floor) wired live on modal + output page.
- **Service worker DISABLED** (`next.config.mjs disable:true`) + `SwKiller`
  tears down old SWs — fixed the "stuck sold-out / stale bundle" class.
- Output opens route to `/art/{slug}/{id}` so output pages inherit project colour.
- `/artists` page. `lib/slug.ts`: `oracle` registered; bare `/{project}`→301.

## OPEN items (after the orange bug)
- **Slug/URL audit:** all internal links conform EXCEPT logo **`/$price`** (line
  ~145 `components/shell/PeteyLogo.tsx`) → 404 (invalid slug). Change to `/price`
  and build reserved routes. Reserved token paths `/price` `/token` + socials
  `/discord /twitter /x /farcaster` not built (the rule says 302). Socials are
  currently linked EXTERNALLY direct (footer/LinksView → discord.gg) so no
  internal 404s there. Need real URLs for twitter/x/farcaster to wire.
- **Project-follow** (projects followable): needs a `project_follows` table +
  endpoints + button placement (Brendon's call on placement).
- **Global `/{number}` output id**: currently assumes prisms (no global
  id↔(project,localId) map). Per-project `/art/{slug}/{localId}` is correct.
- Output modal still has some placeholder stats; public Docs trait-guide page
  not written; hero "JUL 09 2026" date is a PriceDay placeholder.

## Process / gates
- App pushes need Brendon's numbered-list approval; docs/process pre-approved.
- Merge to dev/main only on explicit chat confirmation. Local commits free.
- git-guard blocks main writes (escape: `PD_ALLOW_MAIN=1`).
- **Branch sync gotcha:** dev squash-merges diverge this branch; before new work
  `git fetch origin dev && git checkout -B <branch> origin/dev`, cherry-pick if needed.

## main / production — untouched (clean baseline 5236c2e)
