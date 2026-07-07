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

---

# ADDENDUM (2026-07-06, end of Fable session): indexer go-live remainder

State: webhook → site → DB pipe is live on Sepolia EXCEPT the final proof.
Root-caused and fixed today: the indexer inside PriceOS read SUPABASE_URL,
Cloudflare only sets NEXT_PUBLIC_SUPABASE_URL → every webhook write silently
no-op'd behind a 200 (per-log fault isolation ate the throw). Fallback shipped
on dev. The missed delivery (token-2 transfer, project pd-test-alpha
0x7eb2ea63d41e34a8338cd92ea06adee4b54a1cf6) is NOT backfilled yet.

Remaining, in order:
1. Prove the pipe: one more transfer on the test project (token 3, throwaway
   0x80564f…1773 → 0x1460…B9B8) after the fix deploys → confirm events row +
   holders update in Supabase (project_id 'pd-test-alpha').
2. Reconcile sweep go-live: set CRON_SECRET + ALCHEMY_RPC_URL on the Worker,
   and schedule the sweep on Cloudflare (the transplant's cron file is
   Vercel-shaped — Workers needs a Cron Trigger in wrangler.jsonc hitting
   /api/cron/indexer-reconcile with the Bearer secret; custom-worker.ts is the
   place for a scheduled handler). Sweep window default 50 blocks — a manual
   run right after go-live backfills the missed token-2 transfer only if run
   within ~10 min of it; otherwise insert that one events row by hand or
   re-fire a transfer.
3. Webhook payload validation (HANDOFF step 5) is still UNCONFIRMED against a
   real delivery — the env bug masked it. If the token-3 transfer writes rows,
   parse() is proven too. If rows still don't appear, capture the raw payload
   (debug-log it on parse-empty) before touching parse().
4. Then: Phase C frontend Sepolia profile · OpenSea listing royalty check ·
   Phase E observation log → Mythic Audit Pass (86b9v5wj4).
