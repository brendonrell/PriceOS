'use client';

/*
 * NotesBox
 *
 * The Notes accordion. List items render their text raw — markdown
 * tokens (**bold**, _italic_, `code`) display as literal punctuation,
 * matching sim 4922–4951. Markdown resolution is reserved for the
 * NotePromptModal viewer + calendar day-note row (sim 5722 /
 * renderNoteMarkdown), neither of which is ported yet. Header click
 * toggles open; opening closes Todos and Tape.
 */

import { AccordionBox } from './AccordionBox';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { MOCK_NOTES } from '../../lib/data/mockNotes';

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
                        {n.id} — {n.text}
                    </span>
                </div>
            ))}
        </AccordionBox>
    );
}
