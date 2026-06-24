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

const NOTES_KEY = 'pd_token_notes';
const NOTE_ICON = '⊟︎';

interface SavedNote { id: string; numericId: number; text: string; }

/* Read the viewer's REAL saved notes from the same store the cards + modal use.
   No more demo/test notes — the list shows exactly what the user has written
   (Brendon 2026-06-24). */
function readNotes(): SavedNote[] {
    try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(NOTES_KEY) : null;
        const obj = raw ? (JSON.parse(raw) as Record<string, string>) : {};
        return Object.entries(obj)
            .filter(([, t]) => typeof t === 'string' && t.trim().length > 0)
            .map(([k, t]) => ({ id: `#${k}`, numericId: parseInt(k, 10), text: t }))
            .sort((a, b) => a.numericId - b.numericId);
    } catch {
        return [];
    }
}

export function NotesBox() {
    const { notifs, setAccordion } = usePdNotifs();
    const { openOutputNoteEditor } = useNotePrompt();
    const { showToast } = useToast();

    const [notes, setNotes] = useState<SavedNote[]>([]);
    useEffect(() => {
        const read = () => setNotes(readNotes());
        read();
        window.addEventListener('pd:notes-changed', read);
        window.addEventListener('storage', read);
        return () => {
            window.removeEventListener('pd:notes-changed', read);
            window.removeEventListener('storage', read);
        };
    }, []);

    const handleDelete = (e: React.MouseEvent, idStr: string, numericId: number) => {
        e.stopPropagation();
        try {
            const raw = localStorage.getItem(NOTES_KEY);
            const obj = raw ? (JSON.parse(raw) as Record<string, string>) : {};
            delete obj[String(numericId)];
            localStorage.setItem(NOTES_KEY, JSON.stringify(obj));
            window.dispatchEvent(new Event('pd:notes-changed'));
        } catch {
            /* swallow */
        }
        showToast(`Note ${idStr}: DELETED`);
    };

    const visible = notes;

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
                const handleClick = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (Number.isNaN(n.numericId)) return;
                    openOutputNoteEditor(n.numericId);
                };
                return (
                    <div
                        key={n.id}
                        className="notif-item notif-item-deletable"
                        onClick={handleClick}
                        role="button"
                        tabIndex={0}
                    >
                        <span className="n-icon">{NOTE_ICON}</span>
                        <span className="notif-item-body">
                            {n.id} — {n.text}
                        </span>
                        <span
                            className="notif-item-delete"
                            role="button"
                            tabIndex={0}
                            title="Delete note"
                            onClick={(e) => handleDelete(e, n.id, n.numericId)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDelete(
                                        e as unknown as React.MouseEvent,
                                        n.id,
                                        n.numericId
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
