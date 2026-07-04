/*
 * todoStore — the ONE real store behind every To-Dos surface (the connect-menu
 * accordion, the calendar overlay, and the artwork "Make To-Do" button).
 *
 * Mirrors the Notes/starred pattern verbatim (Rule #0 — reuse, never reinvent):
 *   - localStorage key `pd_todos` (an array of TodoItem)
 *   - a bare `pd:todos-changed` event + the native `storage` event so every
 *     mounted surface re-reads on any mutation, cross-tab included
 *   - account write-through via pushSettings({ todos }) so the list follows the
 *     user across devices; the server snapshot wins on USERSTATE_HYDRATED_EVENT
 *     (userState seeds `pd_todos` from the row, then fires the event we re-read).
 *
 * All reads/writes are SSR-safe (guarded on `window`).
 */

import { pushSettings, USERSTATE_HYDRATED_EVENT } from '../state/userState';
import { getProject } from '../project/registry';
import type { TodoItem, TodoVerb, TodoPriority, TodoRecurrence } from './types';

export type { TodoItem, TodoVerb, TodoPriority, TodoRecurrence } from './types';

const KEY = 'pd_todos';
export const TODOS_CHANGED_EVENT = 'pd:todos-changed';

let _idSeq = 0;
function newId(): string {
    _idSeq += 1;
    return `t_${Date.now().toString(36)}_${_idSeq.toString(36)}`;
}

function safeParse(raw: string | null): TodoItem[] {
    if (!raw) return [];
    try {
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return [];
        // Tolerate partial/legacy rows — coerce to a valid TodoItem shape.
        return arr
            .filter((t) => t && typeof t === 'object' && typeof t.id === 'string')
            .map((t) => ({
                id: String(t.id),
                kind: t.kind === 'output' ? 'output' : 'raw',
                text: typeof t.text === 'string' ? t.text : '',
                source: t.source && typeof t.source === 'object' ? t.source : undefined,
                due: typeof t.due === 'string' ? t.due : null,
                dueTime: typeof t.dueTime === 'string' ? t.dueTime : null,
                priority: ([0, 1, 2, 3] as number[]).includes(t.priority) ? t.priority : 0,
                priceEth: typeof t.priceEth === 'number' && t.priceEth > 0 ? t.priceEth : null,
                labels: Array.isArray(t.labels)
                    ? t.labels.filter((x: unknown): x is string => typeof x === 'string')
                    : undefined,
                recurrence: (['daily', 'weekly', 'monthly'] as unknown[]).includes(t.recurrence)
                    ? t.recurrence
                    : null,
                done: !!t.done,
                createdAt: typeof t.createdAt === 'number' ? t.createdAt : 0,
            })) as TodoItem[];
    } catch {
        return [];
    }
}

export function getTodos(): TodoItem[] {
    if (typeof window === 'undefined') return [];
    return safeParse(localStorage.getItem(KEY));
}

function commit(next: TodoItem[]): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
        /* quota / private mode — ignore */
    }
    // Account write-through (fire-and-forget; no-op until the account hydrates).
    try {
        pushSettings({ todos: next });
    } catch {
        /* never let a sync failure break a local write */
    }
    window.dispatchEvent(new Event(TODOS_CHANGED_EVENT));
}

/** Subscribe to every change (local mutation, cross-tab storage, account
 *  hydrate). Returns an unsubscribe. Fires the callback immediately? No — the
 *  caller seeds initial state from getTodos(); this only wires the listeners. */
export function subscribeTodos(cb: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(TODOS_CHANGED_EVENT, cb);
    window.addEventListener('storage', cb);
    window.addEventListener(USERSTATE_HYDRATED_EVENT, cb);
    return () => {
        window.removeEventListener(TODOS_CHANGED_EVENT, cb);
        window.removeEventListener('storage', cb);
        window.removeEventListener(USERSTATE_HYDRATED_EVENT, cb);
    };
}

// ── mutations ───────────────────────────────────────────────

export interface RawTodoInput {
    text: string;
    due?: string | null;
    dueTime?: string | null;
    priority?: TodoPriority;
    priceEth?: number | null;
    labels?: string[];
    recurrence?: TodoRecurrence | null;
}

export function addRawTodo(input: RawTodoInput): TodoItem | null {
    const text = input.text.trim();
    if (!text) return null;
    const labels = (input.labels ?? []).map((l) => l.toLowerCase()).filter(Boolean);
    const item: TodoItem = {
        id: newId(),
        kind: 'raw',
        text,
        due: input.due || null,
        dueTime: input.dueTime || null,
        priority: input.priority ?? 0,
        priceEth: typeof input.priceEth === 'number' && input.priceEth > 0 ? input.priceEth : null,
        labels: labels.length ? labels : undefined,
        recurrence: input.recurrence ?? null,
        done: false,
        createdAt: Date.now(),
    };
    commit([item, ...getTodos()]);
    return item;
}

