// tests/helpers/mockSupabase.ts — a minimal in-memory PostgREST stand-in.
//
// The route smoke tests exercise the REAL route handlers; this server catches
// their Supabase REST calls so no test ever touches a real database. It
// implements just enough of PostgREST's dialect for the routes under test:
// GET selects with eq filters, INSERT with PK conflict, PATCH, DELETE, and
// POST /rest/v1/rpc/<fn>. Every request is logged for assertions.

import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';

export const MOCK_PORT = 54999;

export interface LoggedCall {
  method: string;
  path: string;
  query: Record<string, string>;
  body: unknown;
}

interface TableRow {
  [k: string]: unknown;
}

export class MockSupabase {
  server: Server | null = null;
  calls: LoggedCall[] = [];
  tables = new Map<string, TableRow[]>();
  /** rpc name → implementation. Return value is the JSON response. */
  rpcs = new Map<string, (args: Record<string, unknown>) => unknown>();

  reset(): void {
    this.calls = [];
    this.tables.clear();
    this.rpcs.clear();
  }

  table(name: string): TableRow[] {
    if (!this.tables.has(name)) this.tables.set(name, []);
    return this.tables.get(name)!;
  }

  async start(): Promise<void> {
    if (this.server) return;
    this.server = createServer((req, res) => void this.handle(req, res));
    await new Promise<void>((ok) => this.server!.listen(MOCK_PORT, '127.0.0.1', ok));
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((ok) => this.server!.close(() => ok()));
    this.server = null;
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${MOCK_PORT}`);
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const rawBody = Buffer.concat(chunks).toString('utf8');
    let body: unknown = undefined;
    try {
      body = rawBody ? JSON.parse(rawBody) : undefined;
    } catch {
      body = rawBody;
    }
    const query: Record<string, string> = {};
    url.searchParams.forEach((v, k) => (query[k] = v));
    this.calls.push({ method: req.method ?? '?', path: url.pathname, query, body });

    const send = (status: number, payload: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(payload));
    };

    // RPC
    const rpcMatch = url.pathname.match(/^\/rest\/v1\/rpc\/(.+)$/);
    if (rpcMatch) {
      const fn = this.rpcs.get(rpcMatch[1]);
      if (!fn) return send(404, { message: `rpc ${rpcMatch[1]} not mocked` });
      try {
        return send(200, fn((body ?? {}) as Record<string, unknown>) ?? null);
      } catch (e) {
        return send(400, { message: e instanceof Error ? e.message : 'rpc error' });
      }
    }

    const tableMatch = url.pathname.match(/^\/rest\/v1\/([A-Za-z0-9_]+)$/);
    if (!tableMatch) return send(404, { message: 'not found' });
    const rows = this.table(tableMatch[1]);

    const matches = (row: TableRow): boolean => {
      for (const [k, v] of Object.entries(query)) {
        if (k === 'select' || k === 'order' || k === 'limit' || k === 'offset') continue;
        if (!v.startsWith('eq.')) continue;
        if (String(row[k]) !== v.slice(3)) return false;
      }
      return true;
    };

    if (req.method === 'GET') {
      const found = rows.filter(matches);
      const wantsSingle = (req.headers.accept ?? '').includes('vnd.pgrst.object');
      if (wantsSingle) {
        if (found.length === 0) return send(406, { message: 'no rows' });
        return send(200, found[0]);
      }
      return send(200, found);
    }

    if (req.method === 'POST') {
      const newRows = Array.isArray(body) ? (body as TableRow[]) : [body as TableRow];
      // PK conflict on `key` (idempotency table) or `fingerprint` (app_errors)
      for (const nr of newRows) {
        const pk = 'key' in nr ? 'key' : 'fingerprint' in nr ? 'fingerprint' : null;
        if (pk && rows.some((r) => r[pk] === nr[pk])) {
          return send(409, { code: '23505', message: `duplicate key (${pk})` });
        }
      }
      rows.push(...newRows);
      return send(201, newRows);
    }

    if (req.method === 'PATCH') {
      const found = rows.filter(matches);
      for (const r of found) Object.assign(r, body as TableRow);
      return send(200, found);
    }

    if (req.method === 'DELETE') {
      const keep = rows.filter((r) => !matches(r));
      this.tables.set(tableMatch[1], keep);
      return send(200, []);
    }

    return send(405, { message: 'method not mocked' });
  }
}

export const mockDb = new MockSupabase();
