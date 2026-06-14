// lib/pings/render.ts — pure, client-safe mapping of a PingRow to display text.
// No I/O. Used by the Pings panel and the toast copy.

import type { PingRow, PingKind } from '@/lib/supabase';

export interface RenderedPing {
  id: string;
  kind: PingKind;
  icon: string;        // VS-15 enforced glyph
  handle: string;      // actor label (e.g. "@matty", or "" for self/system)
  action: string;      // "collected #14", "followed you", etc.
  read: boolean;
  createdAt: string;
}

/** VS-15 (text-presentation) glyph per kind — matches the menu's notif-item look. */
const ICONS: Record<PingKind, string> = {
  PING:           '✉︎',
  FOLLOW:         '✶︎',
  PROJECT_FOLLOW: '✶︎',
  ACHIEVEMENT:    '✦︎',
  STREAK:         '✦︎',
  MINT:           '✹︎',
  SALE:           '✹︎',
  OFFER:          '✦︎',
  OFFER_ACCEPTED: '✸︎',
  XFER:           '✸︎',
  WISHLIST_HIT:   '✦︎',
  WATCH_HIT:      '✦︎',
};

function fmtEth(amount: string | null): string | null {
  if (amount == null) return null;
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  // Trim trailing zeros, keep it tight: 0.5, 1.25, 2 ETH.
  return `${parseFloat(n.toFixed(4))} ETH`;
}

function tok(row: PingRow): string {
  return row.token_id != null && row.token_id !== '' ? `#${row.token_id}` : '';
}

/** The project's @name (social), snapshotted into data.project_handle at write
 *  time. Empty when the project has no claimed @name yet. */
function proj(row: PingRow): string {
  const h = row.data?.project_handle;
  return typeof h === 'string' && h ? `@${h}` : '';
}

/** Join non-empty parts with single spaces. */
function join(...parts: string[]): string {
  return parts.filter(Boolean).join(' ');
}

/** "+N others" suffix when a rollup row has collapsed multiple actors. */
function rollup(row: PingRow): string {
  const count = typeof row.data?.count === 'number' ? (row.data.count as number) : 1;
  return count > 1 ? ` +${count - 1}` : '';
}

export function renderPing(row: PingRow): RenderedPing {
  const actor = row.actor_name ? `@${row.actor_name}` : 'someone';
  const eth = fmtEth(row.amount_eth);
  const t = tok(row);
  const p = proj(row);

  let handle = actor + rollup(row);
  let action = '';

  switch (row.kind) {
    case 'FOLLOW':
      action = 'followed you';
      break;
    case 'PROJECT_FOLLOW':
      // Social: "@alex followed @oracle" (falls back to "your project").
      action = p ? `followed ${p}` : 'followed your project';
      break;
    case 'MINT':
      action = join('collected', p, t) || 'collected your work';
      break;
    case 'SALE':
      action = join('bought', p, t) + (eth ? ` · ${eth}` : '');
      break;
    case 'OFFER':
      action = join('offered', eth ?? '', 'on', join(p, t) || 'your piece');
      break;
    case 'OFFER_ACCEPTED':
      action = join('accepted your offer on', join(p, t) || 'your piece');
      break;
    case 'XFER':
      action = join('transferred', p, t);
      break;
    case 'ACHIEVEMENT': {
      handle = '';
      const name = typeof row.data?.name === 'string' ? (row.data.name as string) : 'an achievement';
      action = `Unlocked: ${name}`;
      break;
    }
    case 'STREAK': {
      handle = '';
      const days = typeof row.data?.days === 'number' ? (row.data.days as number) : null;
      action = days ? `${days}-day streak` : 'Streak milestone';
      break;
    }
    case 'PING': {
      const msg = typeof row.data?.message === 'string' ? (row.data.message as string) : 'pinged you';
      action = msg;
      break;
    }
    case 'WISHLIST_HIT':
      action = `moved ${t}`.trim();
      break;
    case 'WATCH_HIT':
      action = `moved ${t}`.trim();
      break;
    default:
      action = '';
  }

  return {
    id: row.id,
    kind: row.kind,
    icon: ICONS[row.kind] ?? '✦︎',
    handle,
    action,
    read: row.read,
    createdAt: row.created_at,
  };
}

/** Category-pref gate. Mirrors notifs.pings (mints/lists/offers/xfers/mutuals/
 *  cooldown) so the panel + toasts honour the user's Ping toggles. */
export function passesCategoryPrefs(
  kind: PingKind,
  prefs: { mints: boolean; lists: boolean; offers: boolean; xfers: boolean; mutuals: boolean; cooldown: boolean }
): boolean {
  switch (kind) {
    case 'MINT':
    case 'SALE':
      return prefs.mints;
    case 'OFFER':
    case 'OFFER_ACCEPTED':
      return prefs.offers;
    case 'XFER':
      return prefs.xfers;
    case 'FOLLOW':
    case 'PROJECT_FOLLOW':
      return prefs.mutuals;
    case 'WISHLIST_HIT':
    case 'WATCH_HIT':
      return prefs.lists;
    // ACHIEVEMENT / STREAK / PING are always shown (not category-gated).
    default:
      return true;
  }
}
