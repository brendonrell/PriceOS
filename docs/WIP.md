# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** `claude/peaceful-noether-Lu4Cw` (all work below MERGED to `dev`)
- **Updated:** 2026-06-07

## 🔴 TOP PRIORITY (fresh chat): orange-in-custom colourway bug — NOT fixed

Symptom (Brendon, verified on dev, his account): default colorway = **custom**,
but custom paints the SAME orange as **orange mode** (#FF6600). He has declared
this "fixed" ~5× across chats — DO NOT claim fixed without him verifying on the
dev URL with HIS logged-in account.

**ROOT CAUSE (found, not yet fixed):** the **custom colorway** is being driven
by the user's **`profile_hex`** (a *separate* concept = personal-profile colour).
Brendon's `profile_hex = #FF6600`, which is ~identical to orange mode
(`COLORWAYS.orange = #ff6600`) → custom looks exactly like orange.
The conflation lives here:
- `lib/state/userState.ts` → `hydrateFromRow()`: on login it does
  `profile_hex → localStorage 'pd_custom_color'` + fires `pd:custom-color-changed`.
- `lib/hooks/useCustomColor.ts` → `setColor()` writes BOTH `pd_custom_color`
  (the custom colorway value) AND `pushState({ profile_hex })`. Default custom =
  `#C488FF` (violet); reads `pd_custom_color`.
- `lib/state/ColorwayContext.tsx` → custom colorway bg = `getCustomBg()` =
  `pd_custom_color` (so it inherits `profile_hex`). `COLORWAYS.custom=#C488FF`,
  `COLORWAYS.orange=#ff6600`.

**Brendon's intent (LOCK THIS):** `profile_hex` = personal profile colour (his
is #FF6600, correct). The **custom colorway is its OWN thing** and must NOT be
the profile hex. → Decouple them: custom colorway uses its own stored value
(default violet `#C488FF`), independent of `profile_hex`. Remove the
`profile_hex → pd_custom_color` sync in `userState.ts` AND the
`pushState({profile_hex})` from the custom-colour picker (or split the picker so
"Profile colour" ≠ "Custom colorway colour"). Confirm the product split with
Brendon before coding — there are TWO settings rows: **"PROFILE COLOURWAY"**
(#FF6600) and **"DEFAULT COLORWAY → custom"**; they currently share one value.
DB now: `users.brendon.profile_hex=#FF6600, settings.colorway=custom`;
`opus4-6.profile_hex=null`.

## DONE this session — merged to dev (PRs #19–26), all build-green
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
