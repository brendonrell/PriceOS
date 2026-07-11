/*
 * PDMCP — Price Discussion's public MCP server.
 *
 * A remote MCP server (JSON-RPC 2.0 over streamable HTTP) that makes PD
 * legible to the agent ecosystem: any MCP client — Claude, ChatGPT, Claude
 * Code, an agent framework — can verify PD Projects on-chain, read Projects /
 * Outputs / provenance, pull a piece's ASCII artifact to render INLINE in
 * chat, cross traits with sales ("does landscape or portrait sell better?"),
 * and search PD-Docs with citations.
 *
 * Design rules (docs/pd-mcp-spec.md — the plan of record):
 *   - READ-ONLY, no auth, nothing wallet-scoped, nothing that costs money.
 *   - Every answer comes from things that are already public: the app's own
 *     API, anon Supabase reads, the public R2 artifacts, /llms.txt docs.
 *   - Chain reads ride ONE cached upstream call per TTL window (the /api/gas
 *     pattern) — agent traffic can never run up an RPC meter.
 *   - Zero dependencies. This file IS the server; `wrangler deploy` ships it.
 *
 * Transport: streamable HTTP (POST /) per the MCP spec. Stateless — every
 * call carries everything it needs, so any number of clients can share it.
 */

export interface Env {
    CACHE: KVNamespace;
    /** Service binding to the `pricediscussion` app Worker. workers.dev →
     *  workers.dev fetches on the SAME account are blocked by Cloudflare
     *  (error 1042), so every call to the app rides this binding instead. */
    PD_APP?: { fetch: typeof fetch };
    PD_APP_ORIGIN: string;
    PD_DOCS_ORIGIN: string;
    ART_IMAGE_BASE: string;
    RPC_URL: string;
    FACTORY_ADDRESS: string;
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
}

/* ── MCP plumbing ───────────────────────────────────────────────────────── */

const PROTOCOL_VERSION = '2025-06-18';
const SERVER_INFO = { name: 'pd-mcp', title: 'Price Discussion (PD)', version: '1.0.0' };

const INSTRUCTIONS = `Price Discussion (PD) is a web3 art platform where generative Projects mint
Outputs (individual pieces) on Ethereum. This server gives you live, public,
read-only PD data. Start with get_project or search_docs. Token ids are
1-based. All prices are ETH. verify_project answers whether a contract
address is a genuine PD Project (deployed through the PDFactory).
get_ascii returns a piece's permanent ASCII backup — render it in a code
block to SHOW the artwork inline. query_traits crosses the catalog's stored
trait + visual-fingerprint vocabulary with sales and listings, so questions
like "does landscape or portrait sell better?" are one call. Docs answers
quote pricediscussion.com/docs verbatim with source URLs.`;

type Json = Record<string, unknown>;

const CORS: Record<string, string> = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, mcp-session-id, mcp-protocol-version',
};

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json', ...CORS },
    });
}

function rpcResult(id: unknown, result: unknown): Json {
    return { jsonrpc: '2.0', id, result };
}
function rpcError(id: unknown, code: number, message: string): Json {
    return { jsonrpc: '2.0', id, error: { code, message } };
}

/* Tool results: MCP content blocks. */
function toolText(text: string, structured?: unknown): Json {
    return {
        content: [{ type: 'text', text }],
        ...(structured !== undefined ? { structuredContent: structured } : {}),
    };
}
function toolErr(message: string): Json {
    return { content: [{ type: 'text', text: message }], isError: true };
}

/* ── Cached fetch helpers (the /api/gas pattern: one upstream per window) ── */

async function cached<T>(env: Env, key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    const hit = await env.CACHE.get(key, 'json').catch(() => null);
    if (hit !== null && hit !== undefined) return hit as T;
    const fresh = await load();
    // KV minimum TTL is 60s.
    await env.CACHE.put(key, JSON.stringify(fresh), { expirationTtl: Math.max(60, ttlSeconds) }).catch(() => {});
    return fresh;
}

/** Fetch a same-app URL through the service binding (see Env.PD_APP). */
function appFetch(env: Env, url: string, init?: RequestInit): Promise<Response> {
    return env.PD_APP ? env.PD_APP.fetch(url, init) : fetch(url, init);
}

