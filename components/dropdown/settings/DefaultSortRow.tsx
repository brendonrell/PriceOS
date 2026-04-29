'use client';

/*
 * DefaultSortRow
 *
 * Settings panel section 4 — DEFAULT SORT.
 *
 * Four pill toggles backed by SortContext. Single-active behavior:
 * clicking a pill activates it and deactivates the others.
 *
 * The active sort drives the collection page's default view (lands in
 * step 5+ when the collection page is built); for now the value just
 * persists in localStorage and reflects in the picker UI.
 */

import { useSort } from '../../../lib/state/SortContext';
import { SettingsToggle } from './SettingsToggle';

const SORTS: Array<{ key: 'id' | 'price' | 'feed' | 'fog'; label: string; title: string }> = [
    { key: 'id',    label: '# ID',    title: 'Sort by ID' },
    { key: 'price', label: '$ PRICE', title: 'Sort by Price' },
    { key: 'feed',  label: 'FEED',    title: 'Activity Feed' },
    { key: 'fog',   label: 'FOG',     title: 'Fog — reveal collection artwork by artwork' },
];

export function DefaultSortRow() {
    const { sort, setSort } = useSort();

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
                        label={s.label}
                        onClick={() => setSort(s.key)}
                    />
                ))}
            </div>
        </>
    );
}
