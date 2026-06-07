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
 * each list item's onClick wires to NotePromptContext's output-kind
 * branch via openOutputNoteEditor(numericId, MOCK_DEMO_NOTES[id]).
 *
 *   1. The list-item id-string '#22' is parsed to its numeric form 22.
 *   2. MOCK_DEMO_NOTES[22] (the longer expanded body) is passed as the
 *      prepopulate argument so a first-open from the list shows view-
 *      mode with the saved markdown rendered, matching sim 6601:
 *        if (!tokenNotes[id] && demoNotes[id]) tokenNotes[id] = demoNotes[id];
 *      Subsequent opens (after the demo text has been written to
 *      pd_token_notes) skip the seed because the existing-value guard
 *      inside openOutputNoteEditor short-circuits.
 *   3. e.stopPropagation prevents the click from bubbling up to the
 *      AccordionBox header (which would collapse the accordion).
 *
 * Brendon item 18 (chat A) — NOT a sim port. Sim has no delete affordance
 * on the Notes list items. Brendon explicitly greenlit adding one because
 * "this is probably NOT sim parity but its the right time to fix it." Per-
 * row × button revealed on hover (kept out of the way at rest); persists
 * to localStorage `pd_notes_deleted` so the deletion survives reload.
 */

import { useEffect, useState } from 'react';
import { AccordionBox } from './AccordionBox';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useNotePrompt } from '../../lib/state/NotePromptContext';
import { useToast } from '../../lib/state/ToastContext';
import { MOCK_NOTES, MOCK_DEMO_NOTES } from '../../lib/data/mockNotes';

const DELETED_KEY = 'pd_notes_deleted';

export function NotesBox() {
    const { notifs, setAccordion } = usePdNotifs();
    const { openOutputNoteEditor } = useNotePrompt();
    const { showToast } = useToast();

    const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());

    useEffect(() => {
        try {
            const raw = localStorage.getItem(DELETED_KEY);
            if (!raw) return;
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) setDeletedIds(new Set(arr.map(String)));
        } catch {
            /* swallow */
        }
    }, []);

    const handleDelete = (e: React.MouseEvent, idStr: string) => {
        e.stopPropagation();
        setDeletedIds((prev) => {
            const next = new Set(prev);
            next.add(idStr);
            try {
                localStorage.setItem(DELETED_KEY, JSON.stringify([...next]));
            } catch {
                /* swallow */
            }
            return next;
        });
        showToast(`Note ${idStr} Deleted`);
    };

    const visible = MOCK_NOTES.filter((n) => !deletedIds.has(n.id));

    return (
        <AccordionBox
            boxId="notesBox"
            listId="notesList"
            open={notifs.notes}
            onHeaderClick={() => setAccordion('notes', !notifs.notes)}
            header={
                <>
                    NOTES
                    <span className="notif-count">({visible.length})</span>
                </>
            }
        >
            {visible.map((n) => {
                /* Strip leading '#' from the list-item id string and
                   parseInt — mockNotes stores ids as '#22', sim's
                   demoNotes (now MOCK_DEMO_NOTES) is keyed by numeric
                   form 22. parseInt('#22', 10) returns NaN; slicing the
                   leading hash first fixes the parse. */
                const numericId = parseInt(n.id.replace(/^#/, ''), 10);
                const handleClick = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (Number.isNaN(numericId)) return;
                    openOutputNoteEditor(
                        numericId,
                        MOCK_DEMO_NOTES[numericId]
                    );
                };
                return (
                    <div
                        key={n.id}
                        className="notif-item notif-item-deletable"
                        onClick={handleClick}
                        role="button"
                        tabIndex={0}
                    >
                        <span className="n-icon">{n.icon}</span>
                        <span className="notif-item-body">
                            {n.id} — {n.text}
                        </span>
                        <span
                            className="notif-item-delete"
                            role="button"
                            tabIndex={0}
                            title="Delete note"
                            onClick={(e) => handleDelete(e, n.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDelete(
                                        e as unknown as React.MouseEvent,
                                        n.id
                                    );
                                }
                            }}
                        >
                            {'\u00D7\uFE0E'}
                        </span>
                    </div>
                );
            })}
        </AccordionBox>
    );
}
