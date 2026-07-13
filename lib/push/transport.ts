// lib/push/transport.ts — Workers-native Web Push delivery.
//
// WHY THIS EXISTS (2026-07-13): the npm `web-push` library sends through
// Node's `https.request`, which HANGS FOREVER under the Cloudflare Workers
// runtime — the send neither resolves nor rejects, the runtime cancels the
// request, and no push ever leaves the worker. That silently killed every
// native Pingtoast (to-do reminders included) from the moment PD moved to
// Cloudflare. Proven in an isolated workerd harness before this rewrite.
//
// This module implements the two RFCs `web-push` implemented, on primitives
// that exist in BOTH runtimes (WebCrypto + fetch), so the same code runs in
// `next dev` (Node ≥ 20) and in the deployed worker:
//   • RFC 8291 — payload encryption, aes128gcm content coding
//   • RFC 8292 — VAPID (ES256 JWT in the Authorization header)
//
// Call shape mirrors web-push where it matters: sendWebPush() resolves on
// 2xx and throws a PushSendError carrying `statusCode` + `body` otherwise,
// so the caller's 404/410 dead-subscription pruning keeps working verbatim.

export interface PushSubscriptionLike {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export class PushSendError extends Error {
  statusCode: number;
  body: string;
  constructor(statusCode: number, body: string) {
    super(`push endpoint responded ${statusCode}`);
    this.statusCode = statusCode;
    this.body = body;
  }
}

/* ── base64url helpers ─────────────────────────────────────────────────── */

function b64uToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64u(b: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/* WebCrypto BufferSource wants a plain ArrayBuffer-backed view. */
function buf(b: Uint8Array): ArrayBuffer {
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

/* ── HKDF (SHA-256) via WebCrypto ──────────────────────────────────────── */

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', buf(ikm), 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: buf(salt), info: buf(info) },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

/* ── VAPID (RFC 8292) ──────────────────────────────────────────────────── */

/** Import the VAPID signing pair from the stored base64url strings: the
 *  public key is the 65-byte uncompressed P-256 point, the private key the
 *  raw 32-byte scalar — exactly the format `web-push generate-vapid-keys`
 *  produced, so the existing env values work unchanged. */
async function importVapidKey(publicKey: string, privateKey: string): Promise<CryptoKey> {
  const pub = b64uToBytes(publicKey);
  const d = b64uToBytes(privateKey);
  if (pub.length !== 65 || pub[0] !== 4 || d.length !== 32) {
    throw new Error('bad VAPID key material');
  }
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToB64u(pub.slice(1, 33)),
    y: bytesToB64u(pub.slice(33, 65)),
    d: bytesToB64u(d),
    ext: true,
  };
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

async function vapidAuthHeader(
  endpoint: string,
  subject: string,
  publicKey: string,
  privateKey: string,
): Promise<string> {
  const { origin } = new URL(endpoint);
  const header = bytesToB64u(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = bytesToB64u(
    utf8(
      JSON.stringify({
        aud: origin,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: subject,
      }),
    ),
  );
  const signingInput = `${header}.${claims}`;
  const key = await importVapidKey(publicKey, privateKey);
  // WebCrypto ECDSA emits the raw r||s (64 bytes) JOSE wants — no DER dance.
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, buf(utf8(signingInput))),
  );
  return `vapid t=${signingInput}.${bytesToB64u(sig)}, k=${publicKey}`;
}

/* ── RFC 8291 payload encryption (aes128gcm, single record) ────────────── */

async function encryptPayload(
  sub: PushSubscriptionLike,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const uaPub = b64uToBytes(sub.keys.p256dh); // 65-byte uncompressed point
  const authSecret = b64uToBytes(sub.keys.auth); // 16 bytes
  if (uaPub.length !== 65 || uaPub[0] !== 4) throw new Error('bad p256dh');

  // Ephemeral application-server ECDH pair for this message.
  const asPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', asPair.publicKey));

  const uaKey = await crypto.subtle.importKey(
    'raw',
    buf(uaPub),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const ecdh = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asPair.privateKey, 256),
  );

  // ikm = HKDF(salt=auth, ecdh, "WebPush: info" || 0x00 || ua_pub || as_pub, 32)
  const ikm = await hkdf(
    authSecret,
    ecdh,
    concat(utf8('WebPush: info'), new Uint8Array([0]), uaPub, asPub),
    32,
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, concat(utf8('Content-Encoding: aes128gcm'), new Uint8Array([0])), 16);
  const nonce = await hkdf(salt, ikm, concat(utf8('Content-Encoding: nonce'), new Uint8Array([0])), 12);

  const aesKey = await crypto.subtle.importKey('raw', buf(cek), 'AES-GCM', false, ['encrypt']);
  // Single record: plaintext || 0x02 (final-record delimiter).
  const record = concat(plaintext, new Uint8Array([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: buf(nonce) }, aesKey, buf(record)),
  );

  // aes128gcm body header: salt(16) || rs(4) || idlen(1) || keyid(as_pub, 65)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([asPub.length]), asPub, ciphertext);
}

/* ── The send ──────────────────────────────────────────────────────────── */

export interface WebPushOptions {
  /** Seconds the push service should hold the message. */
  ttl?: number;
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
}

/**
 * Encrypt `payload` for `sub` and POST it, VAPID-signed. Resolves on 2xx;
 * throws PushSendError (with statusCode) otherwise — 404/410 mean the
 * subscription is dead and should be pruned, same contract as web-push.
 */
export async function sendWebPush(
  sub: PushSubscriptionLike,
  payload: string,
  vapid: { subject: string; publicKey: string; privateKey: string },
  opts?: WebPushOptions,
): Promise<void> {
  const body = await encryptPayload(sub, utf8(payload));
  const auth = await vapidAuthHeader(sub.endpoint, vapid.subject, vapid.publicKey, vapid.privateKey);
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(opts?.ttl ?? 24 * 3600),
      Urgency: opts?.urgency ?? 'normal',
    },
    body: buf(body),
  });
  if (res.status < 200 || res.status >= 300) {
    const text = await res.text().catch(() => '');
    throw new PushSendError(res.status, text.slice(0, 500));
  }
  // Drain so the connection can be reused / the worker isn't holding a body.
  await res.arrayBuffer().catch(() => undefined);
}
