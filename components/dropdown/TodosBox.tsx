'use client';

/*
 * TodosBox
 *
 * The To-Dos accordion. Header click toggles. Opening closes Notes and
 * Tape via setAccordion's mutual exclusion.
 */

import { AccordionBox } from './AccordionBox';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { MOCK_TODOS } from '../../lib/data/mockTodos';

export function TodosBox() {
    const { notifs, setAccordion } = usePdNotifs();

    return (
        <AccordionBox
            boxId="todosBox"
            listId="todosList"
            open={notifs.todos}
            onHeaderClick={() => setAccordion('todos', !notifs.todos)}
            header={
                <>
                    TO-DOS
                    <span className="notif-count">(5)</span>
                </>
            }
        >
            {MOCK_TODOS.map((t) => (
                <div key={t.id} className="notif-item todo-item">
                    <span className="n-icon">{t.icon}</span>
                    <span>
                        <b>{t.action}</b> {t.target} · {t.date}
                    </span>
                </div>
            ))}
        </AccordionBox>
    );
}
