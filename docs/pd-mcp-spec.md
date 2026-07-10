# PD MCP Server — spec + cost table (v1 proposal)

> Status: **SPEC ONLY — awaiting Brendon's go.** (Queued 2026-07-10; spec'd same
> day.) Nothing here is built. Zero-dollar architecture on the existing
> Cloudflare account.

## What it is

A public **MCP server** — the standard plug that lets Claude (claude.ai, Claude
Code, and any other MCP client) read PD directly as structured tools instead of
scraping HTML. It makes PD legible to the agent ecosystem: a collector's Claude
can verify a contract is a real PD Project, pull an Output's provenance, read
project/output data, and search our docs — all server-side reads of things that
are already public.

This composes with the existing agent strategy: PD-Docs already ships
`/llms.txt`, `/llms-full.txt`, and raw-markdown URLs (the AFDocs play). The MCP
server is the *interactive* half — live data, not just prose.

## v1 tools (read-only, no auth)

| Tool | What it answers | Source |
|---|---|---|
| `verify_project` | "Is this contract a real PD Project?" → yes/no + slug, artist, supply | `PDFactory.isProject` via the cached RPC pattern (one upstream call per TTL window) + registry |
| `get_project` | Project card: name, artist, supply, minted count, colorway, mint price | public API (`/api/project/*`) |
| `get_output` | One piece: owner, traits (incl. Fate), mint time, listed state | public API + indexer-fed tables |
| `get_provenance` | A piece's life: mint → transfers → sales (times, prices, parties) | indexer-fed Supabase tables (public reads) |
| `search_docs` | Docs answers with citations to pricediscussion.com/docs URLs | `/llms.txt` manifest + raw `.md` pages |

Explicitly **out of v1**: anything that writes, anything wallet-scoped or
private, anything that costs money to serve. Adding an authed tier later
(e.g. "my portfolio") is a clean extension, not a rework.

## Architecture

- **One new Cloudflare Worker** (`pd-mcp`) on the existing account, using
  Cloudflare's own MCP framework (the `agents` SDK / `workers-mcp` — remote MCP
  over streamable HTTP/SSE, the pattern Cloudflare documents and hosts its own
  MCP servers on).
- Tools call the **existing public app API + Supabase anon reads** — no new
  data paths, no service keys in the MCP worker beyond what the public site
  already exposes.
- Chain reads (`verify_project`) go through the same **cached-route pattern as
  `/api/gas`**: one upstream RPC call per TTL window regardless of caller
  count, so agent traffic can never run up the Alchemy meter.
- Suggested home: `mcp.pricediscussion.com` (a one-click subdomain route on the
  existing zone), workers.dev URL until then.

## Cost table

| Piece | Free-tier ceiling | Expected at launch scale | Cost |
|---|---|---|---|
| Workers requests | 100,000 req/day | hundreds/day | $0 |
| Worker CPU | 10 ms/invocation (free plan) | reads are I/O-bound, well under | $0 |
| KV (tool-response cache) | 100k reads / 1k writes per day | small | $0 |
| Upstream RPC (Alchemy) | free tier, throttles not bills | ~constant (cached windows) | $0 |
| Supabase reads | existing free project | marginal | $0 |
| Domain | zone already owned | one DNS record | $0 |

**Total: $0 at launch scale.** The ceiling that binds first is Workers'
100k/day; if agent traffic ever approaches that, that's a success problem and
the $5/mo Workers Paid tier lifts it by 100×.

## Build estimate

One session: scaffold worker + the five tools + KV caching + deploy (~half the
work is tool-shaping and docs-search over llms.txt). Verification: connect it
to a Claude session and run each tool live.

## Open calls for Brendon

1. **Go / no-go** on building v1.
2. Subdomain now (`mcp.pricediscussion.com`) or workers.dev until launch.
3. Whether `search_docs` should answer from `/llms-full.txt` verbatim only
   (safest — never hallucinate PD facts) — recommended yes.