/** Advance a 'YYYY-MM-DD' date to the next occurrence for a recurrence. */
export function advanceDue(due: string, rec: TodoRecurrence): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(due);
    if (!m) return due;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (rec === 'daily') d.setDate(d.getDate() + 1);
    else if (rec === 'weekly') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1); // monthly
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
}

/** Compose the display label for an output to-do from its source, e.g.
 *  { verb:'BUY', slug:'prisms', tokenId:22 } → "BUY PRISMS #22". Re-derivable
 *  so a renamed project stays correct. */
export function outputLabel(verb: TodoVerb, slug: string, tokenId: number): string {
    const name = getProject(slug)?.displayName ?? slug.toUpperCase();
    return `${verb} ${name} #${tokenId}`;
}

export type AddOutputResult = 'added' | 'exists';

/** Create (or find) an output to-do for a piece. Dedupes on
 *  slug+tokenId+verb among OPEN (not-done) to-dos so mashing the button doesn't
 *  pile up duplicates. */
export function addOutputTodo(
    slug: string,
    tokenId: number,
    verb: TodoVerb = 'BUY',
    opts?: { priceEth?: number | null; due?: string | null },
): AddOutputResult {
    const list = getTodos();
    const dupe = list.some(
        (t) =>
            !t.done &&
            t.kind === 'output' &&
            t.source?.slug === slug &&
            t.source?.tokenId === tokenId &&
            t.source?.verb === verb,
    );
    if (dupe) return 'exists';
    const item: TodoItem = {
        id: newId(),
        kind: 'output',
        text: outputLabel(verb, slug, tokenId),
        source: { slug, tokenId, verb },
        due: opts?.due ?? null,
        priority: 0,
        priceEth: typeof opts?.priceEth === 'number' && opts.priceEth > 0 ? opts.priceEth : null,
        done: false,
        createdAt: Date.now(),
    };
    commit([item, ...list]);
    return 'added';
}

/** Result of a toggle, so the UI can pick the right toast. */
export type ToggleResult = 'done' | 'reopened' | 'recurred';

/** Toggle done. A recurring dated to-do that's being COMPLETED instead advances
 *  to its next occurrence and stays open (Todoist behaviour). */
export function toggleTodo(id: string): ToggleResult {
    let result: ToggleResult = 'done';
    const next = getTodos().map((t) => {
        if (t.id !== id) return t;
        if (!t.done && t.recurrence && t.due) {
            result = 'recurred';
            return { ...t, due: advanceDue(t.due, t.recurrence) };
        }
        result = t.done ? 'reopened' : 'done';
        return { ...t, done: !t.done };
    });
    commit(next);
    return result;
}

export function removeTodo(id: string): void {
    commit(getTodos().filter((t) => t.id !== id));
}

export function updateTodo(id: string, patch: Partial<TodoItem>): void {
    commit(getTodos().map((t) => (t.id === id ? { ...t, ...patch, id: t.id } : t)));
}

// ── derived helpers ─────────────────────────────────────────

/** Priority sort rank: P1 (1) highest, none (0) sinks to the bottom. */
export function priorityRank(p: TodoPriority): number {
    return p === 0 ? 99 : p;
}

/** Open (not-done) to-dos sorted for display: priority, then due date (dated
 *  before dateless), then newest first. Done to-dos are handled separately (they
 *  sink + strike). */
export function sortTodos(list: TodoItem[]): TodoItem[] {
    return [...list].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        const pr = priorityRank(a.priority) - priorityRank(b.priority);
        if (pr !== 0) return pr;
        const ad = a.due || '9999-99-99';
        const bd = b.due || '9999-99-99';
        if (ad !== bd) return ad < bd ? -1 : 1;
        return b.createdAt - a.createdAt;
    });
}

/** War-chest: total ETH earmarked across OPEN priced to-dos, and the count. */
export function warChest(list: TodoItem[]): { total: number; count: number } {
    let total = 0;
    let count = 0;
    for (const t of list) {
        if (!t.done && typeof t.priceEth === 'number' && t.priceEth > 0) {
            total += t.priceEth;
            count += 1;
        }
    }
    return { total, count };
}

/** Distinct labels across all to-dos, sorted — for the accordion filter row. */
export function allLabels(list: TodoItem[]): string[] {
    const set = new Set<string>();
    for (const t of list) for (const l of t.labels ?? []) set.add(l);
    return Array.from(set).sort();
}

/** Dated OPEN to-dos grouped by 'YYYY-MM-DD' — for the calendar overlay. */
export function datedTodosByDay(list: TodoItem[]): Record<string, TodoItem[]> {
    const map: Record<string, TodoItem[]> = {};
    for (const t of list) {
        if (t.done || !t.due) continue;
        (map[t.due] ||= []).push(t);
    }
    return map;
}
