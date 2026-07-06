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
 *   keys: Set<string>  — muted Outputs, keyed `${slug}:${id}` so a mute is
 *   Project-exact (2026-07-06 — bare token ids collided across Projects:
 *   muting Prisms #5 also muted Oracle #5). Legacy bare-number entries are
 *   dropped on hydrate (they carry no slug, so they can't be attributed to a
 *   Project — a one-time reset, the same call starStore made; not data loss).
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

import { pushSettings, STATE_CACHE_KEYS, USERSTATE_HYDRATED_EVENT } from '../state/userState';

const STORAGE_KEY = STATE_CACHE_KEYS.mutes;
const COUNT_KEY = 'pd_hammer_count';
const COUNT_EVENT = 'pd:hammer-count-changed';

type Listener = (keys: ReadonlySet<string>) => void;

let keys: Set<string> = new Set();
let hydrated = false;
const listeners = new Set<Listener>();

function keyOf(slug: string, id: number): string {
    return `${slug}:${id}`;
}

function loadFromCache(): Set<string> {
    const out = new Set<string>();
    if (typeof window === 'undefined') return out;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return out;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            parsed.forEach((k) => {
                // Only composite `slug:id` keys; legacy bare numbers are dropped
                // (one-time reset — they can't be attributed to a Project).
                if (typeof k === 'string' && k.includes(':')) out.add(k);
            });
        }
    } catch {
        /* ignore — bad JSON, quota, private mode */
    }
    return out;
}

function hydrate(): void {
    if (hydrated) return;
    hydrated = true;
    keys = loadFromCache();
}

function persist(): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(Array.from(keys))
        );
        window.localStorage.setItem(COUNT_KEY, String(keys.size));
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
    // Account write-through — mutes ride the settings envelope. No-op until an
    // authed snapshot has hydrated (userState guards this).
    pushSettings({ mutes: Array.from(keys) });
}

/* Server snapshot landed (login on any device) — re-read the cache userState
   just overwrote with the account's mutes and refresh subscribers + badges. */
if (typeof window !== 'undefined') {
    window.addEventListener(USERSTATE_HYDRATED_EVENT, () => {
        hydrated = true;
        keys = loadFromCache();
        try {
            window.localStorage.setItem(COUNT_KEY, String(keys.size));
            window.dispatchEvent(new Event(COUNT_EVENT));
        } catch { /* ignore */ }
        emit();
    });
}

function emit(): void {
    const snapshot: ReadonlySet<string> = new Set(keys);
    listeners.forEach((l) => l(snapshot));
}

export type ToggleMuteResult = 'muted' | 'unmuted';

/** Snapshot of currently muted keys (`${slug}:${id}`). Triggers hydrate. */
export function getMutedKeys(): ReadonlySet<string> {
    hydrate();
    return keys;
}

export function isMuted(slug: string, id: number): boolean {
    hydrate();
    return keys.has(keyOf(slug, id));
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
export function toggleMute(slug: string, id: number): ToggleMuteResult {
    hydrate();
    const k = keyOf(slug, id);
    if (keys.has(k)) {
        keys.delete(k);
        persist();
        emit();
        return 'unmuted';
    }
    keys.add(k);
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
export function muteOnly(slug: string, id: number): boolean {
    hydrate();
    const k = keyOf(slug, id);
    if (keys.has(k)) return false;
    keys.add(k);
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
