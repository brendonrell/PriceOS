'use client';

/*
 * anchorStore — the ONE write path for D17 personal anchor prices
 * (localStorage 'pd_anchors', keyed by project TITLE — the key every
 * caller of openAnchorPrompt passes).
 *
 * Extracted from ValuePromptContext's inline finalize (2026-07-19, the
 * Command Stone build) so the Stone's ETCH and the anchor prompt write
 * through byte-identical mechanics: storage write, body.anchor-active
 * toggle, and the 'pd:anchors-changed' event every consumer re-stamps on.
 * Behaviour is unchanged — this is the same code with a front door.
 */

const ANCHORS_KEY = 'pd_anchors';

/** The whole anchors map, straight from storage. Empty object on failure. */
export function readAnchors(): Record<string, number> {
    try {
        if (typeof window === 'undefined') return {};
        const raw = window.localStorage.getItem(ANCHORS_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object'
            ? (parsed as Record<string, number>)
            : {};
    } catch {
        return {};
    }
}

/** One key's saved anchor, or null when unset/invalid. */
export function readAnchor(key: string): number | null {
    const v = readAnchors()[key];
    return typeof v === 'number' && isFinite(v) && v > 0 ? v : null;
}

/**
 * Set (value > 0) or clear (value null) one anchor. Persists, keeps
 * body.anchor-active consistent, and dispatches 'pd:anchors-changed'
 * with the same detail shape consumers already listen for.
 */
export function writeAnchor(key: string, value: number | null): void {
    const next = readAnchors();
    if (typeof value === 'number' && isFinite(value) && value > 0) {
        next[key] = value;
    } else {
        delete next[key];
    }
    try {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(ANCHORS_KEY, JSON.stringify(next));
        }
    } catch { /* swallow */ }
    if (typeof document !== 'undefined') {
        const hasAny = Object.values(next).some(
            (v) => typeof v === 'number' && isFinite(v) && v > 0
        );
        document.body.classList.toggle('anchor-active', hasAny);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(
            new CustomEvent('pd:anchors-changed', {
                detail: { key, value: next[key] ?? null },
            })
        );
    }
}
