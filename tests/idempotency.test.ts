// withIdempotency — the double-submit gate on the money routes (§5.2).
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { mockDb } from './helpers/mockSupabase';
import { withIdempotency } from '@/lib/api/idempotency';

const ADDR = '0x2222222222222222222222222222222222222222';

function reqWithKey(key?: string): Request {
  return new Request('http://pd.test/api/x', {
    method: 'POST',
    headers: key ? { 'idempotency-key': key } : {},
  });
}

beforeAll(() => mockDb.start());
afterAll(() => mockDb.stop());
beforeEach(() => {
  mockDb.reset();
  mockDb.rpcs.set('app_prune_idempotency', () => null);
});

describe('withIdempotency', () => {
  it('runs the handler normally when no key is sent (back-compat)', async () => {
    let runs = 0;
    const res = await withIdempotency(reqWithKey(), ADDR, 'test', async () => {
      runs++;
      return NextResponse.json({ minted: [1] });
    });
    expect(runs).toBe(1);
    expect(res.status).toBe(200);
    expect(mockDb.table('idempotency_keys').length).toBe(0);
  });

  it('executes once and replays the stored response for the same key', async () => {
    let runs = 0;
    const handler = async () => {
      runs++;
      return NextResponse.json({ minted: [42] }, { status: 200 });
    };
    const key = 'press-abc-12345678';

    const first = await withIdempotency(reqWithKey(key), ADDR, 'mint', handler);
    expect(first.status).toBe(200);
    const second = await withIdempotency(reqWithKey(key), ADDR, 'mint', handler);

    expect(runs).toBe(1); // the whole point
    expect(second.status).toBe(200);
    expect(second.headers.get('idempotency-replayed')).toBe('true');
    expect(await second.json()).toEqual({ minted: [42] });
  });

  it('scopes keys per address — another wallet with the same key runs fresh', async () => {
    let runs = 0;
    const handler = async () => {
      runs++;
      return NextResponse.json({ ok: true });
    };
    const key = 'shared-key-12345678';
    await withIdempotency(reqWithKey(key), ADDR, 'mint', handler);
    await withIdempotency(reqWithKey(key), '0x3333333333333333333333333333333333333333', 'mint', handler);
    expect(runs).toBe(2);
  });

  it('409s a concurrent duplicate while the first request is in flight', async () => {
    const key = 'inflight-12345678';
    let release!: () => void;
    const gate = new Promise<void>((ok) => (release = ok));

    const slow = withIdempotency(reqWithKey(key), ADDR, 'mint', async () => {
      await gate;
      return NextResponse.json({ ok: true });
    });
    // Give the first call time to claim the key.
    await new Promise((ok) => setTimeout(ok, 50));
    const dup = await withIdempotency(reqWithKey(key), ADDR, 'mint', async () => {
      throw new Error('must not run');
    });
    expect(dup.status).toBe(409);
    release();
    expect((await slow).status).toBe(200);
  });

  it('clears the claim on a 5xx so the client can retry the same key', async () => {
    const key = 'fivehundred-12345678';
    let runs = 0;
    const failing = async () => {
      runs++;
      return NextResponse.json({ error: 'x' }, { status: 500 });
    };
    await withIdempotency(reqWithKey(key), ADDR, 'mint', failing);
    await withIdempotency(reqWithKey(key), ADDR, 'mint', failing);
    expect(runs).toBe(2);
  });
});