async function appJson(env: Env, path: string): Promise<unknown> {
    const r = await appFetch(env, `${env.PD_APP_ORIGIN}${path}`, { headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error(`PD API ${path} answered ${r.status}`);
    return r.json();
}

async function supaRest(env: Env, pathAndQuery: string): Promise<unknown> {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
        headers: { apikey: env.SUPABASE_ANON_KEY, authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
    });
    if (!r.ok) throw new Error(`data read failed (${r.status})`);
    return r.json();
}

/* ── Tools ──────────────────────────────────────────────────────────────── */

const SLUG_RE = /^[a-z0-9]{3,50}$/;
const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

function requireSlug(args: Json): string {
    const slug = String(args.slug ?? '').toLowerCase().trim();
    if (!SLUG_RE.test(slug)) throw new Error('slug must be the project slug, e.g. "chladni"');
    return slug;
}
function requireTokenId(args: Json): number {
    const id = Number(args.token_id);
    if (!Number.isInteger(id) || id < 1 || id > 9999) throw new Error('token_id must be an integer ≥ 1');
    return id;
}

/* verify_project — PDFactory.isProject(address), cached. The selector is
   keccak256("isProject(address)")[0:4] for the factory's public mapping. */
async function verifyProject(env: Env, args: Json): Promise<Json> {
    const address = String(args.address ?? '').trim();
    if (!ADDR_RE.test(address)) return toolErr('address must be a 0x… contract address (40 hex chars)');
    const result = await cached(env, `verify:${address.toLowerCase()}`, 600, async () => {
        const data = '0x05c81408' + address.slice(2).toLowerCase().padStart(64, '0');
        const r = await fetch(env.RPC_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0', id: 1, method: 'eth_call',
                params: [{ to: env.FACTORY_ADDRESS, data }, 'latest'],
            }),
        });
        if (!r.ok) throw new Error(`RPC answered ${r.status}`);
        const body = (await r.json()) as { result?: string; error?: { message?: string } };
        if (body.error) throw new Error(body.error.message ?? 'RPC error');
        return { isProject: BigInt(body.result ?? '0x0') === 1n };
    });
    const yes = (result as { isProject: boolean }).isProject;
    return toolText(
        yes
            ? `YES — ${address} was deployed through the PD Factory (${env.FACTORY_ADDRESS}). It is a genuine PD Project contract.`
            : `NO — ${address} is NOT a PD Project. It was not deployed through the PD Factory (${env.FACTORY_ADDRESS}).`,
        { address, isProject: yes, factory: env.FACTORY_ADDRESS },
    );
}

/* get_project — the project card, condensed from the app's own API. */
async function getProject(env: Env, args: Json): Promise<Json> {
    const slug = requireSlug(args);
    const data = await cached(env, `project:${slug}`, 60, () => appJson(env, `/api/project/${slug}/outputs`));
    const d = data as Json;
    const outputs = (d.outputs as Json[] | undefined) ?? [];
    const listed = outputs.filter((o) => o.list_price_eth != null);
    const card = {
        slug,
        minted_count: d.minted_count ?? outputs.length,
        colorway: d.colorway ?? null,
        price_sprite: d.price_sprite ?? null,
        soundtrack: d.soundtrack ?? null,
        stats: d.stats ?? null,
        listed_count: listed.length,
        floor_eth: listed.length ? Math.min(...listed.map((o) => Number(o.list_price_eth))) : null,
        page: `${env.PD_APP_ORIGIN}/art/${slug}`,
    };
    return toolText(JSON.stringify(card, null, 2), card);
}

/* Shared: one output's full detail from the app API. */
async function outputDetail(env: Env, slug: string, id: number): Promise<Json> {
    return (await cached(env, `output:${slug}:${id}`, 60, () => appJson(env, `/api/output/${slug}-${id}`))) as Json;
}

