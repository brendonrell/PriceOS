'use client';

/*
 * RewindBar — the persistent frame while The Rewind ◄ is engaged.
 *
 * Full-strength banner (Rule #2 — the MARKER says past, not faded UI):
 * `◄ PriceDay 43 · JUL 24 '26` + a day scrubber (‹ › steppers + a drag
 * slider over the PriceDay spine) + the canonical ✕ back to now.
 * Mounted globally in PriceOSShell; renders nothing while live.
 *
 * The DATE IS A DOOR (Brendon, 2026-07-25): tap it and the platform's own
 * date picker opens, so you can travel straight to a day instead of dragging
 * to it. It can land off the spine — the surfaces say so plainly.
 */

import { useRewind } from '../../lib/state/RewindContext';
import { PRICEDAY_EPOCH } from '../../lib/priceday/priceday';
import { useEffect, useState } from 'react';

const DAY_MS = 86_400_000;

/** PriceDay for a picked calendar date — UNCLAMPED, so off-spine picks stay
    off-spine instead of silently snapping to day 1. */
function dayFromISO(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const utc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Math.floor((utc - PRICEDAY_EPOCH) / DAY_MS) + 1;
}

/** The calendar date a PriceDay falls on, as the input's YYYY-MM-DD. */
function isoFromDay(day: number): string {
  return new Date(PRICEDAY_EPOCH + (day - 1) * DAY_MS).toISOString().slice(0, 10);
}

export default function RewindBar() {
  const { day, today, engage, returnToNow } = useRewind();
  // Local slider value so fast drags feel continuous; commits on release.
  const [drag, setDrag] = useState<number | null>(null);
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    setDrag(null);
    if (day == null) return;
    if (day < 1 || day > today) { setDate(''); return; }
    let dead = false;
    // The bar's date stamp rides the same as-of read the surfaces use.
    fetch(`/api/rewind?day=${day}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!dead && j?.date) setDate(j.date); })
      .catch(() => { /* stamp stays day-only */ });
    return () => { dead = true; };
  }, [day, today]);

  if (day == null) return null;
  const shown = drag ?? day;
  const onSpine = shown >= 1 && shown <= today;
  /* JUL 24 2026 → JUL 24 '26. Local to this bar on purpose: formatPriceDate
     is shared with the PriceDay surfaces and they keep the full year. */
  const stamp = date.replace(/\b(\d{2})(\d{2})\b/, "'$2");
  /* Off the spine the day NUMBER is meaningless, so the label says which side
     of the record you're standing on instead of printing "PriceDay -4". */
  const offLabel = shown < 1 ? 'BEFORE DAY 1' : 'NOT YET';
  const picked = isoFromDay(shown);

  return (
    <div className="rewind-bar" role="region" aria-label="The Rewind">
      <label className="rw-title" title="Pick a date">
        {'◄︎'} {onSpine ? `PriceDay ${shown}` : offLabel}
        {onSpine && stamp && drag == null ? ` · ${stamp}` : ''}
        {!onSpine ? ` · ${picked}` : ''}
        <input
          type="date"
          className="rw-date"
          value={picked}
          /* The spine, handed to the platform: iOS greys out every date
             outside Day 1 → today in its own wheel, so an off-record day
             can't be picked in the first place (Brendon, 2026-07-25). The
             empty states below stay as the backstop, not the front line. */
          min={isoFromDay(1)}
          max={isoFromDay(today)}
          aria-label="Travel to a date"
          onChange={(e) => {
            const d = dayFromISO(e.target.value);
            if (d != null && d !== day) engage(d);
          }}
        />
      </label>
      <span className="rw-scrub">
        <button
          type="button"
          className="rw-step"
          aria-label="Previous day"
          disabled={shown <= 1}
          onClick={() => engage(shown - 1)}
        >{'‹︎'}</button>
        <input
          type="range"
          className="rw-slider"
          min={1}
          max={today}
          value={Math.min(Math.max(shown, 1), today)}
          aria-label="PriceDay"
          onChange={(e) => setDrag(Number(e.target.value))}
          onPointerUp={() => { if (drag != null && drag !== day) engage(drag); else setDrag(null); }}
          onKeyUp={(e) => {
            if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && drag != null) {
              engage(drag);
            }
          }}
        />
        <button
          type="button"
          className="rw-step"
          aria-label="Next day"
          disabled={shown >= today}
          onClick={() => engage(shown + 1)}
        >{'›︎'}</button>
      </span>
      <button
        type="button"
        className="rw-return"
        onClick={returnToNow}
        title="Return to now"
        aria-label="Return to now"
      >{'✕︎'}</button>
    </div>
  );
}
