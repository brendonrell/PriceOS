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
  TRADE:          'high',
  TRADE_ACCEPTED: 'high',
  TRADE_DECLINED: 'medium',
  WISHLIST_HIT:   'high',
  PING:           'high', // reminders (to-do / calendar) + Artist Push — act-now
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
  TRADE:          '⇌︎', // ⇌ the Exchange (⇄ is Arbitrage Map's — GLYPHS.md)
  TRADE_ACCEPTED: '⇌︎', // ⇌ trade resolved
  TRADE_DECLINED: '⇌︎', // ⇌ trade resolved
  XFER:           '✸︎', // ✸ transfer (matches XFERS pill)
  WISHLIST_HIT:   '✛︎', // ✛ wishlist (matches the artwork Wishlist glyph)
  WATCH_HIT:      '✛︎', // ✛ watch (interest pings override per reason below)
  PING:           '❍︎', // ❍ to-do (reminder pings override per subtype below)
};

/** Interest-ping glyphs — the WATCH_HIT reason wears the exact glyph its
 *  concept wears everywhere else (the MY PINGS pills / Starred tiles). */
const WATCH_ICONS: Record<string, string> = {
  mutual:  '⚭︎', // ⚭ mutuals pill
  artist:  '✺︎', // ✺ artists pill / starred-artist tile
  project: '⬚︎', // ⬚ projects pill / starred-project tile
  trait:   '⨝︎', // ⨝ traits pill / starred-trait tile
  rarity:  '❖︎', // ❖ rarity pill (rarity sitewide)
};

/** Reminder / Artist Push / system glyphs — PING subtypes. */
const PING_ICONS: Record<string, string> = {
  todo:     '❍︎', // ❍ To-Do
  sentinel: '❍︎', // ❍ the Sentinel IS a to-do — same mark, its READY moment
  workflow: '☇︎', // ☇ Workflows (GLYPHS: the TEXT lightning)
  calendar: '▦︎', // ▦ Calendar
  streak:   '◈︎', // ◈ streak (the streak glyph — the guard speaks for it)
  artist:   '✺︎', // ✺ Artist Push speaks as the artist
  system:   '⇡︎', // ⇡ the pings system speaking about itself (away rollup, ops)
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
    case 'TRADE':
      action = row.data?.counter === true ? 'countered your trade' : 'proposed a trade';
      break;
    case 'TRADE_ACCEPTED':
      action = 'accepted your trade';
      break;
    case 'TRADE_DECLINED':
      action = 'declined your trade';
      break;
    case 'XFER':
      if (row.data?.gift === true) {
        const note = typeof row.data?.note === 'string' && row.data.note ? ` — “${row.data.note}”` : '';
        const qty = typeof row.data?.qty === 'number' && row.data.qty > 1 ? ` ×${row.data.qty}` : '';
        action = join('sent you a sticker sheet', t ? t.replace('#', '') : '') + qty + note;
      } else if (row.data?.swap === true) {
        action = 'swapped sheets with you';
      } else {
        action = join('transferred', p, t);
      }
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
    case 'WATCH_HIT': {
      const reason = typeof row.data?.watch === 'string' ? (row.data.watch as string) : null;
      if (!reason) {
        action = join('moved', join(p, t));
        break;
      }
      // Interest ping — a starred/circle interest moved. Verb follows the
      // market event; the suffix names WHY you're seeing it.
      const ev = row.data?.event;
      const verb = ev === 'minted' ? 'collected' : ev === 'sold' ? 'sold' : 'listed';
      const what = join(p, t) || 'a piece';
      const priced = eth ? ` · ${eth}` : '';
      if (reason === 'rarity') {
        const rank = typeof row.data?.rank === 'number' ? (row.data.rank as number) : null;
        const total = typeof row.data?.rank_total === 'number' ? (row.data.rank_total as number) : null;
        const standing = rank ? ` · #${rank}${total ? ` of ${total}` : ''} rarest` : ' · rarity';
        action = join(verb, what) + priced + standing;
      } else {
        const why =
          reason === 'mutual' ? 'mutual' :
          reason === 'artist' ? '★ artist' :
          reason === 'project' ? '★ project' : '★ trait';
        action = join(verb, what) + priced + ` · ${why}`;
      }
      break;
    }
    case 'PING': {
      const reminder = typeof row.data?.reminder === 'string' ? (row.data.reminder as string) : null;
      if (reminder === 'todo') {
        handle = '';
        const text = typeof row.data?.text === 'string' && row.data.text ? (row.data.text as string) : 'a to-do';
        action = `To-Do due: ${text}`;
      } else if (reminder === 'calendar') {
        handle = '';
        const text = typeof row.data?.text === 'string' && row.data.text ? (row.data.text as string) : 'an event';
        const when = typeof row.data?.time === 'string' && row.data.time ? ` · ${row.data.time}` : '';
        // Lead-aware wording (2026-07-16 Calendar Sheet fine control).
        const lead = typeof row.data?.lead === 'string' ? (row.data.lead as string) : null;
        action = lead === '1d'
          ? `Tomorrow: ${text}${when}`
          : lead === '1h'
            ? `In 1 hour: ${text}${when}`
            : lead === '15m'
              ? `In 15 min: ${text}${when}`
              : `Today: ${text}${when}`;
      } else if (reminder === 'streak') {
        handle = '';
        const days = typeof row.data?.days === 'number' ? (row.data.days as number) : null;
        action = days
          ? `${days}-day streak on the line — one action today keeps it alive`
          : 'Your streak is on the line — one action today keeps it alive';
      } else if (reminder === 'sentinel') {
        // The Sentinel struck — a BUY target's live price crossed under it.
        handle = '';
        action = typeof row.data?.text === 'string' && row.data.text ? (row.data.text as string) : 'READY — a price target hit';
      } else if (reminder === 'workflow') {
        handle = '';
        action = typeof row.data?.text === 'string' && row.data.text ? (row.data.text as string) : 'Workflow: FIRED';
      } else if (reminder === 'ops') {
        handle = '';
        action = typeof row.data?.text === 'string' ? (row.data.text as string) : 'System notice';
      } else if (row.data?.away === true) {
        handle = '';
        action = typeof row.data?.text === 'string' ? (row.data.text as string) : 'While you were away';
      } else if (row.data?.artist_push === true) {
        const msg = typeof row.data?.message === 'string' ? (row.data.message as string) : '';
        action = join(msg || 'sent a note to holders', p ? `· ${p}` : '');
      } else {
        action = typeof row.data?.message === 'string' ? (row.data.message as string) : '';
      }
      break;
    }
    default:
      action = '';
  }

  // Achievements carry their own catalog glyph — use it when present.
  let ownIcon =
    row.kind === 'ACHIEVEMENT' && typeof row.data?.icon === 'string' && row.data.icon
      ? (row.data.icon as string)
      : null;
  // Interest pings wear their reason's glyph; reminder/Artist-Push pings theirs.
  if (row.kind === 'WATCH_HIT' && typeof row.data?.watch === 'string') {
    ownIcon = WATCH_ICONS[row.data.watch as string] ?? null;
  } else if (row.kind === 'PING') {
    const reminder = typeof row.data?.reminder === 'string' ? (row.data.reminder as string) : '';
    const sub =
      reminder === 'ops'
        ? 'system'
        : reminder ||
          (row.data?.artist_push === true ? 'artist' : row.data?.away === true ? 'system' : '');
    ownIcon = PING_ICONS[sub] ?? null;
  }

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
export function pingHref(p: { kind: RenderKind; project_id?: string | null; token_id?: string | null; data?: Record<string, unknown> | null }): string | null {
  // Trade pings open the Exchange window on that trade (the ?trade= restore —
  // the share-any-view URL-param precedent).
  if (p.kind === 'TRADE' || p.kind === 'TRADE_ACCEPTED' || p.kind === 'TRADE_DECLINED') {
    const tid = p.data?.trade_id;
    return typeof tid === 'string' && tid ? `/?trade=${tid}` : null;
  }
  if (!p.project_id) return null;
  if (p.token_id != null && p.token_id !== '') {
    const base = `/art/${p.project_id}/${p.token_id}`;
    return p.kind === 'OFFER' || p.kind === 'COUNTER' ? `${base}?offers=1` : base;
  }
  return `/art/${p.project_id}`;
}

