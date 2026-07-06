/**
 * Calendar constants — month names + the real "today". The static CAL_EVENTS
 * mock that used to live here was retired 2026-07-06; every event now comes
 * from /api/calendar (global schedule · personal items · auto milestones).
 */


export const CAL_MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
] as const;

export const CAL_MONTH_SHORT = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
] as const;

/** Calendar default. Was hardcoded `{ y: 2026, m: 3, d: 19 }` (sim's
 *  "today"); replaced with real today per Tier 8 spec. Computed at
 *  module load; on server-render runs at request/build time, on client
 *  runs once when the bundle hydrates. Year/month/day can disagree
 *  between server and client only when a page load crosses UTC midnight
 *  — acceptable edge case. */
const _today = new Date();
export const CAL_TODAY = {
  y: _today.getFullYear(),
  m: _today.getMonth(),
  d: _today.getDate(),
};
