// lib/api/idempotency.ts — double-submit protection for money endpoints
// (Architect Report §5.2 / ClickUp 86b9g046n).
//
// Contract: when a POST carries an `Idempotency-Key` header, the wrapped
// handler executes AT MOST ONCE for that (key, address). The first request
// claims the key with a pending row (atomic PK insert — the true gate, no
// read-then-write race); replays get the stored response, and a concurrent
// duplicate that races the first request gets 409 CONFLICT (the client
// treats that as "already in flight"). Requests WITHOUT the header behave
// exactly as before — fully backwards-compatible with deployed clients.

import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';

const KEY_RE = /^[A-Za-z0-9_-]{8,64}$/;
const PRUNE_SAMPLE = 0.01;
const KEEP_HOURS = 24;

type Handler = () => Promise<NextResponse>;

export async function withIdempotency(
  req: Request,
  address: string,
  route: string,
  run: Handler
): Promise<NextResponse> {
  const key = req.headers.get('idempotency-key');
  if (!key || !KEY_RE.test(key)) return run();

  const db = getSupabaseService();
  const scoped = `${address}:${key}`;

  // Claim the key. PK violation ⇒ someone already holds it.
  const { error: claimErr } = await (db.from('idempotency_keys' as never) as never as {
    insert(v: Record<string, unknown>): PromiseLike<{ error: { code?: string } | null }>;
  }).insert({ key: scoped, address, route });

  if (claimErr) {
    // Existing claim — replay the stored response if the first run finished.
    const { data } = await (db.from('idempotency_keys' as never) as never as {
      select(c: string): {
        eq(c: string, v: string): { maybeSingle(): PromiseLike<{ data: { status: number | null; response: unknown } | null }> };
      };
    })
      .select('status, response')
      .eq('key', scoped)
      .maybeSingle();

    if (data?.status != null) {
      return NextResponse.json(data.response ?? {}, {
        status: data.status,
        headers: { 'idempotency-replayed': 'true' },
      });
    }
    // First request still in flight.
    return NextResponse.json(
      { error: 'Request already in flight for this Idempotency-Key', code: 'BAD_REQUEST' },
      { status: 409 }
    );
  }

  // We own the key — run the real handler and store its outcome.
  const res = await run();
  try {
    // Only finalize non-5xx outcomes; a 5xx clears the claim so the client
    // can retry the SAME key once the fault passes.
    if (res.status < 500) {
      const body = await res.clone().json().catch(() => ({}));
      await (db.from('idempotency_keys' as never) as never as {
        update(v: Record<string, unknown>): { eq(c: string, v: string): PromiseLike<unknown> };
      })
        .update({ status: res.status, response: body })
        .eq('key', scoped);
    } else {
      await (db.from('idempotency_keys' as never) as never as {
        delete(): { eq(c: string, v: string): PromiseLike<unknown> };
      })
        .delete()
        .eq('key', scoped);
    }
    if (Math.random() < PRUNE_SAMPLE) {
      await db.rpc('app_prune_idempotency' as never, { p_keep_hours: KEEP_HOURS } as never);
    }
  } catch {
    /* bookkeeping is best-effort; the handler's response always wins */
  }
  return res;
}
