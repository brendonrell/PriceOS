// lib/pings/render.ts — pure, client-safe mapping of a feed item to display
// text. No I/O. Used by the Pings panel and the toast copy.
//
// A feed item is either a DIRECTED ping (a stored `pings` row) or a BROADCAST
// item synthesised at read time from the shared `events` table (the "people /
// projects you follow did X" firehose — never stored). Both share this shape.

import type { PingRow, PingKind } from '@/lib/supabase';

/** Render-only kinds: the directed ping kinds plus LIST (broadcast-only — a
 *  listing by someone you follow). LIST is never stored in `pings`. */
export type RenderKind = PingKind | 'LIST';

export interface FeedItem {
  id: string;
  kind: RenderKind;
  source: 'directed' | 'broadcast';
  actor_name: string | null;
  project_id: string | null;
  token_id: string | null;
  amount_eth: string | null;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

/** Lift a stored ping row into the unified feed-item shape. */
export function fromPingRow(row: PingRow): FeedItem {
  return {
    id: row.id,
    kind: row.kind,
    source: 'directed',
    actor_name: row.actor_name,
    project_id: row.project_id,
    token_id: row.token_id,
    amount_eth: row.amount_eth,
    data: row.data ?? {},
    read: row.read,
    created_at: row.created_at,
  };
}

export interface RenderedPing {
  id: string;
  kind: RenderKind;
  icon: string;        // VS-15 enforced glyph
  handle: string;      // actor label (e.g. "@matty", or "" for self/system)
  action: string;      // "collected @oracle #14", "followed you", etc.
  read: boolean;
  createdAt: string;
}

/** VS-15 (text-presentation) glyph per kind — matches the notif-item look. */
const ICONS: Record<RenderKind, string> = {
  PING:           '✉︎',
  FOLLOW:         '✶︎',
  PROJECT_FOLLOW: '✶︎',
  ACHIEVEMENT:    '✦︎',
  STREAK:         '✦︎',
  MINT:           '✹︎',
  LIST:           '✦︎',
  SALE:           '✹︎',
  OFFER:          '✦︎',
  OFFER_ACCEPTED: '✸︎',
  XFER:           '✸︎',
  WISHLIST_HIT:   '♡︎',
  WATCH_HIT:      '✦︎',
};

function fmtEth(amount: string | null): string | null {
  if (amount == null) return null;
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  return `${parseFloat(n.toFixed(4))} ETH`;
}

function tok(row: FeedItem): string {
  return row.token_id != null && row.token_id !== '' ? `#${row.token_id}` : '';
}

/** The project's @name (social), snapshotted into data.project_handle at write
 *  time (directed) or resolved at read time (broadcast). Empty when unclaimed. */
function proj(row: FeedItem): string {
  const h = row.data?.project_handle;
  return typeof h === 'string' && h ? `@${h}` : '';
}

/** "+N others" suffix when a rollup row has collapsed multiple actors. */
function rollup(row: FeedItem): string {
  const count = typeof row.data?.count === 'number' ? (row.data.count as number) : 1;
  return count > 1 ? ` +${count - 1}` : '';
}

/** Join non-empty parts with single spaces. */
function join(...parts: string[]): string {
  return parts.filter(Boolean).join(' ');
}

export function renderPing(row: FeedItem): RenderedPing {
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
      action = p ? `followed ${p}` : 'followed your project';
      break;
    case 'MINT':
      action = join('collected', p, t) || 'collected your work';
      break;
    case 'LIST':
      action = join('listed', join(p, t) || 'a piece') + (eth ? ` · ${eth}` : '');
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
      action = `pinged you: ${msg}`;
      break;
    }
    case 'WISHLIST_HIT': {
      const verb = row.data?.event === 'sold' ? 'sold' : 'listed';
      action = join(verb, join(p, t) || 'a piece') + (eth ? ` · ${eth}` : '') + ' · wishlist';
      break;
    }
    case 'WATCH_HIT':
      action = join('moved', join(p, t));
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
  kind: RenderKind,
  prefs: { mints: boolean; lists: boolean; offers: boolean; xfers: boolean; mutuals: boolean; cooldown: boolean }
): boolean {
  switch (kind) {
    case 'MINT':
    case 'SALE':
      return prefs.mints;
    case 'LIST':
      return prefs.lists;
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
