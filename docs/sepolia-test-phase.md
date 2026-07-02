# Sepolia PD Test Phase — Spec

**Status:** active · **Owner:** Brendon (CEO) + Claude (CTO mechanics)
**ClickUp:** task `86b9v5w77` (urgent) · feeds Mythic Audit Pass `86b9v5wj4`
**Canonical:** mirrored to ClickUp under the PD Master Brief → Smart Contract.

---

## 0. Why this phase exists (the one-paragraph version)

PD goes to mainnet **immutable** — no proxy, no pause, no admin reach into
deployed Projects. There is no patch-after-launch. So before mainnet we run the
entire stack against **Sepolia** as a full dress rehearsal: real contracts, real
wallet, real indexer, real frontend, real marketplace — testnet money. This
replaces the old no-chain "PD Preview" cohort beta (superseded 2026-05-14). The
canonical path is now:

> **dev preview → Sepolia smoke → Etherscan verify → mainnet Remix deploy**

Everything surfaced here flows into the **Mythic Audit Pass**, the last gate
before mainnet.

## 1. Goal & exit criteria

**Goal:** prove the launch-scope system behaves correctly under real network
conditions, end-to-end, and produce an observation log that feeds the audit.

**Done when (all true):**
- [ ] PDFactory + one test PDProject live on Sepolia, **both Etherscan-verified**
- [ ] Mint, fee-split, withdraw, and royalty paths exercised end-to-end on Sepolia
- [ ] Indexer running against Sepolia, populating Supabase; the 7 mocked API
      routes return **real** data
- [ ] Frontend dev preview talks to Sepolia (wallet connect → mint → see it in feed)
- [ ] Observation log captured (gas, anomalies, edge cases, marketplace quirks)
- [ ] Findings handed to the Mythic Audit Pass

## 2. Scope

**In scope (launch-scope contracts):** `PDFactory`, `PDProject`, `PaymentSplitter`.
**Out of scope (deferred):** `PDStickers` (ERC-1155), `$PRICE` ERC-20.

Three repos move together:

| Repo | What changes for this phase | Who acts |
|---|---|---|
| `pd-contracts` | Deploy to Sepolia, verify on Etherscan | Brendon (Remix mobile) — **ship gate** |
| `PriceOS-indexer` | Serverless rebuild (branch `claude/indexer-alchemy-setup-tuezqu` — repo `main` is dead Ponder/Railway code): register Sepolia addresses on the Alchemy webhook, fold routes into PriceOS | Claude wires · Brendon creates the webhook |
| `PriceOS` (this) | Add a Sepolia env profile + chain config | Claude — **free rein**, merge-gated |

## 3. Workstream — ordered

### Phase A — Contracts to Sepolia *(ship gate: Brendon)*
1. Sepolia MetaMask wallet (throwaway), funded via faucet. Per Brendon's call,
   no hardware wallet for a solo founder (failure vectors > attack vectors).
2. Deploy `PDFactory` via Remix. Constructor args: throwaway-admin,
   throwaway-platformWallet, base-URI placeholder.
3. Verify `PDFactory` on Sepolia Etherscan.
4. Whitelist a test artist address.
5. `createCollection()` → confirms `PDProject` + `PaymentSplitter` both deploy
   correctly under the factory.
6. Verify the deployed `PDProject` + `PaymentSplitter` on Etherscan.
7. **Record every deployed address** → these feed Phases B and C.

### Phase B — Indexer to Sepolia *(Claude wires, Brendon creates the Alchemy webhook)*
*(Rewritten 2026-07-02 — the old Ponder/Railway steps were superseded by the
serverless rebuild, 2026-06-29. Go-live detail: rebuild branch `docs/HANDOFF.md`.)*
1. Fold the serverless indexer (webhook route + reconcile sweep) from the
   rebuild branch into PriceOS (rides the Cloudflare cutover per Brendon's
   2026-06-29 call, or earlier if Sepolia arrives first).
