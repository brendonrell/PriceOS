'use client';

/*
 * PingsContext
 *
 * The live Pings inbox state + delivery. One owner for the whole client:
 *   • Polls the TINY /api/pings/count on a background interval (cheap egress).
 *   • Pulls the full /api/pings list only on login, when the count ticks up, on
 *     a qualifying app action, or when the panel opens.
 *   • Pops a toast for genuinely-new unread pings (honouring notifs.pingToasts
 *     + the per-category prefs).
 *   • Exposes the unread count (badge), the items (panel), refresh, and
 *     markAllRead (clear on open).
 *
 * Delivery is POLLING, not realtime: SIWE gives no Supabase-Auth identity, so a
 * private per-user realtime channel can't be row-secured, and free tier caps at
 * 200 concurrent sockets. Polling a SIWE-gated route is the $0-safe, private
 * path. The poll pauses while the tab is hidden to save bandwidth.
 *
 * Mounted inside ToastProvider (needs useToast) — see app/layout.tsx.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseBrowser } from '../supabase';
import { useAuth } from './AuthContext';
import { useToast, TOAST_ART_MAX, type ToastArt } from './ToastContext';
import { usePdNotifs, showsRegularToasts, showsNativePings } from './PdNotifsContext';
import { passesCategoryPrefs, renderPing, type FeedItem } from '../pings/render';
import { setAppBadge, clearAppBadge, ensureFreshSubscription } from '../push/client';
import { playSound } from '../sound/engine';

/* The with-art toast is DELIBERATELY selective (Brendon, 2026-07-17 — "very
   selective… otherwise people will get annoyed"): the ASCII artifact row rides
   ONLY the app's own HIGH tier — money landing / act-now on a specific piece
   (sale · offer · accepted · counter · wishlist hit). Everything else keeps
   today's plain pill. A batch shows art only when it's small enough to show
   whole (≤3) and EVERY fresh ping is art-grade — a mixed or big batch stays
   plain. */
const TOAST_ART_KINDS = new Set(['SALE', 'OFFER', 'OFFER_ACCEPTED', 'COUNTER', 'WISHLIST_HIT']);
function pingArt(p: FeedItem): ToastArt | null {
  if (!TOAST_ART_KINDS.has(p.kind)) return null;
  if (!p.project_id || p.token_id == null || p.token_id === '') return null;
  const id = Number(p.token_id);
  if (!Number.isFinite(id) || id < 1) return null;
  return { slug: p.project_id, id };
}
function toastArtFor(fresh: FeedItem[]): ToastArt[] | null {
  if (fresh.length > TOAST_ART_MAX) return null;
  const arts: ToastArt[] = [];
  const seen = new Set<string>();
  for (const p of fresh) {
    const a = pingArt(p);
    if (!a) return null; // one non-art-grade ping → the whole toast stays plain
    const k = `${a.slug}:${a.id}`;
    if (!seen.has(k)) { seen.add(k); arts.push(a); }
  }
  return arts.length > 0 ? arts : null;
}

// Poll cadence (reliability FALLBACK). The live market feed below drives the
// near-instant path (a directed ping surfaces in ~1s via the realtime nudge);
// this interval just catches a dropped socket / anon-env-missing build. So it
// can be relaxed — 30s idle keeps per-user DB reads light without any felt
// latency (bumped from 15s on re-enable, Brendon 2026-07-08).
const POLL_MS = 30_000;

// Rolling inbox window. We hold the newest N pings; as fresh ones land at the
// top, the oldest already-seen ones fall off the bottom (the server hands back
// newest-first, so requesting N gives exactly that window). 100 ≈ the live
// window Instagram/X keep — scrollable, with older history aging out per the
// retention tiers rather than living in the panel forever.
// ⛔ BACK TO 100 (Brendon, 2026-08-02). It was halved while hunting the menu
// lag; the lag was the picture reader, not the inbox, so the full window is
// back. The menu only builds a screenful of rows until it is opened, so a
// hundred costs nothing to hold.
const PING_WINDOW = 100;

/* Re-enabled 2026-07-08 (Brendon) post-Cloudflare migration. Safe because:
   (a) polls ONLY while signed in AND the tab is visible (the tick bails on
   non-visible; the socket nudge is the real-time path); (b) the count query is
   a lean index-backed HEAD count of directed unread only — no broadcast join;
   (c) 30s fallback cadence. The 2026-06-27 Vercel-CPU fear doesn't transfer. */
const PINGS_POLL_DISABLED = false;

// App actions that can mint a new ping — re-pull immediately, don't wait for the
// next interval. Mirrors the qualifying-event list PriceRankSync listens to.
const QUALIFYING_EVENTS = [
  'pd:project-refresh', // mint / list / buy / offer / accept
  'pd:follows-changed', // follow a person
  'pd:project-follows-changed', // follow a project
  'pd:pricerank-changed', // achievement unlock
] as const;

