'use client';

/**
 * CalendarPanel — the calendar that swaps in for dropdownMenuLinks
 * when the ▦ icon is tapped in the connect menu's top-row icons.
 *
 * Markup ported verbatim from sim.html lines 4528–4549; render logic
 * ported from sim's _renderCalendar / _renderCalDayCol (lines 6183–6316).
 *
 * Mount this when the active dropdown panel === 'calendar'.
 * The component renders its own .calendar-panel.active root, so the
 * height-locked CSS does the rest.
 *
 * NOTES:
 *  - Day Note edit flow defers to a future round when the modal stack
 *    lands. Buttons render and have hover affordance; their click
 *    handlers are stubbed with TODO markers so wire-in is one diff
 *    when the modal arrives.
 *  - Top Bar Calendar (⥹) is a separate piece, not in scope here.
 */

import { useMemo } from 'react';
import {
  CAL_EVENTS,
  CAL_MONTH_SHORT,
  CAL_TODAY,
  CAL_TODOS,
} from '../lib/calendar/data';
import { useCalendar } from '../lib/calendar/CalendarContext';
import {
  buildMonthCells,
  dateKey,
  renderNoteMarkdown,
} from '../lib/calendar/utils';

export default function CalendarPanel() {
  const {
    viewY, viewM, selY, selM, selD,
    todosMode, dayNotes,
    selectDay, jumpToToday, toggleTodos,
  } = useCalendar();

  const cells = useMemo(() => buildMonthCells(viewY, viewM), [viewY, viewM]);

  // "Today" link is illuminated only when the calendar is viewing
  // the current month/year AND the selected day IS today.
  const onToday =
    viewY === CAL_TODAY.y && viewM === CAL_TODAY.m &&
    selY === CAL_TODAY.y && selM === CAL_TODAY.m && selD === CAL_TODAY.d;

  const selKey = dateKey(selY, selM, selD);
  const dayNote = dayNotes[selKey] || '';
  const hasNote = Boolean(dayNote);
  const dateLabel = `${CAL_MONTH_SHORT[selM]} ${selD}`;

  const events = CAL_EVENTS[selKey] || [];
  const todos = todosMode ? (CAL_TODOS[selKey] || []) : [];
  const empty = events.length === 0 && todos.length === 0 && !dayNote;

  // TODO: wire to modal stack when ported. For now the click is a
  // hover-affordance only — matches the sim's tap-target shape.
  const openDayNoteEditor = () => {
    // intentional no-op — see TODO above
  };

  return (
    <div className="calendar-panel active" id="calendarPanel">
      <div className="cal-body">
        <div className="cal-grid-wrap">
          <div className="cal-weekday-row">
            <span>M</span><span>T</span><span>W</span><span>T</span>
            <span>F</span><span>S</span><span>S</span>
          </div>

          <div className="cal-grid" id="calGrid">
            {cells.map((c, i) => {
              const classes = ['cal-day'];
              if (c.other) classes.push('cal-other-month');
              if (
                !c.other &&
                c.y === CAL_TODAY.y && c.m === CAL_TODAY.m && c.d === CAL_TODAY.d
              ) classes.push('cal-today');
              if (
                !c.other &&
                c.y === selY && c.m === selM && c.d === selD
              ) classes.push('cal-selected');

              const k = dateKey(c.y, c.m, c.d);
              const evs = CAL_EVENTS[k] || [];
              const dotCount = Math.min(evs.length, 3);
              const hasTodo =
                todosMode && !c.other &&
                Boolean(CAL_TODOS[k] && CAL_TODOS[k].length);

              return (
                <div
                  key={i}
                  className={classes.join(' ')}
                  onClick={
                    c.other
                      ? undefined
                      : (e) => {
                          // Stop propagation: the dropdown's outside-click
                          // handler would otherwise see an orphaned target
                          // (cell unmounted on re-render) and close the
                          // menu. Same guard sim uses in calSelectDay.
                          e.stopPropagation();
                          selectDay(c.y, c.m, c.d);
                        }
                  }
                >
                  <span>{c.d}</span>
                  <span className="cal-day-dots">
                    {hasTodo && <span className="cal-day-todo-dot" />}
                    {Array.from({ length: dotCount }).map((_, j) => (
                      <span key={j} className="cal-day-dot" />
                    ))}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Today + To-Dos footer row, centered under the grid */}
          <div className="cal-footer-links">
            <div
              className={`cal-today-link${onToday ? ' active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); jumpToToday(); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  jumpToToday();
                }
              }}
              title="Jump to today"
            >
              Today
            </div>
            <div
              className={`cal-todos-link${todosMode ? ' active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); toggleTodos(); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleTodos();
                }
              }}
              title="Toggle To-Dos on calendar"
            >
              To-Dos
            </div>
          </div>
        </div>

        {/* Right-hand day detail column */}
        <div className="cal-day-col" id="calDayCol">
          <div className="cal-day-col-header" id="calDayColHeader">
            <span>{dateLabel}</span>
            <span
              className={`cal-daynote-btn${hasNote ? ' has-note' : ''}`}
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); openDayNoteEditor(); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  openDayNoteEditor();
                }
              }}
              title="Day Note"
            >
              {'\u229F'}{'\uFE0E'}
            </span>
          </div>

          <div className="cal-day-col-events" id="calDayColEvents">
            {empty && <div className="cal-event-empty">No events</div>}

            {dayNote && (
              <div
                className="cal-event-item cal-event-daynote"
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); openDayNoteEditor(); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    openDayNoteEditor();
                  }
                }}
                title="Edit Day Note"
              >
                <div className="cal-daynote-title">
                  <span className="cal-daynote-row-icon">
                    {'\u229F'}{'\uFE0E'}
                  </span>
                  <span
                    dangerouslySetInnerHTML={{ __html: renderNoteMarkdown(dayNote) }}
                  />
                </div>
              </div>
            )}

            {todos.map((t, i) => (
              <div key={`todo-${i}`} className="cal-event-item cal-event-todo">
                <div className="cal-event-title">
                  <span className="cal-todo-icon">
                    {'\u274D'}{'\uFE0E'}
                  </span>{' '}
                  {t.title}
                </div>
              </div>
            ))}

            {events.map((ev, i) => (
              <div key={`ev-${i}`} className="cal-event-item">
                <div className="cal-event-time">{ev.time}</div>
                <div className="cal-event-title">{ev.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