/* get_output — one piece: owner, traits, fingerprint, listing state. */
async function getOutput(env: Env, args: Json): Promise<Json> {
    const slug = requireSlug(args);
    const id = requireTokenId(args);
    const d = await outputDetail(env, slug, id);
    const out = {
        id: `${slug} #${id}`,
        owner: d.owner,
        minter: d.minter,
        minted_at: d.minted_at,
        true_name: d.true_name ?? null,
        list_price_eth: d.list_price_eth ?? null,
        last_sale_eth: d.last_sale_eth ?? null,
        traits: d.traits ?? {},
        visual_fingerprint: d.fingerprint ?? null,
        page: `${env.PD_APP_ORIGIN}/art/${slug}/${id}`,
    };
    return toolText(JSON.stringify(out, null, 2), out);
}

/* get_provenance — the piece's life: mint → transfers → sales, in order. */
async function getProvenance(env: Env, args: Json): Promise<Json> {
    const slug = requireSlug(args);
    const id = requireTokenId(args);
    const d = await outputDetail(env, slug, id);
    const history = ((d.history as Json[] | undefined) ?? []).map((e) => ({
        type: e.type,
        at: e.created_at ?? e.at ?? null,
        from: e.from_address ?? null,
        to: e.to_address ?? null,
        price_eth: e.price_eth ?? null,
    }));
    const lines = history.map((e) => {
        const price = e.price_eth != null ? ` for ${e.price_eth} ETH` : '';
        return `${String(e.at ?? '').slice(0, 16)}  ${String(e.type).toUpperCase()}${price}  ${e.from ?? ''}${e.from && e.to ? ' → ' : ''}${e.to ?? ''}`.trim();
    });
    const text = lines.length
        ? `Provenance of ${slug} #${id} (oldest last):\n${lines.join('\n')}`
        : `${slug} #${id} has no recorded events — it may not be minted yet.`;
    return toolText(text, { slug, token_id: id, events: history });
}

/* get_ascii — the piece's permanent ASCII artifact, render-ready. */
async function getAscii(env: Env, args: Json): Promise<Json> {
    const slug = requireSlug(args);
    const id = requireTokenId(args);
    if (!env.ART_IMAGE_BASE) return toolErr('ASCII artifacts are not configured on this server yet (ART_IMAGE_BASE unset).');
    const artifact = await cached(env, `ascii:${slug}:${id}`, 3600, async () => {
        const r = await appFetch(env, `${env.ART_IMAGE_BASE}/${slug}/${id}.ascii.json`);
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`artifact read failed (${r.status})`);
        return r.json();
    });
    if (!artifact) {
        return toolErr(`No ASCII artifact pinned for ${slug} #${id} yet — artifacts pin as pieces are viewed on the site.`);
    }
    const a = artifact as { rows?: string[]; text?: string };
    const text = Array.isArray(a.rows) ? a.rows.join('\n') : typeof a.text === 'string' ? a.text : JSON.stringify(a);
    return toolText(
        `ASCII artifact of ${slug} #${id} — show it in a monospace code block to render the artwork inline:\n\n${text}`,
    );
}

/* query_traits — the catalog's stored trait + fingerprint vocabulary crossed
   with sales and listings. This is the "does landscape or portrait sell
   better?" tool: pick a dimension, get per-bucket counts, sales, averages,
   and floors, project-scoped or catalog-wide. */
const DIMENSIONS = [
    'orientation', 'fate', 'natal_sun', 'natal_moon', 'natal_rising', 'natal_element',
    'brightness_band', 'saturation_band', 'palette_band', 'contrast_band', 'warmth_band',
    'symmetry_band', 'air_band', 'texture_band', 'tone_mood', 'color_temperature',
    'scene', 'pattern', 'dominant_color', 'accent_color', 'rarity', 'price_day',
    'birth_weekday', 'birth_season', 'lunar_phase', 'primary_trait_value', 'artist', 'project_id',
] as const;

