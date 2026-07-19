# Brief · Fable build queue — 2026-07-19 ideation (for fresh Fable sessions)

**From:** the 2026-07-19 Opus ideation session (Brendon triaged a wow/QoL round
into Fable's queue). **Read `CLAUDE.md` first.** Work on `dev` rules; present the
numbered CEO list before pushing app code. Reuse-first (Rule #0). Build these as
separate ships; each section is its own spec.

Big ones with their own files: **Command Stone** (`command-stone.md`), **Cartography
Time Machine** (`cartography-time-machine.md`), **PD.fm** (`pd-fm.md`).

---

## PD Wrapped

An **auto-composed, shareable personal recap** of a wallet's time on PD: best call,
biggest flip, streak, faction time, where you rank, pieces collected — *your*
story, versus the Dispatch which is the *platform's* paper.
- **Cadence is Brendon's pick — weekly / monthly / quarterly / annual.** Build the
  engine **cadence-agnostic**: the period is a parameter; wire whichever cadence(s)
  he lands on.
- **Reuse the share-card machinery** — the Identity Plate / Rarity + trade receipts
  (`lib/output/receipt.ts`) — plus the existing stats (PriceScore/Streak/rank,
  trade record, completionism).
- Check **The Long View / The Dossier / The Portrait** (WOW-tier Atlas entries)
  before building — don't duplicate; PD Wrapped may extend one of them.

## Mint Night

A **live communal drop room** during an active mint: the crowd minting in real
time, one **shared countdown**, the supply bar **filling for everyone at once**,
light reactions. A drop becomes an event you attend.
- Extends the **Audience** presence (● breathing dot + headcount) and **Now
  Minting**; ride **Supabase Realtime** presence (the same live layer Cartography
  and the Audience use).

## PDTV (exhibition mode)

Brendon's name for "exhibition mode": **cast any Showcase or collection to a
fullscreen, self-playing gallery wall** with its soundtracks — for a TV or second
screen.
- Reuse **Showcase** + the live render + the project **soundtracks**. **PWA
  fullscreen** (no native — PD is PWA/web only). A slow, ambient auto-advance.

## Share any view (confirmed winner)

Every surface / sort / grouping / filter state gets a **copyable deep link**;
opening it **restores the exact view.**
- **REUSE the existing share/deep-link plumbing** — **Setup Codes**
  (`lib/state/SetupCode.ts`) already encode spells/modes/workspaces, and
  **Shareable sort links** (Atlas #88) exist. **Extend, don't reinvent.**

## Quiet hours (confirmed winner)

A **schedule in Pings settings** that **silences native pushes** during set hours.
- **User's LOCAL timezone** (per the CLAUDE.md clock-times rule). In-app pings still
  log; only the **lock-screen push** is suppressed during the window.
- The **Sentinel** (server-side push evaluator, `lib/push/webpush.ts` + the reminder
  sweep) checks quiet hours **before** sending a native push.

## Sound (synthesized) — with a clear toggle

A **$0 sound layer**: **synthesize the blips in-browser with the Web Audio API**
(oscillators + envelopes) — a mint chime, a win sparkle, a toggle tick. **No files,
no AI bill, deterministic**, and it matches PD's "everything's generated" DNA.
- Behind a **clear user toggle** (Brendon's requirement; default **off**).
  **Haptics** ride the same switch.
- **iOS PWA reality:** web audio needs **one user tap to unlock** (resume the
  AudioContext) and the **ringer/mute switch can silence it** — both fine for an
  opt-in layer; just don't fight them.
- **No connector generates audio** — this is code (Web Audio), not a service. If
  Brendon later wants richer/organic sounds, author short clips with an **external
  AI SFX tool** → ship tiny files. **Start with synthesis.**

---

## ⛔ DEAD — do NOT build (Brendon's calls this session)

- **Instant Offline Open** — Brendon **ripped it out**; old cached versions showed
  in offline mode (stale-cache). Do not re-add.
- **Home / lock-screen widgets** — **impossible on a PWA** (native-only frameworks);
  PD is **PWA/web only with no native plans**. Dead. (Closest is the lock-screen
  **push** already shipped — a notification, not a widget.)
- **Ask PD as a standalone** — **folded into the Command Stone** (see its brief).
