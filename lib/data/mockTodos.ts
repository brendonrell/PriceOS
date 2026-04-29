/*
 * Mock To-Dos — 5 entries matching the sim's todos-list defaults.
 * Action verbs are bolded in the rendered row to read as imperative
 * checklist items.
 */

export interface TodoItem {
    id: string;
    icon: string;        // ❍ glyph with VS-15
    action: string;      // "BUY" / "OFFER" / "LIST" / "DELIST" / "SEND"
    target: string;      // "KIKI #22" / "Strata #37" etc.
    date: string;        // formatted as "Sep 22"
}

export const MOCK_TODOS: TodoItem[] = [
    { id: 't1', icon: '❍\uFE0E', action: 'BUY',    target: 'KIKI #22',          date: 'Sep 22' },
    { id: 't2', icon: '❍\uFE0E', action: 'OFFER',  target: 'Strata #37',        date: 'Apr 14' },
    { id: 't3', icon: '❍\uFE0E', action: 'LIST',   target: 'KIKI #147, #203',   date: 'May 01' },
    { id: 't4', icon: '❍\uFE0E', action: 'DELIST', target: 'KIKI #88',          date: 'Apr 20' },
    { id: 't5', icon: '❍\uFE0E', action: 'SEND',   target: 'KIKI #500 → @matty', date: 'Jun 15' },
];
