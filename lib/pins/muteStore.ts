'use client';

/*
 * muteStore — chat #4 mute system parity (D002 + D010-hammer + D011).
 *
 * Sim refs:
 *   sim.html 7249-7274     storage + count helpers (_mutedIds Set, _persistMuted,
 *                          updateHammerBadge, updateHammerPillCount)
 *   sim.html 7280-7317     toggleMute (the canonical add/remove path)
 *   sim.html 7319-7323     hammerItem legacy shim (mute-only, no unmute)
 *   sim.html 7328-7346     _paintMutedState (implicit in React via subscribe)
 *   sim.html 7350-7386     _onModalMuteTap + _applyModalHammer (callers)
 *   sim.html 12692-12713   toggleSpell('hammer') — body class flip + filter cleanup
 *   sim.html 12727-12742   toggleMutedFilter — body.muted-filter-active toggle
 *
 * Why a module store and not a React context:
 *   Same reasoning as grailStore (lib/pins/grailStore.ts) — three independent
 *   surfaces (TopBarRow's hammer pill count, ArtworkCard's .muted class +
 *   overlay label, OutputPreview's #modalMuteOverlay) need to read+write the
 *   same set of muted ids. Module-singleton + subscribe is the lower-friction
 *   fit and matches the pattern already used by grailStore + sentimentEngine.
 *
 * State shape:
 *   ids: Set<number>   — muted token ids, no cap (sim has no upper bound)
 *
 * Persistence: localStorage `pd_muted_ids` (sim 7253) + `pd_hammer_count`
 * (sim 7260). Both written on every mutation. Hammer count event is
 * dispatched on the window for the existing TopBarRow listener (`pd:hammer-
 * count-changed`, the same event SpellBookSection already fires for the
 * hammer badge — Build 32 D21 pattern).
 *
 * Hydration is lazy — first read or subscribe pulls from storage. SSR
 * stays clean because every entry point happens inside a `'use client'`
 * boundary that only runs in the browser.
 */

const STORAGE_KEY = 'pd_muted_ids';
const COUNT_KEY = 'pd_hammer_count';
const COUNT_EVENT = 'pd:hammer-count-changed';

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
        window.localStorage.setItem(COUNT_KEY, String(ids.size));
    } catch {
        /* ignore */
    }
    // Fire the same event the SpellBookSection / TopBarRow count badges
    // already listen to (Build 32 D21 pattern). Keeps the hammer pill
    // count + spell-book badge in sync without threading state.
    try {
        window.dispatchEvent(new Event(COUNT_EVENT));
    } catch {
        /* ignore */
    }
}

function emit(): void {
    const snapshot: ReadonlySet<number> = new Set(ids);
    listeners.forEach((l) => l(snapshot));
}

export type ToggleMuteResult = 'muted' | 'unmuted';

/** Snapshot of currently muted ids. Triggers hydrate on first call. */
export function getMutedIds(): ReadonlySet<number> {
    hydrate();
    return ids;
}

export function isMuted(id: number): boolean {
    hydrate();
    return ids.has(id);
}

/**
 * Toggle the mute state of a token. Returns:
 *   'muted'   — id was added
 *   'unmuted' — id was removed
 *
 * Mirrors sim 7280-7317 (toggleMute). The label-flip animation
 * (Mute → ⟙ → MUTED) is owned by the caller component, since it's
 * a per-render visual concern — same reason togglePin's toast text
 * lives in the caller in grailStore.
 */
export function toggleMute(id: number): ToggleMuteResult {
    hydrate();
    if (ids.has(id)) {
        ids.delete(id);
        persist();
        emit();
        return 'unmuted';
    }
    ids.add(id);
    persist();
    emit();
    return 'muted';
}

/**
 * Mute-only path — sim's legacy hammerItem (sim 7319-7323).
 * Used by the (retired) hover hi-hammer icon onclick. If the id is
 * already muted, no-op; otherwise mutes. Returns whether it actually
 * muted (so callers can short-circuit if desired).
 */
export function muteOnly(id: number): boolean {
    hydrate();
    if (ids.has(id)) return false;
    ids.add(id);
    persist();
    emit();
    return true;
}

/**
 * Subscribe to mute set changes. Returns an unsubscribe function.
 * Listener receives a fresh snapshot Set, never the live one.
 */
export function subscribeMuted(cb: Listener): () => void {
    hydrate();
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
