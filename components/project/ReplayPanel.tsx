'use client';

/*
 * components/project/ReplayPanel.tsx — The Replay ⟳ (Project time machine).
 *
 * Replaces the static +More "Replay" mockup. Watch a Project's market history
 * animate from mint to today — floor price, holders, listings, sales on one
 * synchronized timeline. Scrub anywhere, play at 1x / 5x / 22x, and pause to
 * lock a static state (how the Project looked / priced / held at that moment).
 *
 * Data is seeded + deterministic per Project until the indexer is live
 * (lib/replay/history.ts) and is pinned to the live end-state numbers the rest
 * of the page already shows, so the Replay always lands exactly on "today".
 * The viz is a custom canvas for smooth continuous motion (no chart dep).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useProject } from '../../lib/state/ProjectContext';
import { getProject, projectColorway, renderArtwork } from '../../lib/project/registry';
import { priceDayNumber } from '../../lib/priceday/priceday';
import {
  buildReplayHistory,
  buildReplayHistoryFromLedger,
  snapshotAt,
  type LedgerEventRow,
  type ReplayEndState,
  type ReplayEvent,
} from '../../lib/replay/history';

const SPEEDS = [1, 5, 22] as const;
type Speed = (typeof SPEEDS)[number];

/* 1x plays the whole biography in ~30s (the spec's "30 seconds" read). */
const BASE_DURATION_MS = 30_000;

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
}

function fmtEth(n: number): string {
  return n >= 10 ? n.toFixed(1) : n.toFixed(n >= 1 ? 2 : 3);
}

