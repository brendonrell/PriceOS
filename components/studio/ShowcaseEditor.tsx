'use client';

/*
 * ShowcaseEditor — the Studio's per-project Showcase customizer
 * (Brendon, 2026-07-20: "artists need easy to use and powerful tools to
 * customize the showcase of each project they release… make it obvious
 * how to 'manual' it").
 *
 * MANUAL is the headline: numbered slots (the set, in the artist's order),
 * add-by-number, tap-to-seat from the full minted grid, ‹ › nudges. The
 * turnkey options sit below: FIRST MINTS (the platform default) and GEN
 * CURATED ⑈ (the profile engine, run over this project's pieces — caption
 * shown as the placard on the project page). PRESENTATION: layout
 * (CLASSIC / MASONRY / LARGE-SMALL) + the little titles.
 *
 * Writes ride PATCH /api/project/[slug]/showcase (SIWE, artist-only).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../../lib/state/ToastContext';
import { artThumbUrl } from '../../lib/project/registry';
import { genCuratedSet, type CuratedCandidate } from '../../lib/profile/genCurated';
import { resolveBucket, resolveFingerprint, resolveStoredTraits } from '../../lib/art/colorStore';
import type { ArtistResponse } from '../../app/api/artist/[address]/route';

const MAX_PICKS = 12;
const LAYOUTS = [
    { key: 'classic', label: 'CLASSIC' },
    { key: 'masonry', label: 'MASONRY' },
    { key: 'mixed', label: 'LARGE/SMALL' },
] as const;
type Layout = (typeof LAYOUTS)[number]['key'];

interface ProjectRow { id: string; title: string; minted: number }

export function ShowcaseEditor({ address }: { address: string | null }) {
    const { showToast } = useToast();

    const [projects, setProjects] = useState<ProjectRow[]>([]);
    const [slug, setSlug] = useState<string | null>(null);
    const [minted, setMinted] = useState(0);
    const [ids, setIds] = useState<number[]>([]);
    const [layout, setLayout] = useState<Layout>('classic');
    const [titles, setTitles] = useState(false);
    const [caption, setCaption] = useState<string | null>(null);
    const [addNum, setAddNum] = useState('');
    const [saving, setSaving] = useState(false);
    const [loaded, setLoaded] = useState(false);

    /* The artist's released projects. */
    useEffect(() => {
        if (!address) return;
        let gone = false;
        fetch(`/api/artist/${address.toLowerCase()}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d: ArtistResponse | null) => {
                if (gone || !d) return;
                const rows = (d.projects ?? [])
                    .filter((p) => p.minted_count > 0)
                    .map((p) => ({ id: p.id, title: p.title, minted: p.minted_count }));
                setProjects(rows);
                if (rows[0] && !slug) setSlug(rows[0].id);
            })
            .catch(() => { /* quiet — the card just doesn't render */ });
        return () => { gone = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [address]);

    /* The selected project's current Showcase state. */
    useEffect(() => {
        if (!slug) return;
        let gone = false;
        setLoaded(false);
        fetch(`/api/project/${slug}/outputs`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d: { total?: number; showcase_ids?: number[]; showcase_layout?: Layout; showcase_titles?: boolean; showcase_caption?: string | null } | null) => {
                if (gone || !d) return;
                setMinted(d.total ?? 0);
                setIds(Array.isArray(d.showcase_ids) ? d.showcase_ids.slice(0, MAX_PICKS) : []);
                setLayout(d.showcase_layout ?? 'classic');
                setTitles(d.showcase_titles === true);
                setCaption(d.showcase_caption ?? null);
                setLoaded(true);
            })
            .catch(() => { /* quiet */ });
        return () => { gone = true; };
    }, [slug]);

    const seat = useCallback((id: number) => {
        setCaption(null); // touching the set by hand ends the engine's placard
        setIds((prev) => {
            if (prev.includes(id)) return prev.filter((x) => x !== id);
            if (prev.length >= MAX_PICKS) return prev;
            return [...prev, id];
        });
    }, []);

    const nudge = (i: number, dir: -1 | 1) => {
        setIds((prev) => {
            const j = i + dir;
            if (j < 0 || j >= prev.length) return prev;
            const next = [...prev];
            [next[i], next[j]] = [next[j], next[i]];
            return next;
        });
    };

    const addByNumber = () => {
        const n = Number(addNum);
        if (!Number.isInteger(n) || n < 1 || n > minted) {
            showToast(`Showcase: NO #${addNum || '?'} — minted runs 1–${minted}`);
            return;
        }
        seat(n);
        setAddNum('');
    };

    /* Turnkey: the engine curates THIS project's pieces. */
    const genCurate = () => {
        if (!slug || minted === 0) return;
        const pool: CuratedCandidate[] = [];
        const cap = Math.min(minted, 400);
        for (let id = 1; id <= cap; id++) {
            const fp = resolveFingerprint(slug, id);
            pool.push({
                slug,
                id,
                color: resolveBucket(slug, id),
                aspect: fp?.aspect ?? undefined,
                brightness: fp?.brightness ?? undefined,
                saturation: fp?.saturation ?? undefined,
                complexity: fp?.complexity ?? undefined,
                mintMs: (() => { const m = resolveStoredTraits(slug, id)?.mintedAt; const n = m != null ? Date.parse(String(m)) : NaN; return Number.isFinite(n) ? n : null; })(),
            });
        }
        const set = genCuratedSet(pool);
        setIds(set.picks.map((p) => p.id).slice(0, MAX_PICKS));
        setCaption(set.caption);
        showToast(`Gen Curated: “${set.caption.toUpperCase()}”`);
    };

    const save = async () => {
        if (!slug || saving) return;
        setSaving(true);
        try {
            const r = await fetch(`/api/project/${slug}/showcase`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, layout, titles, caption }),
            });
            if (!r.ok) {
                const e = (await r.json().catch(() => null)) as { error?: string } | null;
                showToast(`Showcase: ${(e?.error ?? 'SAVE FAILED').toUpperCase()}`);
                return;
            }
            showToast('Showcase: SAVED');
        } finally {
            setSaving(false);
        }
    };

    const gridIds = useMemo(() => Array.from({ length: Math.min(minted, 120) }, (_, i) => i + 1), [minted]);

    if (!address || projects.length === 0) return null;

    return (
        <div className="sce-card" id="showcase-editor">
            <div className="sce-head">SHOWCASE — WHAT VISITORS SEE FIRST</div>
            {projects.length > 1 && (
                <div className="sce-projrow">
                    {projects.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            className={`sce-pill${p.id === slug ? ' on' : ''}`}
                            onClick={() => setSlug(p.id)}
                        >
                            {p.title.toUpperCase()}
                        </button>
                    ))}
                </div>
            )}
            {!loaded ? (
                <div className="sce-hint">loading…</div>
            ) : (
                <>
                    <div className="sce-sub">MANUAL — YOUR HAND, YOUR ORDER</div>
                    <div className="sce-slots">
                        {ids.map((id, i) => (
                            <div key={id} className="sce-slot">
                                {artThumbUrl(slug!, id)
                                    ? <img src={artThumbUrl(slug!, id)!} alt={`#${id}`} draggable={false} />
                                    : <span className="sce-slot-id">#{id}</span>}
                                <span className="sce-ord">{i + 1}</span>
                                <span className="sce-slot-keys">
                                    <button type="button" onClick={() => nudge(i, -1)} aria-label="Earlier">‹</button>
                                    <button type="button" onClick={() => nudge(i, 1)} aria-label="Later">›</button>
                                    <button type="button" onClick={() => seat(id)} aria-label="Drop">×</button>
                                </span>
                            </div>
                        ))}
                        {ids.length < MAX_PICKS && <div className="sce-slot sce-slot-empty">+</div>}
                    </div>
                    <div className="sce-hint">
                        {ids.length === 0
                            ? `empty set = the default (first mints lead the tab)`
                            : `slot 1 LEADS every layout · ${ids.length}/${MAX_PICKS}`}
                    </div>
                    <div className="sce-addrow">
                        <input
                            className="sce-add"
                            inputMode="numeric"
                            placeholder={`+ add by number (1–${minted})`}
                            value={addNum}
                            onChange={(e) => setAddNum(e.target.value.replace(/\D/g, ''))}
                            onKeyDown={(e) => { if (e.key === 'Enter') addByNumber(); }}
                        />
                        <button type="button" className="sce-pill" onClick={addByNumber}>SEAT IT</button>
                        <span className="sce-hint2">or tap pieces below</span>
                    </div>
                    <div className="sce-grid">
                        {gridIds.map((id) => {
                            const on = ids.includes(id);
                            const thumb = artThumbUrl(slug!, id);
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    className={`sce-pick${on ? ' on' : ''}`}
                                    onClick={() => seat(id)}
                                    title={`#${id}`}
                                >
                                    {thumb ? <img src={thumb} alt={`#${id}`} loading="lazy" draggable={false} /> : <span>#{id}</span>}
                                    <span className="sce-ms">{on ? '▣︎' : '❐︎'}</span>
                                </button>
                            );
                        })}
                    </div>
                    {minted > 120 && <div className="sce-hint">first 120 shown — seat higher numbers by the field above</div>}

                    <div className="sce-sub">TURNKEY — ONE TAP</div>
                    <div className="sce-projrow">
                        <button type="button" className="sce-pill" onClick={() => { setIds([]); setCaption(null); showToast('Showcase: FIRST MINTS'); }}>
                            FIRST MINTS (the default)
                        </button>
                        <button type="button" className="sce-pill" onClick={genCurate}>
                            GEN CURATED {'⑈︎'}
                        </button>
                    </div>
                    {caption && <div className="sce-hint">{'⑈︎'} the placard will read “{caption}”</div>}

                    <div className="sce-sub">PRESENTATION</div>
                    <div className="sce-projrow">
                        {LAYOUTS.map((l) => (
                            <button
                                key={l.key}
                                type="button"
                                className={`sce-pill${layout === l.key ? ' on' : ''}`}
                                onClick={() => setLayout(l.key)}
                            >
                                {l.label}
                            </button>
                        ))}
                    </div>
                    <div className="sce-projrow">
                        <button type="button" className={`sce-pill${!titles ? ' on' : ''}`} onClick={() => setTitles(false)}>TITLES OFF</button>
                        <button type="button" className={`sce-pill${titles ? ' on' : ''}`} onClick={() => setTitles(true)}>TITLES ON — little placards</button>
                    </div>

                    <button type="button" className="sce-save" onClick={() => void save()} disabled={saving}>
                        {saving ? 'SAVING…' : 'SAVE — the project page updates now'}
                    </button>
                </>
            )}
        </div>
    );
}
