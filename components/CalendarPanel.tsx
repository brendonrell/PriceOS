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
 *  - Day Note edit flow is wired to NotePromptContext via
 *    openDayNoteEditor(selKey); the modal renders at the app shell.
 *  - Top Bar Calendar (⥹) is a separate piece, not in scope here.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CAL_MONTH_SHORT,
  CAL_TODAY,
} from '../lib/calendar/data';
import {
  getTodos,
  subscribeTodos,
  toggleTodo,
  datedTodosByDay,
  type TodoItem,
} from '../lib/todos/todoStore';
import { useCalendar } from '../lib/calendar/CalendarContext';
import { useNotePrompt } from '../lib/state/NotePromptContext';
import { useAuth } from '../lib/state/AuthContext';
import {
  buildMonthCells,
  dateKey,
  renderNoteMarkdown,
} from '../lib/calendar/utils';
import { useToast } from '../lib/state/ToastContext';
import { usePriceDay } from '../lib/priceday/usePriceDay';
import { PRICEDAY_EPOCH, priceDayNumber } from '../lib/priceday/priceday';
import CalendarSheet from './CalendarSheet';

interface CalApiItem {
  id?: string;
  scope: 'personal' | 'global' | 'auto';
  time?: string | null;
  title: string;
  mine?: boolean;
}

/** Sort key for the day list — timed items in clock order, all-day first. */
function timeMin(label: string | null | undefined): number {
  const m = label && /(\d{1,2}):(\d{2})/.exec(label);
  return m ? Math.min(23, Number(m[1])) * 60 + Math.min(59, Number(m[2])) : -1;
}

