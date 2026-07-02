// lib/pings/render.ts — pure, client-safe mapping of a feed item to display
// text. No I/O. Used by the Pings panel and the toast copy.
//
// A feed item is either a DIRECTED ping (a stored `pings` row) or a BROADCAST
// item synthesised at read time from the shared `events` table (the "people /
// projects you follow did X" firehose — never stored). Both share this shape.

import type { PingRow, PingKind } from '@/lib/supabase';
import { ACHIEVEMENTS_ICON } from '@/lib/achievements/icon';

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

/** Attention tier. MEDIUM is the default (today's behaviour). HIGH always sorts
 *  to the top and renders bold; LOW sinks to the bottom of the list. */
export type PingPriority = 'low' | 'medium' | 'high';

/** Default tier per kind (Brendon, 2026-06-26 — tunable).
 *   HIGH   — money landing / act-now: a sale, an offer, an accepted offer, a
 *            wishlisted piece moving.
 *   LOW    — social / celebratory background: follows, achievements, streaks.
 *   MEDIUM — everything else (mints, transfers, listings, watches). */
const PRIORITY: Record<RenderKind, PingPriority> = {
  SALE:           'high',
  OFFER:          'high',
  OFFER_ACCEPTED: 'high',
  COUNTER:        'high',
  WISHLIST_HIT:   'high',
  FOLLOW:         'low',
  PROJECT_FOLLOW: 'low',
  OUTPUT_FOLLOW:  'low',
  ACHIEVEMENT:    'low',
  STREAK:         'low',
  MINT:           'medium',
  XFER:           'medium',
  WATCH_HIT:      'medium',
  LIST:           'medium',
};

/** Tier rank for sorting (high first, low last). */
export const PRIORITY_RANK: Record<PingPriority, number> = { high: 0, medium: 1, low: 2 };

export interface RenderedPing {
  id: string;
  kind: RenderKind;
  icon: string;        // VS-15 enforced glyph
  handle: string;      // actor label (e.g. "@matty", or "" for self/system)
  action: string;      // "collected @oracle #14", "followed you", etc.
  priority: PingPriority;
  read: boolean;
  createdAt: string;
}

/** VS-15 (text-presentation) glyph per kind — matches the notif-item look. */
// PD's canonical glyph vocabulary — matched 1:1 to the MY PINGS settings pills
// and the achievement category map, so a Ping shows the exact icon that concept
// wears everywhere else in the app. All carry the VS-15 text selector (U+FE0E)
// so they render as monochrome Courier glyphs, never emoji.
const ICONS: Record<RenderKind, string> = {
  FOLLOW:         '⚭︎', // ⚭ mutual / social (matches MUTUALS pill)
  PROJECT_FOLLOW: '⚭︎', // ⚭
  OUTPUT_FOLLOW:  '⚭︎', // ⚭ (same social glyph as project/user follows)
  ACHIEVEMENT:    ACHIEVEMENTS_ICON, // ◍ the canonical achievements icon (the unlock's own glyph is used when present)
  STREAK:         '◈︎', // ◈ streak (achievement category glyph)
  MINT:           '✶︎', // ✶ collected (matches MINTS pill)
  LIST:           '✹︎', // ✹ listed (matches LISTS pill)
  SALE:           '✶︎', // ✶ collected
  OFFER:          '✦︎', // ✦ offered (matches OFFERS pill)
  OFFER_ACCEPTED: '✦︎', // ✦ offer resolved
  COUNTER:        '✦︎', // ✦ countered (offer family)
  XFER:           '✸︎', // ✸ transfer (matches XFERS pill)
  WISHLIST_HIT:   '✛︎', // ✛ wishlist (matches the artwork Wishlist glyph)
  WATCH_HIT:      '✛︎', // ✛ watch
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
    case 'OUTPUT_FOLLOW':
      action = join('followed', join(p, t) || 'your output');
      break;
    case 'MINT':
      if (typeof row.data?.milestone === 'number') {
        // Artist milestone ping — project-level, not a single collector.
        handle = '';
        action = join(p || 'Your project', 'hit', `${row.data.milestone} collected`);
      } else {
        action = join('collected', p, t) || 'collected your work';
      }
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
    case 'COUNTER':
      action = join('countered', eth ? `at ${eth}` : '', 'on', join(p, t) || 'your offer');
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

  // Achievements carry their own catalog glyph — use it when present.
  const ownIcon =
    row.kind === 'ACHIEVEMENT' && typeof row.data?.icon === 'string' && row.data.icon
      ? (row.data.icon as string)
      : null;

  return {
    id: row.id,
    kind: row.kind,
    icon: ownIcon ?? ICONS[row.kind] ?? '✦︎',
    handle,
    action,
    priority: PRIORITY[row.kind] ?? 'medium',
    read: row.read,
    createdAt: row.created_at,
  };
}

/** Where a ping points — the piece (market pings), the project, or nowhere.
 *  Offer-family pings open the piece WITH the offers panel up (?offers=1)
 *  so accept is two taps from the ping (confirm card included). */
export function pingHref(p: { kind: RenderKind; project_id?: string | null; token_id?: string | null }): string | null {
  if (!p.project_id) return null;
  if (p.token_id != null && p.token_id !== '') {
    const base = `/art/${p.project_id}/${p.token_id}`;
    return p.kind === 'OFFER' || p.kind === 'COUNTER' ? `${base}?offers=1` : base;
  }
  return `/art/${p.project_id}`;
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
    case 'COUNTER':
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
