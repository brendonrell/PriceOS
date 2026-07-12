'use client';

/*
 * DefaultSortRow
 *
 * Settings panel section 4 — DEFAULT SORT.
 *
 * A leading GROUP pill + four sort pill toggles backed by SortContext.
 * Sorts are single-active: clicking a pill activates it and deactivates
 * the others. The GROUP pill is the DEFAULT grouping (Brendon, 2026-07-12)
 * — it leads the row exactly like the grid sort rows' group toggle, cycles
 * the master dimension order, and persists as the boot/project-entry
 * grouping. FOG left this row for the Spell Book the same day; AZ took
 * its slot.
 *
 * Build 29 — D14 adds the directional arrow glyph that sim 10492-10498
 * renders inside each active pill via the .settings-sort-arrow span.
 * Active-pill arrow reflects the current direction:
 *
 *   #ID    : '↑' when id-asc, '↓' when id-desc, no arrow otherwise
 *   $PRICE : '↑' when price-asc, '↓' when price-desc, no arrow otherwise
 *   FEED   : 'FEED <↑|↓>' for feed-time-*; 'FEED $ <↑|↓>' for feed-price-*
 *   AZ     : 'AZ ↑' ascending, 'ZA ↓' descending (gallery parity)
 *
 * Click handler upgraded from `setSort` to `cycleSort` so the settings
 * row mirrors sim's main sort row: re-tapping the active family flips
 * direction (sim's window.setSort is the single shared cycle handler).
 *
 * The active sort drives the project page's default view; the
 * pd_settings_sort key persists family-only (matches sim's defaultSort).
 */

import type { ReactNode } from 'react';
import {
    useSort, type SortKey,
    GROUP_GLYPH, GROUP_LABEL, GROUP_BTN_ICON,
} from '../../../lib/state/SortContext';
import { useToast } from '../../../lib/state/ToastContext';
import { SettingsToggle } from './SettingsToggle';

const SORT_NAMES: Record<SortKey, string> = {
    id:    '# ID',
    price: '$ Price',
    feed:  'Feed',
    // Fog now lives in the Spell Book (Brendon, 2026-07-12).
    fog:   'Fog',
    az:    'A–Z',
};

const SORTS: Array<{ key: SortKey; title: string }> = [
    { key: 'id',    title: 'Sort by ID' },
    { key: 'price', title: 'Sort by Price' },
    { key: 'feed',  title: 'Activity Feed' },
    { key: 'az',    title: 'Sort A–Z by project' },
];

export function DefaultSortRow() {
    const { sort, dir, feedKind, cycleSort, defaultGroup, cycleDefaultGroup } = useSort();
    const { showToast } = useToast();

    const groupOn = defaultGroup !== 'none';

    /* Sim 10492-10498 — pill labels are HTML-built per family with
       direction arrow inside .settings-sort-arrow when active. */
    const labelFor = (key: SortKey): ReactNode => {
        const arrow = (glyph: string) => (
            <span className="settings-sort-arrow">{glyph}</span>
        );
        if (key === 'id') {
            if (sort === 'id') {
                return (
                    <>
                        # ID {arrow(dir === 'asc' ? '↑\uFE0E' : '↓\uFE0E')}
                    </>
                );
            }
            return '# ID';
        }
        if (key === 'price') {
            if (sort === 'price') {
                return (
                    <>
                        $ PRICE {arrow(dir === 'asc' ? '↑\uFE0E' : '↓\uFE0E')}
                    </>
                );
            }
            return '$ PRICE';
        }
        if (key === 'feed') {
            if (sort === 'feed') {
                const dirGlyph = dir === 'asc' ? '↑\uFE0E' : '↓\uFE0E';
                return feedKind === 'price' ? (
                    <>FEED $ {arrow(dirGlyph)}</>
                ) : (
                    <>FEED {arrow(dirGlyph)}</>
                );
            }
            return 'FEED';
        }
        // az — flips to ZA when descending, gallery parity.
        if (sort === 'az') {
            return (
                <>
                    {dir === 'desc' ? 'ZA' : 'AZ'} {arrow(dir === 'asc' ? '↑︎' : '↓︎')}
                </>
            );
        }
        return 'AZ';
    };

    return (
        <>
            <div className="settings-header">DEFAULT SORT</div>
            <div className="settings-pill-row">
                {/* Default GROUP — leads the row like the grid group toggle.
                    Icon = the live dimension's glyph (▥ when off); the label
                    names the dimension so the pick reads at a glance. */}
                <SettingsToggle
                    id="ss-group"
                    active={groupOn}
                    title="Default grouping — cycles every dimension"
                    icon={groupOn ? GROUP_GLYPH[defaultGroup] : GROUP_BTN_ICON}
                    iconStyle={{ fontFamily: "'Courier New', Courier, monospace" }}
                    label={groupOn ? GROUP_LABEL[defaultGroup] : 'GROUP'}
                    onClick={() => {
                        const next = cycleDefaultGroup();
                        showToast('Default Group: ' + GROUP_LABEL[next]);
                    }}
                />
                {SORTS.map((s) => (
                    <SettingsToggle
                        key={s.key}
                        id={`ss-${s.key}`}
                        active={sort === s.key}
                        title={s.title}
                        label={labelFor(s.key)}
                        /* Brendon list item 15 — sim 10502-10504 renders
                           the label directly into the button (no .st-label
                           wrapper). Without bareLabel here, the
                           .settings-sort-arrow span sits inside .st-label
                           and its `transform: translateY(-3px)` (sim 1675)
                           visually misaligns vs the pill's baseline. */
                        bareLabel
                        onClick={() => {
                            cycleSort(s.key);
                            showToast('Default Sort: ' + SORT_NAMES[s.key]);
                        }}
                    />
                ))}
            </div>
        </>
    );
}