/* Instant-open cache (Brendon, 2026-06-18). The panel showed an empty "No pings
   yet" on every cold load until /api/pings answered, so the menu read as broken.
   We stash the last-loaded list in localStorage (keyed by wallet so it never
   leaks across accounts on a shared browser) and hydrate it the instant the user
   signs in — the fresh fetch then revalidates in the background. */
const PINGS_CACHE_KEY = 'pd_pings_cache';
type PingsCache = { addr: string; items: FeedItem[]; du: number; bu: number };
function readPingsCache(addr: string): PingsCache | null {
  try {
    const raw = localStorage.getItem(PINGS_CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as PingsCache;
    return c && c.addr === addr && Array.isArray(c.items) ? c : null;
  } catch {
    return null;
  }
}
function writePingsCache(c: PingsCache) {
  try {
    localStorage.setItem(PINGS_CACHE_KEY, JSON.stringify(c));
  } catch {
    /* quota / unavailable — cache is best-effort */
  }
}
function clearPingsCache() {
  try {
    localStorage.removeItem(PINGS_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/* Broadcast SEEN ledger. Directed pings mark read server-side per row, but the
   broadcast firehose has no per-viewer rows — its server read-state is a single
   watermark, which can't express "I scrolled past these three but not the two
   older ones". This on-device ledger holds exactly which broadcast items have
   been scrolled past; the watermark is only advanced once every unread
   broadcast item in the window has genuinely been seen. Keyed by wallet. */
const SEEN_LEDGER_KEY = 'pd_pings_seen';
const SEEN_LEDGER_CAP = 800;
function readSeenLedger(addr: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${SEEN_LEDGER_KEY}:${addr}`);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}
function writeSeenLedger(addr: string, ids: Set<string>) {
  try {
    const arr = Array.from(ids);
    // Cap FIFO — the oldest ledger entries age out of the window anyway.
    const trimmed = arr.length > SEEN_LEDGER_CAP ? arr.slice(arr.length - SEEN_LEDGER_CAP) : arr;
    localStorage.setItem(`${SEEN_LEDGER_KEY}:${addr}`, JSON.stringify(trimmed));
  } catch {
    /* quota — best-effort */
  }
}

interface PingsState {
  items: FeedItem[];
  /** Directed (to-you) unread — refreshed live by the cheap count poll. */
  directedUnread: number;
  /** Broadcast (follow-feed) unread — refreshed only on a full fetch. */
  broadcastUnread: number;
  /** Badge total = directed + broadcast. */
  unreadCount: number;
  loading: boolean;
}

interface PingsContextValue {
  state: PingsState;
  refresh: () => void;
  markAllRead: () => void;
  /** Mark specific pings as SEEN (the scroll-past gesture). Directed ids mark
   *  read server-side; broadcast ids land in the on-device ledger, and the
   *  server watermark advances only when no unread broadcast items remain. */
  markSeen: (ids: string[]) => void;
}

const PingsContext = createContext<PingsContextValue | null>(null);

export function PingsProvider({ children }: { children: ReactNode }) {
  const { siweAddress } = useAuth();
  const { showToast } = useToast();
  const { notifs } = usePdNotifs();

  const [state, setState] = useState<PingsState>({
    items: [], directedUnread: 0, broadcastUnread: 0, unreadCount: 0, loading: false,
  });

  // Refs so the polling effect doesn't re-subscribe on every state change.
  const seenIds = useRef<Set<string>>(new Set());
  const primed = useRef(false); // suppress a toast blast on the first load
  const inFlight = useRef(false);
  const prefsRef = useRef(notifs);
  prefsRef.current = notifs;

  const fetchFull = useCallback(async () => {
    if (!siweAddress || inFlight.current) return;
    inFlight.current = true;
    setState((s) => ({ ...s, loading: true }));
    try {
      const r = await fetch(`/api/pings?limit=${PING_WINDOW}`, { cache: 'no-store' });
      if (!r.ok) return;
      const j = (await r.json()) as {
        directed_unread: number;
        broadcast_unread: number;
        items: FeedItem[];
      };
      let items = j.items ?? [];
      // Scroll-seen ledger wins over the server watermark for broadcast rows.
      const ledger = readSeenLedger(siweAddress);
      if (ledger.size > 0) {
        items = items.map((p) =>
          !p.read && p.source === 'broadcast' && ledger.has(p.id) ? { ...p, read: true } : p
        );
      }

      // New, unread, category-allowed pings we haven't seen → pop a toast once.
      // In-app toasts fire only when Pingtoasts is in a regular state (ON or
      // COMBO) AND Silent Mode (the crescent focus toggle) is OFF. A 3D-only
      // setup delivers via the OS, not an in-app toast. Pings still record
      // regardless — Silent Mode only mutes the surfacing, so flipping it back
      // on resumes the firehose of everything that landed while you focused.
      const n = prefsRef.current;
      const toastsOn = showsRegularToasts(n.pingToasts) && !n.nightmode;
      const fresh = items.filter(
        (p) => !p.read && !seenIds.current.has(p.id) && passesCategoryPrefs(p, n.pings)
      );
      if (primed.current && toastsOn && fresh.length > 0) {
        if (fresh.length === 1) {
          const r = renderPing(fresh[0]);
          showToast(`Ping: ${[r.handle, r.action].filter(Boolean).join(' ')}`.trim(), undefined, undefined, toastArtFor([fresh[0]]));
        } else {
          showToast(`Pings: ${fresh.length} NEW`, undefined, undefined, toastArtFor(fresh));
        }
        // Sound layer (no-op when off) — one blip per toast, picked by the
        // weightiest fresh kind: seal (deal done) > coin (your sale) >
        // sparkle (achievement). Everything else gets the nudge, so a ping
        // landing is never silent (Brendon, 2026-07-31).
        const kinds = new Set(fresh.map((p) => p.kind));
        if (kinds.has('OFFER_ACCEPTED') || kinds.has('TRADE_ACCEPTED')) playSound('seal');
        else if (kinds.has('SALE')) playSound('coin');
        else if (kinds.has('ACHIEVEMENT')) playSound('sparkle');
        else playSound('nudge');
      }
      items.forEach((p) => seenIds.current.add(p.id));
      primed.current = true;

      const du = j.directed_unread ?? 0;
      // Broadcast unread respects the ledger (the server only knows the
      // watermark), so the badge never counts something already scrolled past.
      const bu = items.filter((p) => p.source === 'broadcast' && !p.read).length;
      setState({ items, directedUnread: du, broadcastUnread: bu, unreadCount: du + bu, loading: false });
      if (siweAddress) writePingsCache({ addr: siweAddress, items, du, bu });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    } finally {
      inFlight.current = false;
    }
  }, [siweAddress, showToast]);

  const fetchCount = useCallback(async () => {
    if (!siweAddress) return;
    try {
      const r = await fetch('/api/pings/count', { cache: 'no-store' });
      if (!r.ok) return;
      const j = (await r.json()) as { unread: number };
      const directed = j.unread ?? 0;
      // The count poll only tracks DIRECTED unread (cheap). When it rises, a new
      // to-you ping landed → pull the full list (which also refreshes broadcast).
      setState((s) => {
        if (directed > s.directedUnread) void fetchFull();
        return { ...s, directedUnread: directed, unreadCount: directed + s.broadcastUnread };
      });
    } catch {
      /* offline — last good state stays up */
    }
  }, [siweAddress, fetchFull]);

  /* The scroll-past gesture — the ONLY thing that marks pings read (Brendon,
     2026-07-12: opening the menu proves nothing; scrolling the pings section
     is what proves they've been seen). */
  const markSeen = useCallback(
    (ids: string[]) => {
      if (!siweAddress || ids.length === 0) return;
      const directed: string[] = [];
      const broadcast: string[] = [];
      for (const id of ids) (id.startsWith('bcast:') ? broadcast : directed).push(id);

      setState((s) => {
        const idSet = new Set(ids);
        // Decrement the directed count rather than recount the window — older
        // unread directed pings can live beyond the 100-item window.
        const directedHit = s.items.filter(
          (p) => idSet.has(p.id) && p.source === 'directed' && !p.read
        ).length;
        const items = s.items.map((p) => (idSet.has(p.id) && !p.read ? { ...p, read: true } : p));
        const directedUnread = Math.max(0, s.directedUnread - directedHit);
        const broadcastUnread = items.filter((p) => p.source === 'broadcast' && !p.read).length;
        // Ledger write-through for the broadcast side.
        if (broadcast.length > 0) {
          const ledger = readSeenLedger(siweAddress);
          broadcast.forEach((id) => ledger.add(id));
          writeSeenLedger(siweAddress, ledger);
        }
        writePingsCache({ addr: siweAddress, items, du: directedUnread, bu: broadcastUnread });
        // Server: directed rows flip read; the broadcast watermark advances
        // only once the whole unread broadcast window has been seen.
        const broadcastClear = broadcastUnread === 0 && broadcast.length > 0;
        if (directed.length > 0 || broadcastClear) {
          fetch('/api/pings/read', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              ...(directed.length > 0 ? { ids: directed } : {}),
              ...(broadcastClear ? { broadcast_seen: true } : {}),
            }),
          }).catch(() => {});
        }
        return {
          ...s,
          items,
          directedUnread,
          broadcastUnread,
          unreadCount: directedUnread + broadcastUnread,
        };
      });
    },
    [siweAddress]
  );

  const markAllRead = useCallback(() => {
    if (!siweAddress) return;
    setState((s) => {
      const next = {
        ...s,
        directedUnread: 0,
        broadcastUnread: 0,
        unreadCount: 0,
        items: s.items.map((p) => ({ ...p, read: true })),
      };
      // Keep the seen ledger consistent with the wipe.
      const ledger = readSeenLedger(siweAddress);
      s.items.forEach((p) => { if (p.source === 'broadcast') ledger.add(p.id); });
      writeSeenLedger(siweAddress, ledger);
      writePingsCache({ addr: siweAddress, items: next.items, du: 0, bu: 0 });
      return next;
    });
    fetch('/api/pings/read', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  }, [siweAddress]);

  // Login / logout → reset + initial pull.
  useEffect(() => {
    seenIds.current = new Set();
    primed.current = false;
    if (!siweAddress) {
      setState({ items: [], directedUnread: 0, broadcastUnread: 0, unreadCount: 0, loading: false });
      clearPingsCache();
      return;
    }
    // Paint the last-known pings immediately so the menu is never empty on a
    // cold open; the fetch below revalidates them in the background.
    const cached = readPingsCache(siweAddress);
    if (cached) {
      cached.items.forEach((p) => seenIds.current.add(p.id));
      setState({
        items: cached.items,
        directedUnread: cached.du,
        broadcastUnread: cached.bu,
        unreadCount: cached.du + cached.bu,
        loading: true,
      });
    }
    void fetchFull();

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void fetchCount();
    };
    const interval = PINGS_POLL_DISABLED ? 0 : window.setInterval(tick, POLL_MS);

    const onVisible = () => {
      if (PINGS_POLL_DISABLED) return;
      if (document.visibilityState === 'visible') void fetchCount();
    };
    document.addEventListener('visibilitychange', onVisible);

    const onAction = () => { void fetchFull(); };
    QUALIFYING_EVENTS.forEach((e) => window.addEventListener(e, onAction));

    // Near-instant path: the moment ANY market event lands (offer/sale/list/
    // mint/follow), pull the FULL list so the newest ping surfaces at the top in
    // ~1s — directed AND follow-feed alike (a count-only nudge left the visible
    // list frozen whenever the new activity was broadcast, not directed-to-you).
    // Rides the PUBLIC events table — no private channel, no privacy concern.
    // Debounced so a burst is one fetch. Poll is the fallback if the socket is
    // unavailable (anon env missing) or drops.
    let nudgeTimer = 0;
    const nudge = () => {
      window.clearTimeout(nudgeTimer);
      nudgeTimer = window.setTimeout(() => { void fetchFull(); }, 800);
    };
    let channel: RealtimeChannel | null = null;
    if (!PINGS_POLL_DISABLED) {
      try {
        channel = getSupabaseBrowser()
          .channel('pings-live')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, nudge)
          .subscribe();
      } catch {
        /* anon env missing in this build — the poll covers it */
      }
    }

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(nudgeTimer);
      document.removeEventListener('visibilitychange', onVisible);
      QUALIFYING_EVENTS.forEach((e) => window.removeEventListener(e, onAction));
      if (channel) {
        try { getSupabaseBrowser().removeChannel(channel); } catch { /* socket gone */ }
      }
    };
  }, [siweAddress, fetchFull, fetchCount]);

  // OS app-icon badge — when 3D Pingtoasts are on (3d / combo), mirror the
  // unread count onto the installed app icon (iOS 16.4+ / Chromium), the same
  // way Messages/Mail badge. Cleared when native isn't in play or count hits 0.
  useEffect(() => {
    if (showsNativePings(notifs.pingToasts)) setAppBadge(state.unreadCount);
    else clearAppBadge();
  }, [notifs.pingToasts, state.unreadCount]);

  // Key-rotation self-heal: if this device's push registration predates the
  // server's current signing key, quietly drop + re-register it (once per
  // session). Without this a key rotation strands every subscribed device.
  useEffect(() => {
    if (showsNativePings(notifs.pingToasts)) void ensureFreshSubscription();
  }, [notifs.pingToasts]);

  const value = useMemo<PingsContextValue>(
    () => ({ state, refresh: fetchFull, markAllRead, markSeen }),
    [state, fetchFull, markAllRead, markSeen]
  );

  return <PingsContext.Provider value={value}>{children}</PingsContext.Provider>;
}

export function usePings(): PingsContextValue {
  const ctx = useContext(PingsContext);
  if (!ctx) throw new Error('usePings must be used inside <PingsProvider>');
  return ctx;
}
