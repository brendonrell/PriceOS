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

  const engage = useCallback((d: number) => {
    const clamped = Math.min(Math.max(1, Math.floor(d)), priceDayNumber());
    setDay(clamped);
    showToast(`Rewind: DAY ${clamped}`);
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
