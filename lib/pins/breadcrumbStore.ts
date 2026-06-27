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
 * Persistence: account-backed via the `users.settings` envelope (Brendon,
 * 2026-06-13 — the trail must FOLLOW YOU across devices, not just this one).
 * localStorage `pd_breadcrumbs` stays the write-through cache (instant paint +
 * offline); the server row wins on login. Still PRIVATE — the trail rides only
 * in the owner's settings and is never shown to anyone else.
 */

import { pushSettings, pushSettingsDebounced, STATE_CACHE_KEYS, USERSTATE_HYDRATED_EVENT } from '../state/userState';

const STORAGE_KEY = STATE_CACHE_KEYS.breadcrumbs;
/** Trail length cap — most recent N visits across all Projects. Doubles as the
 *  History depth (Brendon, 2026-06-24). */
const CAP = 100;
/** Crumbs shown per Project gallery (sim's sticker count). */
export const BREADCRUMBS_PER_PROJECT = 5;

type Listener = (keys: ReadonlyArray<string>) => void;

/** A visit: the `${slug}:${id}` key + the epoch-ms it was last opened (powers
 *  History's day grouping). Legacy entries (pre-timestamp) load with t = 0. */
interface Entry { k: string; t: number; }

let order: Entry[] = [];
let hydrated = false;
const listeners = new Set<Listener>();

function keyOf(slug: string, id: number): string {
    return `${slug}:${id}`;
}

function loadOrder(): Entry[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed
                .map((e): Entry | null => {
                    // New shape { k, t }; legacy shape: a bare key string.
                    if (typeof e === 'string' && e.includes(':')) return { k: e, t: 0 };
                    if (e && typeof e === 'object' && typeof e.k === 'string' && e.k.includes(':')) {
                        return { k: e.k, t: typeof e.t === 'number' ? e.t : 0 };
                    }
                    return null;
                })
                .filter((e): e is Entry => e != null)
                .slice(0, CAP);
        }
    } catch {
        /* ignore — bad JSON, quota, private mode */
    }
    return [];
}

function hydrate(): void {
    if (hydrated) return;
    hydrated = true;
    order = loadOrder();
}

function persist(): void {
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
        } catch {
            /* ignore */
        }
    }
    // Account write-through — the trail rides in the settings envelope so it
    // follows the viewer across devices. DEBOUNCED: browsing fires a visit on
    // every open, so the server write is coalesced (and flushed on tab-hide)
    // rather than one PATCH per card (Brendon, 2026-06-24). The localStorage
    // cache above is still written instantly, so the UI + sequence are live.
    // No-op until an authed snapshot has hydrated (userState guards it), so a
    // logged-out trail stays on-device.
    pushSettingsDebounced({ breadcrumbs: order });
}

/* Server snapshot landed (login on any device) — re-read the cache userState
   just overwrote with the account's trail and refresh subscribers. */
if (typeof window !== 'undefined') {
    window.addEventListener(USERSTATE_HYDRATED_EVENT, () => {
        hydrated = true;
        order = loadOrder();
        recordingLoaded = false; // re-read the account's recording choice
        loadRecording();
        emit();
    });
}

function emit(): void {
    const snapshot: ReadonlyArray<string> = order.map((e) => e.k);
    listeners.forEach((l) => l(snapshot));
}

/* Recording switch — the History "Recording" L3 toggle. When OFF we genuinely
   stop recording visits the instant it's flipped (a privacy pause), and resume
   the instant it's flipped back. Persisted (local + account) so the choice
   follows the viewer (Brendon, 2026-06-24). DEFAULT OFF — History is opt-in;
   recording only happens once the viewer explicitly turns it on (Brendon,
   2026-06-27). The stored key holds '0' only when the viewer has enabled it. */
const PAUSE_KEY = 'pd_breadcrumbs_paused';
let recording = false;
let recordingLoaded = false;
function loadRecording(): void {
    if (recordingLoaded || typeof window === 'undefined') return;
    recordingLoaded = true;
    try { recording = window.localStorage.getItem(PAUSE_KEY) === '0'; } catch { /* ignore */ }
}
export function isRecordingEnabled(): boolean {
    loadRecording();
    return recording;
}
export function setRecordingEnabled(on: boolean): void {
    loadRecording();
    recording = on;
    try {
        if (typeof window !== 'undefined') window.localStorage.setItem(PAUSE_KEY, on ? '0' : '1');
    } catch { /* ignore */ }
    /* Discrete user choice — write through immediately (not debounced). */
    pushSettings({ breadcrumbsPaused: !on });
    emit();
}

/** Record a visit — called when the Output modal opens for (slug, id). */
export function recordVisit(slug: string, id: number): void {
    loadRecording();
    if (!recording) return; // genuinely paused — record nothing
    hydrate();
    const k = keyOf(slug, id);
    const i = order.findIndex((e) => e.k === k);
    const t = Date.now();
    if (i === 0) { order[0]!.t = t; persist(); return; } // freshest already — just bump its time
    if (i > 0) order.splice(i, 1);
    order.unshift({ k, t });
    if (order.length > CAP) order.length = CAP;
    persist();
    emit();
}

/** Drop a single visit from the trail (the History row ✕). */
export function removeVisit(slug: string, id: number): void {
    hydrate();
    const k = keyOf(slug, id);
    const i = order.findIndex((e) => e.k === k);
    if (i < 0) return;
    order.splice(i, 1);
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
    for (const e of order) {
        if (!e.k.toLowerCase().startsWith(prefix)) continue;
        const id = Number(e.k.slice(e.k.indexOf(':') + 1));
        if (Number.isFinite(id)) out.push(id);
        if (out.length >= n) break;
    }
    return out;
}

/** Most recent visited Outputs ACROSS the whole site (every Project), freshest
 *  first — each as { slug, id, ts }. Powers the Recent pills + the History
 *  timeline (ts drives the day grouping). */
export function getRecentGlobal(
    n: number = BREADCRUMBS_PER_PROJECT,
): { slug: string; id: number; ts: number }[] {
    hydrate();
    const out: { slug: string; id: number; ts: number }[] = [];
    for (const e of order) {
        const i = e.k.indexOf(':');
        if (i < 0) continue;
        const slug = e.k.slice(0, i);
        const id = Number(e.k.slice(i + 1));
        if (Number.isFinite(id)) out.push({ slug, id, ts: e.t });
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