async function queryTraits(env: Env, args: Json): Promise<Json> {
    const dimension = String(args.dimension ?? '');
    if (!(DIMENSIONS as readonly string[]).includes(dimension)) {
        return toolErr(`dimension must be one of: ${DIMENSIONS.join(', ')}`);
    }
    const slug = args.slug != null && String(args.slug).trim() !== '' ? requireSlug(args) : null;
    const scope = slug ? `&project_id=eq.${slug}` : '';
    const key = `traits:${dimension}:${slug ?? 'all'}`;

    const result = await cached(env, key, 300, async () => {
        const [rows, sales, listings] = await Promise.all([
            supaRest(env, `outputs?select=project_id,token_id,${dimension}${scope ? `&project_id=eq.${slug}` : ''}`),
            supaRest(env, `events?select=project_id,token_id,price_eth&price_eth=not.is.null${scope}`),
            supaRest(env, `listings?select=project_id,token_id,price_eth&active=eq.true${scope}`),
        ]);
        const saleByToken = new Map<string, number[]>();
        for (const s of sales as { project_id: string; token_id: string; price_eth: number | string }[]) {
            const k = `${s.project_id}:${s.token_id}`;
            (saleByToken.get(k) ?? saleByToken.set(k, []).get(k)!).push(Number(s.price_eth));
        }
        const listByToken = new Map<string, number>();
        for (const l of listings as { project_id: string; token_id: string; price_eth: number | string }[]) {
            listByToken.set(`${l.project_id}:${l.token_id}`, Number(l.price_eth));
        }
        type Bucket = { pieces: number; sales: number; sale_volume_eth: number; avg_sale_eth: number | null; top_sale_eth: number | null; listed: number; floor_eth: number | null };
        const buckets = new Map<string, Bucket>();
        for (const row of rows as Record<string, unknown>[]) {
            const value = row[dimension] == null || row[dimension] === '' ? '(unset)' : String(row[dimension]);
            const k = `${row.project_id}:${row.token_id}`;
            let b = buckets.get(value);
            if (!b) { b = { pieces: 0, sales: 0, sale_volume_eth: 0, avg_sale_eth: null, top_sale_eth: null, listed: 0, floor_eth: null }; buckets.set(value, b); }
            b.pieces++;
            for (const p of saleByToken.get(k) ?? []) {
                b.sales++;
                b.sale_volume_eth += p;
                b.top_sale_eth = b.top_sale_eth === null ? p : Math.max(b.top_sale_eth, p);
            }
            const lp = listByToken.get(k);
            if (lp !== undefined) {
                b.listed++;
                b.floor_eth = b.floor_eth === null ? lp : Math.min(b.floor_eth, lp);
            }
        }
        const table = [...buckets.entries()]
            .map(([value, b]) => ({
                value,
                ...b,
                avg_sale_eth: b.sales ? Number((b.sale_volume_eth / b.sales).toFixed(6)) : null,
                sale_volume_eth: Number(b.sale_volume_eth.toFixed(6)),
            }))
            .sort((a, b) => b.pieces - a.pieces);
        return { dimension, project: slug ?? 'ALL PROJECTS', buckets: table };
    });

    const r = result as { dimension: string; project: string; buckets: Json[] };
    const head = `${r.dimension} × market — ${r.project}`;
    const lines = r.buckets.map((b) =>
        `${b.value}: ${b.pieces} pieces · ${b.sales} sales · avg ${b.avg_sale_eth ?? '—'} ETH · vol ${b.sale_volume_eth} ETH · ${b.listed} listed${b.floor_eth != null ? ` (floor ${b.floor_eth})` : ''}`);
    return toolText(`${head}\n${lines.join('\n') || 'No pieces with this dimension recorded yet.'}`, r);
}

/* search_docs — PD-Docs answers, verbatim, with citations. Pages come from
   the docs' own agent manifest (/llms.txt) and raw markdown URLs — the same
   surface any crawler reads, so answers can quote but never invent. */
