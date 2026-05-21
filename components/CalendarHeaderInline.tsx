'use client';

/**
 * CalendarHeaderInline — sits in the dropdown's top row IN PLACE OF
 * the .search-dormant-label when activePanel === 'calendar'.
 *
 * Both elements share min-height: 38px so the dropdown's top row
 * height never changes on swap (height-lock is critical — the menu
 * backboard must not jiggle).
 *
 * The month label and nav arrows have moved into CalendarPanel so they
 * sit directly above the grid and align with its edges. This component
 * is now a pure height-lock spacer.
 */

export default function CalendarHeaderInline() {
  return <div className="cal-header-inline" aria-hidden />;
}
