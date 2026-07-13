// /api/me — the REAL route handlers, driven end-to-end: sealed session cookie
// (real iron-session crypto), mock PostgREST behind the real Supabase client.
// Proves: auth gate, the validation matrix, and that PATCH now goes through
// the MERGE RPC with exactly the keys the client sent (the clobber fix, §3.4).
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { mockDb } from './helpers/mockSupabase';
import { signInAs, signOut, headersMock } from './helpers/session';

vi.mock('next/headers', () => headersMock());

import { GET, PATCH } from '@/app/api/me/route';

const ADDR = '0x1111111111111111111111111111111111111111';
const ctx = { params: Promise.resolve({}) };

function patchReq(body: unknown): NextRequest {
  return new NextRequest('http://pd.test/api/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeAll(() => mockDb.start());
afterAll(() => mockDb.stop());
beforeEach(() => {
  mockDb.reset();
  mockDb.table('users').push({ address: ADDR, settings: {}, handle: 'tester' });
  mockDb.rpcs.set('app_merge_user_state', (args) => {
    // echo a merged row like the real fn (RETURNING *)
    return [{ address: args.p_address, settings: {}, merged_with: args.p_patch }];
  });
});

describe('/api/me auth gate', () => {
  it('401s without a session', async () => {
    signOut();
    const res = await GET(new NextRequest('http://pd.test/api/me'), ctx as never);
    expect(res.status).toBe(401);
  });

  it('returns own row with a session', async () => {
    await signInAs(ADDR);
    const res = await GET(new NextRequest('http://pd.test/api/me'), ctx as never);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { address: string }).address).toBe(ADDR);
  });
});

describe('/api/me PATCH validation', () => {
  beforeEach(() => signInAs(ADDR));

  it('rejects a non-object body', async () => {
    expect((await PATCH(patchReq('nope'), ctx as never)).status).toBe(400);
  });

  it('rejects an empty patch', async () => {
    expect((await PATCH(patchReq({}), ctx as never)).status).toBe(400);
  });

  it('rejects a bad profile_hex', async () => {
    expect((await PATCH(patchReq({ profile_hex: 'red' }), ctx as never)).status).toBe(400);
  });

  it('rejects bidi/invisible characters in ens_name (impersonation guard)', async () => {
    expect((await PATCH(patchReq({ ens_name: 'artist‮name' }), ctx as never)).status).toBe(400);
  });

  it('rejects a 5-slot showcase', async () => {
    expect(
      (await PATCH(patchReq({ showcase: { slots: [null, null, null, null, null] } }), ctx as never)).status
    ).toBe(400);
  });
});

describe('/api/me PATCH merge semantics (the clobber fix)', () => {
  beforeEach(() => signInAs(ADDR));

  it('routes the write through app_merge_user_state with ONLY the sent keys', async () => {
    const res = await PATCH(patchReq({ settings: { colorway: 'dark' } }), ctx as never);
    expect(res.status).toBe(200);

    const rpcCall = mockDb.calls.find((c) => c.path.endsWith('/rpc/app_merge_user_state'));
    expect(rpcCall).toBeTruthy();
    const args = rpcCall!.body as { p_address: string; p_patch: Record<string, unknown> };
    expect(args.p_address).toBe(ADDR);
    // Exactly one envelope key travels — a colorway change can never carry a
    // stale copy of todos/notes/albums with it.
    expect(Object.keys(args.p_patch)).toEqual(['settings']);
    expect(Object.keys(args.p_patch.settings as Record<string, unknown>)).toEqual(['colorway']);

    // …and no direct users-table PATCH happened.
    const directPatch = mockDb.calls.find((c) => c.method === 'PATCH' && c.path.endsWith('/users'));
    expect(directPatch).toBeUndefined();
  });

  it('never lets the body address someone else (ownership is the session)', async () => {
    await PATCH(patchReq({ settings: { colorway: 'dark' }, address: '0xattacker' }), ctx as never);
    const rpcCall = mockDb.calls.find((c) => c.path.endsWith('/rpc/app_merge_user_state'));
    const args = rpcCall!.body as { p_address: string; p_patch: Record<string, unknown> };
    expect(args.p_address).toBe(ADDR);
    expect('address' in args.p_patch).toBe(false);
  });
});