async function searchDocs(env: Env, args: Json): Promise<Json> {
    const query = String(args.query ?? '').trim().toLowerCase();
    if (query.length < 2) return toolErr('query must be a search phrase, e.g. "how do offers work"');
    const manifest = await cached(env, 'docs:manifest', 3600, async () => {
        const r = await appFetch(env, `${env.PD_DOCS_ORIGIN}/llms.txt`);
        if (!r.ok) throw new Error(`llms.txt answered ${r.status}`);
        return r.text();
    });
    // llms.txt lines look like markdown links: - [Title](https://…/docs/….md): blurb
    const pages: { title: string; url: string; blurb: string }[] = [];
    for (const line of (manifest as string).split('\n')) {
        const m = line.match(/\[([^\]]+)\]\((\S+?)\)(?::\s*(.*))?$/);
        if (m) pages.push({ title: m[1], url: m[2], blurb: m[3] ?? '' });
    }
    const terms = query.split(/\s+/).filter((t) => t.length > 2);
    const scored = pages
        .map((p) => ({
            p,
            score: terms.reduce((n, t) => n + (p.title.toLowerCase().includes(t) ? 3 : 0) + (p.blurb.toLowerCase().includes(t) ? 1 : 0), 0),
        }))
        .sort((a, b) => b.score - a.score);
    const top = (scored[0]?.score ? scored.filter((s) => s.score > 0) : scored).slice(0, 3).map((s) => s.p);

    const excerpts: string[] = [];
    for (const page of top) {
        try {
            /* llms.txt cites canonical (future-domain) page URLs; fetch the
               RAW MARKDOWN twin (path + .md — byte-identical for agents) from
               the live docs origin, cite the canonical URL. */
            const pathname = new URL(page.url).pathname;
            const fetchUrl = `${env.PD_DOCS_ORIGIN}${pathname.endsWith('.md') ? pathname : `${pathname}.md`}`;
            const md = await cached(env, `docs:page:${page.url}`, 3600, async () => {
                const r = await appFetch(env, fetchUrl);
                if (!r.ok) throw new Error(String(r.status));
                return r.text();
            });
            // Pick the most term-dense paragraph(s), verbatim.
            const paras = (md as string).split(/\n{2,}/);
            const best = paras
                .map((text) => ({ text, score: terms.reduce((n, t) => n + (text.toLowerCase().includes(t) ? 1 : 0), 0) }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 2)
                .filter((x) => x.score > 0 || paras.length <= 2)
                .map((x) => x.text.trim());
            excerpts.push(`## ${page.title}\nSource: ${page.url}\n\n${best.join('\n\n') || (md as string).slice(0, 600)}`);
        } catch {
            excerpts.push(`## ${page.title}\nSource: ${page.url}\n\n(page fetch failed — cite the URL)`);
        }
    }
    return toolText(
        excerpts.length
            ? `Verbatim from PD-Docs (quote and cite these sources):\n\n${excerpts.join('\n\n---\n\n')}`
            : 'No docs pages matched. Try different words, or read the index at /llms.txt.',
    );
}

/* ── Tool registry ──────────────────────────────────────────────────────── */

const TOOLS = [
    {
        name: 'verify_project',
        title: 'Verify a PD Project contract',
        description:
            'Answer "is this contract a real Price Discussion Project?" — checks PDFactory.isProject(address) on-chain. Use before trusting any contract that claims to be PD.',
        inputSchema: {
            type: 'object',
            properties: { address: { type: 'string', description: 'The 0x… contract address to verify' } },
            required: ['address'],
        },
        run: verifyProject,
    },
    {
        name: 'get_project',
        title: 'Get a PD Project card',
        description:
            'A Project\'s live card: minted count, colorway, PriceSprite, soundtrack, market stats, listed count and floor. Slugs are lowercase, e.g. "chladni".',
        inputSchema: {
            type: 'object',
            properties: { slug: { type: 'string', description: 'Project slug, e.g. "chladni"' } },
            required: ['slug'],
        },
        run: getProject,
    },
    {
        name: 'get_output',
        title: 'Get one Output (piece)',
        description:
            'One minted piece: current owner, minter, mint time, True Name, listing state, last sale, full trait set (incl. Fate + natal chart) and the stored visual fingerprint (orientation, brightness, palette, scene…).',
        inputSchema: {
            type: 'object',
            properties: {
                slug: { type: 'string', description: 'Project slug' },
                token_id: { type: 'integer', description: 'Token id, 1-based' },
            },
            required: ['slug', 'token_id'],
        },
        run: getOutput,
    },
    {
        name: 'get_provenance',
        title: 'Get a piece\'s provenance',
        description:
            'The full recorded life of a piece: mint → transfers → sales with timestamps, parties and ETH prices. Priced transfers are sales.',
        inputSchema: {
            type: 'object',
            properties: {
                slug: { type: 'string', description: 'Project slug' },
                token_id: { type: 'integer', description: 'Token id, 1-based' },
            },
            required: ['slug', 'token_id'],
        },
        run: getProvenance,
    },
    {
        name: 'get_ascii',
        title: 'Get a piece\'s ASCII artwork',
        description:
            'The piece\'s permanent ASCII backup artifact — actual renderable art. Put it in a monospace code block to SHOW the artwork inline in any chat. Great for "show me chladni #22".',
        inputSchema: {
            type: 'object',
            properties: {
                slug: { type: 'string', description: 'Project slug' },
                token_id: { type: 'integer', description: 'Token id, 1-based' },
            },
            required: ['slug', 'token_id'],
        },
        run: getAscii,
    },
    {
        name: 'query_traits',
        title: 'Cross traits with the market',
        description:
            'Group the catalog (or one Project) by any stored trait / visual-fingerprint dimension and cross it with sales and listings: pieces, sale count, average + top sale, volume, listed count, floor. Answers questions like "does landscape or portrait sell better?" (dimension: orientation) or "which Fate sells highest?" (dimension: fate).',
        inputSchema: {
            type: 'object',
            properties: {
                dimension: { type: 'string', enum: [...DIMENSIONS], description: 'The dimension to bucket by' },
                slug: { type: 'string', description: 'Optional project slug to scope to one Project' },
            },
            required: ['dimension'],
        },
        run: queryTraits,
    },
    {
        name: 'search_docs',
        title: 'Search PD-Docs',
        description:
            'Search Price Discussion\'s documentation and get VERBATIM excerpts with source URLs. Quote the excerpts and cite the URLs — never paraphrase PD mechanics from memory.',
        inputSchema: {
            type: 'object',
            properties: { query: { type: 'string', description: 'What to look up, e.g. "how do offers work"' } },
            required: ['query'],
        },
        run: searchDocs,
    },
] as const;

