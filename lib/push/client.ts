'use client';

/*
 * lib/push/client.ts — the browser side of "3D Pingtoasts" (native push).
 *
 * enable():  request notification permission (MUST be from a user gesture on
 *            iOS), subscribe to push with our VAPID public key, and register the
 *            device with the server. Returns a clear outcome for the caller's
 *            toast.
 * disable(): tear the local subscription down + deregister it server-side.
 * getStatus(): cheap snapshot for UI (supported / permission / subscribed).
 *
 * OS app-icon badge: setAppBadge/clearAppBadge mirror the unread ping count onto
 * the installed app icon (iOS 16.4+ / Chromium). No-ops where unsupported.
 *
 * Everything is defensive — on any platform without Web Push (or before the
 * VAPID key is configured), enable() returns 'unsupported' and nothing throws.
 */

// New matched-pair key names (Brendon, 2026-07-05) take precedence; the old
// NEXT_PUBLIC_VAPID_PUBLIC_KEY stays as a fallback so nothing breaks mid-cutover.
const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_WEBPUSH_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export type EnableResult = 'enabled' | 'denied' | 'unsupported' | 'error';

export interface NativeStatus {
  supported: boolean;
  permission: NotificationPermission | 'default';
  subscribed: boolean;
}

/** Web Push needs a service worker, PushManager, and the Notification API. */
export function nativePushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** VAPID public key (URL-safe base64) → an ArrayBuffer applicationServerKey.
 *  Returns a concrete ArrayBuffer (not a Uint8Array) so the typed-array buffer
 *  variance in newer TS lib types doesn't reject it at the subscribe() call. */
function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

/** The VAPID public key. Prefer the build-time inline (NEXT_PUBLIC_*), but fall
 *  back to the server, which always has it at runtime (it signs sends with the
 *  same value). This removes the dependency on the key being set as a Cloudflare
 *  BUILD variable — a toggle that has silently gone missing and left every device
 *  on the 'unsupported' path. Same canonical key either way, so the signing pair
 *  can never drift. */
async function resolveVapidKey(): Promise<string> {
  if (VAPID_PUBLIC_KEY) return VAPID_PUBLIC_KEY;
  try {
    const res = await fetch('/api/push/pubkey');
    if (res.ok) {
      const { key } = (await res.json()) as { key?: string };
      if (typeof key === 'string') return key;
    }
  } catch {
    /* ignore — treated as unsupported below */
  }
  return '';
}

/** Byte-compare two applicationServerKeys. */
function buffersEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
  if (a.byteLength !== b.byteLength) return false;
  const va = new Uint8Array(a);
  const vb = new Uint8Array(b);
  for (let i = 0; i < va.length; i++) if (va[i] !== vb[i]) return false;
  return true;
}

/** If this device's push subscription was created under a DIFFERENT VAPID key
 *  than the server currently signs with, drop it and re-subscribe under the
 *  current key — silently (permission is already granted, so no prompt).
 *  Without this, a key rotation strands every subscribed device: the browser
 *  keeps handing back the old-key subscription, the server signs with the new
 *  key, and Apple rejects every send. Runs once per app session; best-effort. */
let freshnessChecked = false;
export async function ensureFreshSubscription(): Promise<void> {
  if (freshnessChecked || !nativePushSupported()) return;
  freshnessChecked = true;
  try {
    if (Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const key = await resolveVapidKey();
    if (!key) return;
    const keyBuf = urlBase64ToBuffer(key);
    const current = sub.options?.applicationServerKey;
    if (current && buffersEqual(current, keyBuf)) return; // still on the live key
    const oldEndpoint = sub.endpoint;
    await sub.unsubscribe().catch(() => {});
    void fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint: oldEndpoint }),
    }).catch(() => {});
    const fresh = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBuf,
    });
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subscription: fresh.toJSON() }),
    });
  } catch {
    /* best-effort */
  }
}

export async function getNativeStatus(): Promise<NativeStatus> {
  if (!nativePushSupported()) {
    return { supported: false, permission: 'default', subscribed: false };
  }
  let subscribed = false;
  try {
    const reg = await navigator.serviceWorker.ready;
    subscribed = !!(await reg.pushManager.getSubscription());
  } catch {
    /* ignore */
  }
  return { supported: true, permission: Notification.permission, subscribed };
}

/** Request permission + subscribe + register with the server. From a gesture. */
export async function enableNativePings(): Promise<EnableResult> {
  if (!nativePushSupported()) return 'unsupported';
  try {
    // Permission MUST be requested first, synchronously in the user gesture —
    // iOS rejects a prompt raised after an unrelated await. The key is resolved
    // afterwards (subscribe() carries no gesture requirement).
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    const vapidKey = await resolveVapidKey();
    if (!vapidKey) return 'unsupported';

    const reg = await navigator.serviceWorker.ready;
    const keyBuf = urlBase64ToBuffer(vapidKey);
    let sub = await reg.pushManager.getSubscription();
    // A leftover subscription made under an OLD key is dead weight — the server
    // signs with the current key, so Apple rejects sends to it. Replace it.
    if (sub) {
      const current = sub.options?.applicationServerKey;
      if (current && !buffersEqual(current, keyBuf)) {
        const oldEndpoint = sub.endpoint;
        await sub.unsubscribe().catch(() => {});
        void fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endpoint: oldEndpoint }),
        }).catch(() => {});
        sub = null;
      }
    }
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBuf,
      });
    }

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
    if (!res.ok) return 'error';
    return 'enabled';
  } catch {
    return 'error';
  }
}

/** Drop the local push subscription + deregister it server-side. */
export async function disableNativePings(): Promise<void> {
  if (!nativePushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe().catch(() => {});
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    }).catch(() => {});
  } catch {
    /* best-effort */
  }
}

/** Mirror the unread count onto the installed app icon (no-op if unsupported). */
export function setAppBadge(count: number): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const n = navigator as any;
    if (typeof n.setAppBadge === 'function') {
      if (count > 0) n.setAppBadge(count);
      else n.clearAppBadge?.();
    }
  } catch {
    /* ignore */
  }
}

export function clearAppBadge(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const n = navigator as any;
    n.clearAppBadge?.();
  } catch {
    /* ignore */
  }
}
