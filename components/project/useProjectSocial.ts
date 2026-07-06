'use client';

/*
 * useProjectSocial — the project page's social reads: the viewer's follow
 * graph (My Network filter data), the artist's follower/mutual tags for
 * the identity row, the top-5 holders set, and the project's own follow
 * counts. Split out of ProjectPageBody 2026-07-06 — pure move, no
 * behavior change.
 */

import { useEffect, useMemo, useState } from 'react';
import { useProject } from '../../lib/state/ProjectContext';
import { useAuth } from '../../lib/state/AuthContext';
import { getProject } from '../../lib/project/registry';

export function useProjectSocial() {
    const project = useProject();
    const def = getProject(project.slug);
    const { siweAddress, handle: viewerHandle } = useAuth();

    /* My Network — REAL filter data (Brendon 2026-06-11). The viewer's
       follow graph (handles + addresses, lowercased) feeds Mutuals /
       Following / Followers; Top Holders and New Wallets derive from the
       reconciled outputs below. */
    const [netSets, setNetSets] = useState<{ followers: Set<string>; following: Set<string> }>(
        { followers: new Set(), following: new Set() },
    );
    useEffect(() => {
        if (!siweAddress) { setNetSets({ followers: new Set(), following: new Set() }); return; }
        let cancelled = false;
        fetch('/api/follows/' + siweAddress.toLowerCase(), { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (cancelled || !d) return;
                const norm = (arr: unknown) => new Set(
                    (Array.isArray(arr) ? (arr as string[]) : []).map((v) => String(v).toLowerCase().replace(/^@/, '')),
                );
                setNetSets({ followers: norm(d.followers), following: norm(d.following) });
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [siweAddress]);

    /* The ARTIST's real social tags for the identity row (Brendon 2026-06-15 —
       was hardcoded "⚭ 2.2k"). Follower count from the artist's profile; the
       mutual badge shows only when the viewer and artist follow each other.
       Hidden entirely at 0 followers (rendered conditionally below). */
    const [artistSocial, setArtistSocial] = useState<{ followers: number; mutual: boolean }>(
        { followers: 0, mutual: false },
    );
    useEffect(() => {
        const handle = def?.artistHandle;
        if (!handle) return;
        const h = handle.toLowerCase();
        let cancelled = false;
        const load = async () => {
            try {
                const profRes = await fetch(`/api/user/by-handle/${handle}`, { cache: 'no-store' });
                const prof = profRes.ok ? await profRes.json() : null;
                const followers = prof?.follower_count ?? 0;
                /* A user is mutuals with themselves (Brendon, 2026-06-16) — the
                   viewer looking at their OWN project sees the mutual badge on
                   the artist row, no real self-follow row required. */
                let mutual = (viewerHandle ?? '').toLowerCase().replace(/^@/, '') === h;
                if (!mutual && siweAddress) {
                    const fRes = await fetch(`/api/follows/${siweAddress.toLowerCase()}`, { cache: 'no-store' });
                    const f = fRes.ok ? await fRes.json() : null;
                    const lc = (a: unknown) => (Array.isArray(a) ? (a as string[]) : []).map((v) => String(v).toLowerCase().replace(/^@/, ''));
                    const following = lc(f?.following_handles);
                    const followerH = lc(f?.follower_handles);
                    mutual = following.includes(h) && followerH.includes(h);
                }
                if (!cancelled) setArtistSocial({ followers, mutual });
            } catch { /* keep last good */ }
        };
        load();
        const onCh = () => load();
        window.addEventListener('pd:follows-changed', onCh);
        window.addEventListener('pd:project-refresh', onCh);
        return () => {
            cancelled = true;
            window.removeEventListener('pd:follows-changed', onCh);
            window.removeEventListener('pd:project-refresh', onCh);
        };
    }, [def?.artistHandle, siweAddress, viewerHandle]);

    /* Top 5 holders of THIS project by held count (reconciled owners). */
    const topHolders = useMemo(() => {
        const counts = new Map<string, number>();
        project.outputs.forEach((m) => {
            const a = (m.ownerFull || '').toLowerCase();
            if (a) counts.set(a, (counts.get(a) ?? 0) + 1);
        });
        return new Set([...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map((e) => e[0]));
    }, [project.outputs, project.totalOutputs]);

    return { netSets, artistSocial, topHolders };
}
