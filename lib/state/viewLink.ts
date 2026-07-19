/*
 * viewLink — Share Any View (Brendon, 2026-07-19 · the fable-queue brief's
 * confirmed winner, built the "url slug purely" way).
 *
 * A view IS its URL: the path says WHERE, the `?sort=` slug (SortContext,
 * Atlas #88) says how the grid is arranged, and `?tab=` / `?sub=` say which
 * tab of a tabbed page is open. Pages that own tab state REGISTER it here
 * (a module-level map — no context, no re-renders) and READ it back from a
 * pasted URL at boot, where the shared view wins over per-user tab memory
 * (the same "a pasted slug IS the shared view" precedent as `?sort=`).
 *
 * The SHARE VIEW pill in settings composes the link at copy time from the
 * LIVE state — so the copied link always restores the exact view, even
 * when the address bar is clean (slug off, default tab) or invisible
 * (PWA standalone has no address bar — the whole reason the copy
 * affordance exists).
 */

export type ViewParamKey = 'tab' | 'sub';

const live = new Map<ViewParamKey, string>();

/** Pages register their current shareable view state (null clears). */
export function setViewParam(key: ViewParamKey, value: string | null): void {
    if (value == null) live.delete(key);
    else live.set(key, value);
}

/** A pasted deep link's view param, read once at page boot. */
export function readViewParam(key: ViewParamKey): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return new URLSearchParams(window.location.search).get(key);
    } catch {
        return null;
    }
}

/** The copyable deep link to the exact current view. `sortSlug` comes from
 *  the live SortContext state (always included — the recipient must land on
 *  the sender's arrangement, not their own saved default). */
export function composeViewLink(sortSlug: string | null): string {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    if (sortSlug) url.searchParams.set('sort', sortSlug);
    for (const [k, v] of live) url.searchParams.set(k, v);
    return url.toString();
}
