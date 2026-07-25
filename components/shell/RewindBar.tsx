'use client';

/*
 * RewindBar — the persistent frame while The Rewind ◄ is engaged.
 *
 * Full-strength banner (Rule #2 — the MARKER says past, not faded UI):
 * `◄ PD — DAY 41 · JUL 22 2026` + a day scrubber (‹ › steppers + a drag
 * slider over the PriceDay spine) + an always-visible RETURN TO NOW.
 * Mounted globally in PriceOSShell; renders nothing while live.
 */

import { useRewind } from '../../lib/state/RewindContext';
import { useEffect, useState } from 'react';

export default function RewindBar() {
  const { day, today, engage, returnToNow } = useRewind();
  // Local slider value so fast drags feel continuous; commits on release.
  const [drag, setDrag] = useState<number | null>(null);
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    setDrag(null);
    if (day == null) return;
    let dead = false;
    // The bar's date stamp rides the same as-of read the surfaces use.
    fetch(`/api/rewind?day=${day}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!dead && j?.date) setDate(j.date); })
      .catch(() => { /* stamp stays day-only */ });
    return () => { dead = true; };
  }, [day]);

  if (day == null) return null;
  const shown = drag ?? day;
  /* JUL 24 2026 → JUL 24 '26. Local to this bar on purpose: formatPriceDate
     is shared with the PriceDay surfaces and they keep the full year. */
  const stamp = date.replace(/\b(\d{2})(\d{2})\b/, "'$2");

  return (
    <div className="rewind-bar" role="region" aria-label="The Rewind">
      <span className="rw-title">{'◄︎'} PriceDay {shown}{stamp && drag == null ? ` · ${stamp}` : ''}</span>
      <span className="rw-scrub">
        <button
          type="button"
          className="rw-step"
          aria-label="Previous day"
          disabled={shown <= 1}
          onClick={() => engage(day - 1)}
        >{'‹︎'}</button>
        <input
          type="range"
          className="rw-slider"
          min={1}
          max={today}
          value={shown}
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
          onClick={() => engage(day + 1)}
        >{'›︎'}</button>
      </span>
      <button type="button" className="rw-return" onClick={returnToNow}>
        RETURN TO NOW
      </button>
    </div>
  );
}
