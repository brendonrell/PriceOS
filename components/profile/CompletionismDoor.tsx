'use client';

/*
 * CompletionismDoor — the owner's Outputs-Collected count, and the
 * COMPLETIONISM sheet it opens.
 *
 * ⛔ WHY THIS IS ITS OWN COMPONENT (Brendon, 2026-07-28: "the completionism and
 * profit pal etc style modal lags every time it opens... there's obviously a
 * build flaw"). The open flag used to be a `useState` at the top of
 * ProfilePageBody — the biggest component on the site. Flipping it re-rendered
 * the ENTIRE profile (hero, sticker layer, every tab, the whole collected grid
 * and its live art tiles) just to show one small sheet, and that render is the
 * hitch felt on every open. The flag now lives here, beside the one control
 * that sets it, so opening the sheet re-renders this trigger and nothing else.
 *
 * The count is handed in as a prop, so the page owns the number and this owns
 * only the door.
 */

import { useState } from 'react';
import CompletionismModal from '../CompletionismModal';

export default function CompletionismDoor({
    address,
    count,
}: {
    address: string;
    count: number;
}) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <span
                className="stat-val"
                role="button"
                tabIndex={0}
                title="Completionism"
                onClick={() => setOpen(true)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); }
                }}
            >
                {count}
            </span>
            <CompletionismModal
                address={address}
                open={open}
                onClose={() => setOpen(false)}
            />
        </>
    );
}
