# Brief — the two items left from Brendon's 2026-08-02 queue

Brendon's words, verbatim, from the queue he pasted 2026-08-02 (everything
else on that list is SHIPPED to `dev` — see `docs/WIP.md`):

> - keychains have been reworked and smart contract rewritten/updated, please
>   review it all!
> - PDMCP wow pass!! MCP got upgraded and is now stateless does that change
>   our build? We want state of the art. Opus did an initial pass post-upgrade

## 1 · Keychain rework + contract review

The deliverable is a REVIEW — findings first, fixes only on real bugs, and
scope stays keychains.

- The rework lives in `pd-contracts` `main` (tip `9f5047b` at brief time):
  the rarity rebuild (`e2ec08f`), ELEMENTS (`6c79599`), the renderer part
  store split (`3259851`), yin/yang + eyes rounds. App side:
  `components/keychains/` + `lib/keychains/`.
- **Foundry bootstrap is a known recipe — read `pd-contracts/CLAUDE.md`
  FIRST** (forge from npm, deps from soldeer, symlinks; ~1 min). The
  bootstrap was already run once this session and works.
- **Check `forge build --sizes` before anything else.** A green suite says
  NOTHING about deployability (EIP-170). The renderer sat over the limit for
  two days once; `PDFactory` is separately known-over (ClickUp `86bb5nt0f` —
  pre-existing, NOT part of this review).
- Locks that bind the review (WIP + archive): the app engine is the parity
  REFERENCE — never "restore parity" by reverting the app; the worn hang
  shape is settled; completionism is 24 (yin ⚋ / yang ⚊ per shape); the art
  belongs to the CHARM; never print a word for odds — real percentages.
- Run the full suite; render a sample tokenURI via the cache/ recipe in
  `pd-contracts/CLAUDE.md` if art parity needs proving.

## 2 · PDMCP wow pass

- The question: MCP's spec got upgraded and is now STATELESS — does that
  change our build? Brendon wants state of the art.
- Opus did an initial post-upgrade pass — find it: `workers/pd-mcp/` in
  PriceOS (the Worker source), ClickUp `86bb4wzn5` (deploy the 2026-07-28
  round + mcp.pricediscussion.com), and the public manual at
  `content/docs/mcp.md` (endpoint: pd-mcp.pricediscussion.workers.dev).
- Read the current MCP spec (modelcontextprotocol.io) for the
  streamable-HTTP/stateless changes, diff our Worker against it, then the
  wow pass: what state-of-the-art looks like for PD's read-only public
  server, proposed as findings + a build list for Brendon's go.

Both were pre-authorized to push as they land ("push as you go for clear
items don't wait for my push" — 2026-08-02), but the review's FINDINGS come
back to him before any contract change ships.
