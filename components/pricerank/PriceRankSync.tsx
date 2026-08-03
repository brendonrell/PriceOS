'use client';

/*
 * PriceRankSync — headless. Keeps a signed-in user's PriceScore / PriceRank /
 * PriceStreak + achievement unlocks live. Unlocks surface ONLY as the rolled
 * "N new achievements" row in the Pings inbox (Brendon, 2026-08-03) — this
 * sync never toasts them.
 *
 * Two triggers:
 *   • ON LOAD — re-evaluate once (surfaces any unlocks earned since last visit).
 *     This is NOT a streak tick: opening the app is not a deliberate action
 *     (Brendon's rule — bare app-open must never feed the streak).
 *   • ON A QUALIFYING ACTION — a real, deliberate interaction (a mint/market
 *     move, a follow, a project-follow, an anoint). The FIRST one each LOCAL day
 *     ticks the PriceStreak; every one re-evaluates achievements.
 *
 * The streak day boundary is the user's LOCAL date. The streak ping route
 * already re-evaluates achievements server-side, so on a ping day we don't also
 * call evaluate (avoids double work + double pops).
 *
 * Mounted once, inside the auth + toast providers (WalletProviders).
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '../../lib/state/AuthContext';

// Real, deliberate actions — never a bare page open.
const QUALIFYING_EVENTS = [
  'pd:project-refresh',        // mint / list / buy / offer / accept
  'pd:follows-changed',        // follow / unfollow a person
  'pd:project-follows-changed',// follow / unfollow a project
  'pd:anoint-changed',         // place / move an Anointment
] as const;

// A mint fires 'pd:project-refresh' at the exact moment the new piece is
// revealing. Evaluating achievements on that same beat pops toasts and re-pulls
// the user row (an app-wide re-render) right through the reveal — it stepped on
// the minting display (Brendon, 2026-07-05). Hold the achievement check until
// the mint reveal has settled (the button's done-face clears at ~1600ms), so the
// mint owns its moment and the celebration lands cleanly just after. Minting is
// the whole site — nothing else gets to interrupt it.
const MINT_REVEAL_SETTLE_MS = 2200;

function todayLocal(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function PriceRankSync() {
  const { siweAddress } = useAuth();
  const evaluating = useRef(false);

  useEffect(() => {
    if (!siweAddress) return;
    let alive = true;

    /* ⛔ UNLOCKS NO LONGER TOAST (Brendon, 2026-08-03: "Opposite of special…
       No push no badge just in app"). The whole in-app delivery is the ONE
       rolled "N new achievements" row in the Pings inbox — this sync only
       nudges the score/rank surfaces to re-read. */
    const pop = (list: unknown) => {
      if (!Array.isArray(list) || list.length === 0) return;
      window.dispatchEvent(new Event('pd:pricerank-changed'));
    };

    const evaluate = async () => {
      if (evaluating.current) return;
      evaluating.current = true;
      try {
        const r = await fetch('/api/achievements/evaluate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        });
        if (r.ok) { const j = await r.json().catch(() => ({})); if (alive) pop(j?.newlyUnlocked); }
      } catch { /* offline / transient — next action retries */ } finally {
        evaluating.current = false;
      }
    };

    const streakPing = async (): Promise<boolean> => {
      try {
        const r = await fetch('/api/streak/ping', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ localDate: todayLocal() }),
        });
        if (!r.ok) return false;
        const j = await r.json().catch(() => ({}));
        if (alive) pop(j?.newlyUnlocked);
        return true;
      } catch { return false; }
    };

    // On load: surface prior unlocks (no streak tick).
    void evaluate();

    const onAction = async () => {
      const key = `pd_streak_pinged_${todayLocal()}`;
      let pinged = true;
      try { pinged = !!localStorage.getItem(key); } catch { /* private mode */ }
      if (!pinged) {
        const ok = await streakPing(); // this route also re-evaluates achievements
        if (ok) { try { localStorage.setItem(key, '1'); } catch { /* no-op */ } }
        else await evaluate();
      } else {
        await evaluate();
      }
    };
    // Let a mint's reveal finish before the achievement check runs; other
    // deliberate actions (follow / anoint) have no reveal, so they stay immediate.
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const handler = (e: Event) => {
      if (e.type === 'pd:project-refresh') {
        const t = setTimeout(() => { timers.delete(t); if (alive) void onAction(); }, MINT_REVEAL_SETTLE_MS);
        timers.add(t);
      } else {
        void onAction();
      }
    };
    QUALIFYING_EVENTS.forEach((e) => window.addEventListener(e, handler));
    return () => {
      alive = false;
      timers.forEach((t) => clearTimeout(t));
      QUALIFYING_EVENTS.forEach((e) => window.removeEventListener(e, handler));
    };
  }, [siweAddress]);

  return null;
}
