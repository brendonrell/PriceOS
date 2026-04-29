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
 * Mounted once in PriceOSShell.
 */

import { useEffect } from 'react';
import { usePdNotifs } from '../state/PdNotifsContext';

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
    'zen-mode',
    'sentiment-on',
    'redacted-mode',
];

export function useBodyClass() {
    const { notifs } = usePdNotifs();

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
        if (notifs.fogMode)          cl.add('fog-mode');
        if (notifs.zenMode)          cl.add('zen-mode');
        if (notifs.sentimentOn)      cl.add('sentiment-on');
        if (notifs.redactedMode)     cl.add('redacted-mode');
    }, [notifs]);
}
