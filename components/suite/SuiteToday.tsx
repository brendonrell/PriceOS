'use client';

/*
 * SuiteToday — the Suite's landing dashboard (Brendon, 2026-07-27: "your
 * chance to put something special in PriceOS"). Fantastical grammar, PD
 * body: the week strip rides along the top — today wears the dotted ring
 * (PD's own active mark) — and the day's work sits underneath: today's
 * dated to-dos (tap the box to complete, right here), what's up next, and
 * the live pulse tiles (war chest · armed workflows · active budget).
 *
 * Every number is read from the REAL stores the other tabs run on —
 * nothing mocked, nothing duplicated. Tapping a day opens PriceCal;
 * tapping a tile opens its app.
 */

import { useEffect, useMemo, useState } from 'react';
import {
    getTodos,
    subscribeTodos,
    toggleTodo,
    sortTodos,
    warChest,
    datedTodosByDay,
    type TodoItem,
} from '../../lib/todos/todoStore';
import { getWorkflows, subscribeWorkflows } from '../../lib/workflows/store';
import { getBudgets, subscribeBudgets, type BudgetsState } from '../../lib/engines/budgetEngine';
import { formatEth } from '../../lib/format/eth';
import { renderMentions } from '../../lib/mentions/render';
import { useToast } from '../../lib/state/ToastContext';
import { usePings } from '../../lib/state/PingsContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useModal } from '../../lib/state/ModalContext';
import { renderPing, passesCategoryPrefs, pingHref, type RenderKind } from '../../lib/pings/render';

const VS15 = '︎';
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export type SuiteAppKey = 'today' | 'cal' | 'task' | 'flow' | 'books' | 'calc' | 'calm' | 'phone' | 'notes';

function dayKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ── PINGS ON TODAY, AND NOWHERE ELSE IN THE SUITE (Brendon, 2026-07-28).
   The inbox is the dashboard's news, not its own app — so it lives here with
   a filter row across the ping types. The buckets are the ping kinds
   themselves, grouped the way a person reads them; the rows, icons and
   category prefs are the real Pings box's (Rule #0), never a second inbox. */
type PingFilter = 'all' | 'market' | 'social' | 'wins' | 'reminders';

const PING_FILTERS: { key: PingFilter; label: string }[] = [
    { key: 'all', label: 'ALL' },
    { key: 'market', label: 'MARKET' },
    { key: 'social', label: 'SOCIAL' },
    { key: 'wins', label: 'ACHIEVEMENTS' },
    { key: 'reminders', label: 'REMINDERS' },
];

const MARKET_KINDS = new Set<RenderKind>([
    'MINT', 'SALE', 'LIST', 'OFFER', 'OFFER_ACCEPTED', 'COUNTER',
    'XFER', 'WISHLIST_HIT', 'TRADE', 'TRADE_ACCEPTED', 'TRADE_DECLINED',
]);
const SOCIAL_KINDS = new Set<RenderKind>([
    'FOLLOW', 'PROJECT_FOLLOW', 'OUTPUT_FOLLOW', 'WATCH_HIT',
]);
const WIN_KINDS = new Set<RenderKind>(['ACHIEVEMENT', 'STREAK']);

function inFilter(kind: RenderKind, f: PingFilter): boolean {
    switch (f) {
        case 'all': return true;
        case 'market': return MARKET_KINDS.has(kind);
        case 'social': return SOCIAL_KINDS.has(kind);
        case 'wins': return WIN_KINDS.has(kind);
        case 'reminders': return kind === 'PING';
    }
}

