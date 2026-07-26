'use client';

/*
 * useTeamTagStyle — which of the twelve WTBS-family chip treatments the owner
 * has cycled to (Brendon, 2026-07-26).
 *
 * The WTBS + Petey chips are reserved to fixed handles and are NOT customizable
 * the way ordinary tags are (no paint, no @name font — they are lockStyle). What
 * their owner CAN do is tap the chip to advance it through the twelve locked
 * looks; the pick is public, so every visitor sees the treatment its owner
 * chose.
 *
 * Stored in the account's `settings` envelope under `teamTagStyle` and mirrored
 * to localStorage, exactly like useShownTags — no new column, and the value is
 * lifted out server-side alongside shownTags for visitors.
 */

import { useCallback, useEffect, useState } from 'react';
import { pushSettings } from '@/lib/state/userState';
import { TEAM_TAG_STYLES, teamStyleIndex } from '../tags/catalog';

const STORAGE_KEY = 'pd_team_tag_style';
const EVENT_NAME = 'pd:team-tag-style-changed';

function readStored(seed: number): number {
    if (typeof window === 'undefined') return seed;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved != null) return teamStyleIndex(JSON.parse(saved));
    } catch { /* ignore */ }
    return seed;
}

/**
 * @param serverStyle Server-known `settings.teamTagStyle` for the profile OWNER —
 *   pass only on the viewer's OWN profile so the chip paints right immediately.
 */
export function useTeamTagStyle(serverStyle?: number | null) {
    const seed = teamStyleIndex(serverStyle);
    const [style, setStyleState] = useState<number>(seed);

    useEffect(() => {
        setStyleState(readStored(seed));
        const sync = (e: Event) => setStyleState(teamStyleIndex((e as CustomEvent<number>).detail));
        window.addEventListener(EVENT_NAME, sync);
        return () => window.removeEventListener(EVENT_NAME, sync);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** Advance one place through the twelve, wrapping at the end. */
    const cycleStyle = useCallback(() => {
        setStyleState((cur) => {
            const value = (teamStyleIndex(cur) + 1) % TEAM_TAG_STYLES.length;
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* ignore */ }
            try { window.dispatchEvent(new CustomEvent<number>(EVENT_NAME, { detail: value })); } catch { /* ignore */ }
            pushSettings({ teamTagStyle: value });
            return value;
        });
    }, []);

    return { style, cycleStyle };
}
