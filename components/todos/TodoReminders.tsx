'use client';

/*
 * TodoReminders — the in-app due-reminder watcher (app-open path).
 *
 * Mounted once at the shell so it fires regardless of whether the connect menu
 * is open. Every 30s (and on any to-do change) it looks for OPEN dated to-dos
 * whose due moment has arrived and that haven't been reminded yet, and pops a
 * Pingtoast. Each (id @ due) is reminded once — stored in localStorage so a
 * reload doesn't re-nag, and a recurring to-do re-reminds on its NEW date.
 *
 * NOTE: this is the app-OPEN reminder. Native closed-app reminders ride the
 * existing web-push pipeline (public/sw.js + lib/push/*), which is code-complete
 * but inert until VAPID keys are provisioned + a scheduled sender is wired.
 */

import { useEffect, useRef } from 'react';
import { useToast } from '../../lib/state/ToastContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { getTodos, subscribeTodos, type TodoItem } from '../../lib/todos/todoStore';

const REMINDED_KEY = 'pd_todo_reminded';

function readReminded(): Set<string> {
    try {
        const raw = localStorage.getItem(REMINDED_KEY);
        const arr = raw ? (JSON.parse(raw) as unknown) : [];
        return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []);
    } catch {
        return new Set();
    }
}
function writeReminded(set: Set<string>): void {
    try {
        // Cap so the ledger can't grow unbounded.
        const arr = Array.from(set).slice(-500);
        localStorage.setItem(REMINDED_KEY, JSON.stringify(arr));
    } catch {
        /* ignore */
    }
}

/** Due epoch for a to-do: its date at 00:00, or the HH:MM if dueTime parses. */
function dueEpoch(t: TodoItem): number | null {
    if (!t.due) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t.due);
    if (!m) return null;
    let h = 0;
    let min = 0;
    const tm = t.dueTime && /^(\d{1,2}):(\d{2})$/.exec(t.dueTime);
    if (tm) {
        h = Math.min(23, Number(tm[1]));
        min = Math.min(59, Number(tm[2]));
    }
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), h, min).getTime();
}

export default function TodoReminders() {
    const { showToast } = useToast();
    const { notifs } = usePdNotifs();
    const firstRunRef = useRef(true);

    /* The in-app reminder is a Pingtoast, so it obeys the Pingtoasts mode:
       ON / COMBO → toast; 3D → native-only (the closed-app sweep covers it —
       an in-app toast in 3D was the 2026-07-10 bug); OFF → silent. Read via
       ref so the 30s poll always sees the current mode without re-arming. */
    const modeRef = useRef(notifs.pingToasts);
    modeRef.current = notifs.pingToasts;

    useEffect(() => {
        let timer: ReturnType<typeof setInterval> | null = null;

        const check = () => {
            const now = Date.now();
            const reminded = readReminded();
            const dueNow: TodoItem[] = [];
            for (const t of getTodos()) {
                if (t.done || !t.due) continue;
                const e = dueEpoch(t);
                if (e == null || e > now) continue;
                const key = `${t.id}@${t.due}`;
                if (reminded.has(key)) continue;
                reminded.add(key);
                dueNow.push(t);
            }
            if (dueNow.length === 0) return;
            writeReminded(reminded);
            // Mode gate — the due ledger above still advances in every mode so
            // switching modes later never replays old reminders.
            if (modeRef.current !== 'on' && modeRef.current !== 'combo') return;
            // On the first sweep after load, collapse a backlog into one toast so
            // opening the app with several overdue items doesn't spam.
            if (firstRunRef.current && dueNow.length > 1) {
                showToast(`To-Dos: ${dueNow.length} DUE`);
            } else {
                for (const t of dueNow) showToast(`To-Do DUE: ${t.text}`);
            }
        };

        // Initial sweep shortly after mount (let hydration settle), then poll.
        const kick = setTimeout(() => {
            check();
            firstRunRef.current = false;
            timer = setInterval(check, 30_000);
        }, 1500);

        // Re-check when the list changes (add / complete / edit).
        const unsub = subscribeTodos(() => {
            if (!firstRunRef.current) check();
        });

        return () => {
            clearTimeout(kick);
            if (timer) clearInterval(timer);
            unsub();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}
