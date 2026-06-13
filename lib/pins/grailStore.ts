'use client';

/*
 * grailStore — F50 (BUG-02).
 *
 * Module-singleton store for the Grail Pin system. Three independent
 * surfaces read + write the same set of pinned Outputs — TopBarRow renders
 * the pills, ArtworkCard renders the badge + hover-icon click, OutputPreview
 * renders the pin button — so a small subscribe-on-mount module-singleton is
 * the lower-friction fit (matches sentimentEngine / priceSpriteEngine).
 *
 * State shape (Brendon 2026-06-13):
 *   pins: { slug, id }[]  — each pin carries its PROJECT slug + Output id,
 *   so a pill always shows the actual pinned project (Oracle #7, not the
 *   wrong "Prisms #7"). Output ids are per-project, so the slug is required
 *   to identify a pin. Caps at 5 (sim 12426), insertion order.
 *
 * Toast text + UX side effects live in the caller (showToast is React
 * context); togglePin returns a result discriminator.
 *
 * Persistence: localStorage `pd_grail_pins`. Legacy entries (bare numbers,
 * pre-slug) can't be resolved to a project, so they're dropped on hydrate.
 */

const STORAGE_KEY = 'pd_grail_pins';
const MAX_PINS = 5;
export const MAX_GRAIL_PINS = MAX_PINS;

export interface GrailPin {
    slug: string;
    id: number;
}

type Listener = (pins: readonly GrailPin[]) => void;

let pins: GrailPin[] = [];
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
            // Keep only well-formed {slug, id} entries — legacy bare-number
            // pins have no project and are the source of the wrong-name bug,
            // so they're dropped.
            pins = parsed.filter(
                (p): p is GrailPin =>
                    !!p &&
                    typeof p === 'object' &&
                    typeof p.slug === 'string' &&
                    typeof p.id === 'number' &&
                    Number.isFinite(p.id)
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
export function getGrails(): readonly GrailPin[] {
    hydrate();
    return pins;
}

export function isPinned(slug: string, id: number): boolean {
    hydrate();
    return pins.some((p) => p.slug === slug && p.id === id);
}

/**
 * Toggle a pin for a specific Output. Returns:
 *   'pinned'   — pin was added
 *   'unpinned' — pin was removed
 *   'limit'    — at cap (5) and not already pinned, no-op
 */
export function togglePin(slug: string, id: number): ToggleGrailResult {
    hydrate();
    const idx = pins.findIndex((p) => p.slug === slug && p.id === id);
    if (idx >= 0) {
        pins = pins.filter((_, i) => i !== idx);
        persist();
        emit();
        return 'unpinned';
    }
    if (pins.length >= MAX_PINS) {
        return 'limit';
    }
    pins = [...pins, { slug, id }];
    persist();
    emit();
    return 'pinned';
}

/** Drop a pin without the toggle-on path. */
export function unpinGrail(slug: string, id: number): boolean {
    hydrate();
    const idx = pins.findIndex((p) => p.slug === slug && p.id === id);
    if (idx < 0) return false;
    pins = pins.filter((_, i) => i !== idx);
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
