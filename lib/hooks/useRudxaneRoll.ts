'use client';

/*
 * useRudxaneRoll — this page load's roll for @rudxane's chip (Brendon,
 * 2026-07-26).
 *
 * His tag IS his name, and it changes every refresh: usually one of the
 * contested respellings from the Ode to Rudxane project, sometimes the plain
 * "Rudxane". The roll is deliberately NOT persisted — re-rolling is the whole
 * point — but it IS taken once per page load and shared, so every surface
 * showing him in a single view agrees with itself instead of flickering a
 * different pronunciation into each list row.
 *
 * The server renders no roll at all (the plain name), and the roll lands after
 * mount, so server and client markup can never disagree on first paint.
 */

import { useEffect, useState } from 'react';

/** One roll per page load, shared by every surface in this view. */
let pageRoll: number | null = null;

function getPageRoll(): number {
    if (pageRoll === null) pageRoll = Math.floor(Math.random() * 1_000_000);
    return pageRoll;
}

export function useRudxaneRoll(): number | null {
    const [roll, setRoll] = useState<number | null>(null);
    useEffect(() => { setRoll(getPageRoll()); }, []);
    return roll;
}
