'use client';

/*
 * useUserTags — profile tags for a LIST of people, in one read (Brendon,
 * 2026-07-24).
 *
 * Tags started life on the profile page only. They now ride every surface that
 * lists people, so this hook is the single door those surfaces knock on: hand it
 * the handles currently on screen, get back handle → ordered Tag[].
 *
 * Two things keep it cheap on a phone:
 *   • a MODULE-level cache, so the same person's tags are fetched once per
 *     session no matter how many surfaces show them (the leaderboard, the
 *     followers list and the dossier all share it);
 *   • one batched request for everything still missing, not one per row.
 *
 * The server hands back FACTS, never finished chips — deriveTags runs here, off
 * lib/tags/catalog, so that one file stays the only place a tag's colour or
 * label is defined and a change there repaints every surface at once.
 */

import { useEffect, useMemo, useState } from 'react';
import { deriveTags } from '../tags/derive';
import { useRudxaneRoll } from './useRudxaneRoll';
import type { Tag } from '../tags/catalog';
import type { TagFacts } from '../../app/api/tags/route';

/** What a surface needs to paint one person's tags identically to their profile. */
export interface UserTagSet {
    tags: Tag[];
    /** The owner's @name font — their tag labels wear it on their profile too. */
    font: string | null;
    /** The owner's all-tags paint, or null for each tag's own colour. */
    paint: string | null;
}

const cache = new Map<string, TagFacts | null>();
/** In-flight handles, so two surfaces mounting together don't both fetch them. */
const pending = new Map<string, Promise<void>>();
/** Bumped whenever the cache grows, so mounted hooks re-read it. */
let version = 0;
const listeners = new Set<() => void>();

function publish() {
    version += 1;
    for (const l of listeners) l();
}

/** Request-size cap — matches the endpoint's own ceiling. */
const CHUNK = 120;

async function fetchChunk(handles: string[]): Promise<void> {
    try {
        const r = await fetch(`/api/tags?handles=${encodeURIComponent(handles.join(','))}`, {
            cache: 'no-store',
        });
        const d = r.ok ? ((await r.json()) as { users?: Record<string, TagFacts> }) : null;
        const users = d?.users ?? {};
        // Miss = cached as null so a handle with no row is never re-requested.
        for (const h of handles) cache.set(h, users[h] ?? null);
    } catch {
        for (const h of handles) cache.set(h, null);
    } finally {
        for (const h of handles) pending.delete(h);
    }
}

function load(handles: string[]): void {
    const want = handles.filter((h) => !cache.has(h) && !pending.has(h));
    if (!want.length) return;
    for (let i = 0; i < want.length; i += CHUNK) {
        const chunk = want.slice(i, i + CHUNK);
        const p = fetchChunk(chunk).then(publish);
        for (const h of chunk) pending.set(h, p);
    }
}

/**
 * @param handles The people currently on screen. Order and duplicates don't
 *   matter; pass whatever the list has.
 * @returns handle (lowercase) → their tag set. Absent while loading, and absent
 *   for anyone with no tags — a surface just renders nothing for them.
 */
export function useUserTags(handles: readonly (string | null | undefined)[]): Record<string, UserTagSet> {
    const key = useMemo(() => {
        const clean = [...new Set(handles.filter((h): h is string => !!h).map((h) => h.toLowerCase()))];
        clean.sort();
        return clean.join(',');
    }, [handles]);

    const [, setTick] = useState(0);
    /* @rudxane's chip re-rolls per page load — one roll shared by every row. */
    const rudxaneRoll = useRudxaneRoll();

    useEffect(() => {
        const l = () => setTick(version);
        listeners.add(l);
        return () => { listeners.delete(l); };
    }, []);

    useEffect(() => {
        if (key) load(key.split(','));
    }, [key]);

    return useMemo(() => {
        const out: Record<string, UserTagSet> = {};
        if (!key) return out;
        for (const h of key.split(',')) {
            const f = cache.get(h);
            if (!f) continue;
            const tags = deriveTags({
                profileTags: f.profileTags,
                grantedTags: f.grantedTags,
                userNumber: f.userNumber,
                isArtist: f.isArtist,
                createdAt: f.createdAt,
                address: f.address,
                priceHoldRank: f.priceHoldRank,
                priceHeld: f.priceHeld,
                shownTags: f.shownTags,
                tagsOff: f.tagsOff,
                projects: f.projects,
                clearedMonths: f.clearedMonths,
                handle: f.handle,
                teamTagStyle: f.teamTagStyle,
                rudxaneRoll,
            });
            if (tags.length) out[h] = { tags, font: f.nameFont, paint: f.tagPaint };
        }
        return out;
        // `version` is the cache's change signal — the tick above re-runs this.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, version, rudxaneRoll]);
}
