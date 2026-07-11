---
title: "PDMCP — the PD MCP Server"
description: "Connect any AI agent to Price Discussion: the PDMCP server's endpoint, every tool with its exact arguments and answer shapes, how to render PD artwork inline in a chat, trait × market analytics, and the guarantees behind the data."
category: "building"
keywords: ["mcp", "agents", "ai", "claude", "chatgpt", "model context protocol", "pdmcp", "tools"]
last_updated: "2026-07-11"
---

# PDMCP — the PD MCP Server

PDMCP is Price Discussion's public [Model Context Protocol](https://modelcontextprotocol.io)
server: the standard plug that lets ANY AI agent — Claude, ChatGPT, Claude
Code, Cursor, a LangChain pipeline, your own bot — read PD as live,
structured tools instead of scraping HTML. Ask your assistant *"is this
contract a real PD Project?"*, *"who owns Chladni #22 and what has it sold
for?"*, *"does landscape or portrait sell better?"*, or *"show me the piece"*
— and it answers from the same public data the site itself runs on.

If you are an agent reading this page: connect to the endpoint below and
call `tools/list`. Every tool is read-only and unauthenticated. This page is
your manual.

## Connecting

- **Endpoint:** `https://pd-mcp.pricediscussion.workers.dev` (streamable
  HTTP — POST JSON-RPC 2.0 to the root; a `mcp.pricediscussion.com` home is
  planned).
- **Claude (claude.ai / desktop):** Settings → Connectors → *Add custom
  connector* → paste the endpoint URL.
- **Claude Code:** `claude mcp add --transport http pd
  https://pd-mcp.pricediscussion.workers.dev`
- **Anything else:** any MCP client that speaks streamable HTTP works; the
  server is stateless, so sessions cost nothing and reconnects are free.

No key, no signup, no write access. Everything PDMCP can see is already
public: the app's own API, the public database reads, the pinned artifacts,
and these docs.

## The tools

### `verify_project` — authenticity in one call

**Ask it:** "Is `0xABC…` a real PD Project?"
**Arguments:** `address` (the 0x… contract address).
**Answers:** yes/no, checked against the on-chain factory —
`PDFactory.isProject(address)` — the [same verification pattern](/docs/for-collectors/the-secondary-market)
collectors are taught. A YES means the contract was deployed through PD's
factory and is genuine; a NO means it merely claims to be. Use this before
trusting any marketplace listing that says "PD."

### `get_project` — the Project card

**Ask it:** "What's the state of Chladni?"
**Arguments:** `slug` (lowercase project slug, e.g. `chladni`).
**Answers:** minted count, signature colorway, the Project's PriceSprite,
soundtrack, market stats, live listed count and floor, and the canonical
page URL.

### `get_output` — one piece, completely

**Ask it:** "Tell me about Chladni #22."
**Arguments:** `slug`, `token_id` (1-based).
**Answers:** current owner, original minter, mint moment, the piece's
[True Name](/docs/app/outputs), listing state and last sale, the full trait
set — artist traits plus the platform traits every Output carries (Artist,
Project, PriceDay, the natal chart, [Fate](/docs/app/outputs)) — and the
stored **visual fingerprint**: orientation, brightness, saturation, palette
size, contrast, warmth, symmetry, texture, scene and pattern read from the
artwork's actual pixels.

### `get_provenance` — the piece's life

**Ask it:** "Walk me through this piece's history."
**Arguments:** `slug`, `token_id`.
**Answers:** the recorded timeline — mint → transfers → sales — with
timestamps, parties, and ETH prices. Priced transfers are sales. This is
the off-chain mirror of the ERC-721 event log, so an agent can cross-check
it against the chain any time.

### `get_ascii` — SHOW the artwork, inline

**Ask it:** "Show me Chladni #22."
**Arguments:** `slug`, `token_id`.
**Answers:** the piece's permanent [ASCII backup artifact](/docs/app/outputs)
— real, renderable art derived deterministically from the same generative
engine. Put it in a monospace code block and the artwork appears inline in
the conversation — no image pipeline, no viewer, pure text. This is the
fastest way for an agent to *show* PD art anywhere text renders.

### `query_traits` — traits × the market

**Ask it:** "Does landscape or portrait sell better?" · "Which Fate carries
the highest average sale?" · "Do bright pieces list more than dark ones?"
**Arguments:** `dimension` (required), `slug` (optional — omit for the whole
catalog).
**Answers:** the catalog grouped by that dimension, each bucket crossed with
the market: piece count, sale count, average sale, top sale, ETH volume,
live listed count, and floor.

Dimensions cover the platform's whole stored vocabulary — `orientation`,
`fate`, `natal_sun` / `natal_moon` / `natal_rising` / `natal_element`,
`brightness_band`, `saturation_band`, `palette_band`, `contrast_band`,
`warmth_band`, `symmetry_band`, `air_band`, `texture_band`, `tone_mood`,
`color_temperature`, `scene`, `pattern`, `dominant_color`, `accent_color`,
`rarity`, `price_day`, `birth_weekday`, `birth_season`, `lunar_phase`,
`primary_trait_value`, `artist`, and `project_id`. Any question that crosses
*what a piece is like* with *how the market treats it* is one call.

### `search_docs` — these docs, verbatim

**Ask it:** anything about how PD works.
**Arguments:** `query`.
**Answers:** verbatim excerpts from these docs with source URLs, drawn from
the same [/llms.txt](/llms.txt) manifest agents crawl. The tool quotes; it
never paraphrases — so an agent citing PDMCP is citing
pricediscussion.com/docs itself.

## Guarantees

- **Read-only, forever, at this endpoint.** No tool writes, signs, spends,
  or touches anything wallet-scoped. An agent connected to PDMCP cannot be
  tricked into moving anything.
- **Public data only.** Every answer is assembled from surfaces that are
  already public. There is nothing to leak.
- **Cheap by design.** Answers are cached at the edge; chain reads collapse
  to one upstream call per cache window no matter how many agents ask. Use
  it freely.
- **The chain outranks us.** Anything PDMCP reports about tokens is
  reproducible from Ethereum directly — see
  [Building on PD](/docs/building-on-pd) for the raw chain surface. If an
  answer ever disagrees with the chain, the chain is right.

## For toolmakers

PDMCP is itself a worked example of what [Building on PD](/docs/building-on-pd)
describes: one zero-dependency Cloudflare Worker over public reads. If you
want a tool PDMCP doesn't have, build it — or ask for it in the
[Discord](https://discord.gg/mJteKZmg28) and it may simply get added.
