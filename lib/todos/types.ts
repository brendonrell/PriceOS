/*
 * To-Do types — the real To-Dos feature (replaces the old mock rows).
 *
 * Leaf module: NO imports, so both the store (lib/todos/todoStore) and the
 * account-settings envelope (lib/supabase UserSettings) can depend on it
 * without a cycle.
 *
 * A to-do is EITHER:
 *   - `raw`    — a freeform user task ("Renew ENS"), optionally with a due
 *                date, a priority, and an ETH target/budget.
 *   - `output` — a market action bound to a piece ("BUY PRISMS #22"), created
 *                from the artwork "Make To-Do" button. Carries `source` so the
 *                row can deep-link to the piece and the Sentinel can watch its
 *                price.
 */

/** Market-action verbs for output to-dos — the existing tape/mock vocabulary. */
export type TodoVerb = 'BUY' | 'OFFER' | 'LIST' | 'DELIST' | 'SEND';

/** 0 = none · 1 = P1 (top) · 2 = P2 · 3 = P3. Lower non-zero sorts higher. */
export type TodoPriority = 0 | 1 | 2 | 3;

export interface TodoSource {
    slug: string;
    tokenId: number;
    verb: TodoVerb;
}

export interface TodoItem {
    id: string;
    kind: 'raw' | 'output';
    /** Rendered label. For output to-dos this is the composed "VERB Name #id"
     *  captured at creation; the row re-derives the name live when it can. */
    text: string;
    source?: TodoSource;
    /** Due day as 'YYYY-MM-DD', or null/absent = dateless (list-only). */
    due?: string | null;
    /** Optional time-of-day label, e.g. '22:00'. Freeform, display-only. */
    dueTime?: string | null;
    priority: TodoPriority;
    /** Optional ETH target/budget the collector attaches. Powers the war-chest
     *  meter and, for BUY output to-dos, the Sentinel READY flip. */
    priceEth?: number | null;
    done: boolean;
    createdAt: number;
}
