'use client';

/*
 * components/shell/TheWatch.tsx — The Watch (OS Tools / Ambient).
 *
 * A small persistent chip that floats over every page, showing one live
 * platform vital of the user's choosing. Off by default; enabled from the
 * Spell Book (it took the retired Solar Flare slot). Mounted once globally in
 * PriceOSShell and gated on the `watch` flag.
 *
 * Interaction:
 *   - tap  → cycle the metric (volume → minted → holders → projects), saved
 *            so it persists across reloads.
 *   - drag → reposition anywhere; position remembered.
 *   - ✕    → dismiss (turns The Watch off).
 *
 * Data: /api/stats (real platform-wide totals, 60s edge cache). No indexer
 * needed — the chainless ledger already feeds these numbers.
 *
 * Next layer (not in this build): "Watch this" on any stat to pin a specific
 * collection's floor + tap-to-navigate there.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useToast } from '../../lib/state/ToastContext';
import type { PlatformStatsResponse } from '../../app/api/stats/route';

interface Metric {
  key: keyof PlatformStatsResponse;
  label: string;
  /** Render the stored value for display. */
  fmt: (v: string | number) => string;
}

const METRICS: Metric[] = [
  /* ETH wears PD's own ◊, like every other price on the site — never the
     Greek Xi (Brendon, 2026-07-31). */
  { key: 'total_volume_eth', label: 'VOLUME', fmt: (v) => `◊︎ ${v}` },
  { key: 'total_minted', label: 'MINTED', fmt: (v) => `${v}` },
  { key: 'total_holders', label: 'HOLDERS', fmt: (v) => `${v}` },
  { key: 'total_projects', label: 'PROJECTS', fmt: (v) => `${v}` },
];

const POS_KEY = 'pd_watch_pos';
const DRAG_THRESHOLD = 5; // px of movement before a press counts as a drag

export default function TheWatch() {
  const { notifs, update, toggle } = usePdNotifs();
  const { showToast } = useToast();

  const [stats, setStats] = useState<PlatformStatsResponse | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const ref = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ active: boolean; moved: boolean; dx: number; dy: number }>({
    active: false, moved: false, dx: 0, dy: 0,
  });

  const active = notifs.watch;
  const metric = METRICS[((notifs.watchMetric % METRICS.length) + METRICS.length) % METRICS.length];

  /* Poll platform stats while active (60s — matches the edge cache). */
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const load = () => {
      fetch('/api/stats')
        .then((r) => (r.ok ? r.json() : null))
        .then((d: PlatformStatsResponse | null) => { if (!cancelled && d) setStats(d); })
        .catch(() => { /* offline — keep the last value */ });
    };
    load();
    // Skip the poll while the tab is hidden; refresh on return. A backgrounded
    // tab must not keep hitting the stats route.
    const id = window.setInterval(() => { if (!document.hidden) load(); }, 60_000);
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { cancelled = true; window.clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [active]);

  /* Restore saved position; default to lower-right above the footer. */
  useEffect(() => {
    if (!active || pos) return;
    let next = { x: window.innerWidth - 150, y: window.innerHeight - 120 };
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p?.x === 'number' && typeof p?.y === 'number') next = p;
      }
    } catch { /* ignore */ }
    next = clampToViewport(next.x, next.y);
    setPos(next);
  }, [active, pos]);

  /* Re-clamp on rotation / viewport resize — a chip parked bottom-right in
     portrait would otherwise sit stranded OFF-SCREEN after turning landscape
     (the viewport shrinks under the saved coords). */
  useEffect(() => {
    if (!active) return;
    const onResize = () => {
      setPos((p) => {
        if (!p) return p;
        const c = clampToViewport(p.x, p.y);
        return c.x === p.x && c.y === p.y ? p : c;
      });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [active]);

  /* Hide while a modal / panel owns the screen so the chip never covers it. */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const sync = () => setModalOpen(document.body.classList.contains('modal-open'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const cycleMetric = useCallback(() => {
    const nextIdx = (notifs.watchMetric + 1) % METRICS.length;
    update({ watchMetric: nextIdx });
    showToast(`Watch: ${METRICS[nextIdx].label}`);
  }, [notifs.watchMetric, update, showToast]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.watch-x')) return; // ✕ handles itself
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    drag.current = { active: true, moved: false, dx: e.clientX - r.left, dy: e.clientY - r.top };
    el.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    const nx = e.clientX - d.dx;
    const ny = e.clientY - d.dy;
    const el = ref.current;
    const start = el?.getBoundingClientRect();
    if (start && (Math.abs(nx - start.left) > DRAG_THRESHOLD || Math.abs(ny - start.top) > DRAG_THRESHOLD)) {
      d.moved = true;
    }
    setPos(clampToViewport(nx, ny));
  }, []);

  const onPointerUp = useCallback(() => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    if (!d.moved) {
      cycleMetric();
    } else if (pos) {
      try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
    }
  }, [cycleMetric, pos]);

  if (!active || !pos || modalOpen) return null;

  const raw = stats ? stats[metric.key] : null;
  const value = raw != null ? metric.fmt(raw) : '—';

  return (
    <div
      ref={ref}
      className="the-watch"
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="button"
      tabIndex={0}
      aria-label={`The Watch — ${metric.label}. Tap to change what it shows.`}
      title="Tap to change · drag to move"
    >
      <span className="watch-live" aria-hidden="true" />
      <span className="watch-body">
        <span className="watch-label">{metric.label}</span>
        <span className="watch-value">{value}</span>
      </span>
      <button
        type="button"
        className="watch-x"
        aria-label="Dismiss The Watch"
        onClick={(e) => {
          e.stopPropagation();
          toggle('watch');
          showToast('The Watch: OFF');
        }}
      >
        ✕
      </button>
    </div>
  );
}

function clampToViewport(x: number, y: number): { x: number; y: number } {
  if (typeof window === 'undefined') return { x, y };
  const w = 140, h = 52, pad = 8;
  return {
    x: Math.max(pad, Math.min(x, window.innerWidth - w - pad)),
    y: Math.max(pad, Math.min(y, window.innerHeight - h - pad)),
  };
}
