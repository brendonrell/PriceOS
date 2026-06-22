'use client';

/*
 * profileLogoActive — the "whose Profile Logo is the site chrome wearing right
 * now" signal.
 *
 * A profile page sets this to its OWNER's chosen logo id on mount and clears it
 * on unmount (mirrors ColorwayContext.setActiveProfileHex). The navbar logo
 * (PeteyLogo) subscribes and renders that owner's custom mark instead of the
 * default — so visiting someone's profile shows THEIR logo, overriding the
 * viewer's own theme. Module-global + subscribe so it stays out of React
 * context but still drives a re-render in the one component that reads it.
 */

let active: string | null = null;
const subs = new Set<() => void>();

export function getActiveProfileLogo(): string | null {
    return active;
}

export function setActiveProfileLogo(id: string | null): void {
    if (active === id) return;
    active = id;
    subs.forEach((fn) => fn());
}

export function subscribeActiveProfileLogo(fn: () => void): () => void {
    subs.add(fn);
    return () => {
        subs.delete(fn);
    };
}
