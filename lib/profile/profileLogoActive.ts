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
/** The viewed profile OWNER's wallet — needed when the logo is a Sigil pick
 *  (the mark is per-wallet art, computed from this address). */
let activeOwner: string | null = null;
const subs = new Set<() => void>();

/** The owner-logo id for the profile being viewed, or null (no override). */
export function getActiveProfileLogo(): string | null {
    return active;
}

/** The viewed profile owner's address (set alongside the logo id). */
export function getActiveProfileLogoOwner(): string | null {
    return activeOwner;
}

/** Register (or clear, with null) the viewed profile's owner logo. No-ops when
 *  unchanged so subscribers don't churn. */
export function setActiveProfileLogo(id: string | null, ownerAddress?: string | null): void {
    const next = id && id.length > 0 ? id : null;
    const nextOwner = next ? (ownerAddress ?? null) : null;
    if (next === active && nextOwner === activeOwner) return;
    active = next;
    activeOwner = nextOwner;
    subs.forEach((fn) => fn());
}

export function subscribeActiveProfileLogo(fn: () => void): () => void {
    subs.add(fn);
    return () => {
        subs.delete(fn);
    };
}
