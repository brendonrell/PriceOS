# PDMCP — Price Discussion's public MCP server

One zero-dependency Cloudflare Worker (`src/index.ts`) speaking MCP over
streamable HTTP. Seven read-only tools: `verify_project`, `get_project`,
`get_output`, `get_provenance`, `get_ascii`, `query_traits`, `search_docs`.
Public story + agent manual: `/docs/mcp` (content/docs/mcp.md). Plan of
record: `docs/pd-mcp-spec.md`.

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
- The RPC default is a keyless public Sepolia endpoint — swap RPC_URL and
  FACTORY_ADDRESS at mainnet cutover.
- Claude connectors directory path: needs the custom domain
  (mcp.pricediscussion.com), an OAuth stub, privacy policy + support
  contact — usable day-one as a custom connector while that runs.