export default function SuiteToday({ openApp }: { openApp: (app: SuiteAppKey) => void }) {
    const { showToast } = useToast();

    const [todos, setTodos] = useState<TodoItem[]>([]);
    useEffect(() => {
        const read = () => setTodos(getTodos());
        read();
        return subscribeTodos(read);
    }, []);

    const [armed, setArmed] = useState(0);
    useEffect(() => {
        const read = () => setArmed(getWorkflows().filter((w) => w.firedAt == null).length);
        read();
        return subscribeWorkflows(read);
    }, []);

    const [budgets, setBudgets] = useState<BudgetsState>({ list: [], activeIdx: -1 });
    useEffect(() => {
        setBudgets(getBudgets());
        return subscribeBudgets(setBudgets);
    }, []);

    /* The real inbox, read through the user's own category prefs — the same
       list the Pings box shows, filtered by the row of type chips. */
    const { state: pingsState, refresh: refreshPings } = usePings();
    const { notifs } = usePdNotifs();
    const { open: openModal } = useModal();
    const [pingFilter, setPingFilter] = useState<PingFilter>('all');

    useEffect(() => { refreshPings(); }, [refreshPings]);

    const allowedPings = useMemo(
        () => pingsState.items.filter((p) => passesCategoryPrefs(p, notifs.pings)),
        [pingsState.items, notifs.pings],
    );
    const pings = useMemo(
        () => allowedPings
            .filter((p) => inFilter(p.kind, pingFilter))
            .map((p) => ({ ...renderPing(p), href: pingHref(p) }))
            /* Unread first, then the app's own newest-first order. */
            .sort((a, b) => (a.read ? 1 : 0) - (b.read ? 1 : 0))
            .slice(0, 12),
        [allowedPings, pingFilter],
    );
    const pingUnread = allowedPings.filter((p) => !p.read).length;

    const byDay = useMemo(() => datedTodosByDay(todos), [todos]);

    /* The strip: today + the six days ahead (the Fantastical week). */
    const week = useMemo(() => {
        const now = new Date();
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
            const k = dayKey(d);
            return {
                k,
                dow: DOW[d.getDay()],
                num: d.getDate(),
                month: MONTHS[d.getMonth()],
                open: (byDay[k] ?? []).filter((t) => !t.done).length,
                isToday: i === 0,
            };
        });
    }, [byDay]);

    const todayK = week[0].k;
    const todayList = useMemo(
        () => sortTodos(byDay[todayK] ?? []),
        [byDay, todayK],
    );
    /* Up next — open work beyond today, the store's own order (priority →
       due → newest), capped so the dashboard stays a glance. */
    const upNext = useMemo(
        () => sortTodos(todos).filter((t) => !t.done && t.due !== todayK).slice(0, 5),
        [todos, todayK],
    );
    const chest = warChest(todos);
    const activeBudget = budgets.activeIdx >= 0 ? budgets.list[budgets.activeIdx] : null;

    const onToggle = (t: TodoItem) => {
        const r = toggleTodo(t.id);
        showToast(r === 'recurred' ? 'To-Do: RESCHEDULED' : r === 'reopened' ? 'To-Do: REOPENED' : 'To-Do: DONE');
    };

    const row = (t: TodoItem) => (
        <div key={t.id} className={`suite-td-row${t.done ? ' done' : ''}`}>
            <span
                className="todo-box"
                role="button"
                tabIndex={0}
                title={t.done ? 'Reopen' : 'Complete'}
                onClick={() => onToggle(t)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(t); } }}
            >
                {t.done ? `✓${VS15}` : `❍${VS15}`}
            </span>
            <span className="suite-td-text">{t.kind === 'output' ? t.text : renderMentions(t.text)}</span>
            <span className="suite-td-meta">
                {t.dueTime ? t.dueTime : t.due && t.due !== todayK ? t.due.slice(5).replace('-', '/') : ''}
                {t.priceEth ? <span className="suite-td-eth"><span className="eth-mark">◊</span>{formatEth(t.priceEth)}</span> : null}
            </span>
        </div>
    );

    return (
        <div className="suite-today">
            {/* ── the week, Fantastical-style — today wears the dotted ring ── */}
            <div className="suite-week" role="group" aria-label="This week">
                {week.map((d) => (
                    <button
                        key={d.k}
                        type="button"
                        className={`suite-day${d.isToday ? ' today' : ''}`}
                        title={`${d.dow} ${d.month} ${d.num}`}
                        onClick={() => openApp('cal')}
                    >
                        <span className="suite-day-dow">{d.isToday ? 'TODAY' : d.dow}</span>
                        <span className="suite-day-num">{d.num}</span>
                        <span className={`suite-day-count${d.open > 0 ? ' has' : ''}`}>
                            {d.open > 0 ? `❍${VS15}${d.open}` : '·'}
                        </span>
                    </button>
                ))}
            </div>

            {/* ── today's work ── */}
            <div className="suite-td-head">
                TODAY <span className="notif-count">({todayList.filter((t) => !t.done).length})</span>
            </div>
            {todayList.length === 0 ? (
                <div className="todo-empty">Nothing due today.</div>
            ) : (
                todayList.map(row)
            )}

            {upNext.length > 0 && (
                <>
                    <div className="suite-td-head">UP NEXT</div>
                    {upNext.map(row)}
                </>
            )}

            {/* ── PINGS — the inbox, only here (Brendon, 2026-07-28) ── */}
            <div className="suite-td-head">
                PINGS {pingUnread > 0 && <span className="notif-count">({pingUnread})</span>}
            </div>
            <div className="suite-ping-filters" role="group" aria-label="Ping types">
                {PING_FILTERS.map((f) => (
                    <button
                        key={f.key}
                        type="button"
                        className={`suite-ping-chip${pingFilter === f.key ? ' on' : ''}`}
                        aria-pressed={pingFilter === f.key}
                        onClick={() => setPingFilter(f.key)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>
            {pings.length === 0 ? (
                <div className="todo-empty">Nothing here yet.</div>
            ) : (
                pings.map((p) => {
                    const body = (
                        <>
                            <span className={`n-icon ping-ic ping-ic--${p.kind}`}>{p.icon}</span>
                            <span>
                                {p.handle && <strong>{p.handle}</strong>}
                                {p.handle ? ' ' : ''}
                                {p.action}
                            </span>
                        </>
                    );
                    const cls = `notif-item suite-ping-row${p.read ? ' read' : ''}${p.priority === 'high' ? ' notif-item--high' : ''}${p.priority === 'low' ? ' notif-item--low' : ''}`;
                    return p.href ? (
                        <a key={p.id} href={p.href} className={`${cls} notif-item--link`}>{body}</a>
                    ) : (
                        <div
                            key={p.id}
                            className={`${cls} notif-item--link`}
                            role="button"
                            tabIndex={0}
                            onClick={() => openModal('ping', p.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal('ping', p.id); } }}
                        >{body}</div>
                    );
                })
            )}

            {/* ── the pulse — live numbers, each tile a door to its app ── */}
            <div className="suite-pulse">
                {chest.count > 0 && (
                    <button type="button" className="suite-tile" onClick={() => openApp('task')}>
                        <span className="suite-tile-num"><span className="eth-mark">◊</span>{formatEth(chest.total)}</span>
                        <span className="suite-tile-lbl">EARMARKED · {chest.count}</span>
                    </button>
                )}
                <button type="button" className="suite-tile" onClick={() => openApp('flow')}>
                    <span className="suite-tile-num">{`☇${VS15}`}{armed}</span>
                    <span className="suite-tile-lbl">ARMED</span>
                </button>
                <button type="button" className="suite-tile" onClick={() => openApp('books')}>
                    {activeBudget ? (
                        <>
                            <span className="suite-tile-num"><span className="eth-mark">◊</span>{formatEth(activeBudget.eth)}</span>
                            <span className="suite-tile-lbl">{activeBudget.name.toUpperCase()}</span>
                        </>
                    ) : (
                        <>
                            <span className="suite-tile-num"><span className="eth-mark">◊</span>—</span>
                            <span className="suite-tile-lbl">NO BUDGET</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
