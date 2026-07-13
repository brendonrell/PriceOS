// Cron fail-closed gate + the middleware rate limiter's in-memory logic.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

describe('cron fail-closed (indexer reconcile)', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('401s when CRON_SECRET is unset (no secret = no sweep, ever)', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const { GET } = await import('@/app/api/cron/indexer-reconcile/route');
    const res = await GET(new Request('http://pd.test/api/cron/indexer-reconcile'));
    expect(res.status).toBe(401);
  });

  it('401s on a wrong bearer', async () => {
    vi.stubEnv('CRON_SECRET', 'real-secret');
    const { GET } = await import('@/app/api/cron/indexer-reconcile/route');
    const res = await GET(
      new Request('http://pd.test/api/cron/indexer-reconcile', {
        headers: { authorization: 'Bearer wrong' },
      })
    );
    expect(res.status).toBe(401);
  });
});

describe('middleware rate limiter (in-memory path)', () => {
  it('429s a sensitive route after 15 hits from one IP inside the window', async () => {
    const { middleware } = await import('@/middleware');
    const hit = () =>
      middleware(
        new NextRequest('http://pd.test/api/handle/check?handle=x', {
          headers: { 'cf-connecting-ip': '203.0.113.7' },
        })
      );
    let last = 0;
    for (let i = 0; i < 16; i++) last = (await hit()).status;
    expect(last).toBe(429);
  });

  it('keeps distinct IPs in distinct buckets', async () => {
    const { middleware } = await import('@/middleware');
    const res = await middleware(
      new NextRequest('http://pd.test/api/handle/check?handle=x', {
        headers: { 'cf-connecting-ip': '203.0.113.99' },
      })
    );
    expect(res.status).not.toBe(429);
  });
});
