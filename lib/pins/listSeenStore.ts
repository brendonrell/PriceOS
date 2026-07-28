'use client';

/*
 * listSeenStore — WHAT'S MOVED IN YOUR LISTS SINCE YOU LAST LOOKED (Brendon,
 * 2026-07-28).
 *
 * A List is only worth checking if it can tell you something changed. The price
 * feed the ◊ total already loads knows every member's live ask, so the missing
 * half is a BASELINE: what that ask was the last time the user actually read
 * the list. This store is that baseline, and nothing else.
 *
 * Per member key: the last-seen ask, or null for "was not listed". A member
 * with no entry at all has never been read, which is NOT a change — a list you
 * just built must not open covered in marks.
 *
 * DELIBERATELY DEVICE-LOCAL (not account-backed): "since I last looked" is a
 * fact about this device's reading, and syncing it would mean opening a list on
 * the phone silently clears the marks on the desktop. It's a reading mark, not
 * portfolio truth — localStorage is the honest home for it.
 */

const KEY = 'pd_lists_seen';

/** null = seen as UNLISTED. A missing key = never seen at all. */
type SeenMap = Record<string, number | null>;

function read(): SeenMap {
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        const out: SeenMap = {};
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
            if (v === null) out[k] = null;
            else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
        }
        return out;
    } catch { return {}; }
}

function write(map: SeenMap): void {
    try { window.localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* private mode */ }
}

/** What this member looked like last time it was read. `undefined` = never. */
export function seenAsk(key: string): number | null | undefined {
    return read()[key];
}

/**
 * Has this member moved since it was last read? A member never read before is
 * NOT changed — the mark means "this moved", never "you haven't looked yet".
 * A listed→unlisted flip counts (it sold or came down), as does the reverse
 * (it came up for sale) and any change of ask.
 */
export function hasMoved(key: string, ask: number | null): boolean {
    const map = read();
    if (!(key in map)) return false;
    return map[key] !== ask;
}

/**
 * Mark these members read, at the asks they're showing right now. Called when a
 * list is opened and its prices have landed — opening a list IS looking at it,
 * so that's what clears the marks.
 */
export function markSeen(entries: ReadonlyArray<{ key: string; ask: number | null }>): void {
    if (entries.length === 0) return;
    const map = read();
    let dirty = false;
    for (const e of entries) {
        if (map[e.key] === e.ask && e.key in map) continue;
        map[e.key] = e.ask;
        dirty = true;
    }
    if (dirty) write(map);
}
