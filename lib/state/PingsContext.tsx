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
import { useToast } from './ToastContext';
import { usePdNotifs } from './PdNotifsContext';
import { passesCategoryPrefs, type FeedItem } from '../pings/render';

// Poll cadence (reliability fallback). The live market feed below drives the
// near-instant path; this just catches non-market pings (follow / p2p) and any
// dropped socket. Tight because latency is the enemy on a financial surface.
const POLL_MS = 15_000;

// App actions that can mint a new ping — re-pull immediately, don't wait for the
// next interval. Mirrors the qualifying-event list PriceRankSync listens to.
const QUALIFYING_EVENTS = [
  'pd:project-refresh', // mint / list / buy / offer / accept
  'pd:follows-changed', // follow a person
  'pd:project-follows-changed', // follow a project
  'pd:pricerank-changed', // achievement unlock
] as const;

interface PingsState {
  items: FeedItem[];
  unreadCount: number;
  loading: boolean;
}

interface PingsContextValue {
  state: PingsState;
  refresh: () => void;
  markAllRead: () => void;
}

const PingsContext = createContext<PingsContextValue | null>(null);

export function PingsProvider({ children }: { children: ReactNode }) {
  const { siweAddress } = useAuth();
  const { showToast } = useToast();
  const { notifs } = usePdNotifs();

  const [state, setState] = useState<PingsState>({ items: [], unreadCount: 0, loading: false });

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
      const r = await fetch('/api/pings', { cache: 'no-store' });
      if (!r.ok) return;
      const j = (await r.json()) as { unread_count: number; items: FeedItem[] };
      const items = j.items ?? [];

      // New, unread, category-allowed pings we haven't seen → toast once.
      const n = prefsRef.current;
      const fresh = items.filter(
        (p) => !p.read && !seenIds.current.has(p.id) && passesCategoryPrefs(p.kind, n.pings)
      );
      if (primed.current && n.pingToasts && fresh.length > 0) {
        showToast(`Pings: ${fresh.length} NEW`);
      }
      items.forEach((p) => seenIds.current.add(p.id));
      primed.current = true;

      setState({ items, unreadCount: j.unread_count ?? 0, loading: false });
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
      // Only pay for the full list when the count actually moved up.
      setState((s) => {
        if ((j.unread ?? 0) > s.unreadCount) void fetchFull();
        return { ...s, unreadCount: j.unread ?? s.unreadCount };
      });
    } catch {
      /* offline — last good state stays up */
    }
  }, [siweAddress, fetchFull]);

  const markAllRead = useCallback(() => {
    if (!siweAddress) return;
    setState((s) => ({ ...s, unreadCount: 0, items: s.items.map((p) => ({ ...p, read: true })) }));
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
      setState({ items: [], unreadCount: 0, loading: false });
      return;
    }
    void fetchFull();

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void fetchCount();
    };
    const interval = window.setInterval(tick, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void fetchCount();
    };
    document.addEventListener('visibilitychange', onVisible);

    const onAction = () => { void fetchFull(); };
    QUALIFYING_EVENTS.forEach((e) => window.addEventListener(e, onAction));

    // Near-instant path: the moment ANY market event lands (offer/sale/list/
    // mint), nudge a count check so a financial ping surfaces in ~1s instead of
    // waiting for the poll. Rides the PUBLIC events table — no private channel,
    // no privacy concern. Debounced so a burst is one check. Poll is the
    // fallback if the socket is unavailable (anon env missing) or drops.
    let nudgeTimer = 0;
    const nudge = () => {
      window.clearTimeout(nudgeTimer);
      nudgeTimer = window.setTimeout(() => { void fetchCount(); }, 800);
    };
    let channel: RealtimeChannel | null = null;
    try {
      channel = getSupabaseBrowser()
        .channel('pings-live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, nudge)
        .subscribe();
    } catch {
      /* anon env missing in this build — the poll covers it */
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

  const value = useMemo<PingsContextValue>(
    () => ({ state, refresh: fetchFull, markAllRead }),
    [state, fetchFull, markAllRead]
  );

  return <PingsContext.Provider value={value}>{children}</PingsContext.Provider>;
}

export function usePings(): PingsContextValue {
  const ctx = useContext(PingsContext);
  if (!ctx) throw new Error('usePings must be used inside <PingsProvider>');
  return ctx;
}