2. Brendon creates the Alchemy webhook (steps in HANDOFF) + sets the signing
   key; register the Phase A contract addresses on it — and paste each
   contract address into its `projects` row (`contract_address` — that's the
   address→slug bridge AND the per-project cutover switch).
3. Send test events / run the reconcile sweep against Sepolia, confirm the
   Phase A events (mint, transfer, sale) populate Supabase.

### Phase C — Frontend to Sepolia *(Claude, free rein, merge-gated)*
1. Add a **Sepolia env profile** (separate from mainnet): Alchemy Sepolia RPC,
   `chainId 11155111`, Sepolia contract addresses, indexer/Supabase pointing at
   the Sepolia dataset.
2. Wagmi config: add Sepolia chain alongside mainnet, gated by an env flag so the
   preview can run on testnet without disturbing the mainnet path.
3. Flip the relevant routes off mock once the indexer populates (the
   `blocked-on-indexer` set in `docs/api-spec.md`).
4. Verify on the dev preview: connect wallet → mint → token shows in
   project/output/feed surfaces.

### Phase D — Exercise the flows *(Claude scripts/checklist, Brendon signs txns)*
Run a representative set and log each:
- [ ] Mint a few tokens — confirms blockhash entropy, fee split, artist payout
- [ ] `withdrawFrom()` path
- [ ] `batchWithdrawRange()` path
- [ ] Cooldown enforcement (needs time-warp equivalent — wait, or a second
      account; note the workaround used)
- [ ] List on Sepolia OpenSea → confirm royalty flows to `PaymentSplitter`
- [ ] Confirm the 60/40 secondary split + live platform-wallet read from factory

### Phase E — Observation log → audit handoff
Capture in a ClickUp sub-page of `86b9v5w77`:
- Gas usage per call (deploy, mint, withdraw, batch)
- Any unexpected behavior under real network conditions
- Edge cases that surface (last-edition races, sold-out, cooldown boundaries)
- Marketplace integration anomalies (royalty enforcement, metadata rendering)
Hand findings to the **Mythic Audit Pass** (`86b9v5wj4`).

## 4. Sepolia config matrix (frontend)

Mirror of the mainnet env (see `docs/api-spec.md`), re-pointed at Sepolia. Keep
mainnet and Sepolia profiles separate so neither clobbers the other.

| Var | Mainnet | Sepolia profile |
|---|---|---|
| Chain | `1` | `11155111` |
| RPC | Alchemy mainnet | Alchemy **Sepolia** endpoint |
| `*_FACTORY_ADDRESS` | (post-mainnet) | Phase A factory address |
| `*_PROJECT_ADDRESS` | (post-mainnet) | Phase A test project address |
| Supabase dataset | prod | Sepolia-indexed rows |
| `PRICE_TOKEN_ADDRESS` | (post-deploy) | n/a (out of scope) |

## 5. Roles & gates (recap)

- **Free rein (Claude, no asking):** all frontend/indexer wiring, env scaffolding,
  build verification, the observation-log structure, ClickUp updates.
- **Brendon's taps (the only approvals):**
  1. Merge frontend/indexer PRs into `dev`
  2. On-chain Sepolia deploys (Remix mobile) + signing the test transactions
  3. Creating the Alchemy webhook + signing key for the serverless indexer
- **Never automated:** mainnet anything, real-money writes.

## 6. Risks / watch-items

- **Cooldown testing** needs a time-warp the live network won't give — plan a
  second account or accept a documented gap, don't fake-pass it.
- **Immutability** means the Sepolia run is the real rehearsal; treat a Sepolia
  bug as a mainnet bug — it reopens the audit pass.
- **Marketplace royalty enforcement** is marketplace-dependent; OpenSea testnet
  behavior may differ from mainnet — note, don't assume.
- **Env bleed:** a misconfigured flag pointing the prod preview at Sepolia (or
  vice versa) would confuse data. Gate the profile explicitly.
