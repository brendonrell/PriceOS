// lib/push/webpush.ts — server-only delivery of "3D Pingtoasts" (native push).
//
// Best-effort, like createPing: a push must never throw out of, or slow down,
// the action that triggered the ping. Every failure is swallowed. If the VAPID
// env keys aren't set (or the web-push lib is unavailable), every call no-ops —
// so the rest of the app, and the in-app/regular Pingtoasts, work untouched
// before native delivery is ever configured.
//
// Gate (server-side, so it holds even when PD is closed): we deliver only when
// the recipient's persisted Pingtoasts mode includes native (3D or COMBO) AND
// Silent Mode (the crescent focus toggle) is OFF. Both live in the user's
// settings.notifs envelope. The fast path is a single indexed lookup: no
// subscriptions for this user → return before touching settings (the common
// case until someone opts in).

import webpush from 'web-push';
import { getSupabaseService } from '@/lib/supabase';
import { showsNativePings, type PingToastMode } from '@/lib/state/PdNotifsContext';
import { formatNativePing } from '@/lib/push/format';
import type { FeedItem } from '@/lib/pings/render';
import { composeResolved, composeSprite, type ResolvedSprite } from '@/lib/sprites/composer';
import { isPriceSpriteVibe } from '@/lib/sprites/vibes';

type DB = ReturnType<typeof getSupabaseService>;

// PriceSprite standin when a recipient has no resolved sprite yet — the same
// awake placeholder string the engine uses (priceSpriteEngine STANDIN_AWAKE_R).
const FALLBACK_SPRITE_FACE = '(ง •̀_•́)ง';

interface UserGateRow {
  address?: string;
  settings?: Record<string, unknown> | null;
  price_sprite?: unknown;
  price_sprite_resolved?: ResolvedSprite | null;
}

/** Compose the recipient's resting PriceSprite face server-side (their frozen
 *  resolution → awake frame). Falls back to the vibe composition, then the
 *  standin face. Mirrors useSpriteFace / artistColorStore. */
function spriteFaceFor(row: UserGateRow | null): string {
  try {
    if (row?.price_sprite_resolved) {
      const c = composeResolved(row.price_sprite_resolved, 'awake');
      if (c?.fullString) return c.fullString;
    }
    if (row?.address && isPriceSpriteVibe(row.price_sprite)) {
      const c = composeSprite(row.address, row.price_sprite, 'awake');
      if (c?.fullString) return c.fullString;
    }
  } catch {
    /* fall through to standin */
  }
  return FALLBACK_SPRITE_FACE;
}

let configured: boolean | null = null;

/** Configure web-push from env once. Returns false (and stays false) when the
 *  keys are absent — every send then no-ops. */
function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:pricediscussion@gmail.com';
  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch {
    configured = false;
  }
  return configured;
}

interface SubRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Read the recipient's settings (Pingtoasts mode + Silent Mode) and sprite in
 *  one go. Returns whether native delivery is allowed + their composed face. */
async function fetchGate(
  db: DB,
  address: string,
): Promise<{ allowed: boolean; spriteFace: string }> {
  const { data } = await db
    .from('users')
    .select('address, settings, price_sprite, price_sprite_resolved')
    .eq('address', address)
    .maybeSingle();
  const row = (data as UserGateRow | null) ?? null;
  const settings = row?.settings ?? {};
  const notifs = (settings.notifs ?? {}) as { pingToasts?: PingToastMode; nightmode?: boolean };
  const mode = (notifs.pingToasts ?? 'off') as PingToastMode;
  const allowed = showsNativePings(mode) && notifs.nightmode !== true; // Silent Mode keeps it quiet
  return { allowed, spriteFace: spriteFaceFor(row) };
}

/**
 * Fan a ping out to every device the recipient has registered for 3D Pingtoasts.
 * Fire-and-forget from the caller's view, but AWAITED internally so it completes
 * before a serverless function tears down. Dead subscriptions (410/404) are
 * pruned. Never throws.
 */
export async function sendNativePing(recipientAddress: string, item: FeedItem): Promise<void> {
  try {
    if (!ensureConfigured()) return;
    const db = getSupabaseService();
    const address = recipientAddress.toLowerCase();

    // Fast path: no registered devices → nothing to do (the common case).
    const { data: subRows } = await db
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_address', address);
    const subs = (subRows ?? []) as SubRow[];
    if (subs.length === 0) return;

    // Honour the recipient's current mode + Silent Mode, and grab their sprite.
    const { allowed, spriteFace } = await fetchGate(db, address);
    if (!allowed) return;

    const { title, body, tag } = formatNativePing(item, spriteFace);
    const payload = JSON.stringify({
      title,
      body,
      tag,
      // The PD app icon (Android/desktop render this; iOS uses the installed
      // app icon). badge is the monochrome status-bar mark on Android.
      icon: '/icon-192px.png',
      badge: '/icon-192-maskable.png',
      // Deep-link target: open the app; the SW focuses an existing window.
      url: '/',
    });

    const dead: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
        } catch (err) {
          // 404/410 → the browser dropped this subscription; prune it.
          const code = (err as { statusCode?: number })?.statusCode;
          if (code === 404 || code === 410) dead.push(s.id);
        }
      }),
    );

    if (dead.length > 0) {
      await db.from('push_subscriptions').delete().in('id', dead);
    }
  } catch (err) {
    console.error('[push] sendNativePing error:', err instanceof Error ? err.message : err);
  }
}

/**
 * Native "3D" reminder for a due To-Do (the closed-app path — the in-app toast
 * lives in components/todos/TodoReminders.tsx). Same delivery contract as
 * sendNativePing — VAPID-gated, honours the recipient's Pingtoasts mode + Silent
 * Mode, prunes dead subscriptions, never throws — but with plain title/body copy
 * instead of the ping/sprite format. Called by /api/cron/todo-reminders.
 */
export async function sendTodoReminder(
  recipientAddress: string,
  title: string,
  body: string,
): Promise<void> {
  try {
    if (!ensureConfigured()) return;
    const db = getSupabaseService();
    const address = recipientAddress.toLowerCase();

    const { data: subRows } = await db
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_address', address);
    const subs = (subRows ?? []) as SubRow[];
    if (subs.length === 0) return;

    // Same gate as sendNativePing: 3D/COMBO Pingtoasts on + Silent Mode off.
    const { data: uRow } = await db
      .from('users')
      .select('settings')
      .eq('address', address)
      .maybeSingle();
    const notifs = (((uRow as { settings?: Record<string, unknown> } | null)?.settings ?? {})
      .notifs ?? {}) as { pingToasts?: PingToastMode; nightmode?: boolean };
    if (!showsNativePings(notifs.pingToasts ?? 'off') || notifs.nightmode === true) return;

    const payload = JSON.stringify({
      title,
      body,
      tag: 'pd-todo-reminder',
      icon: '/icon-192px.png',
      badge: '/icon-192-maskable.png',
      url: '/',
    });

    const dead: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
        } catch (err) {
          const code = (err as { statusCode?: number })?.statusCode;
          if (code === 404 || code === 410) dead.push(s.id);
        }
      }),
    );
    if (dead.length > 0) {
      await db.from('push_subscriptions').delete().in('id', dead);
    }
  } catch (err) {
    console.error('[push] sendTodoReminder error:', err instanceof Error ? err.message : err);
  }
}
