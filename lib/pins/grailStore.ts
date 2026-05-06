'use client';

/*
 * grailStore — F50 (BUG-02).
 *
 * Module-singleton store for the Grail Pin system. Sim refs:
 *   sim.html 12303-12451   engine (varDecl, save, render, toggle, unpin)
 *   sim.html 12342         incognito/hammer hide gate for the bar
 *   sim.html 12397-12399   .grail-pinned class on edition-card
 *   sim.html 12405         badge glyph U+27DF
 *   sim.html 12426         5-pin cap
 *   sim.html 5366          modal-pin-hint (#modalGrailBtn) markup
 *
 * Why a module store and not a React context:
 *   Three independent surfaces need to read + write the same set of
 *   pinned ids — TopBarRow renders the pills, ArtworkCard renders the
 *   badge + handles the hover-icon click, ArtworkModal renders the pin
 *   button. Threading a context through every parent works but adds
 *   noise to the tree; a small subscribe-on-mount module-singleton is
 *   the lower-friction fit and matches the pattern already used by
 *   sentimentEngine / priceSpriteEngine / tapeEngine.
 *
 * State shape:
 *   pins: number[]   — token ids, insertion order. Caps at 5 (sim 12426).
 *
 * Toast text + UX side effects (DE-PINNED toast, "Limit: 5 max" toast,
 * "GRAIL PINNED" toast) live in the caller, because showToast comes
 * from React context. togglePin returns a result discriminator and the
 * caller renders the matching toast — same end state as sim, just
 * separated along the React/non-React boundary.
 *
 * Persistence: localStorage key `pd_grail_pins` (sim 12309 + 12314).
 * Hydration is lazy — first read or subscribe pulls from storage. SSR
 * stays clean because every entry point happens inside a `'use client'`
 * boundary that only runs in the browser.
 */

const STORAGE_KEY = 'pd_grail_pins';
const MAX_PINS = 5;

type Listener = (pins: readonly number[]) => void;

let pins: number[] = [];
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
            pins = parsed.filter(
                (n): n is number => typeof n === 'number' && Number.isFinite(n)
            );
        }
    } catch {
        /* ignore — bad JSON, quota, private mode */
    }
}

function persist(): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
    } catch {
        /* ignore */
    }
}

function emit(): void {
    const snapshot = pins.slice();
    listeners.forEach((l) => l(snapshot));
}

export type ToggleGrailResult = 'pinned' | 'unpinned' | 'limit';

/** Current pin list (read-only snapshot). Triggers hydrate on first call. */
export function getGrails(): readonly number[] {
    hydrate();
    return pins;
}

export function isPinned(id: number): boolean {
    hydrate();
    return pins.includes(id);
}

/**
 * Toggle a pin. Returns:
 *   'pinned'   — pin was added
 *   'unpinned' — pin was removed
 *   'limit'    — at cap (5) and id wasn't already pinned, no-op
 *
 * Mirrors sim 12413-12440. Caller owns toast text.
 */
export function togglePin(id: number): ToggleGrailResult {
    hydrate();
    const idx = pins.indexOf(id);
    if (idx >= 0) {
        pins = pins.filter((p) => p !== id);
        persist();
        emit();
        return 'unpinned';
    }
    if (pins.length >= MAX_PINS) {
        return 'limit';
    }
    pins = [...pins, id];
    persist();
    emit();
    return 'pinned';
}

/** Drop a pin without the toggle-on path. Mirrors sim 12442-12451. */
export function unpinGrail(id: number): boolean {
    hydrate();
    if (pins.indexOf(id) < 0) return false;
    pins = pins.filter((p) => p !== id);
    persist();
    emit();
    return true;
}

/**
 * Subscribe to pin changes. Returns an unsubscribe function. Listener
 * is invoked with a snapshot, never the live array.
 */
export function subscribeGrails(cb: Listener): () => void {
    hydrate();
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
