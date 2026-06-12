# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** work is on `dev`. Start fresh from `dev`. Three task branches are
  trash once their work is on dev — Brendon to delete on GitHub (ClickUp task
  `86badm7pa`): `claude/exciting-meitner-82scyc` + `feat/ai-sample-projects`
  (PriceOS), `claude/exciting-meitner-82scyc` (kiki-genart). Earlier strays
  (`trusting-knuth`, `vibrant-curie`, `elegant-carson`) may also still exist.
- **Updated:** 2026-06-12 (AI sample-cohort mega-session)

## ✅ SHIPPED THIS SESSION (all on `dev`, deploy READY, Brendon-tested)
1. **22 AI sample projects** are real registry Projects (engines in
   `lib/art/engines/ai/`, traits machine-verified against renders, 40
   seeds/engine). Artists carry `-ai` handles with wallets, profiles, `.eth`
   names; DB rows at launch state (0 minted — mints create outputs, the point).
2. **Prisms v2** — Brendon's bench ring-encounter engine replaced the gradient
   Prisms wholesale (`prismsCore.ts`, deterministic per tokenId; the bench's
   per-pageload RUN_OFFSET is removed). Palette table is a deliberate unnamed
   easter egg. Colorway + DB custom = `#E8FF47`. Traits: Palette (subtraited
   Main/Special), Mode, Encounter, State — derived from the same calc() the
   renderer paints with.
3. **Artist whitelist** — `artist_allowlist` table (RLS read-only) is the
   contract stand-in. `/artists` lists ONLY whitelisted wallets with ☼/☽
   status; profiles show a plain ✺ badge for whitelisted artists. **Status
   moons live ONLY in artist lists, never beside usernames elsewhere (hard
   Brendon rule).** **Cooldown fires at UPLOAD** (not mint-out; multiple live
   projects per artist are legal — Oracle is the old-upload example).
4. **Connect-menu artists list** — all 25 artists, rows navigate to profiles.
5. **Trait system real** — Fate pills show only fates present in the MINTED
   set (TraitsUI computes from outputFate over 1..mintedCount); My Network
   filters all work: Me (= signed-in wallet's outputs), Mutuals/Following/
   Followers (follow graph), Top Holders (top-5 per project), New Wallets
   (owner account < 30 days; outputs API now ships owner_created_at).
   Subtraits authored across 12 AI schemas + Prisms.
6. **Soundtracks + custom colors for every project** (registry + DB) — real
   public playlists, taste-matched. Brendon is judging taste, not links.
7. Sundry: Oracle credited to `sonnet4-6` (new artist); output-modal listing
   button removed (CTA owns listing, coming soon); home by-line shows
   ⚬ follower count beside @brendon.

## ⚠️ KNOW THIS (next session)
- **KIKI is the GENESIS PROJECT** (Brendon's own, set aside) — see CLAUDE.md §2
  callout. Never park files in kiki-genart.
- The AI engines' verification harnesses lived in the session container only
  (`pd-sample-demos`) — gone with the container. The engines + verified casts
  in `lib/art/engines/ai/` are the durable source of truth; do NOT reorder rng
  draws in an engine without rebuilding its cast.
- Soundtrack playlist ids were found via live search and link-checked, not
  audio-verified; swap freely if any embed dies or misses Brendon's taste.

## NEXT (queued, not started)
- Brendon continues testing the cohort on dev; edits land in fresh chats.
- ClickUp `86badm7mm` (02 · Done) holds the full shipped manifest.
