'use client';

/*
 * NotesBox
 *
 * The Notes accordion. Each item renders inline markdown (**bold**,
 * _italic_, `code`) via renderInlineMarkdown. Header click toggles
 * open; opening closes Todos and Tape.
 */

import { AccordionBox } from './AccordionBox';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { MOCK_NOTES } from '../../lib/data/mockNotes';
import { renderInlineMarkdown } from '../../lib/markdown';

export function NotesBox() {
    const { notifs, setAccordion } = usePdNotifs();

    return (
        <AccordionBox
            boxId="notesBox"
            listId="notesList"
            open={notifs.notes}
            onHeaderClick={() => setAccordion('notes', !notifs.notes)}
            header={
                <>
                    NOTES
                    <span className="notif-count">(22)</span>
                </>
            }
        >
            {MOCK_NOTES.map((n) => (
                <div key={n.id} className="notif-item">
                    <span className="n-icon">{n.icon}</span>
                    <span>
                        {n.id} — {renderInlineMarkdown(n.text)}
                    </span>
                </div>
            ))}
        </AccordionBox>
    );
}
