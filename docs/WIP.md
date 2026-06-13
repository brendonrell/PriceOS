# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** work is on `dev`, fully pushed, tree clean (origin/dev `0f9bf44`).
  This chat's task branch `claude/spot-edits-design-tweaks-6gxjbt` is trash
  (work is on dev) — Brendon deletes on GitHub.
- **Updated:** 2026-06-13 (big spot-edit + purple-purge + grail/modal session)

## ✅ SHIPPED 2026-06-13 (on `dev`, Brendon-approved in batches)
- **Home CTA → "Join The Chat"** (links to the community Discord). The button
  beside it is now **Stickers**, opening the new **Sticker Exchange** modal — a
  bottom-sheet, one-row sheet carousel, subtly-cyberpunk *terminal* styling
  fully themed to the colorway (no neon). Mockup; no stickers minted yet.
- **Real project upload date.** Added `projects.uploaded_at timestamptz` to
  Supabase (PROD) and set every current project to **Jun 12 2026**. Project page
  + home New-Uploads feed read it (cooldown−60d is only a legacy fallback now).
- **PURPLE PURGE (#C488FF).** That violet is **reserved for the genesis project
  and must not appear anywhere in the app.** The Custom colorway had it
  hardcoded as a baked-in default, bleeding onto Home. Custom now ALWAYS derives
  (home → Mood Ring, project → its colorway, profile → owner hex) via
  `resolveCustomBg`; only Dot (#111) is a last-resort fallback. **Default
  profile theme = brand matrix white `#E0E0E0`** (so an un-themed profile reads
  blank) — set as the `users.profile_hex` DB default too; old violet migrated
  away. No applied purple remains (only a migration entry + guard comments).
- **Grail pins carry `{slug, id}`** now (were bare ids) — a pill shows the
  ACTUAL pinned Output (Oracle #7, not "Prisms"), right price, opens the right
  project. Legacy bare-number pins drop on load.
- **Artwork modal buttons wired:** Star (★ fill) / Wishlist / Add-to-Album
  (opens picker) / Grail / **Add-to-Showcase** (new device-local
  `userShowcaseStore`). To-Do + BUY-side LIST/MAKE-OFFER stay stubs (no store /
  marketplace unbuilt).
- **Home polish:** Now-Minting threshold **6 → 12** (carousels show 12);
  Shuffle tab icon bigger+bold on mobile; social row reverted to plain @name
  links, one line, matches the project page (CollectedPair kept but UNUSED);
  New-Art feed row = just the project name; stats **PRO / VOL / NFTs** (small s).
- **Lists:** Starred + Wishlist divider lines removed; their ghosts squared to
  sharp industrial rectangles (match the artwork ghosts).
- **Mint toast** lingers ~33% longer + fades gently (new optional
  `showToast(msg, holdMs, fadeMs)`).
- **PRSN easter egg** (count of 1 → "1 PRSN"); **Haze dropper** (◉ grabs the
  page bg into the Haze slot); user-facing **colour → color**.
- **Title rows:** date wraps flush (gap moved to the title's trailing edge).

## 🎯 NEXT — the priority (NOT started)
- **Sort GROUPING feature.** A new *group-by* dimension with a cycling control
  modeled on the feed's `$` toggle (little glyphs/letters per option), grouping
  the gallery by: artist, owner, **color**, last-sold $, rarity, etc. Approach
  locked by Brendon: derive each Output's **color via the Hash Synesthesia
  dominant-color sample**, bucket into his named list (red/orange/yellow/green/
  blue/purple/black/white/wooden=brown/stone=grey/cream=beige/moon=light-purple)
  + a **"has Hothurt"** flag = a specific-hex check (#FF0055) read from the
  Output's palette/code. Multi-surface: SortContext group dim + the cycling
  control on the project (TraitsUI) + profile (ProfileFacetBar) bars + grouped
  gallery rendering. ⚠ rarity + last-sold have **no data source yet**.

## ⚠️ KNOW THIS (next session)
- **On-chain previews (contracts):** the deployed `PDProject` stores a **16KB
  on-chain WebP thumbnail** (`MAX_THUMBNAIL_BYTES = 16_384`); the pd-contracts
  README still describing Arweave is **stale**. My recommendation to Brendon:
  ship on-chain-only (~$3 storage fee) now; keep Arweave high-res as an optional
  later layer (image prefers Arweave, on-chain thumb as guaranteed fallback) —
  doing both is ~$7 and a contracts change. Decision not finalized.
- `users.profile_hex` DB default + `projects.uploaded_at` are **live PROD
  Supabase** changes made this session.
- Mood-Ring boot-paint mirror in `app/layout.tsx` still must match
  `lib/mood/mood.ts` (unchanged this session).
- `CollectedPair` component is now unused (kept, deactivated).
