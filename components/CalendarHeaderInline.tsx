'use client';

/**
 * CalendarHeaderInline — sits in the dropdown's top row IN PLACE OF
 * the .search-dormant-label when activePanel === 'calendar'.
 *
 * Both elements share min-height: 38px so the dropdown's top row
 * height never changes on swap (height-lock is critical — the menu
 * backboard must not jiggle).
 *
 * Nav arrows have been moved into CalendarPanel above the grid so they
 * align precisely with the grid edges. This component now renders only
 * the centered month/year label.
 *
 * Mount this from wherever the dropdown's top-row is rendered:
 *   {activePanel === 'calendar'
 *     ? <CalendarHeaderInline />
 *     : <SearchDormantLabel /> }
 */

import { useCalendar } from '../lib/calendar/CalendarContext';
import { CAL_MONTH_NAMES } from '../lib/calendar/data';

export default function CalendarHeaderInline() {
  const { viewY, viewM } = useCalendar();
  const monthLabel = `${CAL_MONTH_NAMES[viewM]} ${viewY}`;

  return (
    <div className="cal-header-inline">
      <span className="cal-month-label" id="calMonthLabel">
        {monthLabel}
      </span>
    </div>
  );
}
