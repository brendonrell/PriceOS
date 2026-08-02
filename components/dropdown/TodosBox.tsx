'use client';

/*
 * TodosBox — the real To-Dos accordion (replaces the old 5-row mock).
 *
 * One store (lib/todos/todoStore) feeds this, the calendar overlay, and the
 * artwork "Make To-Do" button. Layout = the "Meta chips" treatment Brendon
 * picked (2026-07-04): title on top, details as chips (due · ◊ price · priority ·
 * ↻ recurrence · #labels) below. Reuses the connect-menu panel/rows (Rule #0).
 *
 * Extras, all fed by the same store:
 *   - Quick-add composer (opened by the header "+", which Brendon will re-home),
 *     with MAGIC parsing: "buy prisms 22 under .4 fri" fills verb/piece/price/due.
 *   - Label filter row — tap a #label to narrow the list.
 *   - War-chest line — total ETH earmarked across open priced to-dos.
 *   - The Sentinel — a BUY to-do with an ETH target flips to READY when the
 *     piece's live listing price (the SAME real feed the grail pins read, via
 *     starredPriceStore) is at/under the target.
 *   - Recurring to-dos — completing one advances it to its next occurrence.
 *
 * Completed to-dos strike through and sink to the bottom (never deleted).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AccordionBox } from './AccordionBox';
import { useLongPress } from '../../lib/hooks/useLongPress';
import { useModal } from '../../lib/state/ModalContext';
import { MentionLookup } from '../MentionLookup';
import { renderMentions } from '../../lib/mentions/render';
import { WorkflowsSheet } from './WorkflowsSheet';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useDropdown } from '../../lib/state/DropdownContext';
import { useToast } from '../../lib/state/ToastContext';
import { priceOf, useStarredPrices } from '../../lib/pins/starredPriceStore';
import { parseTodo } from '../../lib/todos/parse';

/* How many rows the hidden menu carries before it is opened. */
const FIRST_PAGE = 25;
import {
    getTodos,
    subscribeTodos,
    addRawTodo,
    addOutputTodo,
    toggleTodo,
    removeTodo,
    updateTodo,
    clearDoneTodos,
    sortTodos,
    warChest,
    allLabels,
    type TodoItem,
    type TodoPriority,
} from '../../lib/todos/todoStore';
import { formatEth } from '../../lib/format/eth';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'YYYY-MM-DD' → 'Sep 22' (display only; falls back to raw on a bad parse). */
function fmtDue(due: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(due);
    if (!m) return due;
    const mon = MONTHS[Number(m[2]) - 1] ?? '';
    return `${mon} ${Number(m[3])}`;
}

/** The site ETH display rule (4 digits, floating decimal). */
function fmtEth(n: number): string {
    return formatEth(n);
}

/* `suite` — the SAME box mounted inside the PriceOS Suite (2026-07-27):
   always expanded, header no longer collapses, and the Suite door long-press
   stays off (you're already inside). Zero behavioural changes otherwise. */
