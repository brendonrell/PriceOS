'use client';

/**
 * CalendarHeaderInline — sits in the dropdown's top row IN PLACE OF
 * the .search-dormant-label when activePanel === 'calendar'.
 *
 * Both elements share min-height: 38px so the dropdown's top row
 * height never changes on swap (height-lock is critical — the menu
 * backboard must not jiggle).
 *
 * Mount this from wherever the dropdown's top-row is rendered:
 *   {activePanel === 'calendar'
 *     ? <CalendarHeaderInline />
 *     : <SearchDormantLabel /> }
 */

import { useCalendar } from '../lib/calendar/CalendarContext';
import { CAL_MONTH_NAMES } from '../lib/calendar/data';

export default function CalendarHeaderInline() {
  const { viewY, viewM, navMonth } = useCalendar();
  const monthLabel = `${CAL_MONTH_NAMES[viewM]} ${viewY}`;

  return (
    <div className="cal-header-inline">
      <span
        className="cal-nav"
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); navMonth(-1); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            navMonth(-1);
          }
        }}
        title="Previous month"
      >
        {'\u25C0\uFE0E'}
      </span>
      <span className="cal-month-label" id="calMonthLabel">
        {monthLabel}
      </span>
      <span
        className="cal-nav"
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); navMonth(1); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            navMonth(1);
          }
        }}
        title="Next month"
      >
        {'\u25B6\uFE0E'}
      </span>
    </div>
  );
}
