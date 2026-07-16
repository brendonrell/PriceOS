/**
 * Calendar type definitions.
 */

/** A single day cell in the rendered 6×7 month grid. */
export interface CalCell {
  y: number;
  m: number; // 0-indexed
  d: number;
  other: boolean; // true if this cell belongs to prev/next month
}

/** Map of dayKey ('YYYY-MM-DD') → markdown note string. */
export type DayNotesMap = Record<string, string>;

export interface CalendarState {
  /** Currently viewed month — what the grid shows. */
  viewY: number;
  viewM: number; // 0-indexed
  /** Currently selected day — what the right column shows. */
  selY: number;
  selM: number; // 0-indexed
  selD: number;
  /** When true: red to-do dots on grid + red to-do rows above events list. */
  todosMode: boolean;
  /** When false the GLOBAL schedule never pings this account (2026-07-16
   *  Calendar Sheet — calendar↔pings fine control). Default true. */
  globalPings: boolean;
  /** Day notes keyed by 'YYYY-MM-DD'. */
  dayNotes: DayNotesMap;
}

export interface CalendarActions {
  selectDay: (y: number, m: number, d: number) => void;
  navMonth: (dir: -1 | 1) => void;
  jumpToToday: () => void;
  toggleTodos: () => void;
  toggleGlobalPings: () => void;
  setDayNote: (dayKey: string, note: string) => void;
}

export type CalendarContextValue = CalendarState & CalendarActions;