export function TodosBox({ suite = false }: { suite?: boolean } = {}) {
    const { menuOpen } = useDropdown();
    const { notifs, setAccordion } = usePdNotifs();
    const { showToast } = useToast();
    const { open: openModal } = useModal();
    /* THE SUITE DOOR (Brendon-confirmed 2026-07-27): long-press the TO-DOS
       header — right where it says "TO-DOS" — to open the PriceOS Suite.
       The app's one press-and-hold contract (useLongPress), nothing new. */
    const suiteHold = useLongPress(() => { if (!suite) openModal('suite'); });

    const [todos, setTodos] = useState<TodoItem[]>([]);
    useEffect(() => {
        const read = () => setTodos(getTodos());
        read();
        return subscribeTodos(read);
    }, []);

    // Composer state.
    const [composeOpen, setComposeOpen] = useState(false);
    // Workflows ☇ — the modal's ONLY entry surface (Brendon, 2026-07-05).
    const [workflowsOpen, setWorkflowsOpen] = useState(false);
    const [text, setText] = useState('');
    // @name lookup — caret position + the input node, for the mention popover.
    const [caret, setCaret] = useState<number | null>(null);
    const composeInputRef = useRef<HTMLInputElement>(null);
    const [due, setDue] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [price, setPrice] = useState('');
    const [priority, setPriority] = useState<TodoPriority>(0);

    // Deleting a to-do asks first — the same confirm card every destructive /
    // financial action uses (Brendon, 2026-07-05).
    const [confirm, setConfirm] = useState<{ question: string; onConfirm: () => void } | null>(null);

    /* EDIT ✎ — beside the row's × (Brendon, 2026-07-28). The Lists panel's
       rename-in-place, verbatim: the pencil swaps the title for an input,
       Enter/blur commits, Esc backs out. Same glyph, same mechanics. */
    const [editId, setEditId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const editRef = useRef<HTMLInputElement>(null);
    useEffect(() => { if (editId) editRef.current?.focus(); }, [editId]);
    const commitEdit = (t: TodoItem) => {
        const next = editText.trim();
        setEditId(null);
        if (!next || next === t.text) return;
        updateTodo(t.id, { text: next });
        showToast('To-Do: EDITED');
    };

    // Label filter.
    const [activeLabel, setActiveLabel] = useState<string | null>(null);
    const labels = useMemo(() => allLabels(todos), [todos]);
    useEffect(() => {
        // Drop the filter if its label no longer exists.
        if (activeLabel && !labels.includes(activeLabel)) setActiveLabel(null);
    }, [labels, activeLabel]);

    // ── The Sentinel — load the real listing price for every BUY target's slug
    //    (same store the grail/starred pins use) and flip READY when it's hit.
    const watchSlugs = useMemo(
        () =>
            Array.from(
                new Set(
                    todos
                        .filter((t) => !t.done && t.kind === 'output' && t.source?.verb === 'BUY' && t.priceEth)
                        .map((t) => t.source!.slug),
                ),
            ),
        [todos],
    );
    const priceVersion = useStarredPrices(watchSlugs);
    const isReady = useCallback(
        (t: TodoItem): boolean => {
            if (t.done || t.kind !== 'output' || t.source?.verb !== 'BUY' || !t.priceEth) return false;
            const p = priceOf(t.source.slug, t.source.tokenId);
            return p != null && p <= t.priceEth;
        },
        // priceVersion bumps when a slug's prices land, re-evaluating readiness.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [priceVersion],
    );

    const openCount = todos.filter((t) => !t.done).length;
    const doneCount = todos.length - openCount;
    const chest = warChest(todos);

    // Sort: store order (priority → due → newest, done last), float READY ones to
    // the top, then apply the label filter.
    const ordered = useMemo(() => {
        const base = sortTodos(todos);
        return [...base].sort((a, b) => (isReady(b) ? 1 : 0) - (isReady(a) ? 1 : 0));
    }, [todos, isReady]);
    const matching = activeLabel ? ordered.filter((t) => (t.labels ?? []).includes(activeLabel)) : ordered;
    /* ⛔ THE LIST IS BUILT WHEN IT IS LOOKED AT (Brendon, 2026-08-01). The menu's
       stack is hidden, never unmounted, so a long list sat live in the page on
       every screen and the menu had to raise all of it behind the slide. A
       screenful goes up first; the rest fill in once the menu is open and the
       slide has finished. The Suite pane is its own app view and is never
       capped. */
    const [cap, setCap] = useState(FIRST_PAGE);
    useEffect(() => {
        if (suite) { setCap(Number.MAX_SAFE_INTEGER); return; }
        if (!menuOpen || cap >= matching.length) return;
        const t = window.setTimeout(() => setCap(Number.MAX_SAFE_INTEGER), 450);
        return () => window.clearTimeout(t);
    }, [suite, menuOpen, cap, matching.length]);
    const shown = useMemo(() => matching.slice(0, cap), [matching, cap]);

    const stop = (e: React.MouseEvent | React.KeyboardEvent) => e.stopPropagation();

    const openComposer = (e: React.MouseEvent) => {
        stop(e);
        if (!suite && !notifs.todos) setAccordion('todos', true);
        setComposeOpen((v) => !v);
    };

    const cyclePriority = () => setPriority((p) => (((p + 1) % 4) as TodoPriority));

    /* Sticky label — adding while a #label filter is active tags the new
       to-do with that label (Todoist's project-view behaviour), so a grocery
       run is: filter #grocery, then rattle items off. */
    const withSticky = (labels?: string[]): string[] | undefined => {
        if (!activeLabel) return labels;
        const set = new Set(labels ?? []);
        set.add(activeLabel);
        return Array.from(set);
    };

    const addOne = (raw: string): boolean => {
        const t = raw.trim();
        if (!t) return false;
        const p = parseTodo(t);
        const eth = parseFloat(price);
        const explicitPrice = Number.isFinite(eth) && eth > 0 ? eth : null;
        const finalDue = due || p.due || null;
        /* A time only means something on a dated to-do — the reminder fires
           at date+time (TodoReminders.dueEpoch already reads dueTime). The
           picked time wins; else the parsed "3pm"-style time rides along. */
        const finalDueTime = finalDue ? (dueTime || p.dueTime || null) : null;
        const finalPrice = explicitPrice ?? p.priceEth ?? null;
        const finalPriority = (priority || p.priority || 0) as TodoPriority;
        if (p.output) {
            addOutputTodo(p.output.slug, p.output.tokenId, p.output.verb, {
                priceEth: finalPrice,
                due: finalDue,
                dueTime: finalDueTime,
            });
        } else {
            addRawTodo({
                text: p.text || t,
                due: finalDue,
                dueTime: finalDueTime,
                priceEth: finalPrice,
                priority: finalPriority,
                labels: withSticky(p.labels),
                recurrence: p.recurrence,
            });
        }
        return true;
    };

    /* Rapid entry: adding CLEARS the composer but keeps it open + focused, so
       a grocery list goes in as fast as you can type it. Close with + or by
       collapsing the accordion. */
    const submit = () => {
        if (!addOne(text)) return;
        setText('');
        setDue('');
        setDueTime('');
        setPrice('');
        setPriority(0);
        showToast('To-Do: ADDED');
    };

    /* Paste a whole list — every non-empty line becomes its own to-do (each
       line still gets the magic parse + the sticky label). */
    const onPasteList = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pasted = e.clipboardData?.getData('text') ?? '';
        if (!pasted.includes('\n')) return; // single line — let the input take it
        e.preventDefault();
        const lines = pasted.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        let added = 0;
        for (const line of lines) if (addOne(line)) added += 1;
        if (added > 0) {
            setText('');
            showToast(added === 1 ? 'To-Do: ADDED' : `To-Dos: ADDED · ${added}`);
        }
    };

    const onClearDone = (e: React.MouseEvent) => {
        stop(e);
        const n = todos.filter((t) => t.done).length;
        setConfirm({
            question: `Clear ${n} completed to-do${n === 1 ? '' : 's'}?`,
            onConfirm: () => {
                const removed = clearDoneTodos();
                showToast(`To-Dos: CLEARED · ${removed}`);
            },
        });
    };

    const onToggle = (e: React.MouseEvent, t: TodoItem) => {
        stop(e);
        const r = toggleTodo(t.id);
        showToast(r === 'recurred' ? 'To-Do: RESCHEDULED' : r === 'reopened' ? 'To-Do: REOPENED' : 'To-Do: DONE');
    };
    const onDelete = (e: React.MouseEvent, t: TodoItem) => {
        stop(e);
        setConfirm({
            question: 'Delete this to-do?',
            onConfirm: () => { removeTodo(t.id); showToast('To-Do: DELETED'); },
        });
    };

    return (
        <AccordionBox
            boxId={suite ? 'suiteTodosBox' : 'todosBox'}
            listId={suite ? 'suiteTodosList' : 'todosList'}
            open={suite || notifs.todos}
            /* The Suite pane scrolls with the thumb — no ⇡ / ⇣ rows there. */
            noArrows={suite}
            onHeaderClick={() => { if (!suite) setAccordion('todos', !notifs.todos); }}
            header={
                <span className="todos-header-row">
                    <span {...(suite ? {} : suiteHold)} title={suite ? undefined : 'Hold to open the PriceOS Suite'}>
                        {/* In the Suite the header wears the app's own name
                            (Brendon, 2026-07-28); the connect menu keeps
                            TO-DOS. */}
                        {suite ? 'PRICETASK' : 'TO-DOS'} <span className="notif-count">({openCount})</span>
                    </span>
                    {(suite || notifs.todos) && (
                        /* One right-side icon cluster — + then ☇ (swapped per
                           Brendon, 2026-07-10), instead of drifting to the
                           row's centre via the header's space-between. */
                        <span className="todos-header-icons">
                            <span
                                className={`todos-add-btn${composeOpen ? ' is-on' : ''}`}
                                role="button"
                                tabIndex={0}
                                title="Add a to-do"
                                onClick={openComposer}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        openComposer(e as unknown as React.MouseEvent);
                                    }
                                }}
                            >
                                +
                            </span>
                            <span
                                className="todos-add-btn todos-wf-btn"
                                role="button"
                                tabIndex={0}
                                title="Workflows"
                                onClick={(e) => { stop(e); setWorkflowsOpen(true); }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setWorkflowsOpen(true);
                                    }
                                }}
                            >
                                {'☇︎'}
                            </span>
                        </span>
                    )}
                </span>
            }
        >
            {chest.count > 0 && (
                <div className="todo-chest">
                    <span className="todo-chest-eth">
                        <span className="eth-mark">◊</span>
                        {fmtEth(chest.total)}
                    </span>
                    <span className="todo-chest-lbl">
                        earmarked · {chest.count} target{chest.count === 1 ? '' : 's'}
                    </span>
                </div>
            )}

            {composeOpen && (
                <div className="todo-compose" onClick={stop}>
                    {/* Close × — the composer's explicit exit (Brendon,
                        2026-07-10); before this the only way out was
                        re-tapping the header +. */}
                    <span
                        className="todo-compose-close"
                        role="button"
                        tabIndex={0}
                        title="Close"
                        onClick={(e) => { stop(e); setComposeOpen(false); }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                setComposeOpen(false);
                            }
                        }}
                    >
                        {'×︎'}
                    </span>
                    <input
                        ref={composeInputRef}
                        className="todo-compose-input"
                        type="text"
                        placeholder="Add a to-do…  (try: buy prisms 22 under .4 fri)"
                        value={text}
                        maxLength={200}
                        autoFocus
                        onChange={(e) => { setText(e.target.value); setCaret(e.target.selectionStart); }}
                        onKeyUp={(e) => setCaret(e.currentTarget.selectionStart)}
                        onClick={(e) => setCaret(e.currentTarget.selectionStart)}
                        onPaste={onPasteList}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                submit();
                            }
                        }}
                    />
                    <MentionLookup
                        value={text}
                        caret={caret}
                        anchorRef={composeInputRef}
                        onPick={(next, caretAfter) => {
                            setText(next);
                            setCaret(caretAfter);
                            const el = composeInputRef.current;
                            if (el) {
                                el.focus();
                                requestAnimationFrame(() => el.setSelectionRange(caretAfter, caretAfter));
                            }
                        }}
                    />
                    <div className="todo-compose-row">
                        {/* Due chip — ONE pill holding both the date and (once a
                            day is picked) the time, matching the saved-row
                            "Jul 10 09:49" display (Brendon, 2026-07-10 — two
                            separate chips overflowed the row). Each segment
                            carries its own transparent native picker. */}
                        <span className={`todo-chip todo-chip-due${due ? ' set' : ''}`}>
                            <label className="todo-chip-seg" title="Due date">
                                <span className="todo-chip-lbl">{due ? fmtDue(due) : 'due'}</span>
                                <input
                                    className="todo-chip-native"
                                    type="date"
                                    value={due}
                                    onChange={(e) => setDue(e.target.value)}
                                />
                            </label>
                            {/* Clock sits BETWEEN the date and time and is always
                                shown, a hair of space on each side (Brendon,
                                2026-07-18). The time segment is always present so
                                the clock always has both sides to sit between. */}
                            <span className="todo-chip-ico todo-chip-clock">◷</span>
                            <label className="todo-chip-seg" title="Reminder time">
                                <span className="todo-chip-lbl">{dueTime || 'time'}</span>
                                <input
                                    className="todo-chip-native"
                                    type="time"
                                    value={dueTime}
                                    onChange={(e) => setDueTime(e.target.value)}
                                />
                            </label>
                        </span>
                        <span className={`todo-chip todo-chip-price${price ? ' set' : ''}`} title="ETH target / budget">
                            <span className="todo-chip-ico eth-mark">◊</span>
                            <input
                                className="todo-chip-price-input"
                                type="text"
                                inputMode="decimal"
                                maxLength={8}
                                placeholder="price"
                                value={price}
                                onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                            />
                        </span>
                        <button
                            type="button"
                            className={`todo-chip todo-chip-pri${priority > 0 ? ` on p${priority}` : ''}`}
                            title="Priority"
                            onClick={cyclePriority}
                        >
                            <span className="todo-chip-ico">!</span>
                            <span className="todo-chip-lbl">P{priority === 0 ? 1 : priority}</span>
                        </button>
                        <button
                            type="button"
                            className="todo-add"
                            title="Add"
                            disabled={!text.trim()}
                            onClick={submit}
                        >
                            +
                        </button>
                    </div>
                </div>
            )}

            {labels.length > 0 && (
                <div className="todo-filter-row" onClick={stop}>
                    {labels.map((l) => (
                        <span
                            key={l}
                            className={`todo-filter-chip${activeLabel === l ? ' on' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveLabel((cur) => (cur === l ? null : l))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setActiveLabel((cur) => (cur === l ? null : l));
                                }
                            }}
                        >
                            #{l}
                        </span>
                    ))}
                </div>
            )}

            {todos.length === 0 && !composeOpen && (
                <div className="todo-empty">No to-dos yet — tap + to add one.</div>
            )}

            {shown.map((t) => {
                const ready = isReady(t);
                /* p1 keeps its class when done — the Hothurt ring survives
                   completion at the done-row fade (Brendon, 2026-07-13); the
                   .done rules still win weight/box colour in the cascade. */
                const p1 = t.priority === 1;
                const href =
                    t.kind === 'output' && t.source
                        ? `/art/${t.source.slug}/${t.source.tokenId}`
                        : null;
                const title = (
                    <span className="todo-title">
                        {t.kind === 'output' ? t.text : renderMentions(t.text)}
                        {ready && <span className="todo-ready">READY</span>}
                    </span>
                );
                const hasChips =
                    t.due || t.priceEth || t.priority > 0 || t.recurrence || (t.labels && t.labels.length);
                return (
                    <div
                        key={t.id}
                        className={`todo-row${t.done ? ' done' : ''}${p1 ? ' p1' : ''}${ready ? ' ready' : ''}`}
                    >
                        <span
                            className="todo-box"
                            role="button"
                            tabIndex={0}
                            title={t.done ? 'Reopen' : 'Complete'}
                            onClick={(e) => onToggle(e, t)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onToggle(e as unknown as React.MouseEvent, t);
                                }
                            }}
                        >
                            {t.done ? '✓︎' : '❍︎'}
                        </span>

                        <span className="todo-main">
                            {editId === t.id ? (
                                <input
                                    ref={editRef}
                                    className="todo-edit-input"
                                    type="text"
                                    value={editText}
                                    maxLength={200}
                                    onClick={stop}
                                    onChange={(e) => setEditText(e.target.value)}
                                    onBlur={() => commitEdit(t)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') { e.preventDefault(); commitEdit(t); }
                                        else if (e.key === 'Escape') { e.preventDefault(); setEditId(null); }
                                    }}
                                />
                            ) : href ? (
                                <a className="todo-link" href={href} onClick={stop}>
                                    {title}
                                </a>
                            ) : (
                                title
                            )}
                            {hasChips ? (
                                <span className="todo-chips">
                                    {t.due && <span className="todo-chip">{fmtDue(t.due)}{t.dueTime ? ` ${t.dueTime}` : ''}</span>}
                                    {t.recurrence && <span className="todo-chip rec">↻ {t.recurrence}</span>}
                                    {t.priceEth ? (
                                        <span className="todo-chip eth">
                                            <span className="eth-mark">◊</span>
                                            {fmtEth(t.priceEth)}
                                        </span>
                                    ) : null}
                                    {t.priority > 0 && (
                                        <span className={`todo-chip pri p${t.priority}`}>P{t.priority}</span>
                                    )}
                                    {(t.labels ?? []).map((l) => (
                                        <span key={l} className="todo-chip label">
                                            #{l}
                                        </span>
                                    ))}
                                </span>
                            ) : null}
                        </span>

                        <span
                            className="todo-edit"
                            role="button"
                            tabIndex={0}
                            title="Edit to-do"
                            aria-label="Edit to-do"
                            onClick={(e) => { stop(e); setEditText(t.text); setEditId(t.id); }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditText(t.text);
                                    setEditId(t.id);
                                }
                            }}
                        >
                            {'✎︎'}
                        </span>

                        <span
                            className="todo-del"
                            role="button"
                            tabIndex={0}
                            title="Delete to-do"
                            onClick={(e) => onDelete(e, t)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onDelete(e as unknown as React.MouseEvent, t);
                                }
                            }}
                        >
                            {'×︎'}
                        </span>
                    </div>
                );
            })}

            {/* One-tap sweep of everything checked off — the after-the-
                groceries clear. Sits under the sunk done rows. */}
            {doneCount > 0 && (
                <div className="todo-clear-row">
                    <span
                        className="todo-clear-btn"
                        role="button"
                        tabIndex={0}
                        title="Remove all completed to-dos"
                        onClick={onClearDone}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onClearDone(e as unknown as React.MouseEvent);
                            }
                        }}
                    >
                        Clear completed ({doneCount})
                    </span>
                </div>
            )}

            {workflowsOpen && <WorkflowsSheet onClose={() => setWorkflowsOpen(false)} />}

            {/* The confirm rides a portal to <body> — rendered inside the
                dropdown, the menu's transform traps the fixed overlay so it
                only covered the menu (Brendon, 2026-07-10). Same pattern as
                every other full-screen confirm (unlist / mint / stickers). */}
            {confirm && typeof document !== 'undefined' && createPortal(
                <div
                    className="starred-confirm-overlay"
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setConfirm(null)}
                >
                    <div className="ms-confirm-card is-centered" onClick={(e) => e.stopPropagation()}>
                        <div className="ms-confirm-question">{confirm.question}</div>
                        <div className="ms-confirm-btns">
                            <button
                                className="ms-confirm-btn ms-confirm-btn--cancel"
                                onClick={() => setConfirm(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="ms-confirm-btn ms-confirm-btn--ok"
                                onClick={() => { confirm.onConfirm(); setConfirm(null); }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </AccordionBox>
    );
}
