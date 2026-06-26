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

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

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
  if (!nativePushSupported() || !VAPID_PUBLIC_KEY) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(VAPID_PUBLIC_KEY),
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
