'use client';

/*
 * CalendarSheet — THE DAY, full screen (Brendon, 2026-07-16): the calendar's
 * + icon opens this instead of the old inline composer. Built on the
 * WorkflowsSheet shell verbatim (value-prompt wrap/box, slide-up + fade,
 * portal to body) — the workflows-like screen Brendon asked for.
 *
 * It doubles as VIEW and EDIT:
 *   VIEW — the whole day on one sheet: day nav ‹ ›, the PriceDay line, the
 *   schedule (global ⊞ · personal · auto milestones) sorted by time, the
 *   Day Note, and the day's To-Dos (tap = done, same as the panel). Every
 *   personal row wears its PING plan (⇡ AT TIME / 15M / 1H / 1D / OFF) and
 *   tapping a row opens it in the editor.
 *
 *   EDIT — the builder: WHAT + AT (HH:MM pings on the minute) + the PING
 *   plan chips (calendar↔pings fine control, per item) + GLOBAL for the
 *   platform author. SAVE adds; opening from a row UPDATES it.
 *
 * The sheet's floor carries the account-wide switch: GLOBAL SCHEDULE PINGS
 * ON/OFF (users.calendar_state.globalPings — the reminder sweep reads it).
 *
 * Data: the same /api/calendar month read the panel uses; day selection is
 * shared through CalendarContext so the panel underneath follows along.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCalendar } from '../lib/calendar/CalendarContext';
import { useNotePrompt } from '../lib/state/NotePromptContext';
import { useAuth } from '../lib/state/AuthContext';
import { useToast } from '../lib/state/ToastContext';
import { usePriceDay } from '../lib/priceday/usePriceDay';
import { PRICEDAY_EPOCH, priceDayNumber } from '../lib/priceday/priceday';
import { CAL_MONTH_SHORT, CAL_TODAY } from '../lib/calendar/data';
import { dateKey, renderNoteMarkdown } from '../lib/calendar/utils';
import {
    getTodos, subscribeTodos, toggleTodo, datedTodosByDay, type TodoItem,
} from '../lib/todos/todoStore';

type CalRemind = 'off' | 'attime' | '15m' | '1h' | '1d';

interface CalApiItem {
    id?: string;
    scope: 'personal' | 'global' | 'auto';
    time?: string | null;
    title: string;
    mine?: boolean;
    remind?: CalRemind;
}

const CLOSE_FADE_MS = 250;
const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/** The ping plan's short badge word. */
const REMIND_BADGE: Record<CalRemind, string> = {
    off: 'NO PING', attime: 'AT TIME', '15m': '15M BEFORE', '1h': '1H BEFORE', '1d': 'DAY BEFORE',
};
const REMIND_CHIPS: Array<{ key: CalRemind; label: string }> = [
    { key: 'off', label: 'OFF' },
    { key: 'attime', label: 'AT TIME' },
    { key: '15m', label: '15M BEFORE' },
    { key: '1h', label: '1H BEFORE' },
    { key: '1d', label: 'DAY BEFORE' },
];

/** Sort key for the day list — timed items in clock order, all-day first. */
function timeMin(label: string | null | undefined): number {
    const m = label && /(\d{1,2}):(\d{2})/.exec(label);
    return m ? Math.min(23, Number(m[1])) * 60 + Math.min(59, Number(m[2])) : -1;
}

