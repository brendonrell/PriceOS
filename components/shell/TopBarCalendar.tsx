'use client';

/*
 * TopBarCalendar — D9 of the Build 25 deficiency pass.
 *
 * Sim refs: 4360-4376 (DOM), 1205-1340 (CSS), 6370-6481 (renderer + day
 * selection logic).
 *
 * Renders a horizontal calendar pill at the top of the navbar when
 * `notifs.topBarCalendar` is on. Layout:
 *
 *   ⭢ [M·1] [T·0] [W·3] [T·0] [F·1] [S·0] [S·0] · 11:00 Strata sync · …  ×
 *
 * The 7-day strip starts on the Sunday of the week containing CAL_TODAY
 * — not the user's selected day; the strip stays anchored to the
 * current week regardless of which cell is selected. Tapping a cell
 * just changes the events ticker contents below.
 *
 * Selected day defaults to CAL_TODAY on first reveal and persists for
 * the session in component state. Sim's _topBarCalSelected is
 * independent of the dropdown calendar's _calSel* — toggling on the
 * top-bar calendar after exploring the dropdown one doesn't move the
 * top-bar selection. Same here.
 *
 * To-Dos overlay (sim 6420-6431, 6464-6467) and Day Note marker (sim
 * 6451-6463 + 1311-1329 styling) both wire through the existing
 * CalendarContext (todosMode + dayNotes). Tapping the ⊟ marker opens
 * the editor via NotePromptContext — same path the dropdown calendar's
 * day-column header uses.
 *
 * Mobile-first: the ⭢ icon is hidden under 600px (sim 1335) to leave
 * horizontal room for the strip itself; events ticker fades on the
 * right edge via mask-image so it's clear there's more to scroll.
 */

import { useEffect, useRef, useState } from 'react';
import { useCalendar } from '../../lib/calendar/CalendarContext';
import { CAL_EVENTS, CAL_TODAY } from '../../lib/calendar/data';
import { getTodos, subscribeTodos, datedTodosByDay, type TodoItem } from '../../lib/todos/todoStore';
import { dateKey } from '../../lib/calendar/utils';
import { useNotePrompt } from '../../lib/state/NotePromptContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';

interface SelDay { y: number; m: number; d: number }

/** A real calendar item from /api/calendar (the same feed the main
 *  CalendarPanel loads) — global schedule · your items · auto milestones. */
