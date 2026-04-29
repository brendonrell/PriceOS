'use client';

/*
 * PanelPlaceholder
 *
 * Shared shell used by Settings/Calendar/Artists/Portfolio panel views
 * in step 3. Renders:
 *   - A back-arrow row that returns the user-dropdown to its links view
 *   - A title + a small note explaining this panel's content lands in
 *     step 4
 *
 * Step 4 will replace each placeholder with its real implementation.
 * Keeping them as placeholders here means the navigation entry points
 * already work and the swap behavior (links ⇄ panel) is exercised end
 * to end before the panel content is built out.
 */

import { useDropdown } from '../../lib/state/DropdownContext';

interface Props {
    title: string;
    note?: string;
}

export function PanelPlaceholder({ title, note }: Props) {
    const { setView } = useDropdown();

    return (
        <div className="panel-placeholder">
            <div
                className="panel-back-row"
                onClick={() => setView('links')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setView('links');
                    }
                }}
                title="Back to menu"
            >
                <span className="panel-back-arrow">←{'\uFE0E'}</span>
                <span className="panel-back-label">Back</span>
            </div>
            <div className="panel-placeholder-body">
                <div className="panel-placeholder-title">{title}</div>
                <div className="panel-placeholder-note">
                    {note ?? 'Full panel content lands in Step 4 of the Connect Menu port.'}
                </div>
            </div>
        </div>
    );
}
