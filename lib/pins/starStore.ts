'use client';

/*
 * starStore — chat #6 D010-star (Card hover overlay icons).
 *
 * Sim refs:
 *   sim.html 5536-5551    toggleStar handler (DOM-attribute toggle in sim)
 *   sim.html 8045         hi-icon onclick="toggleStar(event, this)"
 *
 * Why a module store and not pure DOM-attribute toggle:
 *   Sim's toggleStar reads/writes data-starred + .active-star directly on
 *   the icon span. That's fine for a static page but breaks under React +
 *   Build 35 virtualization (lib/virtualization/canvasVirtualizer) — every
 *   card unmount/remount loses its DOM-only star state. A module-singleton
 *   store + per-card subscription gives the same end state (icon shows ★
 *   when starred, ☆ when not) and survives remount + cross-surface reads.
 *   Same pattern as grailStore + muteStore.
 *
 * State shape:
 *   ids: Set<number>   — starred token ids, no cap (sim has no upper bound)
 *
 * Persistence: localStorage `pd_starred_ids`. Sim itself doesn't persist
 * stars (DOM-only) — the React port adds persistence because the
 * virtualization-driven remount cycle would otherwise eat star state on
 * every scroll. This is the same sim-deviation logged in muteStore: pure-
 * DOM state in sim → store-backed state in React. Storage key follows the
 * `pd_{kind}_ids` convention (pd_grail_pins, pd_muted_ids, pd_starred_ids).
 *
 * Toast text ("STARRED #22" / "UNSTARRED #22") lives in the caller, same
 * reasoning as grailStore + muteStore — keeps the store free of
 * ToastContext dependency.
 */

const STORAGE_KEY = 'pd_starred_ids';

type Listener = (ids: ReadonlySet<number>) => void;

let ids: Set<number> = new Set();
let hydrated = false;
const listeners = new Set<Listener>();

function hydrate(): void {
    if (hydrated) return;
    hydrated = true;
    if (typeof window === 'undefined') return;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            parsed.forEach((n) => {
                const id = typeof n === 'number' ? n : parseInt(String(n), 10);
                if (Number.isFinite(id)) ids.add(id);
            });
        }
    } catch {
        /* ignore — bad JSON, quota, private mode */
    }
}

function persist(): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(Array.from(ids))
        );
    } catch {
        /* ignore */
    }
}

function emit(): void {
    const snapshot: ReadonlySet<number> = new Set(ids);
    listeners.forEach((l) => l(snapshot));
}

export type ToggleStarResult = 'starred' | 'unstarred';

/** Snapshot of currently starred ids. Triggers hydrate on first call. */
export function getStarredIds(): ReadonlySet<number> {
    hydrate();
    return ids;
}

export function isStarred(id: number): boolean {
    hydrate();
    return ids.has(id);
}

/**
 * Toggle the star state of a token. Returns:
 *   'starred'   — id was added (sim 5546-5550 path)
 *   'unstarred' — id was removed (sim 5541-5544 path)
 *
 * Mirrors sim 5536-5551. Caller owns toast text + class flip on the icon
 * (the .active-star class lives on the rendered span in ArtworkCard).
 */
export function toggleStar(id: number): ToggleStarResult {
    hydrate();
    if (ids.has(id)) {
        ids.delete(id);
        persist();
        emit();
        return 'unstarred';
    }
    ids.add(id);
    persist();
    emit();
    return 'starred';
}

/**
 * Subscribe to star set changes. Returns an unsubscribe function.
 * Listener receives a fresh snapshot Set, never the live one.
 */
export function subscribeStarred(cb: Listener): () => void {
    hydrate();
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
