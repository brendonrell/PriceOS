'use client';

/*
 * TodoVerbBubble — the Create-To-Do card: pick the due date, the reminder time
 * and the priority, then pick the verb. Anchored on whatever pill opened it.
 *
 * Lifted out of OutputPreview 2026-07-31 unchanged, so the output page's ❍ runs
 * the SAME card the artwork modal runs rather than a lookalike (Rule #0) — the
 * same lift TailBubble had the same day. Nothing about its behaviour moved with
 * it: same chips, same four verbs, same toasts, same dismiss.
 */

import { useState } from 'react';
import TailBubble, { type BubbleAnchor } from './TailBubble';
import { addOutputTodo, type TodoVerb, type TodoPriority } from '../../lib/todos/todoStore';
import { useToast } from '../../lib/state/ToastContext';

/* Short due-date label for the composer chip — "2026-07-10" → "Jul 10"
   (the same shape TodosBox uses). */
const TODO_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtTodoDue(due: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(due);
    if (!m) return due;
    return `${TODO_MONTHS[Number(m[2]) - 1] ?? ''} ${Number(m[3])}`;
}

/* The four verbs a piece can carry. BUY and OFFER are what you want on someone
   else's; LIST and SEND are what you want on your own — which is why an owner
   gets the card rather than a dead pill (Brendon, 2026-07-31). */
const VERBS: TodoVerb[] = ['BUY', 'OFFER', 'LIST', 'SEND'];

export default function TodoVerbBubble({
    anchor,
    slug,
    id,
    title,
    onDismiss,
}: {
    anchor: BubbleAnchor;
    slug: string;
    id: number;
    /** The piece's name, shown in the question line. */
    title: string;
    onDismiss: () => void;
}) {
    const { showToast } = useToast();
    /* Each open starts the selectors fresh — the card is mounted by its opener
       (Brendon 2026-07-23: give them the option, don't auto-guess). */
    const [due, setDue] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [priority, setPriority] = useState<TodoPriority>(0);

    const add = (verb: TodoVerb) => {
        const r = addOutputTodo(slug, id, verb, {
            due: due || null,
            dueTime: due ? (dueTime || null) : null,
            priority,
        });
        onDismiss();
        showToast(r === 'exists' ? 'To-Do: ALREADY ADDED' : 'To-Do: ADDED');
    };

    return (
        <TailBubble anchor={anchor} className="todo-verb-card" onDismiss={onDismiss} dismissOnScroll={false}>
            <div className="ms-confirm-question">
                Create <u>To-Do</u> for{' '}
                <em className="todo-verb-piece">{title.charAt(0) + title.slice(1).toLowerCase()} #{id}</em>
            </div>
            {/* Date / time / priority — the composer's own selectors (reused
                verbatim from TodosBox), sitting up top; the picked verb is
                filed with them (Brendon, 2026-07-23). */}
            <div className="todo-compose-row">
                <span className={`todo-chip todo-chip-due${due ? ' set' : ''}`}>
                    <label className="todo-chip-seg" title="Due date">
                        <span className="todo-chip-lbl">{due ? fmtTodoDue(due) : 'due'}</span>
                        <input
                            className="todo-chip-native"
                            type="date"
                            value={due}
                            onChange={(e) => setDue(e.target.value)}
                        />
                    </label>
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
                <button
                    type="button"
                    className={`todo-chip todo-chip-pri${priority > 0 ? ` on p${priority}` : ''}`}
                    title="Priority"
                    onClick={() => setPriority((p) => (((p + 1) % 4) as TodoPriority))}
                >
                    <span className="todo-chip-ico">!</span>
                    <span className="todo-chip-lbl">P{priority === 0 ? 1 : priority}</span>
                </button>
            </div>
            <div className="todo-verb-btns">
                {VERBS.map((v) => (
                    <button
                        key={v}
                        type="button"
                        className="todo-verb-btn"
                        onClick={() => add(v)}
                    >
                        {v}
                    </button>
                ))}
            </div>
        </TailBubble>
    );
}