interface CalApiItem {
    id?: string;
    scope: 'personal' | 'global' | 'auto';
    time?: string | null;
    title: string;
    mine?: boolean;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

export function TopBarCalendar() {
    const { notifs, toggle } = usePdNotifs();
    const { todosMode, dayNotes } = useCalendar();
    const { openDayNoteEditor } = useNotePrompt();

    // Sim's _topBarCalSelected — defaults to CAL_TODAY on first reveal.
    const [selDay, setSelDay] = useState<SelDay>({
        y: CAL_TODAY.y, m: CAL_TODAY.m, d: CAL_TODAY.d,
    });

    // Reset to CAL_TODAY whenever the bar is freshly toggled on (matches
    // sim 6391-6393 — _topBarCalSelected is null while the bar's hidden,
    // so reopening always lands on today).
    const wasOpenRef = useRef(false);
    useEffect(() => {
        if (notifs.topBarCalendar && !wasOpenRef.current) {
            setSelDay({ y: CAL_TODAY.y, m: CAL_TODAY.m, d: CAL_TODAY.d });
        }
        wasOpenRef.current = notifs.topBarCalendar;
    }, [notifs.topBarCalendar]);

    // Build 27 fix-ship F1 — sim 6475: reset the events strip's scroll
    // position when a different day is selected. Browsers preserve
    // scrollLeft across re-renders, so without this the strip stays
    // scrolled to wherever the user left it on the previous day. The
    // ref is on the .topbarcal-events container itself.
    const eventsRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const el = eventsRef.current;
        if (el) el.scrollLeft = 0;
    }, [selDay.y, selDay.m, selDay.d]);

    // Dated to-dos from the real todoStore (replaces the old hardcoded CAL_TODOS).
    const [todoMap, setTodoMap] = useState<Record<string, TodoItem[]>>({});
    useEffect(() => {
        const read = () => setTodoMap(datedTodosByDay(getTodos()));
        read();
        return subscribeTodos(read);
    }, []);

    // Real calendar events from /api/calendar — the SAME ledger the main
    // CalendarPanel reads (Fable wired the panel but not this strip). Fetch every
    // month the visible week touches, merged by day key. Alongside the static
    // CAL_EVENTS seed, mirroring the panel's dual source.
    const [calItems, setCalItems] = useState<Record<string, CalApiItem[]>>({});
    useEffect(() => {
        const start = new Date(CAL_TODAY.y, CAL_TODAY.m, CAL_TODAY.d);
        start.setDate(start.getDate() - start.getDay());
        const months = new Map<string, { y: number; m: number }>();
        for (let i = 0; i < 7; i++) {
            const dt = new Date(start);
            dt.setDate(start.getDate() + i);
            months.set(`${dt.getFullYear()}-${dt.getMonth()}`, { y: dt.getFullYear(), m: dt.getMonth() });
        }
        let cancelled = false;
        Promise.all(
            Array.from(months.values()).map(({ y, m }) =>
                fetch(`/api/calendar?year=${y}&month=${m + 1}`, { cache: 'no-store' })
                    .then((r) => (r.ok ? r.json() : null))
                    .then((d) => (d?.days as Record<string, CalApiItem[]>) ?? {})
                    .catch(() => ({} as Record<string, CalApiItem[]>)),
            ),
        ).then((results) => {
            if (cancelled) return;
            const merged: Record<string, CalApiItem[]> = {};
            for (const days of results) {
                for (const k of Object.keys(days)) merged[k] = (merged[k] || []).concat(days[k]);
            }
            setCalItems(merged);
        });
        return () => { cancelled = true; };
    }, []);

    // Don't render the row at all when off — saves layout cost and keeps
    // the navbar's flex-wrap behaviour identical to the pre-D9 state.
    if (!notifs.topBarCalendar) return null;

    // Resolve the Sunday of the week containing CAL_TODAY (week starts Sunday).
    const today = new Date(CAL_TODAY.y, CAL_TODAY.m, CAL_TODAY.d);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // getDay(): 0 = Sunday

    const weekDays: Array<{
        y: number; m: number; d: number;
        label: string; count: number; hasTodo: boolean;
    }> = [];
    for (let i = 0; i < 7; i++) {
        const dt = new Date(weekStart);
        dt.setDate(weekStart.getDate() + i);
        const y = dt.getFullYear();
        const m = dt.getMonth();
        const d = dt.getDate();
        const key = dateKey(y, m, d);
        const events = CAL_EVENTS[key] || [];
        const real = calItems[key] || [];
        const hasTodo = todosMode && !!(todoMap[key] && todoMap[key].length);
        weekDays.push({ y, m, d, label: DAY_LABELS[i], count: events.length + real.length, hasTodo });
    }

    const selKey = dateKey(selDay.y, selDay.m, selDay.d);
    const selEvents = [
        ...(CAL_EVENTS[selKey] || []),
        ...((calItems[selKey] || []).map((it) => ({ time: it.time || '', title: it.title }))),
    ];
    const selTodos  = (todosMode && todoMap[selKey]) ? todoMap[selKey] : [];
    const selDayNote = dayNotes[selKey] || '';

    const isEmpty =
        selTodos.length === 0 && selEvents.length === 0 && !selDayNote;

    const onDayNoteClick = () => {
        openDayNoteEditor(selKey);
    };

    /* Build 33 D22 — wrapper moved to TopBarRow.
       Sim has a single .top-bar #topBar element hosting both rows
       (topbar-calendar-row + top-bar-row). Pre-Build-33 only this
       calendar row existed, so it owned the wrapper; now the second
       row needs the same parent. TopBarRow renders the wrapper and
       includes <TopBarCalendar /> as its first child, so this
       component returns just the calendar row itself. */
    return (
        <>
            <div className="top-bar-calendar-row active" id="topBarCalendarRow">
                <div className="topbarcal-pill" id="topbarcalPill">
                    <span className="topbarcal-icon">⭢{'\uFE0E'}</span>

                    <div className="topbarcal-days" id="topbarcalDays">
                        {weekDays.map((cell, i) => {
                            const isSelected =
                                selDay.y === cell.y && selDay.m === cell.m && selDay.d === cell.d;
                            return (
                                <span
                                    key={i}
                                    className={`tbcd-cell${isSelected ? ' tbcd-selected' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelDay({ y: cell.y, m: cell.m, d: cell.d });
                                    }}
                                    title={
                                        `${cell.label} · ${cell.count} event${cell.count === 1 ? '' : 's'}` +
                                        (cell.hasTodo ? ' · to-do' : '')
                                    }
                                    role="button"
                                    tabIndex={0}
                                >
                                    <span className="tbcd-label">{cell.label}</span>
                                    <span className={`tbcd-count${cell.count === 0 ? ' tbcd-zero' : ''}`}>
                                        {cell.hasTodo ? <span className="tbcd-todo-dot" /> : null}
                                        {cell.count}
                                    </span>
                                </span>
                            );
                        })}
                    </div>

                    <div className="topbarcal-events" id="topbarcalEvents" ref={eventsRef}>
                        {isEmpty ? (
                            <span className="tbc-ev-empty">No events</span>
                        ) : (
                            <TopBarCalendarEventStrip
                                dayNote={selDayNote}
                                onDayNoteClick={onDayNoteClick}
                                todos={selTodos}
                                events={selEvents}
                            />
                        )}
                    </div>

                    <span
                        className="hammer-bar-close topbarcal-close"
                        onClick={(e) => {
                            e.stopPropagation();
                            // Mirrors sim's toggleTopBarCalendar — same path
                            // the ⥹ icon in the connect menu uses.
                            toggle('topBarCalendar');
                        }}
                        title="Turn off Top Bar Calendar"
                        role="button"
                        tabIndex={0}
                    >
                        ×
                    </span>
                </div>
            </div>
        </>
    );
}

/* ──────────────────────────────────────────────────────────────
   Inline subcomponent — renders the events strip with sim-faithful
   `·` separators between siblings (Day Note → todos → events).
   Pulled out to keep the main component readable.
   ────────────────────────────────────────────────────────────── */
function TopBarCalendarEventStrip({
    dayNote,
    onDayNoteClick,
    todos,
    events,
}: {
    dayNote: string;
    onDayNoteClick: () => void;
    todos: Array<{ text: string }>;
    events: Array<{ time: string; title: string }>;
}) {
    const parts: React.ReactElement[] = [];
    let key = 0;

    parts.push(
        <span
            key={`dn-${key++}`}
            className={`tbc-ev-daynote${dayNote ? ' tbc-ev-daynote--active' : ' tbc-ev-daynote--empty'}`}
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onDayNoteClick(); }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onDayNoteClick();
                }
            }}
            title={dayNote ? 'Edit Day Note' : 'Add Day Note'}
        >
            ⊟{'\uFE0E'}
        </span>
    );

    for (const t of todos) {
        if (parts.length > 0) {
            parts.push(<span key={`s-${key++}`} className="tbc-ev-sep">·</span>);
        }
        parts.push(
            <span key={`td-${key++}`} className="tbc-ev-todo">
                <span className="tbc-ev-todo-icon">❍{'\uFE0E'}</span>
                {t.text}
            </span>
        );
    }

    for (const ev of events) {
        if (parts.length > 0) {
            parts.push(<span key={`s-${key++}`} className="tbc-ev-sep">·</span>);
        }
        parts.push(
            <span key={`ev-${key++}`}>
                <span className="tbc-ev-time">{ev.time}</span>
                <span className="tbc-ev-title">{ev.title}</span>
            </span>
        );
    }

    return <>{parts}</>;
}