/** The pref keys the gate below reads — a structural subset of notifs.pings. */
export interface PingCategoryPrefs {
  mints: boolean;
  lists: boolean;
  offers: boolean;
  xfers: boolean;
  mutuals: boolean;
  artists: boolean;
  projects: boolean;
  traits: boolean;
  rarity: boolean;
}

/** Category-pref gate — mirrors the MY PINGS pills, one honest gate for the
 *  panel, the toasts AND the native (3D) sender. Interest pings (WATCH_HIT)
 *  gate on their reason so all five taste toggles really control delivery.
 *  Directed-to-you social (followed you) plus achievements / streaks /
 *  reminders / Artist Push are always shown — they're about YOU, not a
 *  category you opted into. */
export function passesCategoryPrefs(
  item: { kind: RenderKind; data?: Record<string, unknown> | null },
  prefs: PingCategoryPrefs
): boolean {
  switch (item.kind) {
    case 'MINT':
    case 'SALE':
      return prefs.mints;
    case 'LIST':
      return prefs.lists;
    case 'OFFER':
    case 'OFFER_ACCEPTED':
    case 'COUNTER':
    case 'TRADE':
    case 'TRADE_ACCEPTED':
    case 'TRADE_DECLINED':
      return prefs.offers; // trades ride the OFFERS category (offer family)
    case 'XFER':
      return prefs.xfers;
    case 'WISHLIST_HIT':
      return prefs.lists;
    case 'WATCH_HIT': {
      const reason = typeof item.data?.watch === 'string' ? (item.data.watch as string) : null;
      switch (reason) {
        case 'mutual':  return prefs.mutuals;
        case 'artist':  return prefs.artists;
        case 'project': return prefs.projects;
        case 'trait':   return prefs.traits;
        case 'rarity':  return prefs.rarity;
        default:        return prefs.lists; // legacy watch pings
      }
    }
    // FOLLOW / PROJECT_FOLLOW / OUTPUT_FOLLOW / ACHIEVEMENT / STREAK / PING —
    // always shown (directed at you; not category-gated).
    default:
      return true;
  }
}