export default function CalendarPanel() {
  const {
    viewY, viewM, selY, selM, selD,
    todosMode, dayNotes,
    selectDay, jumpToToday, toggleTodos,
  } = useCalendar();

  const { openDayNoteEditor } = useNotePrompt();
  const { siweAddress, handle } = useAuth();
  const { showToast } = useToast();

  /* THE REAL CALENDAR — month items from the ledger + the stored layers
     (global schedule · your items · auto milestones + retrospectives). */
  const [monthItems, setMonthItems] = useState<Record<string, CalApiItem[]>>({});
  const loadMonth = useCallback(() => {
    fetch(`/api/calendar?year=${viewY}&month=${viewM + 1}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setMonthItems((d.days as Record<string, CalApiItem[]>) ?? {});
      })
      .catch(() => {});
  }, [viewY, viewM]);
  useEffect(() => { loadMonth(); }, [loadMonth]);

  /* Dated to-dos (from the real todoStore) grouped by day — replaces the old
     hardcoded CAL_TODOS. Red dot on the grid + red row in the day column, both
     still gated behind the To-Dos toggle + sign-in below. */
  const [todoMap, setTodoMap] = useState<Record<string, TodoItem[]>>({});
  useEffect(() => {
    const read = () => setTodoMap(datedTodosByDay(getTodos()));
    read();
    return subscribeTodos(read);
  }, []);

  /* The Calendar Sheet (2026-07-16) — the + opens the full-day modal
     (view + edit + per-item ping plans) instead of the old inline composer. */
  const [sheetOpen, setSheetOpen] = useState(false);

  /* PriceDay ↔ calendar: the selected day's almanac line rides the column. */
  const selDate = useMemo(() => new Date(selY, selM, selD, 12), [selY, selM, selD]);
  const selPd = usePriceDay(selDate);
  const selInPdRange =
    Date.UTC(selY, selM, selD) >= PRICEDAY_EPOCH &&
    priceDayNumber(selDate) <= priceDayNumber(new Date());

  const cells = useMemo(() => buildMonthCells(viewY, viewM), [viewY, viewM]);

  // Sim 6558–6559: every calendar open hard-resets view + selection to
  // CAL_TODAY. CalendarPanel only mounts when active === 'calendar', so a
  // mount-time effect with empty deps is the per-open reset. Hook lives at
  // the top of the component (alongside useMemo above) — never below an
  // early return.
  useEffect(() => {
    jumpToToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Today" link is illuminated only when the calendar is viewing
  // the current month/year AND the selected day IS today.
  const onToday =
    viewY === CAL_TODAY.y && viewM === CAL_TODAY.m &&
    selY === CAL_TODAY.y && selM === CAL_TODAY.m && selD === CAL_TODAY.d;

  /* S2 logged-out preview — calendar shows public events only:
       - Day notes (personal markdown notes) hidden
       - To-Dos toggle + per-day to-do dots hidden
     The GLOBAL /api/calendar layer is the public schedule and stays
     visible to everyone. */
  const isAuthed = !!siweAddress;

  const selKey = dateKey(selY, selM, selD);
  const dayNote = isAuthed ? (dayNotes[selKey] || '') : '';
  const hasNote = Boolean(dayNote);
  const dateLabel = `${CAL_MONTH_SHORT[selM]} ${selD}`;

  /* GCal-like day timeline (Brendon, 2026-07-18): calendar items and to-dos
     share ONE ordered list, sorted by clock time — no-time entries (all-day,
     including a dated to-do with no time) float to the top; timed ones follow.
     To-dos still ride the To-Dos toggle + sign-in. */
  const dayEntries = useMemo(() => {
    const out: Array<
      | { kind: 'item'; sortMin: number; item: CalApiItem }
      | { kind: 'todo'; sortMin: number; todo: TodoItem }
    > = [];
    for (const it of monthItems[selKey] ?? []) {
      out.push({ kind: 'item', sortMin: timeMin(it.time), item: it });
    }
    if (isAuthed && todosMode) {
      for (const t of todoMap[selKey] ?? []) {
        out.push({ kind: 'todo', sortMin: timeMin(t.dueTime), todo: t });
      }
    }
    return out
      .map((e, i) => ({ e, i }))
      .sort((a, b) => a.e.sortMin - b.e.sortMin || a.i - b.i)
      .map(({ e }) => e);
  }, [monthItems, todoMap, selKey, isAuthed, todosMode]);

  return (
    <div className="calendar-panel active" id="calendarPanel">
      <div className="cal-body">
        <div className="cal-grid-wrap">
          <div className="cal-weekday-row">
            <span>S</span><span>M</span><span>T</span><span>W</span>
            <span>T</span><span>F</span><span>S</span>
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
              const real = monthItems[k] || [];
              const dotCount = Math.min(real.length, 3);
              const hasTodo =
                isAuthed && todosMode && !c.other &&
                Boolean(todoMap[k] && todoMap[k].length);
              const hasNote =
                isAuthed && !c.other &&
                Boolean(dayNotes[k] && dayNotes[k].trim());

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
                    {hasNote && <span className="cal-day-note-dot" />}
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
            {isAuthed && (
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
            )}
          </div>
        </div>

        {/* Right-hand day detail column */}
        <div className="cal-day-col" id="calDayCol">
          <div className="cal-day-col-header" id="calDayColHeader">
            <span>{dateLabel}</span>
            {isAuthed && (
              <span
                className="cal-daynote-btn cal-add-btn"
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); setSheetOpen(true); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    setSheetOpen(true);
                  }
                }}
                title="Open the day — view, add, edit"
              >
                {'+'}
              </span>
            )}
            {isAuthed && (
              <span
                className={`cal-daynote-btn${hasNote ? ' has-note' : ''}`}
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); openDayNoteEditor(selKey); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    openDayNoteEditor(selKey);
                  }
                }}
                title="Day Note"
              >
                {'\u229F'}{'\uFE0E'}
              </span>
            )}
          </div>

          <div className="cal-day-col-events" id="calDayColEvents">
            {/* Day Note — pinned to the TOP of the day (Brendon, 2026-07-18:
                restored to its sim.html home, above events + PriceDay). */}
            {dayNote && (
              <div
                className="cal-event-item cal-event-daynote"
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); openDayNoteEditor(selKey); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    openDayNoteEditor(selKey);
                  }
                }}
                title="Edit Day Note"
              >
                <div className="cal-daynote-title">
                  <span className="cal-daynote-row-icon">
                    {'⊟'}{'︎'}
                  </span>
                  <span
                    dangerouslySetInnerHTML={{ __html: renderNoteMarkdown(dayNote) }}
                    onClick={(e) => {
                      const target = (e.target as HTMLElement).closest('a[data-external]');
                      if (target) {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open((target as HTMLAnchorElement).href, '_blank', 'noopener,noreferrer');
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Events — calendar items + to-dos, one time-sorted list
                (all-day first). To-dos ride the To-Dos toggle. */}
            {dayEntries.map((entry) => {
              if (entry.kind === 'todo') {
                const t = entry.todo;
                return (
                  <div
                    key={`todo-${t.id}`}
                    className="cal-event-item cal-event-todo"
                    role="button"
                    tabIndex={0}
                    title="Complete to-do"
                    onClick={(e) => { e.stopPropagation(); toggleTodo(t.id); showToast('To-Do: DONE'); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleTodo(t.id);
                        showToast('To-Do: DONE');
                      }
                    }}
                  >
                    <div className="cal-event-title">
                      <span className="cal-event-time">{t.dueTime || 'all day'}</span>{' '}
                      <span className="cal-todo-icon">
                        {'❍'}{'︎'}
                      </span>{' '}
                      {t.text}
                    </div>
                  </div>
                );
              }
              const it = entry.item;
              return (
                <div key={it.id ?? `${it.scope}-${it.title}`} className={`cal-event-item cal-event-${it.scope}`}>
                  <div className="cal-event-title">
                    <span className="cal-event-time">{it.time || 'all day'}</span>{' '}
                    {it.scope === 'global' && <span className="cal-global-mark">{'⊞︎'} </span>}
                    {it.title}
                    {it.mine && it.id && (
                      <span
                        className="cal-item-del"
                        role="button"
                        tabIndex={0}
                        title="Remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          fetch('/api/calendar', {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ action: 'delete', id: it.id }),
                          }).then(() => { showToast('Calendar: REMOVED'); loadMonth(); }).catch(() => {});
                        }}
                      >
                        {'×︎'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* PriceDay — the almanac line, now at the FOOT of the day. */}
            {selInPdRange && (
              <div className="cal-event-item cal-event-priceday" title={selPd.flavor ?? undefined}>
                <div className="cal-event-title">
                  <span className="cal-pd-num">{'✶︎'} PriceDay {selPd.number}</span>
                  {selPd.flavor && <span className="cal-pd-flavor"> — {selPd.flavor}</span>}
                </div>
              </div>
            )}

            {dayEntries.length === 0 && !dayNote && !selInPdRange && <div className="cal-event-empty">No events</div>}
          </div>
        </div>
      </div>
      {/* THE DAY, full screen — view + edit + per-item ping plans. Reloads
          the month on close so the panel reflects sheet writes. */}
      {sheetOpen && <CalendarSheet onClose={() => { setSheetOpen(false); loadMonth(); }} />}
    </div>
  );
}
