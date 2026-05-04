'use client';

/*
 * useBodyClass
 *
 * Reads pdNotifs and applies the matching body class flags whenever
 * the state changes. The pre-hydration script in layout.tsx applies
 * the same classes synchronously before React mounts; this hook keeps
 * them in sync as state changes during the session.
 *
 * Source of truth for the flag mapping is duplicated between this hook
 * and the pre-hydration script. They MUST stay in lockstep — when a
 * new flag is added, update both.
 *
 * Build 23 — fog-mode is now driven by SortContext (sort === 'fog'),
 * not by a pdNotifs flag. Sim 8334-8338 toggles `body.fog-mode` exactly
 * when `currentSort === 'fog'`. The DefaultSortRow already wires that
 * sort key, so flipping body.fog-mode from `useSort()` here is the
 * single sim-faithful source. The dormant `notifs.fogMode` flag stays
 * in PdNotifs (no state-shape change) but is no longer consulted.
 *
 * Build 24 — feed-mode joins fog-mode as a sort-driven body class.
 * Sim 8342 + 9927 toggle `body.feed-mode` when
 * `currentSort.startsWith('feed')` — for our 'id' | 'price' | 'feed'
 * | 'fog' union that collapses to `sort === 'feed'`. globals.css 2954
 * already had `body.feed-mode .price-memory-ghost { display: none }`
 * waiting for a consumer; this wires it up. anon-mode joins as a
 * pdNotifs-driven flag (sim 9499 + 13033) — `notifs.anon` is new in
 * Build 24 and lights up sim's ascii-sprite font swap (sim 925-936)
 * plus info-line / follow-badge / follower-count / network pill /
 * artists rel pill hides (sim 3872-3879).
 *
 * Mounted once in PriceOSShell.
 */

import { useEffect } from 'react';
import { usePdNotifs } from '../state/PdNotifsContext';
import { useSort } from '../state/SortContext';

const TAPE_CLASS_MAP: Record<number, string | null> = {
    0: 'tape-off',
    1: 'tape-faded',
    2: null, // 'standard' has no class — it's the unstyled baseline
    3: 'tape-bold',
    4: 'tape-framed',
};

const ALL_TAPE_CLASSES = ['tape-off', 'tape-faded', 'tape-bold', 'tape-framed'];

const ALL_FLAG_CLASSES = [
    'notes-mode',
    'aura-active',
    'pm-active',
    'stargazing-mode',
    'hammer-mode',
    'pricelens-mode',
    'fog-mode',
    'feed-mode',
    'anon-mode',
    'zen-mode',
    'sentiment-on',
    'redacted-mode',
];

export function useBodyClass() {
    const { notifs } = usePdNotifs();
    const { sort } = useSort();

    useEffect(() => {
        const cl = document.body.classList;

        // Tape mode — clear all tape classes first, then add the active one.
        ALL_TAPE_CLASSES.forEach((c) => cl.remove(c));
        const tapeClass = TAPE_CLASS_MAP[notifs.tape];
        if (tapeClass) cl.add(tapeClass);

        // Boolean flags — clear all then re-add the active subset.
        ALL_FLAG_CLASSES.forEach((c) => cl.remove(c));
        if (notifs.notes)            cl.add('notes-mode');
        if (notifs.spell_aura)       cl.add('aura-active');
        if (notifs.spell_priceghost) cl.add('pm-active');
        if (notifs.spell_stargazing) cl.add('stargazing-mode');
        if (notifs.spell_hammer)     cl.add('hammer-mode');
        if (notifs.spell_pricelens)  cl.add('pricelens-mode');
        // Build 23 — fog-mode follows SortContext, not pdNotifs (sim 8334-8338).
        if (sort === 'fog')          cl.add('fog-mode');
        // Build 24 — feed-mode follows SortContext (sim 8342 + 9927).
        if (sort === 'feed')         cl.add('feed-mode');
        // Build 24 — anon-mode follows pdNotifs.anon (sim 9499 + 13033).
        if (notifs.anon)             cl.add('anon-mode');
        if (notifs.zenMode)          cl.add('zen-mode');
        if (notifs.sentimentOn)      cl.add('sentiment-on');
        if (notifs.redactedMode)     cl.add('redacted-mode');
    }, [notifs, sort]);
}
