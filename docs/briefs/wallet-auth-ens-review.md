# BRIEF — Wallet / auth / ENS reliability review (the launch gate)

**For a fresh Opus 4.8 session. Read CLAUDE.md first; subagents allowed.**

## The ask (Brendon, 2026-07-03, verbatim intent)

"Do they all look good? Will they be reliable? Can I start letting people
other than me connect and feel good about it?" The app has only ever had
Brendon connecting. Before real strangers connect wallets, he wants a
**verdict per piece — RELIABLE / FIX-FIRST / FINE — with evidence**, not
vibes. This is a REVIEW: report first. Only fix things after Brendon reads
the findings and says which to fix (present the fix list, get his go).

## Scope — every path a stranger's wallet can take

- **Connect:** `lib/wallet/wagmiConfig.ts` (Rainbow/WalletConnect + chain
  profile, `NEXT_PUBLIC_CHAIN_ID` gate), `lib/wallet/accountClient.ts`,
  `lib/wallet/walletBus.ts`, the connect menu UI.
- **Sign-in (SIWE):** `app/api/auth/nonce` + `app/api/auth/siwe` +
  `lib/auth/siwe.ts` + `lib/wallet/siweClient.ts` / `siweSession.ts`
  (iron-session cookie). Session lifetime, nonce reuse, replay, the
  `requireAuth` wrapper on write routes, dev-login (`app/api/auth/dev-login`)
  MUST be prod-inert — verify how it's gated.
- **ENS:** `lib/engines/ensEngine.ts` + the `pricediscussion.eth` detection
  (portfolio). What happens for users WITH an ENS name vs without; reverse
  lookups; failure modes when the RPC hiccups.
- **New-user rails:** first connect → users row → handle claim → RLS
  (Supabase project `zspxpfwlwikdxwavffjn`; SELECT to anon/authenticated,
  never public). What breaks if two wallets claim simultaneously, if a
  wallet disconnects mid-claim, if the same wallet connects on two devices.
- **The Cloudflare seam:** sessions/cookies + SIWE on the Workers runtime —
  the app JUST moved (2026-07-03); anything that assumed Vercel (headers,
  IP, crypto APIs in the session layer) gets special scrutiny.
  WalletConnect metadata/allowed-origins vs the new
  `pricediscussion.pricediscussion.workers.dev` origin.

## Deliverable (in chat, for Brendon)

Numbered verdict list, one line per piece: RELIABLE / FIX-FIRST / FINE +
the reason in plain English. FIX-FIRST items each get a paragraph: concrete
failure a real user would hit, and the proposed smallest fix. No fixes
shipped until he picks. If everything is genuinely solid, say exactly that —
no manufactured findings.
