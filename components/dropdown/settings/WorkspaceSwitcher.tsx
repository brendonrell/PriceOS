'use client';

/*
 * WorkspaceSwitcher
 *
 * Sits at the bottom of the Settings panel — small dots representing
 * saved workspace profiles, plus a + to add a new one. Tapping a dot
 * activates that workspace. Long-press would open a popover for rename
 * / delete (deferred to step 5).
 *
 * Step 4 ships visual-only — three default dots (Default, Work, Play),
 * one active. Real workspace storage + the swap-pdNotifs-on-activate
 * behavior land alongside the spell behaviors that the workspaces are
 * designed to capture.
 */

import { useState } from 'react';

const DEFAULT_WORKSPACES = ['Default', 'Work', 'Play'];

export function WorkspaceSwitcher() {
    const [active, setActive] = useState(0);

    return (
        <div
            className="workspace-switcher"
            id="workspace-switcher"
            role="tablist"
            aria-label="Workspaces"
        >
            {DEFAULT_WORKSPACES.map((label, i) => (
                <button
                    key={label}
                    type="button"
                    role="tab"
                    aria-selected={i === active}
                    aria-label={label}
                    title={label}
                    className={`ws-dot${i === active ? ' active' : ''}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        setActive(i);
                    }}
                />
            ))}
            <button
                type="button"
                className="ws-add"
                aria-label="Add workspace"
                title="Add workspace"
                onClick={(e) => e.stopPropagation()}
            >
                +
            </button>
        </div>
    );
}
