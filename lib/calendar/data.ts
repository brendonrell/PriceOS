/**
 * Calendar mock data — ported verbatim from sim.html (lines 6139–6166).
 * Date keys are 'YYYY-MM-DD'. Month indices are 0-based to match JS Date.
 *
 * All data here is prototype/fake — gets replaced with real
 * indexer + Supabase wiring post-port.
 */

import type { CalEvent, CalTodo } from './types';

export const CAL_EVENTS: Record<string, CalEvent[]> = {
  '2026-04-03': [{ time: '10:00', title: 'Kiki genesis drop (anniversary)' }],
  '2026-04-08': [
    { time: '19:00', title: 'WTBS ep live' },
    { time: '21:30', title: 'Discord voice chat' },
  ],
  '2026-04-12': [{ time: 'all-day', title: 'PD monthly AMA' }],
  '2026-04-14': [{ time: '16:00', title: 'Artist review · @rudxane' }],
  '2026-04-19': [
    { time: '11:00', title: 'Strata mint-prep sync' },
    { time: '15:00', title: 'Opus build session' },
    { time: '20:00', title: 'Community call' },
  ],
  '2026-04-22': [{ time: '22:00', title: 'Lucky-22 community mint window' }],
  '2026-04-25': [{ time: '18:00', title: 'Drop #2 scope lock' }],
  '2026-04-29': [{ time: '12:00', title: 'End-of-month retrospective' }],
};

/**
 * Mock to-dos overlaid onto the calendar when the To-Dos toggle is active.
 * Drawn from the same mock set that populates the TO-DOS panel so the two
 * surfaces stay consistent.
 */
export const CAL_TODOS: Record<string, CalTodo[]> = {
  '2026-04-14': [{ title: 'OFFER Strata #37' }],
  '2026-04-19': [{ title: 'FLOOR-watch Kiki #88' }],
  '2026-04-20': [{ title: 'DELIST Kiki #88' }],
  '2026-05-01': [{ title: 'LIST Kiki #147, #203' }],
  '2026-06-15': [{ title: 'SEND Kiki #500 → @matty' }],
  '2026-09-22': [{ title: 'BUY Kiki #22' }],
};

export const CAL_MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
] as const;

export const CAL_MONTH_SHORT = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
] as const;

/** Simulated "today" in the prototype — April 19 2026 per sim spec. */
export const CAL_TODAY = { y: 2026, m: 3, d: 19 } as const;
