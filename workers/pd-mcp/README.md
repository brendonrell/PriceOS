# PDMCP — Price Discussion's public MCP server

One zero-dependency Cloudflare Worker (`src/index.ts`) speaking **MCP
2026-07-28** (the stateless revision) over streamable HTTP, still answering
clients back to `2025-03-26`. Dual-era: requests declaring 2026-07-28 get the
revision's full strictness (required `params._meta` fields, mirrored-header
validation, `supportedVersions` discovery with the PD icon inlined, 400/404
error statuses); older handshake clients keep their lenient behaviour. Eleven read-only tools — the way in
(`list_projects`, `get_activity`, `get_collector`, `get_artist`) and the
detail (`verify_project`, `get_project`, `get_output`, `get_provenance`,
`get_ascii`, `query_traits`, `search_docs`). `get_output` also carries an MCP
App that renders the piece itself in the conversation.
Public story + agent manual: `/docs/mcp` (content/docs/mcp.md).
Plan of record: `docs/pd-mcp-spec.md` (protocol section covers the 2026-07-28
conformance).

Home is `mcp.pricediscussion.com` — the route is wired; it provisions on the
next `wrangler deploy` of this worker. Until that record resolves, the
workers.dev URL is the live endpoint and the public docs point there.

## Deploy (one-time, ~3 minutes, from this directory)

```bash
npm install                                   # wrangler + types only
npx wrangler kv namespace create PD_MCP_CACHE # paste the id into wrangler.jsonc
# fill ART_IMAGE_BASE in wrangler.jsonc = the app build's NEXT_PUBLIC_ART_IMAGE_BASE
npx wrangler deploy
```

Then connect a Claude session to `https://pd-mcp.<account>.workers.dev`
(Settings → Connectors → Add custom connector) and exercise every tool.

## Verified

Tool logic was exercised end-to-end against the live dev deploy + live
Supabase anon reads + live Sepolia RPC before first commit (initialize,
tools/list, and all seven tools). `get_ascii` needs ART_IMAGE_BASE set at
deploy time; it fail-softs with a clear message until then.

## Notes

- Caching: KV, one upstream call per TTL window per key (the /api/gas
  pattern). Chain reads can never run up an RPC meter.
- ⛔ **MAINNET CUTOVER — RPC_URL, CHAIN_ID and FACTORY_ADDRESS flip together.**
  The default is a keyless public Sepolia endpoint. `chainGuard()` checks the
  RPC's actual chain id against CHAIN_ID and confirms the factory has code
  before `verify_project` answers anything; on a mismatch it REFUSES instead
  of returning "not a PD Project". Without that guard a botched cutover would
  have PD's own tool calling every genuine Project fake.
- Claude connectors directory path: needs the custom domain
  (mcp.pricediscussion.com), an OAuth stub, privacy policy + support
  contact — usable day-one as a custom connector while that runs.
