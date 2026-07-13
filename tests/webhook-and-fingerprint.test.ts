// Webhook signature verification (the indexer's front door) + the telemetry
// fingerprint. Pure functions — no mocks needed.
import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyAlchemySignature } from '@/lib/indexer/alchemy/verify';
import { errorFingerprint } from '@/lib/telemetry/fingerprint';

const KEY = 'test-webhook-signing-key';
const sign = (body: string) => createHmac('sha256', KEY).update(body, 'utf8').digest('hex');

describe('verifyAlchemySignature', () => {
  it('accepts a correctly signed raw body', () => {
    const body = JSON.stringify({ event: { activity: [] } });
    expect(verifyAlchemySignature(body, sign(body), KEY)).toBe(true);
  });

  it('rejects a tampered body (same signature)', () => {
    const body = '{"a":1}';
    const sig = sign(body);
    expect(verifyAlchemySignature('{"a":2}', sig, KEY)).toBe(false);
  });

  it('rejects a missing signature and a wrong key', () => {
    const body = '{"a":1}';
    expect(verifyAlchemySignature(body, null, KEY)).toBe(false);
    expect(verifyAlchemySignature(body, sign(body), 'other-key')).toBe(false);
  });

  it('rejects when the signing key is empty (fail closed)', () => {
    const body = '{"a":1}';
    expect(verifyAlchemySignature(body, sign(body), '')).toBe(false);
  });
});

describe('errorFingerprint', () => {
  it('is stable for the same fault and distinct across faults', () => {
    const a1 = errorFingerprint('server', '/api/x', 'boom at line 3');
    const a2 = errorFingerprint('server', '/api/x', 'boom at line 3');
    const b = errorFingerprint('server', '/api/y', 'boom at line 3');
    expect(a1).toBe(a2);
    expect(a1).not.toBe(b);
  });
});