export default function ReplayPanel() {
  const project = useProject();
  const def = getProject(project.slug);

  /* End-state pinned to what the page already shows. Floor + listings derived
     from the live outputs map (same rule as the hero BUY floor); holders +
     volume from the reconciled stats. */
  const end: ReplayEndState = useMemo(() => {
    let floor = Infinity;
    let listings = 0;
    project.outputs.forEach((o) => {
      if (o.price) {
        listings++;
        const n = parseFloat(o.price);
        if (Number.isFinite(n) && n < floor) floor = n;
      }
    });
    const volume = parseFloat(project.stats.volume_eth);
    return {
      floor: Number.isFinite(floor) ? floor : 0,
      holders: project.stats.collectors || 0,
      listings,
      volume: Number.isFinite(volume) ? volume : 0,
      minted: project.totalOutputs || 0,
      mintPrice: def?.mintPriceEth ?? 0,
    };
  }, [project.outputs, project.stats, project.totalOutputs, def]);

  /* THE REAL LEDGER (Brendon, 2026-07-05: "just make it real") — fetch the
     project's actual event stream and replay it. The seeded biography stays
     ONLY as the fallback while a project's ledger is still empty, so the
     panel is never dead. */
  const [ledger, setLedger] = useState<{
    events: LedgerEventRow[];
    uploadedAtMs: number | null;
    maxSupply: number | null;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLedger(null);
    fetch(`/api/project/${project.slug}/replay`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d || !Array.isArray(d.events)) return;
        setLedger({
          events: d.events as LedgerEventRow[],
          uploadedAtMs: typeof d.uploadedAtMs === 'number' ? d.uploadedAtMs : null,
          maxSupply: typeof d.maxSupply === 'number' ? d.maxSupply : null,
        });
      })
      .catch(() => { /* seeded fallback covers it */ });
    return () => { cancelled = true; };
  }, [project.slug]);

  const { history, isReal } = useMemo(() => {
    if (ledger && ledger.events.length > 0) {
      const real = buildReplayHistoryFromLedger(ledger.events, {
        uploadedAtMs: ledger.uploadedAtMs,
        maxSupply: ledger.maxSupply,
      });
      if (real) return { history: real, isReal: true };
    }
    return { history: buildReplayHistory(project.slug, end), isReal: false };
  }, [ledger, project.slug, end]);

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  /* Starts at THE START — day one, ready to play forward (Brendon,
     2026-07-06; it opened on TODAY before, which read as backwards). */
  const [progress, setProgress] = useState(0);
  const [dims, setDims] = useState({ w: 0, h: 160 });

  const progressRef = useRef(0);
  const speedRef = useRef<Speed>(1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const scrubbing = useRef(false);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  /* Track width via ResizeObserver so the canvas is crisp at any size. */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      setDims((d) => (Math.abs(d.w - w) > 0.5 ? { ...d, w } : d));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const setProg = useCallback((p: number) => {
    const c = Math.max(0, Math.min(1, p));
    progressRef.current = c;
    setProgress(c);
  }, []);

  /* Playback loop — advances progress; the draw effect renders each change. */
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (ts: number) => {
      const dt = ts - last;
      last = ts;
      let p = progressRef.current + dt / (BASE_DURATION_MS / speedRef.current);
      if (p >= 1) {
        setProg(1);
        setPlaying(false);
        return;
      }
      setProg(p);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, setProg]);

  const togglePlay = useCallback(() => {
    setPlaying((was) => {
      if (was) return false;
      if (progressRef.current >= 0.999) setProg(0); // replay from the start
      return true;
    });
  }, [setProg]);

  /* Scrub: pointer anywhere on the chart sets the playhead and locks (pauses)
     a static state — the spec's "pause at any point, lock the view". */
  const scrubTo = useCallback((clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setProg((clientX - r.left) / r.width);
  }, [setProg]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    scrubbing.current = true;
    setPlaying(false);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    scrubTo(e.clientX);
  }, [scrubTo]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (scrubbing.current) scrubTo(e.clientX);
  }, [scrubTo]);

  const onPointerUp = useCallback(() => { scrubbing.current = false; }, []);

  /* The milestone the playhead is currently sitting on (drives the caption). */
  const activeMilestone: ReplayEvent | null = useMemo(() => {
    let best: ReplayEvent | null = null;
    let bestD = 0.045; // within ~4.5% of the timeline
    for (const ev of history.events) {
      if (!ev.milestone) continue;
      const d = Math.abs(ev.f - progress);
      if (d < bestD) { bestD = d; best = ev; }
    }
    return best;
  }, [history.events, progress]);

  /* Wow layer — thumbnail cache: the ACTUAL pieces materialize over the chart
     as the playhead crosses their moments (real-ledger events carry tokens).
     One deterministic 96px render per token, cached for the session. */
  const thumbCache = useRef(new Map<string, HTMLCanvasElement>());
  const thumbFor = useCallback((token: string): HTMLCanvasElement | null => {
    const cache = thumbCache.current;
    const hit = cache.get(token);
    if (hit) return hit;
    try {
      const c = document.createElement('canvas');
      /* Images-only off the feature page (Brendon, 2026-07-07): the chart
         thumbnails use the stored preview, not a live render. */
      renderArtwork(c, project.slug, Number(token), 96);
      cache.set(token, c);
      return c;
    } catch {
      return null;
    }
  }, [project.slug]);
  useEffect(() => { thumbCache.current.clear(); }, [project.slug]);

  /* Draw — runs on every progress / size change (incl. each playback frame). */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || dims.w <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = dims.w;
    const H = dims.h;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const cs = getComputedStyle(canvas);
    const ink = cs.color || '#000';
    const accent = (projectColorway(project.slug) || def?.colorway || ink).trim();

    const snaps = history.snapshots;
    const n = snaps.length;
    const padL = 6, padR = 6, padT = 16, padB = 14;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const maxFloor = Math.max(history.athFloor, ...snaps.map((s) => s.floor)) * 1.08;
    const minFloor = 0;
    const maxHold = Math.max(1, ...snaps.map((s) => s.holders));

    const xAt = (i: number) => padL + (i / (n - 1)) * plotW;
    const yFloor = (v: number) => padT + plotH - ((v - minFloor) / (maxFloor - minFloor)) * plotH;
    const yHold = (v: number) => padT + plotH - (v / maxHold) * plotH * 0.92;

    const progX = padL + progress * plotW;
    const cutIdx = progress * (n - 1);

    // Faint baseline grid (3 lines).
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.08;
    ctx.lineWidth = 1;
    for (let g = 0; g <= 2; g++) {
      const y = padT + (plotH / 2) * g;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Holders line (secondary, subtle).
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = xAt(i), y = yHold(snaps[i].holders);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Full floor path — faint "future" (where it's going).
    const floorPath = () => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = xAt(i), y = yFloor(snaps[i].floor);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
    };
    floorPath();
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Lived floor path (bold, accent) + area fill, clipped to the playhead.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, progX, H);
    ctx.clip();

    // Area fill under the lived line.
    ctx.beginPath();
    ctx.moveTo(xAt(0), padT + plotH);
    for (let i = 0; i < n; i++) ctx.lineTo(xAt(i), yFloor(snaps[i].floor));
    ctx.lineTo(xAt(n - 1), padT + plotH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
    grad.addColorStop(0, hexA(accent, 0.28));
    grad.addColorStop(1, hexA(accent, 0.02));
    ctx.fillStyle = grad;
    ctx.fill();

    floorPath();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.25;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();

    // Event dots up to the playhead.
    for (const ev of history.events) {
      if (ev.f > progress + 0.001) continue;
      const i = Math.round(ev.f * (n - 1));
      const x = xAt(i);
      const y = yFloor(snaps[i].floor);
      const big = ev.milestone;
      ctx.beginPath();
      ctx.arc(x, y, big ? 3.6 : 2.2, 0, Math.PI * 2);
      ctx.fillStyle = big ? accent : ink;
      ctx.globalAlpha = big ? 1 : 0.45;
      ctx.fill();
      if (big) {
        ctx.beginPath();
        ctx.arc(x, y, 5.5, 0, Math.PI * 2);
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // ── Wow layer: milestone pulse — an expanding colorway ring blooms as
    //    the playhead crosses each narrated moment. ─────────────────────────
    for (const ev of history.events) {
      if (!ev.milestone) continue;
      const d = Math.abs(ev.f - progress);
      if (d > 0.045) continue;
      const i = Math.round(ev.f * (n - 1));
      const x = xAt(i);
      const y = yFloor(snaps[i].floor);
      const k = 1 - d / 0.045; // 1 at the moment, 0 at the window edge
      ctx.beginPath();
      ctx.arc(x, y, 6 + 16 * (1 - k), 0, Math.PI * 2);
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.55 * k;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ── Wow layer: the piece itself materializes above its moment while the
    //    playhead is near (real ledger only — events carry their token). ────
    let nearTok: { ev: ReplayEvent; d: number } | null = null;
    for (const ev of history.events) {
      if (!ev.token) continue;
      const d = Math.abs(ev.f - progress);
      if (d <= 0.03 && (!nearTok || d < nearTok.d)) nearTok = { ev, d };
    }
    if (nearTok) {
      const thumb = thumbFor(nearTok.ev.token!);
      if (thumb && thumb.width > 0) {
        const k = 1 - nearTok.d / 0.03;
        const size = 44 + 12 * k;
        const i = Math.round(nearTok.ev.f * (n - 1));
        const dotX = xAt(i);
        const tx = Math.max(padL, Math.min(W - padR - size, dotX - size / 2));
        const ty = padT + 2;
        ctx.globalAlpha = Math.min(1, k * 1.6);
        // True aspect, contained in a square slot.
        const a = thumb.width / Math.max(1, thumb.height);
        let dw = size, dh = size / a;
        if (dh > size) { dh = size; dw = size * a; }
        const ox = tx + (size - dw) / 2, oy = ty + (size - dh) / 2;
        ctx.drawImage(thumb, ox, oy, dw, dh);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(ox, oy, dw, dh);
        // #id tag under the thumb.
        ctx.fillStyle = ink;
        ctx.font = `10px 'Courier New', Courier, monospace`;
        ctx.fillText(`#${nearTok.ev.token}`, ox, oy + dh + 12);
        ctx.globalAlpha = 1;
      }
    }

    // Playhead.
    ctx.beginPath();
    ctx.moveTo(progX, padT - 6);
    ctx.lineTo(progX, padT + plotH + 4);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(progX, padT - 6, 3, 0, Math.PI * 2);
    ctx.fillStyle = ink;
    ctx.fill();

    void cutIdx;
  }, [dims, history, progress, def, thumbFor]);

  useEffect(() => { draw(); }, [draw]);

  const snap = snapshotAt(history, progress);
  const atToday = progress >= 0.999;

  return (
    <div className="more-replay-wrap">
      <div className="replay-card">
        {/* Live readout — animates as it plays; freezes (locks) on pause. */}
        <div className="replay-readout">
          <div className="rr-date">
            <span className="rr-state">
              {playing ? '▶︎ PLAYING' : atToday ? 'TODAY' : progress <= 0.001 ? 'START' : '◼︎ LOCKED'}
            </span>
            {/* The PriceDay spine — every scrubbed moment names its DAY. */}
            <span className="rr-day">{fmtDate(snap.t)} · DAY {priceDayNumber(new Date(snap.t))}</span>
          </div>
          <div className="rr-metrics">
            <span className="rr-metric"><b>{fmtEth(snap.floor)}</b> FLOOR</span>
            <span className="rr-metric"><b>{snap.holders}</b> HOLDERS</span>
            <span className="rr-metric"><b>{snap.listings}</b> LISTED</span>
            <span className="rr-metric"><b>{snap.sales}</b> SALES</span>
          </div>
        </div>

        {/* Chart — click / drag anywhere to scrub + lock. */}
        <div
          ref={wrapRef}
          className="replay-chart"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          role="slider"
          aria-label="Scrub the Project's market history"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <canvas ref={canvasRef} className="replay-canvas" style={{ width: '100%', height: dims.h }} />
          <div className="replay-caption" data-show={activeMilestone ? 'true' : 'false'}>
            {activeMilestone?.label ?? ''}
          </div>
        </div>

        {/* Transport — play/pause + speed. */}
        <div className="replay-controls">
          <button type="button" className="rc-play" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? '❚❚' : '▶︎'}
          </button>
          <div className="rc-speeds">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                className={`rc-speed${speed === s ? ' rc-speed-on' : ''}`}
                onClick={() => setSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>
          {/* Honesty tag: an empty ledger plays the seeded PREVIEW biography;
              the moment real history exists this label drops the suffix. */}
          <span className="rc-range">{fmtDate(history.startMs)} → TODAY{isReal ? '' : ' · PREVIEW'}</span>
        </div>
      </div>
    </div>
  );
}

/* Turn a hex (#rgb / #rrggbb) or any CSS color into an rgba() with alpha.
   Falls back to a neutral if parsing fails. */
function hexA(color: string, alpha: number): string {
  let hex = color.trim();
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
  }
  // rgb(...) → rgba(...)
  const m = hex.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(',').map((p) => p.trim());
    return `rgba(${parts[0]},${parts[1]},${parts[2]},${alpha})`;
  }
  return `rgba(128,128,128,${alpha})`;
}
