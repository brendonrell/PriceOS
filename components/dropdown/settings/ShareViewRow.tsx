'use client';

/*
 * ShareViewRow — the SHARE VIEW pill (Share Any View, Brendon 2026-07-19).
 *
 * One tap copies a deep link to the exact current view — page, open tab,
 * sub-tab, sort, and grouping — composed at copy time from live state
 * (lib/state/viewLink.ts), so it works even where the address bar doesn't
 * exist (PWA standalone). Opening the link restores the view: the sort
 * slug and tab params win over the recipient's own saved defaults.
 * ⧉ is the canonical COPY glyph (GLYPHS.md).
 */

import { useSort, encodeSortSlug } from '../../../lib/state/SortContext';
import { useToast } from '../../../lib/state/ToastContext';
import { composeViewLink } from '../../../lib/state/viewLink';
import { SettingsToggle } from './SettingsToggle';

export function ShareViewRow() {
    const { sort, dir, feedKind, group } = useSort();
    const { showToast } = useToast();

    const copyLink = () => {
        const link = composeViewLink(encodeSortSlug(sort, dir, feedKind, group));
        if (!link) return;
        try {
            void navigator.clipboard?.writeText(link);
        } catch {
            /* ignore */
        }
        showToast('View link: COPIED');
    };

    return (
        <div className="settings-pill-row">
            <SettingsToggle
                id="sn-shareView"
                title="Share this view — copy a link that restores this exact page, tab, sort, and grouping"
                active={false}
                onClick={copyLink}
                icon={'⧉︎'}
                label="SHARE VIEW"
            />
        </div>
    );
}
