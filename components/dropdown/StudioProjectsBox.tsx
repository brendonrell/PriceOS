'use client';

/*
 * StudioProjectsBox — PD Studio's Projects accordion. On /studio the connect
 * menu is the artist dashboard: this box takes the Notes slot ("instead of
 * notes we have projects in the accordion" — Brendon, 2026-07-10), same
 * AccordionBox shape, same accordion state key, artist content. Rows are the
 * wallet's drafts + deployed Projects from the Studio store; tapping one
 * returns to the workbench.
 *
 * Glyph: ⌗ = projects (docs/GLYPHS.md §nav) — canonical, not invented.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AccordionBox } from './AccordionBox';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { loadDrafts, type StudioDraft } from '../../lib/studio/drafts';

const PROJECT_ICON = '⌗︎';

export function StudioProjectsBox() {
    const { notifs, setAccordion } = usePdNotifs();
    const router = useRouter();

    const [drafts, setDrafts] = useState<StudioDraft[]>([]);
    useEffect(() => {
        const read = () => setDrafts(loadDrafts());
        read();
        window.addEventListener('storage', read);
        return () => window.removeEventListener('storage', read);
    }, []);

    return (
        <AccordionBox
            boxId="notesBox"
            listId="studioProjectsList"
            open={notifs.notes}
            onHeaderClick={() => setAccordion('notes', !notifs.notes)}
            header={
                <>
                    PROJECTS
                    <span className="notif-count">({drafts.length})</span>
                </>
            }
        >
            {drafts.map((d) => (
                <div
                    key={d.id}
                    className="notif-item"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                        e.stopPropagation();
                        router.push('/studio');
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') router.push('/studio');
                    }}
                >
                    <span className="n-icon">{PROJECT_ICON}</span>
                    <span className="notif-item-body">
                        {(d.name.trim() || 'Untitled').toUpperCase()} —{' '}
                        {d.deployed
                            ? 'LIVE'
                            : d.runs.length
                              ? `${d.runs.length} test run${d.runs.length === 1 ? '' : 's'}`
                              : 'DRAFT'}
                    </span>
                </div>
            ))}
        </AccordionBox>
    );
}
