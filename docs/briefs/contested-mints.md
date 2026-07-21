# Contested Mints — full spec + build brief

> **Origin:** Brendon × Fable brainstorm session, 2026-07-21. Every decision
> marked **LOCKED** below is Brendon's explicit call from that chat — do not
> re-litigate them. Items under **OPEN — BRENDON DECIDES** are genuinely open;
> ask before building those parts. This brief is written for an Opus build
> session (Fable metering precedent, CLAUDE.md §3).
>
> **Read first:** `PriceOS/CLAUDE.md` (the whole contract), `docs/GLYPHS.md`,
> and the Mint Room ship notes in `docs/WIP.md` (2026-07-20 marathon entry ⑨) —
> the Mint Room is the reuse base for the live-drop surface (Rule #0).

---

## 1. What this is and why it exists

When a drop has more real collectors than supply, the mint moment is the single
thing collectors care most about. fxhash died on sniping after Artcoins. The
industry's answers — allowlists, raffles, dutch auctions — all killed the thing
that makes a mint fun: the surprise drop and the sprint to the mint button.

**The thesis (the innovation claim):** time is the only resource nobody can
fake, buy, or multiply. The simultaneous drop was never the vulnerability — it
was the strongest anti-bot primitive available, ruined only because it ran at
machine speed on-chain. Every platform that stretched drops out over time
(raffles open for hours, auctions) handed sybils a feast: one person can enter
50 accounts *sequentially*. Compress the contest into one human-paced
simultaneous moment and one human has one body and one window — 50 accounts
need 50 bodies in the same ten seconds.

So: run the race at human speed, inside the app, and make simultaneity itself
the security. The experience Brendon wants to prize (flying to the mint button)
and the defense are the same object.

**Design north stars (all LOCKED):**

1. **Preserve the surprise drop + button sprint.** No auction mechanisms, no
   scheduled raffle theater. The mint moment stays the mint moment.
2. **Punish bad actors; do not reward performed behavior.** Anything you reward
   gets farmed. Honest collectors just show up and press — no behavior to
   perform. Only bad-actor signatures cost you.
3. **Contested is an emergent state, not a label.** We never know in advance
   which drops will be contested. Every drop launches identically; a drop
   *becomes* contested live, by oversubscription.
4. **One tap, ever.** A minter taps mint (plus the single wallet confirm that
   is part of any mint today) and is DONE. No claim step, no return trip, no
   second tap, no bill. Winners wake up owning the token; losers' money never
   moved.
5. **No escrow. Never hold user funds.** LOCKED hard — the design holds signed
   *orders*, not money.
6. **No allowlist as the mechanism.** (Whether a small artist guest-list
   carve-out ever exists is OPEN, leaning no.)
7. **iOS Safari + PWA first** (Rule #-0.5) — the drop moment, the ritual, the
   Face ID anchor are all designed for iPhone.

---

## 2. The mechanic, end to end

### 2.1 Every drop launches identically

One mint button. No pre-designation, no special mode, no countdown apparatus
beyond whatever the project page already does. Most drops will never touch any
of the machinery below, and for them the whole system costs zero.

### 2.2 The Window — "first" does not exist

All mint presses within the opening window (**default ~10 seconds** — exact
length OPEN) are treated as **simultaneous, not ordered**. This single rule is
the entire system:

- Nobody can be sniped, because there is nothing to be first *to*.
- Gas priority buys nothing, because arrival order inside the window is
  discarded.
- A bot that is fast in a way no human is has purchased nothing.

**Optional refinement (OPEN, from the brainstorm — "no true zero"):** the
window opens on a *felt* visual moment (a pulse rolling across the screen)
landing ±1–2s differently per session, all inside the tie window so no human
loses anything — but a bot synced to a announced clock time is synced to
nothing. Cheap to add, ask Brendon if he wants it in v1.

### 2.3 The press — one tap carrying a signed order

The press is the normal mint action: tap → wallet sheet → approve. That
approval signs a complete **mint order** ("mint me one at this price") that
does **not** execute yet. Money stays in the user's wallet. We hold paper, not
funds.

- **Undersubscribed window** (pressers ≤ remaining supply): every order
  executes immediately at window close. Indistinguishable from minting today.
  Post-window, remaining supply mints normally (first-come, ordinary flow).
- **Oversubscribed window** (pressers > supply): the drop **flips CONTESTED,
  live, visibly, in front of the room** — the flip is itself the spectacle
  (see §5). Settlement proceeds per §2.4.

### 2.4 Contested settlement

1. **Snapshot at window open.** Every entry's standing (§3) is computed from
   pre-drop state. Drops are surprises, so your ID is whoever you were
   yesterday — nothing to game in the moment.
2. **The sequencer — banded priority (LOCKED, public policy §3.1).** Entries
   sort into bands; seats fill from the top band down; **within a band the
   draw is a pure equal-odds draw.**
3. **The draw is provably fair.** Commit-reveal: server commits a seed hash
   before the window closes; final randomness = committed seed + a
   future-block hash, published with the full draw transcript so anyone can
   verify no one (including us) could rig it.
4. **Winners' orders execute** — mint + payment in one transaction each,
   server-submitted, zero action from the winner. Losers' orders are
   discarded unexecuted; their money never moved; nothing to refund.
5. **Cascade — seats cannot die.** Any order that fails to execute (balance
   spent meanwhile, wallet weirdness) passes its seat to the next drawn entry
   automatically, repeating until supply is filled. No forgetful human can
   strand a slot, because no human action exists post-press.
6. **Sealed until reveal (duration OPEN, hours-scale).** Contested-mint tokens
   are non-transferable until reveal. This is the adjudication window: the
   shadow sweep (§4) runs with hours instead of milliseconds, voided entries'
   seats are re-drawn to humans *before* reveal, and the reveal doubles as
   the party. Uncontested mints are never sealed.

---

## 3. The ID system — two ledgers

Core reframe: **we never need to know who anyone is. We need to know two
wallets are different people, and that wallets are expensive to duplicate.**
Distinctness, not identity. No KYC. Wallet = the PD account; @names are
permanent (both platform facts — the model leans on them).

### 3.1 The public ledger — transparent, published, owned (LOCKED)

Contested priority goes to **collection size and lifetime spend on PD** — said
loudly in the docs and on the drop surface. Safe to publish because gaming it
is indistinguishable from being a real collector: the only way to climb is to
buy and hold art, which pays artists. It is also the retention pitch: *every
piece you collect here permanently raises your standing for every contested
drop, under your permanent @name.*

Band inputs (weights tuned at build, exact cutoffs NEVER published — bands are
public as *policy*, thresholds stay private):

1. **Held collection on PD + lifetime spend** — the heavy signals. Weight by
   *holding*: a piece still held months later counts fully; a piece flipped in
   48h counts ~zero. (Human flippers are explicitly NOT a priority target —
   the holding weight self-disciplines them; no dedicated flipper police.)
2. **Wallet on-chain life** — age × activity density; lifetime gas burned is
   the beautiful metric (provably destroyed money, public, scales linearly
   with the number of fakes). Idle aged wallets (purchasable) score poorly.
3. **PD tenure** — @name claim date × distinct active days.
4. **ENS with reverse record** — mild positive garnish (LOCKED: a named,
   lived-in wallet is less likely to be a bot; light weight only).

Structure: fill from top band down; **equal draw within a band** — among real
collectors it stays a fair coin flip (LOCKED: when real collectors outnumber
supply, that scarcity is accepted; the system's job is only to keep the draw
human). A genuine day-one newcomer sits in the bottom band for *contested*
drops only — everything else on PD is untouched.

### 3.2 The shadow ledger — silent, forever (LOCKED)

Never published, never surfaced, never explained to users. These do not lower
a band — they **void** entries:

1. **Hardware anchor.** PD account bound to a passkey (iPhone Secure
   Enclave). A contested press includes the Face ID glance — zero perceived
   work on iOS — stamping every entry with *a distinct physical device
   produced this*. Farming graduates from "generate wallets free" to "buy a
   drawer of iPhones."
2. **Funding archaeology.** Wallets funded from a common parent, correlated
   amounts/timing. On-chain, free to read, unfakeable history.
3. **The hand.** Session/gesture telemetry during the window: entries from
   "different" accounts moving with correlated rhythm in the same ten seconds
   are one hand. Simultaneity forces the tell — one human running N accounts
   must script them (bot signature) or perform them in parallel (impossible).
4. **Behavioral/session correlation** — device fingerprints, IP families,
   session timing across accounts.

**Punishment rules (LOCKED):**

- **Silent nullification.** Flagged entries still press, still "enter," still
  see the room — the entry is dead and they are never told. Loud bans teach
  bots what tripped them; shadow-dead entries waste their time forever.
- **Cluster death.** Catch one wallet in an army, void the whole cluster.
  Multiplying entries becomes negative-value.
- **Permanent taint on infrastructure.** The taint lands on @names (permanent,
  unshedable — the only escape is total abandonment and a naked bottom-band
  restart), on hardware IDs, and on funding wallets. We don't ban accounts; we
  burn the farmer's capital. Cheating compounds: every future account touching
  tainted infrastructure inherits suspicion.

### 3.3 The spicy option — poisoned supply (OPEN — BRENDON DECIDES)

Flagged entries *succeed* into a decoy pool resolving to a publicly marked
counterfeit; bots pay full price for a branded dunce cap while real supply
goes to humans. Raised and NOT ruled on — real money-handling and trust
questions inside it (likely shape: refund the mint price, keep only their gas
+ the mark). Do not build without his explicit yes.

---

## 4. Post-settlement: sweep, forensics, spectacle

- **The sweep** runs during the sealed window: clustering over funding graphs,
  device/hardware stamps, telemetry correlation. Voids → seats cascade to
  redrawn humans → reveal proceeds with a clean edition.
- **Drop forensics (OPEN, liked in brainstorm):** after settlement, publish
  the anonymized replay — entries, bands (as policy), voids, clusters caught.
  On a platform whose product is discussion, the aftermath is content and
  bot-catching becomes something the community watches PD win.

---

## 5. The surface — reuse the Mint Room (Rule #0)

The live-drop surface is the **existing Mint Room** (shipped 2026-07-20:
long-press door on the MINT button, crowd count via the Audience channel,
shared supply bar, LIVE mark, reaction sparks, real MintButton inside). The
contested experience extends it, never replaces it:

- Room presence count climbing pre-drop (already exists).
- The window: continuous motion per §9 UX law (the in-button mint progress
  bar is the reference pattern).
- **The CONTESTED flip** — the room visibly flips state when oversubscribed;
  this moment is the marketing. Treatment/glyphs: from `docs/GLYPHS.md` canon
  only; any NEW chrome, door, or persistent element needs Brendon's explicit
  placement call BEFORE build (Rule #-0.4 — no invented doors).
- The draw + reveal theater: design with Brendon at build time; nothing
  auto-opens, nothing default-on.
- Losers see the honest result in-room (no consolation mechanics — rewards
  get farmed; standing-for-losers was raised and NOT adopted).

---

## 6. How to build it

### 6.0 The one hard engineering unknown — SOLVE FIRST

**Sign-now-execute-later for the mint order** is where the implementation risk
lives (flagged to Brendon in-chat; he knows). The press must yield a signed
order executable later by the server, carrying native-ETH payment, from
ordinary EOA wallets, with no second user action. Known routes to investigate
as a spike BEFORE any other build work:

- **(a) Pre-signed raw transaction** — user signs the full mint tx at press;
  server broadcasts winners' only. Wallet support for sign-without-broadcast
  is the question (MetaMask/Rainbow/Coinbase Wallet over WalletConnect, in
  iOS Safari/PWA specifically). Nonce staleness + gas staleness handled by
  the cascade (a failed order forfeits the seat).
- **(b) ERC-4337 / smart-account session** — clean solution shape, adoption
  friction question for PD's actual user wallets.
- **(c) Token-pull authorization (WETH/permit)** — works cryptographically,
  forces users to hold wrapped ETH; friction, likely reject.
- **(d) Winner claim-tap — VETOED by Brendon.** Do not resurface. The cascade
  exists so seats never die; it must never depend on a human returning.

Deliverable of the spike: a working iPhone-Safari proof with the top two real
wallets, or an honest writeup of which route survives contact. Everything in
§2 composes with whichever route wins.

### 6.1 Contract side (`pd-contracts`)

Read the actual PDProject/PDFactory code first (KNOW, never guess — this brief
deliberately does not assert their current shape). Requirements to land:

- Window-mode minting: during a drop's opening window the contract does not
  order by arrival; settlement is **server-authorized** (signed by a PD
  settlement key) so the off-chain draw is enforceable on-chain. Supply cap
  enforced on-chain as ever.
- **Sealed state**: contested-minted tokens non-transferable until reveal
  timestamp/flag. Uncontested paths untouched.
- Void/cascade compatibility: settlement happens in batches; a re-drawn seat
  is just another authorized mint.
- Draw verifiability: commit hash + blockhash formula published; transcript
  off-chain, anchor on-chain if cheap.
- Foundry bootstrap for tests: `pd-contracts/CLAUDE.md` has the container
  recipe (npm forge + soldeer; ~1 min to green).
- **Sequencing reality:** contracts are pre-mainnet (Sepolia phase → Mythic
  Audit → mainnet, `docs/sepolia-test-phase.md`). Contested-mint contract
  changes must ride BEFORE the audit gate or wait for a v2 — surface this
  scheduling question to Brendon at build start.

### 6.2 App side (`PriceOS`)

- **Sim rail first.** PD runs a sim economy today with the chain rail dormant
  until cutover (the Exchange precedent: two rails, one book). Build the
  entire window/contested/draw/settlement machine on the sim rail — it
  exercises everything except wallet plumbing — then wire the chain rail with
  the §6.0 spike's winner.
- Drop window state machine (server-side, authoritative): OPEN → WINDOW →
  (UNDERSUBSCRIBED settle | CONTESTED → DRAW → SETTLE → SEALED → REVEAL),
  driven off the existing project/mint state, KV/DB-backed, resumable.
- Entry API: press → signed order + standings snapshot ref + telemetry blob.
  SIWE-authed, one entry per account per drop (LOCKED: wallet = account).
- Sequencer module: banded scoring per §3.1 — pure function over indexed
  data, snapshot input, deterministic output, heavily unit-tested.
- Draw service: commit-reveal seed handling, transcript generation.
- Settlement worker: execute winners' orders, cascade failures, push refund-
  free losses (nothing to do), flip DB state, fire pings.
- Shadow sweep job: clustering over funding graph + device stamps + telemetry
  correlation; writes voids + taints. Start simple (funding parent + device
  exact-match) and iterate — a crude sweep that voids obvious clusters beats
  a perfect one that never ships.
- Passkey anchor: bind account ↔ passkey (WebAuthn, Secure Enclave);
  contested press includes the assertion. iOS PWA WebAuthn works; verify the
  exact Safari/PWA flows on-device early.
- Pings: entered / contested-flip / won / missed via the existing ping kinds
  machinery (the Exchange precedent for new kinds).

### 6.3 Data (Supabase — verify all live columns via MCP before writing)

New tables (RLS: SELECT `TO anon`/`TO authenticated`, never `TO public`;
shadow tables get NO public read at all):

- `drop_windows` (project, window open/close, state, seed commit, transcript)
- `drop_entries` (drop, account/wallet, order blob ref, band-at-snapshot,
  device stamp, result: WON/LOST/VOID/CASCADED)
- `standing_snapshots` (account, computed inputs, band, snapshot time)
- shadow: `clusters`, `taints` (kind: name/device/funding-wallet, permanent),
  `sweep_findings`
- Draw transcripts public; band thresholds and everything shadow: private.

### 6.4 Indexer (`PriceOS-indexer` — the serverless rebuild branch ONLY,
`claude/indexer-alchemy-setup-tuezqu`; `main` is DEAD, per CLAUDE.md)

Extend wallet ingestion to feed the sequencer: wallet birth, activity density,
lifetime gas, funding parent(s), ENS reverse record. Batch/cached — none of
this is needed at millisecond speed; snapshots are pre-drop.

### 6.5 Phasing

- **Phase 1 — the machine (sim rail):** window + tie + emergent contested +
  banded draw + settlement + cascade + basic sweep (funding + device
  exact-match) + Mint Room contested surface. This alone kills gas-race
  sniping and naive burner armies.
- **Phase 2 — the ID deepening:** passkey hardware anchor, telemetry
  correlation ("the hand"), taint graph, silent nullification plumbing.
- **Phase 3 — the theater + record:** sealed-reveal ritual polish, drop
  forensics page, docs page explaining the public ledger policy.
- Chain rail wiring rides the §6.0 spike outcome + the contract scheduling
  call (§6.1), targeting the Sepolia phase for a full rehearsal.

---

## 7. OPEN — BRENDON DECIDES (ask before building each)

1. Window length (default proposal: 10s).
2. Sealed-reveal duration for contested drops (hours-scale; proposal: 2h).
3. The "no true zero" felt-moment window open (§2.2 refinement) — in or out.
4. Poisoned-supply decoys (§3.3) — in, out, or later.
5. Drop forensics page (§4) — in, out, or later.
6. Artist guest-list carve-out — exists at all? (Leaning no from the chat.)
7. Per-account mint limit inside a contested window (1 assumed).
8. The public-policy copy (how the docs state the priority ladder) — his
   wording pass.
9. All UI doors/placements/treatments for the contested surface (Rule #-0.4).

## 8. Explicitly rejected in the brainstorm — do not resurface

- Auction mechanisms of any kind; allowlist as the mechanism.
- Rewarding performed behavior (activity-weighted odds, loser consolation
  standing, loyalty escalators) — anything rewardable is farmable.
- Escrow / holding user funds in any form.
- Any second user action after the press (claim taps, pay-later bills).
- Publishing band thresholds or any shadow-ledger signal.
- Loud bot bans (teaches the adversary; silence is the punishment).
