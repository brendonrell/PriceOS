'use client';

/*
 * NotesBox
 *
 * The Notes accordion. List items render their text raw — markdown
 * tokens (**bold**, _italic_, `code`) display as literal punctuation,
 * matching sim 4922–4951. Markdown resolution is reserved for the
 * NotePromptModal viewer + calendar day-note row (sim 5722 /
 * renderNoteMarkdown). Header click toggles open; opening closes Todos
 * and Tape.
 *
 * D013 (chat #5 — Notes feature parity, sim 4922-4951 + 6598-6603):
 * each list item's onClick wires to NotePromptContext's token-kind
 * branch via openTokenNoteEditor(numericId, MOCK_DEMO_NOTES[id]).
 *
 *   1. The list-item id-string '#22' is parsed to its numeric form 22.
 *   2. MOCK_DEMO_NOTES[22] (the longer expanded body) is passed as the
 *      prepopulate argument so a first-open from the list shows view-
 *      mode with the saved markdown rendered, matching sim 6601:
 *        if (!tokenNotes[id] && demoNotes[id]) tokenNotes[id] = demoNotes[id];
 *      Subsequent opens (after the demo text has been written to
 *      pd_token_notes) skip the seed because the existing-value guard
 *      inside openTokenNoteEditor short-circuits.
 *   3. e.stopPropagation prevents the click from bubbling up to the
 *      AccordionBox header (which would collapse the accordion).
 */

import { AccordionBox } from './AccordionBox';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useNotePrompt } from '../../lib/state/NotePromptContext';
import { MOCK_NOTES, MOCK_DEMO_NOTES } from '../../lib/data/mockNotes';

export function NotesBox() {
    const { notifs, setAccordion } = usePdNotifs();
    const { openTokenNoteEditor } = useNotePrompt();

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
            {MOCK_NOTES.map((n) => {
                /* Strip leading '#' from the list-item id string and
                   parseInt — mockNotes stores ids as '#22', sim's
                   demoNotes (now MOCK_DEMO_NOTES) is keyed by numeric
                   form 22. parseInt('#22', 10) returns NaN; slicing the
                   leading hash first fixes the parse. */
                const numericId = parseInt(n.id.replace(/^#/, ''), 10);
                const handleClick = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (Number.isNaN(numericId)) return;
                    openTokenNoteEditor(
                        numericId,
                        MOCK_DEMO_NOTES[numericId]
                    );
                };
                return (
                    <div
                        key={n.id}
                        className="notif-item"
                        onClick={handleClick}
                        role="button"
                        tabIndex={0}
                    >
                        <span className="n-icon">{n.icon}</span>
                        <span>
                            {n.id} — {n.text}
                        </span>
                    </div>
                );
            })}
        </AccordionBox>
    );
}
