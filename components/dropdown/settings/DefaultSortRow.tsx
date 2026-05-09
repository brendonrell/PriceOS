'use client';

/*
 * DefaultSortRow
 *
 * Settings panel section 4 — DEFAULT SORT.
 *
 * Four pill toggles backed by SortContext. Single-active behavior:
 * clicking a pill activates it and deactivates the others.
 *
 * Build 29 — D14 adds the directional arrow glyph that sim 10492-10498
 * renders inside each active pill via the .settings-sort-arrow span.
 * Active-pill arrow reflects the current direction:
 *
 *   #ID    : '↑' when id-asc, '↓' when id-desc, no arrow otherwise
 *   $PRICE : '↑' when price-asc, '↓' when price-desc, no arrow otherwise
 *   FEED   : 'FEED <↑|↓>' for feed-time-*; 'FEED $ <↑|↓>' for feed-price-*
 *   FOG    : no arrow (single state)
 *
 * Click handler upgraded from `setSort` to `cycleSort` so the settings
 * row mirrors sim's main sort row: re-tapping the active family flips
 * direction (sim's window.setSort is the single shared cycle handler).
 *
 * The active sort drives the project page's default view; the
 * pd_settings_sort key persists family-only (matches sim's defaultSort).
 */

import type { ReactNode } from 'react';
import { useSort, type SortKey } from '../../../lib/state/SortContext';
import { SettingsToggle } from './SettingsToggle';

const SORTS: Array<{ key: SortKey; title: string }> = [
    { key: 'id',    title: 'Sort by ID' },
    { key: 'price', title: 'Sort by Price' },
    { key: 'feed',  title: 'Activity Feed' },
    { key: 'fog',   title: 'Fog — reveal project artwork by artwork' },
];

export function DefaultSortRow() {
    const { sort, dir, feedKind, cycleSort } = useSort();

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
        // fog
        return 'FOG';
    };

    return (
        <>
            <div className="settings-header">DEFAULT SORT</div>
            <div className="settings-pill-row">
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
                        onClick={() => cycleSort(s.key)}
                    />
                ))}
            </div>
        </>
    );
}
