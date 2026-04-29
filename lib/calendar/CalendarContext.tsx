'use client';

/**
 * CalendarProvider — React context for the Calendar panel state.
 *
 * Mirrors sim.html's _calViewY/_calViewM/_calSelY/_calSelM/_calSelD
 * module-level state plus _calTodosMode and window._dayNotes.
 *
 * Initial state matches sim's CAL_TODAY (April 19 2026 — the prototype's
 * simulated "today"). When real wall-clock time replaces this, swap
 * CAL_TODAY in data.ts.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CAL_TODAY } from './data';
import type { CalendarContextValue, DayNotesMap } from './types';

const CalendarCtx = createContext<CalendarContextValue | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [viewY, setViewY] = useState<number>(CAL_TODAY.y);
  const [viewM, setViewM] = useState<number>(CAL_TODAY.m);
  const [selY, setSelY] = useState<number>(CAL_TODAY.y);
  const [selM, setSelM] = useState<number>(CAL_TODAY.m);
  const [selD, setSelD] = useState<number>(CAL_TODAY.d);
  const [todosMode, setTodosMode] = useState<boolean>(false);
  const [dayNotes, setDayNotes] = useState<DayNotesMap>({});

  const selectDay = useCallback((y: number, m: number, d: number) => {
    setSelY(y);
    setSelM(m);
    setSelD(d);
  }, []);

  const navMonth = useCallback((dir: -1 | 1) => {
    setViewM((m) => {
      let nm = m + dir;
      if (nm < 0) {
        nm = 11;
        setViewY((y) => y - 1);
      } else if (nm > 11) {
        nm = 0;
        setViewY((y) => y + 1);
      }
      return nm;
    });
  }, []);

  const jumpToToday = useCallback(() => {
    setViewY(CAL_TODAY.y);
    setViewM(CAL_TODAY.m);
    setSelY(CAL_TODAY.y);
    setSelM(CAL_TODAY.m);
    setSelD(CAL_TODAY.d);
  }, []);

  const toggleTodos = useCallback(() => {
    setTodosMode((on) => !on);
  }, []);

  const setDayNote = useCallback((dayKey: string, note: string) => {
    setDayNotes((prev) => {
      const next = { ...prev };
      if (note) next[dayKey] = note;
      else delete next[dayKey];
      return next;
    });
  }, []);

  const value = useMemo<CalendarContextValue>(
    () => ({
      viewY, viewM, selY, selM, selD, todosMode, dayNotes,
      selectDay, navMonth, jumpToToday, toggleTodos, setDayNote,
    }),
    [
      viewY, viewM, selY, selM, selD, todosMode, dayNotes,
      selectDay, navMonth, jumpToToday, toggleTodos, setDayNote,
    ]
  );

  return <CalendarCtx.Provider value={value}>{children}</CalendarCtx.Provider>;
}

export function useCalendar(): CalendarContextValue {
  const v = useContext(CalendarCtx);
  if (!v) {
    throw new Error('useCalendar must be used inside <CalendarProvider>');
  }
  return v;
}
