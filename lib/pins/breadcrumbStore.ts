/*
 * breadcrumbStore — REAL "recently visited" breadcrumbs (Brendon, 2026-06-12).
 *
 * Replaces the Build 22 placeholder (5 random ids per page session) with the
 * truth: an Output is a breadcrumb because the viewer actually OPENED it.
 * Recording happens at the single chokepoint every surface routes through —
 * ModalContext.open('output', …) — so card taps on the gallery, home
 * carousels, shuffle grid, profile grids and search all leave crumbs with no
 * per-surface wiring.
 *
 * State shape: most-recent-first list of `${slug}:${id}` keys, de-duped on
 * re-visit (a key moves back to the front), capped so the trail stays a
 * trail. Same module-singleton + subscribe pattern as starStore/muteStore.
 *
 * Persistence: localStorage `pd_breadcrumbs` — device-local and PRIVATE (a
 * browsing trail is the viewer's own business; it never rides to the server).
 */

const STORAGE_KEY = 'pd_breadcrumbs';
/** Trail length cap — most recent N visits across all Projects. */
const CAP = 60;
/** Crumbs shown per Project gallery (sim's sticker count). */
export const BREADCRUMBS_PER_PROJECT = 5;

type Listener = (keys: ReadonlyArray<string>) => void;

let order: string[] = [];
let hydrated = false;
const listeners = new Set<Listener>();

function keyOf(slug: string, id: number): string {
    return `${slug}:${id}`;
}

function hydrate(): void {
    if (hydrated) return;
    hydrated = true;
    if (typeof window === 'undefined') return;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            order = parsed
                .filter((k): k is string => typeof k === 'string' && k.includes(':'))
                .slice(0, CAP);
        }
    } catch {
        /* ignore — bad JSON, quota, private mode */
    }
}

function persist(): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    } catch {
        /* ignore */
    }
}

function emit(): void {
    const snapshot: ReadonlyArray<string> = [...order];
    listeners.forEach((l) => l(snapshot));
}

/** Record a visit — called when the Output modal opens for (slug, id). */
export function recordVisit(slug: string, id: number): void {
    hydrate();
    const k = keyOf(slug, id);
    const i = order.indexOf(k);
    if (i === 0) return; // already the freshest crumb — nothing to do
    if (i > 0) order.splice(i, 1);
    order.unshift(k);
    if (order.length > CAP) order.length = CAP;
    persist();
    emit();
}

/** Most recent visited Output ids for one Project, freshest first. */
export function getRecentIdsForProject(
    slug: string,
    n: number = BREADCRUMBS_PER_PROJECT,
): number[] {
    hydrate();
    const prefix = `${slug.toLowerCase()}:`;
    const out: number[] = [];
    for (const k of order) {
        if (!k.toLowerCase().startsWith(prefix)) continue;
        const id = Number(k.slice(k.indexOf(':') + 1));
        if (Number.isFinite(id)) out.push(id);
        if (out.length >= n) break;
    }
    return out;
}

/** Subscribe to trail changes. Returns an unsubscribe function. */
export function subscribeBreadcrumbs(cb: Listener): () => void {
    hydrate();
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