/* ── HTTP entry ─────────────────────────────────────────────────────────── */

async function handleRpc(env: Env, msg: Json): Promise<Json | null> {
    const { id, method } = msg as { id?: unknown; method?: string };
    const params = (msg.params ?? {}) as Json;

    // Notifications get no response.
    if (id === undefined || id === null) return null;

    switch (method) {
        case 'initialize':
            return rpcResult(id, {
                protocolVersion: PROTOCOL_VERSION,
                capabilities: { tools: {} },
                serverInfo: SERVER_INFO,
                instructions: INSTRUCTIONS,
            });
        case 'ping':
            return rpcResult(id, {});
        case 'tools/list':
            return rpcResult(id, {
                tools: TOOLS.map(({ name, title, description, inputSchema }) => ({ name, title, description, inputSchema })),
            });
        case 'tools/call': {
            const tool = TOOLS.find((t) => t.name === params.name);
            if (!tool) return rpcError(id, -32602, `Unknown tool: ${String(params.name)}`);
            try {
                const result = await tool.run(env, (params.arguments ?? {}) as Json);
                return rpcResult(id, result);
            } catch (e) {
                return rpcResult(id, toolErr(`${tool.name} failed: ${e instanceof Error ? e.message : 'unknown error'}`));
            }
        }
        default:
            return rpcError(id, -32601, `Method not found: ${String(method)}`);
    }
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

        const url = new URL(request.url);
        if (request.method === 'GET') {
            // Human/agent-readable front door.
            return json({
                name: SERVER_INFO.name,
                what: 'Price Discussion (PD) — public MCP server. Connect via streamable HTTP: POST JSON-RPC to this URL.',
                tools: TOOLS.map((t) => t.name),
                docs: `${env.PD_DOCS_ORIGIN}/docs/mcp`,
            });
        }
        if (request.method !== 'POST') return json({ error: 'POST JSON-RPC 2.0 messages to this URL' }, 405);

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return json(rpcError(null, -32700, 'Parse error'), 400);
        }

        if (Array.isArray(body)) {
            const answers = (await Promise.all(body.map((m) => handleRpc(env, m as Json)))).filter(Boolean);
            return answers.length ? json(answers) : new Response(null, { status: 202, headers: CORS });
        }
        const answer = await handleRpc(env, body as Json);
        return answer ? json(answer) : new Response(null, { status: 202, headers: CORS });
    },
};
