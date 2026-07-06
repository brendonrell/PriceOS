# Brief: port /test (Sepolia readiness tester) to MAINNET — for a future Opus session

**When:** mainnet deploy day, after Brendon deploys the stack from /deploy
(re-pointed at mainnet) or Remix. **Requested by Brendon 2026-07-06** ("I would
love something similar for mainnet when that time comes").

## What exists

`app/test/page.tsx` — a standalone tool page (bare-route, no app shell; see
`middleware.ts` x-pd-bare-route) that runs the contract readiness matrix
against the deployed Sepolia stack and prints a green/red report + gas bill.
Read its header comment first: matrix R1–R3, T1–T8. Contract interfaces come
from `lib/deploy/artifacts.json` + `lib/deploy/testerAbis.json` (regenerate
from a fresh pd-contracts build — the pd-contracts CLAUDE.md has the container
bootstrap recipe; NEVER reuse stale ones, byte-compare like the 2026-07-06
session did).

## What changes for mainnet

1. Copy to `app/test-mainnet/page.tsx` (keep the Sepolia one). Add the new
   route to the middleware bare-route stamp + matcher.
2. Swap the config block at the top: `mainnet` chain, the REAL factory /
   registry addresses (deploy-day values), Brendon's real wallets.
3. **REAL MONEY discipline — the whole point of the port:**
   - The "throwaway key" becomes a REAL funded burner Brendon creates for the
     day. Balance banner + a hard confirm before RUN showing the projected
     spend in ETH **and USD at live price**.
   - T4 mint uses the real mint price — read it from the created project, do
     not assume 0.00022.
   - T7's royalty sim sends real ETH through the splitter and withdraws it
     back — net loss is gas only; say so in the UI.
   - Every tx that leaves value anywhere must end with the value withdrawn
     back to the burner where the contracts allow it.
4. The cooldown negative test (T2) and wrong-payment test (T3) are simulated
   calls — free on mainnet too. Keep them.
5. Mainnet Etherscan verification: reuse the staged standard-JSON flow from
   the 2026-07-06 session (forge verify-contract --show-standard-json-input;
   constructor args encoding is in the session's scratch commands and trivial
   to redo).
6. Ship gates still apply: Brendon signs the whitelist tap; the burner key is
   his; nothing runs without his RUN tap. On-chain deploys stay HIS action.

## Gotchas learned on Sepolia (don't rediscover)

- The one admin-gated step is whitelistArtist — it needs Brendon's wallet
  connected; everything else runs headless off the burner key.
- MetaMask's default fee ceiling reserves ~2× base fee — if the burner is
  funded tightly, the page's own txs are fine (viem uses saner estimates),
  but tell Brendon to fund with real headroom.
- Primary mint split pays out INSTANTLY at mint (95% artist / 5% platform +
  storage fee) — the splitter only ever holds secondary royalties (60/40).
  Assertions must target the right wallets or they false-fail.
- `ProjectCreated` event carries both the project and splitter addresses —
  decode it, don't compute them.
