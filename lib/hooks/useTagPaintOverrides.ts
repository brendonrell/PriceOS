'use client';

/*
 * useTagPaintOverrides — per-tag longpress toggle between the all-tags paint
 * and a tag's own original colours (Brendon, 2026-09-18).
 *
 * Device-local (localStorage), keyed by tag id:
 *   pd_tag_paint_overrides  { [tagId]: 'own' | paintId }  — this tag's look
 *   pd_tag_paint_prev       { [tagId]: paintId }          — last paint it wore
 *
 * Longpress on a painted tag  → original colours (remembers the paint it had).
 * Longpress on an original tag → back to the previous paint; none = All Dot.
 */

import { useCallback, useEffect, useState } from 'react';
import { isValidTagPaint } from '@/lib/tags/catalog';

const OVERRIDES_KEY = 'pd_tag_paint_overrides';
const PREV_KEY = 'pd_tag_paint_prev';
export const OWN_COLOURS = 'own';
const FALLBACK_PAINT = 'black'; // All Dot

type Map = Record<string, string>;
type State = { o: Map; p: Map };

function read(key: string, allowOwn: boolean): Map {
    if (typeof window === 'undefined') return {};
    try {
        const raw = JSON.parse(localStorage.getItem(key) ?? '{}');
        const out: Map = {};
        for (const [id, v] of Object.entries(raw ?? {})) {
            if ((allowOwn && v === OWN_COLOURS) || isValidTagPaint(v)) out[id] = v as string;
        }
        return out;
    } catch {
        return {};
    }
}

function write(key: string, value: Map) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* device-local nicety */ }
}

export function useTagPaintOverrides() {
    const [state, setState] = useState<State>({ o: {}, p: {} });

    useEffect(() => {
        setState({ o: read(OVERRIDES_KEY, true), p: read(PREV_KEY, false) });
    }, []);

    /** @param globalPaint the owner's all-tags paint (users.tag_paint), or null. */
    const toggle = useCallback((tagId: string, globalPaint: string | null) => {
        setState((cur) => {
            const now = cur.o[tagId] ?? globalPaint;
            const o = { ...cur.o };
            const p = { ...cur.p };
            if (now && now !== OWN_COLOURS) {
                p[tagId] = now;
                o[tagId] = OWN_COLOURS;
            } else {
                const target = p[tagId] ?? FALLBACK_PAINT;
                if (target === globalPaint) delete o[tagId];
                else o[tagId] = target;
            }
            write(OVERRIDES_KEY, o);
            write(PREV_KEY, p);
            return { o, p };
        });
    }, []);

    return { overrides: state.o, toggle };
}
