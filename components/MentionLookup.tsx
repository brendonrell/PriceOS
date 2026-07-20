'use client';

/*
 * MentionLookup — the @name inline lookup for To-Dos + Notes (Brendon,
 * 2026-07-20).
 *
 * Typing `@` + letters in a wired input/textarea surfaces matching collectors
 * in a small popover under the field. It reuses the app's real pieces, not a
 * lookalike (Rule #0): the one Global Search door (`/api/search` user lane)
 * and the search's own collector rows (`SearchUserRow` — PriceSprite, @name,
 * ✺ badge, the three profile stats). Picking a row completes the handle in
 * place.
 *
 * Rides a body portal (fixed) so the dropdown's transform can't trap it —
 * the same escape every popover in the menu uses (fiat picker / confirm).
 * Only collectors WITH a handle are offered — an @mention is a handle.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SearchUserRow } from './dropdown/GlobalSearchBar';
import type { SearchResponse, SearchUserResult } from '../app/api/search/route';

/* The active "@tok" being typed at the caret, or null. Handle charset matches
   the by-handle route (`[a-z0-9_-]`); the token must follow start-of-text or
   whitespace so emails never trigger it. */
export function mentionTokenAt(value: string, caret: number | null): { start: number; query: string } | null {
    if (caret == null) return null;
    const before = value.slice(0, caret);
    const m = /(^|\s)@([a-zA-Z0-9_-]*)$/.exec(before);
    if (!m) return null;
    return { start: caret - m[2]!.length - 1, query: m[2]!.toLowerCase() };
}

/** Complete a pick: swap the @token for @handle + a space, return the new
 *  value and where the caret lands. */
export function completeMention(
    value: string,
    caret: number,
    tokenStart: number,
    handle: string,
): { next: string; caretAfter: number } {
    const inserted = `@${handle} `;
    const next = value.slice(0, tokenStart) + inserted + value.slice(caret);
    return { next, caretAfter: tokenStart + inserted.length };
}

export function MentionLookup({
    value,
    caret,
    anchorRef,
    onPick,
}: {
    value: string;
    caret: number | null;
    /** The input/textarea the popover hangs under. */
    anchorRef: React.RefObject<HTMLElement | null>;
    /** Receives the completed text + where to put the caret. */
    onPick: (next: string, caretAfter: number) => void;
}) {
    const token = useMemo(() => mentionTokenAt(value, caret), [value, caret]);
    const [users, setUsers] = useState<SearchUserResult[]>([]);
    const [dismissedAt, setDismissedAt] = useState<number | null>(null);
    const popRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Look the fragment up through the one search door, debounced.
    useEffect(() => {
        if (!token || token.query.length < 1) {
            setUsers([]);
            return;
        }
        const t = window.setTimeout(async () => {
            abortRef.current?.abort();
            const ac = new AbortController();
            abortRef.current = ac;
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(`@${token.query}`)}`, { signal: ac.signal });
                if (!res.ok) return;
                const j = (await res.json()) as SearchResponse;
                setUsers((j.users ?? []).filter((u) => !!u.handle).slice(0, 5));
            } catch {
                /* stale/aborted — keep what's shown */
            }
        }, 200);
        return () => window.clearTimeout(t);
    }, [token?.query, token?.start]); // eslint-disable-line react-hooks/exhaustive-deps

    // A new token (or more typing) clears a manual dismissal.
    useEffect(() => {
        if (dismissedAt !== null && token?.start !== dismissedAt) setDismissedAt(null);
    }, [token?.start, dismissedAt]);

    const open = !!token && users.length > 0 && dismissedAt !== token.start;

    // Outside tap dismisses (typing continues to drive the query).
    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: PointerEvent) => {
            if (popRef.current?.contains(e.target as Node)) return;
            if (anchorRef.current?.contains(e.target as Node)) return;
            setDismissedAt(token!.start);
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        return () => document.removeEventListener('pointerdown', onPointerDown, true);
    }, [open, token, anchorRef]);

    if (!open || typeof document === 'undefined') return null;
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return null;

    return createPortal(
        <div
            ref={popRef}
            className="mention-pop"
            style={{ top: rect.bottom + 6, left: rect.left, minWidth: Math.min(rect.width, window.innerWidth - rect.left - 12) }}
            role="listbox"
        >
            {users.map((u) => (
                <SearchUserRow
                    key={u.address}
                    user={u}
                    onGo={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!token || caret == null) return;
                        const { next, caretAfter } = completeMention(value, caret, token.start, u.handle!);
                        onPick(next, caretAfter);
                    }}
                />
            ))}
        </div>,
        document.body,
    );
}
