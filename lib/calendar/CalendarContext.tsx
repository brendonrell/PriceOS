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
 *
 * Day notes persist to localStorage('pd_day_notes'). Hydration runs once on
 * mount; setDayNote writes through on every mutation. Empty `note` arg
 * deletes the key — same semantics as sim's saveDayNote at lines 5894–5905.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CAL_TODAY } from './data';
import { pushState, STATE_CACHE_KEYS, USERSTATE_HYDRATED_EVENT } from '../state/userState';
import type { CalendarContextValue, DayNotesMap } from './types';

/* Calendar state is account-backed (Brendon, 2026-07-13): it lives in the
 * dedicated `calendar_state` column and follows the user across devices.
 * localStorage is the offline mirror only (`pd_calendar_state`, seeded by
 * userState.hydrateFromRow — server wins on hydrate). */
function readCalState(): Record<string, unknown> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STATE_CACHE_KEYS.calState);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

const DAY_NOTES_KEY = 'pd_day_notes';

const CalendarCtx = createContext<CalendarContextValue | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [viewY, setViewY] = useState<number>(CAL_TODAY.y);
  const [viewM, setViewM] = useState<number>(CAL_TODAY.m);
  const [selY, setSelY] = useState<number>(CAL_TODAY.y);
  const [selM, setSelM] = useState<number>(CAL_TODAY.m);
  const [selD, setSelD] = useState<number>(CAL_TODAY.d);
  // To-Dos layer defaults ON (Brendon, 2026-07-13 — was off by default); the
  // account's stored choice wins when one exists.
  const [todosMode, setTodosMode] = useState<boolean>(() => {
    const s = readCalState();
    return typeof s.todosMode === 'boolean' ? s.todosMode : true;
  });
  // Calendar↔pings fine control (2026-07-16): the GLOBAL schedule pings this
  // account unless switched off. Rides the same account-backed column.
  const [globalPings, setGlobalPings] = useState<boolean>(() => {
    const s = readCalState();
    return typeof s.globalPings === 'boolean' ? s.globalPings : true;
  });
  const [dayNotes, setDayNotes] = useState<DayNotesMap>({});

  // Hydrate day notes from localStorage on mount, and re-read when the account
  // snapshot lands (notes are account-backed 2026-07-10 — the server's day
  // notes win, same doctrine as every other envelope citizen). Wrapped in
  // try/catch — corrupted localStorage shouldn't take down the app.
  useEffect(() => {
    const read = () => {
      try {
        // calendar_state — the account's stored choices win on hydrate.
        const cal = readCalState();
        if (typeof cal.todosMode === 'boolean') setTodosMode(cal.todosMode);
        if (typeof cal.globalPings === 'boolean') setGlobalPings(cal.globalPings);
        const raw = localStorage.getItem(DAY_NOTES_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          setDayNotes(parsed as DayNotesMap);
        }
      } catch {
        // swallow — bad JSON or storage access denial
      }
    };
    read();
    window.addEventListener(USERSTATE_HYDRATED_EVENT, read);
    return () => window.removeEventListener(USERSTATE_HYDRATED_EVENT, read);
  }, []);

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
    setTodosMode((on) => {
      const next = !on;
      // Write-through: mirror + the dedicated account column, so the layer
      // choice follows the user across devices.
      try {
        const state = { ...readCalState(), todosMode: next };
        localStorage.setItem(STATE_CACHE_KEYS.calState, JSON.stringify(state));
        pushState({ calendar_state: state });
      } catch { /* private mode — in-memory state still flips */ }
      return next;
    });
  }, []);

  const toggleGlobalPings = useCallback(() => {
    setGlobalPings((on) => {
      const next = !on;
      // Same write-through as the To-Dos layer — the reminder sweep reads
      // this straight off users.calendar_state.
      try {
        const state = { ...readCalState(), globalPings: next };
        localStorage.setItem(STATE_CACHE_KEYS.calState, JSON.stringify(state));
        pushState({ calendar_state: state });
      } catch { /* private mode — in-memory state still flips */ }
      return next;
    });
  }, []);

  const setDayNote = useCallback((dayKey: string, note: string) => {
    setDayNotes((prev) => {
      const next = { ...prev };
      if (note) next[dayKey] = note;
      else delete next[dayKey];
      try {
        localStorage.setItem(DAY_NOTES_KEY, JSON.stringify(next));
      } catch {
        // swallow — storage quota or access denial
      }
      return next;
    });
  }, []);

  const value = useMemo<CalendarContextValue>(
    () => ({
      viewY, viewM, selY, selM, selD, todosMode, globalPings, dayNotes,
      selectDay, navMonth, jumpToToday, toggleTodos, toggleGlobalPings, setDayNote,
    }),
    [
      viewY, viewM, selY, selM, selD, todosMode, globalPings, dayNotes,
      selectDay, navMonth, jumpToToday, toggleTodos, toggleGlobalPings, setDayNote,
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
