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
    clearDoneTodos,
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

    // Deleting a to-do asks first — the same confirm card every destructive /
    // financial action uses (Brendon, 2026-07-05).
    const [confirm, setConfirm] = useState<{ question: string; onConfirm: () => void } | null>(null);

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
    const shown = activeLabel ? ordered.filter((t) => (t.labels ?? []).includes(activeLabel)) : ordered;

    const stop = (e: React.MouseEvent | React.KeyboardEvent) => e.stopPropagation();

    const openComposer = (e: React.MouseEvent) => {
        stop(e);
        if (!notifs.todos) setAccordion('todos', true);
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
            boxId="todosBox"
            listId="todosList"
            open={notifs.todos}
            onHeaderClick={() => setAccordion('todos', !notifs.todos)}
            header={
                <span className="todos-header-row">
                    <span>
                        TO-DOS <span className="notif-count">({openCount})</span>
                    </span>
                    {notifs.todos && (
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
                    <input
                        className="todo-compose-input"
                        type="text"
                        placeholder="Add a to-do…  (try: buy prisms 22 under .4 fri)"
                        value={text}
                        maxLength={200}
                        autoFocus
                        onChange={(e) => setText(e.target.value)}
                        onPaste={onPasteList}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                submit();
                            }
                        }}
                    />
                    <div className="todo-compose-row">
                        {/* Due chip — clock + label (or the picked date); the native
                            date picker sits transparent on top so the chip stays a
                            clean labeled pill. */}
                        <label className={`todo-chip todo-chip-due${due ? ' set' : ''}`} title="Due date">
                            <span className="todo-chip-ico">◷</span>
                            <span className="todo-chip-lbl">{due ? fmtDue(due) : 'due'}</span>
                            <input
                                className="todo-chip-native"
                                type="date"
                                value={due}
                                onChange={(e) => setDue(e.target.value)}
                            />
                        </label>
                        <span className={`todo-chip todo-chip-price${price ? ' set' : ''}`} title="ETH target / budget">
                            <span className="todo-chip-ico eth-mark">◊</span>
                            <input
                                className="todo-chip-price-input"
                                type="text"
                                inputMode="decimal"
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

            {confirm && (
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
                </div>
            )}
        </AccordionBox>
    );
}
