'use client';

/*
 * Active Profile Logo — the corner-logo override for the profile page CURRENTLY
 * being viewed (Brendon 2026-06-23, Profile Logo feature).
 *
 * Mirrors ColorwayContext's `activeProfileHex` idea: a profile page registers
 * its OWNER's chosen logo id here on mount (and clears it on unmount), and the
 * navbar logo (PeteyLogo) subscribes so it can repaint to the owner's pick while
 * you're on their profile — overriding the viewer's own logo setting. Off every
 * other page (null = the normal logo).
 *
 * A tiny module store + subscribe (the same shape PeteyLogo already consumes for
 * the sentiment engine) — no provider plumbing, SSR-safe (starts null so the
 * server and first client paint agree).
 */

let active: string | null = null;
const subs = new Set<() => void>();

/** The owner-logo id for the profile being viewed, or null (no override). */
export function getActiveProfileLogo(): string | null {
    return active;
}

/** Register (or clear, with null) the viewed profile's owner logo. No-ops when
 *  unchanged so subscribers don't churn. */
export function setActiveProfileLogo(id: string | null): void {
    const next = id && id.length > 0 ? id : null;
    if (next === active) return;
    active = next;
    subs.forEach((fn) => fn());
}

export function subscribeActiveProfileLogo(fn: () => void): () => void {
    subs.add(fn);
    return () => {
        subs.delete(fn);
    };
}