export default function CalendarSheet({ onClose }: { onClose: () => void }) {
    const { selY, selM, selD, selectDay, dayNotes } = useCalendar();
    const { globalPings, toggleGlobalPings } = useCalendar();
    const { openDayNoteEditor } = useNotePrompt();
    const { siweAddress } = useAuth();
    const { showToast } = useToast();
    const isAuthed = !!siweAddress;

    const [active, setActive] = useState(false);
    const closingRef = useRef(false);
    useEffect(() => {
        const raf = requestAnimationFrame(() => setActive(true));
        return () => cancelAnimationFrame(raf);
    }, []);
    const dismiss = useCallback(() => {
        if (closingRef.current) return;
        closingRef.current = true;
        setActive(false);
        setTimeout(onClose, CLOSE_FADE_MS);
    }, [onClose]);

    /* Month read — the same composed layers the panel shows. Re-fetched when
       the selected month changes or after a write. */
    const [monthItems, setMonthItems] = useState<Record<string, CalApiItem[]>>({});
    const [canGlobal, setCanGlobal] = useState(false);
    const loadMonth = useCallback(() => {
        fetch(`/api/calendar?year=${selY}&month=${selM + 1}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (!d) return;
                setMonthItems((d.days as Record<string, CalApiItem[]>) ?? {});
                setCanGlobal(!!d.can_global);
            })
            .catch(() => {});
    }, [selY, selM]);
    useEffect(() => { loadMonth(); }, [loadMonth]);

    /* Day's to-dos — live off the store, same as the panel. */
    const [todoMap, setTodoMap] = useState<Record<string, TodoItem[]>>({});
    useEffect(() => {
        const read = () => setTodoMap(datedTodosByDay(getTodos()));
        read();
        return subscribeTodos(read);
    }, []);

    /* Day navigation ‹ › — shared selection, the panel follows. */
    const nav = useCallback((dir: -1 | 1) => {
        const d = new Date(selY, selM, selD + dir, 12);
        selectDay(d.getFullYear(), d.getMonth(), d.getDate());
    }, [selY, selM, selD, selectDay]);

    const selKey = dateKey(selY, selM, selD);
    const selDate = useMemo(() => new Date(selY, selM, selD, 12), [selY, selM, selD]);
    const pd = usePriceDay(selDate);
    const inPdRange =
        Date.UTC(selY, selM, selD) >= PRICEDAY_EPOCH &&
        priceDayNumber(selDate) <= priceDayNumber(new Date());
    const isToday = selY === CAL_TODAY.y && selM === CAL_TODAY.m && selD === CAL_TODAY.d;

    const dayNote = isAuthed ? (dayNotes[selKey] || '') : '';
    /* GCal-like day timeline (Brendon, 2026-07-18): calendar items and to-dos
       share ONE ordered list, sorted by clock time — no-time entries (all-day,
       including a to-do that has a date but no time) float to the top; timed
       ones follow in order. Each keeps its own row treatment + interactions. */
    const dayEntries = useMemo(() => {
        const out: Array<
            | { kind: 'item'; sortMin: number; item: CalApiItem }
            | { kind: 'todo'; sortMin: number; todo: TodoItem }
        > = [];
        for (const it of monthItems[selKey] ?? []) {
            out.push({ kind: 'item', sortMin: timeMin(it.time), item: it });
        }
        if (isAuthed) {
            for (const t of todoMap[selKey] ?? []) {
                out.push({ kind: 'todo', sortMin: timeMin(t.dueTime), todo: t });
            }
        }
        // Stable: all-day (-1) first, then chronological; equal times keep
        // insertion order (calendar items before to-dos at the same minute).
        return out
            .map((e, i) => ({ e, i }))
            .sort((a, b) => a.e.sortMin - b.e.sortMin || a.i - b.i)
            .map(({ e }) => e);
    }, [monthItems, todoMap, selKey, isAuthed]);

    /* ── The editor (the workflows-like screen) ─────────────────────────── */
    const [editing, setEditing] = useState<null | { id?: string }>(null);
    const [title, setTitle] = useState('');
    const [time, setTime] = useState('');
    const [remind, setRemind] = useState<CalRemind>('attime');
    const [asGlobal, setAsGlobal] = useState(false);
    const [busy, setBusy] = useState(false);

    const openNew = () => {
        setEditing({});
        setTitle(''); setTime(''); setRemind('attime'); setAsGlobal(false);
    };
    const openEdit = (it: CalApiItem) => {
        if (!it.mine || !it.id) return;
        setEditing({ id: it.id });
        setTitle(it.title);
        setTime(it.time ?? '');
        setRemind(it.remind ?? 'attime');
        setAsGlobal(it.scope === 'global');
    };

    const save = () => {
        const t = title.trim();
        if (busy || !t) return;
        setBusy(true);
        const isUpdate = !!editing?.id;
        fetch('/api/calendar', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(
                isUpdate
                    ? { action: 'update', id: editing!.id, title: t, time: time.trim(), remind }
                    : { action: 'add', dateKey: selKey, title: t, time: time.trim(), remind, scope: asGlobal ? 'global' : 'personal' },
            ),
        })
            .then(async (r) => {
                if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string })?.error ?? 'FAILED');
                showToast(isUpdate ? 'Calendar: UPDATED' : `Calendar: ADDED${asGlobal ? ' · GLOBAL' : ''}`);
                setEditing(null);
                loadMonth();
            })
            .catch((err: unknown) => showToast(err instanceof Error ? err.message : 'Calendar: FAILED'))
            .finally(() => setBusy(false));
    };

    const remove = (id: string) => {
        fetch('/api/calendar', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action: 'delete', id }),
        }).then(() => { showToast('Calendar: REMOVED'); loadMonth(); }).catch(() => {});
    };

    const dateLabel = `${CAL_MONTH_SHORT[selM]} ${selD}`;

    return createPortal(
        <div
            className={`value-prompt-wrap mounted${active ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Calendar day"
            onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
        >
            <div className="value-prompt-box wf-sheet cal-sheet">
                <span
                    className="value-prompt-close-x"
                    onClick={dismiss}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dismiss(); } }}
                    title="Close"
                >
                    {'×︎'}
                </span>

                {/* Header — the day, walkable. */}
                <div className="value-prompt-title cal-sheet-head">
                    <span className="cal-sheet-nav" role="button" tabIndex={0} title="Previous day"
                        onClick={() => nav(-1)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav(-1); } }}
                    >{'‹'}</span>
                    <span className="cal-sheet-date">
                        {'▦︎ '}{dateLabel}
                        <span className="cal-sheet-weekday">{WEEKDAYS[selDate.getDay()]}{isToday ? ' · TODAY' : ''}</span>
                    </span>
                    <span className="cal-sheet-nav" role="button" tabIndex={0} title="Next day"
                        onClick={() => nav(1)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav(1); } }}
                    >{'›'}</span>
                </div>

                {editing ? (
                    /* ── EDIT — the builder ─────────────────────────────── */
                    <div className="wf-compose cal-sheet-compose">
                        <div className="wf-fields">
                            <span className="wf-when">ON {dateLabel} AT</span>
                            <input
                                className="wf-input wf-input-num cal-sheet-time"
                                type="text"
                                inputMode="numeric"
                                placeholder="HH:MM"
                                maxLength={24}
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                            />
                            <span className="wf-when">—</span>
                            <input
                                className="wf-input"
                                type="text"
                                placeholder="what's happening?"
                                maxLength={200}
                                autoFocus
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }}
                            />
                        </div>
                        <div className="wf-fields">
                            <span className="wf-when">{'⇡︎ PING'}</span>
                            {REMIND_CHIPS.map((c) => (
                                <button
                                    key={c.key}
                                    type="button"
                                    className={`wf-kind cal-remind-chip${remind === c.key ? ' on' : ''}`}
                                    onClick={() => setRemind(c.key)}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>
                        {canGlobal && !editing.id && (
                            <div className="wf-fields">
                                <span className="wf-when">SCOPE</span>
                                <button
                                    type="button"
                                    className={`wf-kind${asGlobal ? ' on' : ''}`}
                                    onClick={() => setAsGlobal((v) => !v)}
                                    title="Write to the GLOBAL calendar (everyone sees it)"
                                >
                                    {'⊞︎ GLOBAL'}
                                </button>
                            </div>
                        )}
                        <div className="cal-sheet-actions">
                            <button type="button" className="wf-kind" onClick={() => setEditing(null)}>CANCEL</button>
                            <button type="button" className="wf-arm" disabled={busy || !title.trim()} onClick={save}>
                                {busy ? '…' : editing.id ? 'UPDATE' : 'ADD'}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ── VIEW — the whole day ───────────────────────────── */
                    <>
                        {isAuthed && (
                            <button type="button" className="wf-arm cal-sheet-new" onClick={openNew}>
                                + NEW ITEM
                            </button>
                        )}
                        <div className="wf-list cal-sheet-list">
                            {isAuthed && (
                                <div
                                    className="wf-row cal-sheet-row is-mine"
                                    role="button"
                                    tabIndex={0}
                                    title={dayNote ? 'Edit Day Note' : 'Write a Day Note'}
                                    onClick={() => openDayNoteEditor(selKey)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDayNoteEditor(selKey); } }}
                                >
                                    <span className="wf-sentence">
                                        {'⊟︎ '}
                                        {dayNote
                                            ? <span dangerouslySetInnerHTML={{ __html: renderNoteMarkdown(dayNote) }} />
                                            : <span className="cal-sheet-ghost">Day Note — tap to write</span>}
                                    </span>
                                </div>
                            )}
                            {dayEntries.map((entry) => {
                                if (entry.kind === 'todo') {
                                    const t = entry.todo;
                                    return (
                                        <div
                                            key={`todo-${t.id}`}
                                            className="wf-row cal-sheet-row cal-sheet-todo is-mine"
                                            role="button"
                                            tabIndex={0}
                                            title="Complete to-do"
                                            onClick={() => { toggleTodo(t.id); showToast('To-Do: DONE'); }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault(); toggleTodo(t.id); showToast('To-Do: DONE');
                                                }
                                            }}
                                        >
                                            <span className="wf-sentence">
                                                <span className="cal-sheet-timecol">{t.dueTime || 'all day'}</span>{' '}
                                                {'❍︎ '}{t.text}
                                            </span>
                                        </div>
                                    );
                                }
                                const it = entry.item;
                                return (
                                    <div
                                        key={it.id ?? `${it.scope}-${it.title}`}
                                        className={`wf-row cal-sheet-row cal-sheet-${it.scope}${it.mine && it.id ? ' is-mine' : ''}`}
                                        role={it.mine && it.id ? 'button' : undefined}
                                        tabIndex={it.mine && it.id ? 0 : undefined}
                                        title={it.mine && it.id ? 'Edit item' : undefined}
                                        onClick={() => openEdit(it)}
                                        onKeyDown={(e) => {
                                            if ((e.key === 'Enter' || e.key === ' ') && it.mine && it.id) {
                                                e.preventDefault();
                                                openEdit(it);
                                            }
                                        }}
                                    >
                                        <span className="wf-sentence">
                                            <span className="cal-sheet-timecol">{it.time || 'all day'}</span>{' '}
                                            {it.scope === 'global' && <span>{'⊞︎ '}</span>}
                                            {it.title}
                                        </span>
                                        {it.mine && it.id && (
                                            <>
                                                <span className={`cal-ping-badge${(it.remind ?? 'attime') === 'off' ? ' is-off' : ''}`}>
                                                    {'⇡︎ '}{REMIND_BADGE[it.remind ?? 'attime']}
                                                </span>
                                                <span
                                                    className="todo-del"
                                                    role="button"
                                                    tabIndex={0}
                                                    title="Remove"
                                                    onClick={(e) => { e.stopPropagation(); remove(it.id!); }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault(); e.stopPropagation(); remove(it.id!);
                                                        }
                                                    }}
                                                >
                                                    {'×︎'}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                            {inPdRange && (
                                <div className="wf-row cal-sheet-row cal-sheet-pd" title={pd.flavor ?? undefined}>
                                    <span className="wf-sentence">
                                        {'✶︎ PriceDay '}{pd.number}
                                        {pd.flavor && <span className="cal-sheet-flavor"> — {pd.flavor}</span>}
                                    </span>
                                </div>
                            )}
                            {dayEntries.length === 0 && !dayNote && !inPdRange && (
                                <div className="todo-empty">Nothing on this day yet.</div>
                            )}
                        </div>
                        {/* The floor — account-wide calendar↔pings control. */}
                        {isAuthed && (
                            <div className="cal-sheet-floor">
                                <span className="wf-when">{'⊞︎ GLOBAL SCHEDULE PINGS'}</span>
                                <button
                                    type="button"
                                    className={`wf-kind${globalPings ? ' on' : ''}`}
                                    onClick={() => {
                                        toggleGlobalPings();
                                        showToast(`Global Schedule Pings: ${globalPings ? 'OFF' : 'ON'}`);
                                    }}
                                >
                                    {globalPings ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
}
