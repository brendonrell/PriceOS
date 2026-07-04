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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccordionBox } from './AccordionBox';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useToast } from '../../lib/state/ToastContext';
import { priceOf, useStarredPrices } from '../../lib/pins/starredPriceStore';
import { parseTodo } from '../../lib/todos/parse';
import {
    getTodos,
    subscribeTodos,
    addRawTodo,
    addOutputTodo,
    toggleTodo,
    removeTodo,
    sortTodos,
    warChest,
    allLabels,
    type TodoItem,
    type TodoPriority,
} from '../../lib/todos/todoStore';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'YYYY-MM-DD' → 'Sep 22' (display only; falls back to raw on a bad parse). */
function fmtDue(due: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(due);
    if (!m) return due;
    const mon = MONTHS[Number(m[2]) - 1] ?? '';
    return `${mon} ${Number(m[3])}`;
}

/** Trim trailing zeros: 0.40 → 0.4, 2.00 → 2. */
function fmtEth(n: number): string {
    return String(Number(n.toFixed(4)));
}

export function TodosBox() {
    const { notifs, setAccordion } = usePdNotifs();
    const { showToast } = useToast();

    const [todos, setTodos] = useState<TodoItem[]>([]);
    useEffect(() => {
        const read = () => setTodos(getTodos());
        read();
        return subscribeTodos(read);
    }, []);

    // Composer state.
    const [composeOpen, setComposeOpen] = useState(false);
    const [text, setText] = useState('');
    const [due, setDue] = useState('');
    const [price, setPrice] = useState('');
    const [priority, setPriority] = useState<TodoPriority>(0);

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
    const chest = warChest(todos);

    // Sort: store order (priority → due → newest, done last), float READY ones to
    // the top, then apply the label filter.
    const ordered = useMemo(() => {
        const base = sortTodos(todos);
        return [...base].sort((a, b) => (isReady(b) ? 1 : 0) - (isReady(a) ? 1 : 0));
    }, [todos, isReady]);
    const shown = activeLabel ? ordered.filter((t) => (t.labels ?? []).includes(activeLabel)) : ordered;

    const stop = (e: React.MouseEvent | React.KeyboardEvent) => e.stopPropagation();

    const openComposer = (e: React.MouseEvent) => {
        stop(e);
        if (!notifs.todos) setAccordion('todos', true);
        setComposeOpen((v) => !v);
    };

    const cyclePriority = () => setPriority((p) => (((p + 1) % 4) as TodoPriority));

    const submit = () => {
        const t = text.trim();
        if (!t) return;
        const p = parseTodo(t);
        const eth = parseFloat(price);
        const explicitPrice = Number.isFinite(eth) && eth > 0 ? eth : null;
        const finalDue = due || p.due || null;
        const finalPrice = explicitPrice ?? p.priceEth ?? null;
        const finalPriority = (priority || p.priority || 0) as TodoPriority;
        if (p.output) {
            addOutputTodo(p.output.slug, p.output.tokenId, p.output.verb, {
                priceEth: finalPrice,
                due: finalDue,
            });
        } else {
            addRawTodo({
                text: p.text || t,
                due: finalDue,
                priceEth: finalPrice,
                priority: finalPriority,
                labels: p.labels,
                recurrence: p.recurrence,
            });
        }
        setText('');
        setDue('');
        setPrice('');
        setPriority(0);
        setComposeOpen(false);
        showToast('To-Do: ADDED');
    };

    const onToggle = (e: React.MouseEvent, t: TodoItem) => {
        stop(e);
        const r = toggleTodo(t.id);
        showToast(r === 'recurred' ? 'To-Do: RESCHEDULED' : r === 'reopened' ? 'To-Do: REOPENED' : 'To-Do: DONE');
    };
    const onDelete = (e: React.MouseEvent, t: TodoItem) => {
        stop(e);
        removeTodo(t.id);
        showToast('To-Do: DELETED');
    };

    return (
        <AccordionBox
            boxId="todosBox"
            listId="todosList"
            open={notifs.todos}
            onHeaderClick={() => setAccordion('todos', !notifs.todos)}
            header={
                <span className="todos-header-row">
                    <span>
                        TO-DOS <span className="notif-count">({openCount})</span>
                    </span>
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
                    <input
                        className="todo-compose-input"
                        type="text"
                        placeholder="Add a to-do…  (try: buy prisms 22 under .4 fri)"
                        value={text}
                        maxLength={200}
                        autoFocus
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                submit();
                            }
                        }}
                    />
                    <div className="todo-compose-row">
                        <input
                            className="todo-mini todo-mini-date"
                            type="date"
                            value={due}
                            title="Due date"
                            onChange={(e) => setDue(e.target.value)}
                        />
                        <span className="todo-mini todo-price-wrap" title="ETH target / budget">
                            <span className="eth-mark">◊</span>
                            <input
                                className="todo-price-input"
                                type="text"
                                inputMode="decimal"
                                placeholder="0.0"
                                value={price}
                                onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                            />
                        </span>
                        <button
                            type="button"
                            className={`todo-mini todo-pri-btn${priority > 0 ? ` on p${priority}` : ''}`}
                            title="Priority"
                            onClick={cyclePriority}
                        >
                            {priority === 0 ? '! P' : `P${priority}`}
                        </button>
                        <button
                            type="button"
                            className="todo-add"
                            disabled={!text.trim()}
                            onClick={submit}
                        >
                            Add
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
                const p1 = t.priority === 1 && !t.done;
                const href =
                    t.kind === 'output' && t.source
                        ? `/art/${t.source.slug}/${t.source.tokenId}`
                        : null;
                const title = (
                    <span className="todo-title">
                        {t.text}
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
                            {href ? (
                                <a className="todo-link" href={href} onClick={stop}>
                                    {title}
                                </a>
                            ) : (
                                title
                            )}
                            {hasChips ? (
                                <span className="todo-chips">
                                    {t.due && <span className="todo-chip">{fmtDue(t.due)}</span>}
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
        </AccordionBox>
    );
}
