'use client';

/*
 * RewindContext — the engaged Rewind day, shared shell-wide.
 *
 * null = NOW (live app, zero behaviour change). A number = the whole OS is
 * docked at that PriceDay: data surfaces render as-of state, commercial
 * actions go inert, and the RewindBar (shell) shows the day + RETURN TO NOW.
 * Session-only on purpose — a reload always comes back to the present.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { priceDayNumber } from '../priceday/priceday';
import { useToast } from './ToastContext';

interface RewindContextValue {
  /** Engaged PriceDay, or null = live NOW. */
  day: number | null;
  /** Today's PriceDay number (scrubber upper bound). */
  today: number;
  engage: (day: number) => void;
  returnToNow: () => void;
}

const RewindContext = createContext<RewindContextValue | null>(null);

export function RewindProvider({ children }: { children: ReactNode }) {
  const [day, setDay] = useState<number | null>(null);
  const { showToast } = useToast();
  const today = priceDayNumber();

  /* The scrubber and steppers can only ever produce a day ON the spine — they
     are bounded by their own min/max. The DATE PICKER can land anywhere
     (Brendon, 2026-07-25), so a day outside [1, today] is a legal state: the
     surfaces render an honest empty for it rather than pretending. Stepping
     and scrubbing walk straight back onto the spine. */
  const engage = useCallback((d: number) => {
    const next = Math.floor(d);
    setDay(next);
    const t = priceDayNumber();
    if (next < 1) showToast('Rewind: BEFORE DAY 1');
    else if (next > t) showToast('Rewind: NOT YET');
    else showToast(`Rewind: DAY ${next}`);
  }, [showToast]);

  const returnToNow = useCallback(() => {
    setDay(null);
    showToast('Rewind: OFF');
  }, [showToast]);

  const value = useMemo(
    () => ({ day, today, engage, returnToNow }),
    [day, today, engage, returnToNow],
  );
  return <RewindContext.Provider value={value}>{children}</RewindContext.Provider>;
}

export function useRewind(): RewindContextValue {
  const ctx = useContext(RewindContext);
  if (!ctx) throw new Error('useRewind outside RewindProvider');
  return ctx;
}

/** Null-safe variant for components that may mount outside the shell. */
export function useRewindOptional(): RewindContextValue | null {
  return useContext(RewindContext);
}
