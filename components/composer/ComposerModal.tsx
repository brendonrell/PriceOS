'use client';

/*
 * The Composer ⊚ — visual query builder over PD's whole dataset.
 *
 * Spec: ClickUp task 86b9eu9wn + docs/briefs/composer-v1.md; UI per the
 * approved 2026-07-13 mocks (builder · results · Programs · Spell Book
 * pill). Three views inside one full-screen platform modal:
 *
 *   BUILDER  — Airtable-style stacked rule rows (field → condition →
 *              value pills; tap a pill to open its editor tray beneath
 *              the row), scope picker, the standard sort/group row, a
 *              live match-count strip, SAVE AS PROGRAM.
 *   RESULTS  — the existing grouped gallery VERBATIM (ArtworkCard in
 *              ProjectProvider + .gallery-group-header collapse), fed by
 *              the composed query; query summarised as chips (EDIT ▸
 *              reopens the builder).
 *   PROGRAMS — the saved-query shelf: live counts, one-line summaries,
 *              long-press a row to rename/delete, + NEW PROGRAM.
 *
 * A Program stores the CONFIG, never results — every open re-runs live.
 * Opened from the Spell Book's The Composer pill (temporary switch —
 * Brendon is choosing the permanent home). Mounted globally in
 * PriceOSShell; fire useModal().open('composer').
 */

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useModal } from '../../lib/state/ModalContext';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import {
    GROUP_GLYPH, GROUP_BTN_ICON, GROUP_LABEL, groupHeaderGlyph,
    type GroupKey, type SortDir,
} from '../../lib/state/SortContext';
import { COLOR_BUCKET_ORDER } from '../../lib/art/outputColor';
import { getProject } from '../../lib/project/registry';
import { ProjectProvider } from '../../lib/state/ProjectContext';
import ArtworkCard from '../ArtworkCard';
import { useComposerData } from '../../lib/composer/useComposerData';
import {
    useComposerGallery, COMPOSER_GROUP_ORDER,
} from '../../lib/composer/useComposerGallery';
import {
    runQuery, ruleIsComplete, ruleFieldLabel, ruleOpLabel, ruleValueLabel,
    querySummary, querySentence, EMPTY_QUERY, FIELD_GLYPH,
    OWNER_CLASS_FACE, LIST_FACE, EMPTY_CTX,
    type ComposerQuery, type ComposerRule, type ComposerSortKey, type FacetField,
    type ComposerCtx, type MyList, type OwnerClass,
} from '../../lib/composer/query';
import { getStarredKeys, subscribeStarred } from '../../lib/pins/starStore';
import { getWishlistKeys, subscribeWishlist } from '../../lib/pins/wishlistStore';
import { getAlbums, subscribeAlbums } from '../../lib/pins/albumStore';
import { fullTraitSchema } from '../../lib/project/registry';
import {
    getPrograms, saveProgram, renameProgram, deleteProgram, subscribePrograms,
    type ComposerProgram,
} from '../../lib/composer/programStore';

type View = 'builder' | 'results' | 'programs';
type Segment = 'field' | 'op' | 'value';

const SORT_PILLS: { key: ComposerSortKey; label: string }[] = [
    { key: 'price', label: 'PRICE' },
    { key: 'rarity', label: 'RARITY' },
    { key: 'id', label: '#ID' },
    { key: 'az', label: 'AZ' },
];

const RARITY_PCTS = [1, 5, 10, 25, 50];

/** Fresh default rule per field pick. */
function defaultRuleFor(field: string): ComposerRule {
    switch (field) {
        case 'Artist':
        case 'Project':
        case 'Fate':   return { kind: 'facet', field: field as FacetField, op: 'is', values: [] };
        case 'listed': return { kind: 'listed', op: 'listed' };
        case 'owner':  return { kind: 'owner', op: 'notMe' };
        case 'color':  return { kind: 'color', values: [] };
        case 'rarity': return { kind: 'rarity', op: 'top', pct: 10 };
        case 'list':   return { kind: 'list', list: 'wishlist', op: 'in' };
        default:
            if (field.startsWith('trait:')) {
                return { kind: 'trait', name: field.slice(6), op: 'is', values: [] };
            }
            return { kind: 'facet', field: 'Artist', op: 'is', values: [] };
    }
}

function fieldKeyOf(r: ComposerRule): string {
    if (r.kind === 'facet') return r.field;
    if (r.kind === 'trait') return `trait:${r.name}`;
    return r.kind;
}

/** Label a Project facet value ('@slug') with its display name. */
function facetValueFace(field: FacetField, v: string): string {
    if (field === 'Project') {
        const p = getProject(v.replace(/^@/, ''));
        if (p) return p.displayName;
    }
    return v.replace(/^@/, '').toUpperCase();
}

export default function ComposerModal() {
    const { openModal, close } = useModal();
    const { siweAddress } = useAuth();
    const { showToast } = useToast();
    const isOpen = openModal?.name === 'composer';

    /* ── query + view state (survives close/reopen within the session) ── */
    const [query, setQuery] = useState<ComposerQuery>(EMPTY_QUERY);
    const [programName, setProgramName] = useState<string | null>(null);
    const [view, setView] = useState<View>('builder');
    const [editing, setEditing] = useState<{ rule: number; seg: Segment } | null>(null);
    const [scopeOpen, setScopeOpen] = useState(false);
    const [saveOpen, setSaveOpen] = useState(false);
    const [saveName, setSaveName] = useState('');

    /* Programs — live store subscription. */
    const [programs, setPrograms] = useState<readonly ComposerProgram[]>(() => getPrograms());
    useEffect(() => subscribePrograms(setPrograms), []);

    /* On each fresh open: land on the shelf when Programs exist, else the
       builder (the shelf is the tool's home once it has residents). */
    const wasOpen = useRef(false);
    useEffect(() => {
        if (isOpen && !wasOpen.current) {
            setView(getPrograms().length > 0 ? 'programs' : 'builder');
            setEditing(null); setScopeOpen(false); setSaveOpen(false);
        }
        wasOpen.current = isOpen;
    }, [isOpen]);

    /* ── dataset ────────────────────────────────────────────────────── */
    const { rows, mintedSlugs, loading } = useComposerData(isOpen);
    const me = siweAddress ? siweAddress.toLowerCase() : null;

    /* ── the viewer's world (v1.1) — follow graph + pin stores + the two
          per-project derivations. All existing machinery: the follows
          endpoint is useProjectSocial's, the key-sets are the pin stores',
          and top-holders/Cartel derive straight off the dataset. ── */
    const [graph, setGraph] = useState<{ following: Set<string>; followers: Set<string> }>(
        { following: new Set(), followers: new Set() },
    );
    useEffect(() => {
        if (!isOpen || !me) { setGraph({ following: new Set(), followers: new Set() }); return; }
        let cancelled = false;
        fetch('/api/follows/' + me, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (cancelled || !d) return;
                const norm = (arr: unknown) => new Set(
                    (Array.isArray(arr) ? (arr as string[]) : []).map((v) => String(v).toLowerCase().replace(/^@/, '')),
                );
                setGraph({ following: norm(d.following), followers: norm(d.followers) });
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [isOpen, me]);

    const [starredKeys, setStarredKeys] = useState<ReadonlySet<string>>(() => getStarredKeys());
    const [wishlistKeys, setWishlistKeys] = useState<ReadonlySet<string>>(() => getWishlistKeys());
    const [albumKeys, setAlbumKeys] = useState<ReadonlySet<string>>(
        () => new Set(getAlbums().flatMap((a) => [...a.keys])),
    );
    useEffect(() => subscribeStarred(setStarredKeys), []);
    useEffect(() => subscribeWishlist(setWishlistKeys), []);
    useEffect(() => subscribeAlbums(() => setAlbumKeys(new Set(getAlbums().flatMap((a) => [...a.keys])))), []);

    const ctx = useMemo<ComposerCtx>(() => {
        /* Per-project holder tallies once; top-5 per project (the
           useProjectSocial derivation, over the composer dataset). */
        const counts = new Map<string, Map<string, number>>();
        for (const r of rows) {
            if (!r.ownerAddr) continue;
            const m = counts.get(r.slug) ?? new Map<string, number>();
            m.set(r.ownerAddr, (m.get(r.ownerAddr) ?? 0) + 1);
            counts.set(r.slug, m);
        }
        const topHoldersBySlug = new Map<string, ReadonlySet<string>>();
        for (const [slug, m] of counts) {
            topHoldersBySlug.set(
                slug,
                new Set([...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map((e) => e[0])),
            );
        }
        /* THE CARTEL ⟁ — the Friend Inspector's shared-holdings read, per
           project: my mutuals who hold ground where I hold ground. */
        const cartelBySlug = new Map<string, ReadonlySet<string>>();
        if (me) {
            const isMutual = (r: { ownerAddr: string; ownerHandle: string | null }) =>
                (graph.following.has(r.ownerAddr) || (r.ownerHandle != null && graph.following.has(r.ownerHandle.toLowerCase())))
                && (graph.followers.has(r.ownerAddr) || (r.ownerHandle != null && graph.followers.has(r.ownerHandle.toLowerCase())));
            const mySlugs = new Set(rows.filter((r) => r.ownerAddr === me).map((r) => r.slug));
            for (const slug of mySlugs) {
                const members = new Set<string>();
                for (const r of rows) {
                    if (r.slug === slug && r.ownerAddr !== me && isMutual(r)) members.add(r.ownerAddr);
                }
                if (members.size) cartelBySlug.set(slug, members);
            }
        }
        return {
            ...EMPTY_CTX,
            me,
            following: graph.following,
            followers: graph.followers,
            starred: starredKeys,
            wishlist: wishlistKeys,
            albums: albumKeys,
            topHoldersBySlug,
            cartelBySlug,
        };
    }, [rows, me, graph, starredKeys, wishlistKeys, albumKeys]);

    /* Value pools for the facet trays, computed over the scoped dataset. */
    const scopeRows = useMemo(
        () => (query.scope ? rows.filter((r) => query.scope!.includes(r.slug)) : rows),
        [rows, query.scope],
    );
    const facetPools = useMemo(() => {
        const pools: Record<FacetField, string[]> = { Artist: [], Project: [], Fate: [] };
        const seen: Record<FacetField, Set<string>> = {
            Artist: new Set(), Project: new Set(), Fate: new Set(),
        };
        for (const r of scopeRows) {
            for (const f of ['Artist', 'Project', 'Fate'] as FacetField[]) {
                const v = r.traits[f];
                if (v != null && !seen[f].has(v)) { seen[f].add(v); pools[f].push(v); }
            }
        }
        for (const f of ['Artist', 'Project', 'Fate'] as FacetField[]) {
            pools[f].sort((a, b) => facetValueFace(f, a).localeCompare(facetValueFace(f, b)));
        }
        return pools;
    }, [scopeRows]);

    /* ── the live match ─────────────────────────────────────────────── */
    /* The match, timed — the machine brags about its speed in the live strip. */
    const [matched, queryMs] = useMemo<[ReturnType<typeof runQuery>, number]>(() => {
        const t0 = performance.now();
        const m = runQuery(query, rows, ctx);
        return [m, Math.max(1, Math.round(performance.now() - t0))];
    }, [query, rows, ctx]);

    /* Count delta — every rule edit visibly bites: a +N/−N chip flashes
       beside the count, then leaves (the fade IS the meaning: it's a
       moment, not a state). */
    const prevCount = useRef<number | null>(null);
    const [delta, setDelta] = useState<number | null>(null);
    useEffect(() => {
        if (loading) return;
        const n = matched.length;
        if (prevCount.current != null && n !== prevCount.current) {
            setDelta(n - prevCount.current);
            prevCount.current = n;
            const t = window.setTimeout(() => setDelta(null), 1100);
            return () => window.clearTimeout(t);
        }
        prevCount.current = n;
    }, [matched.length, loading]);
    const { blocks, runs, collapsedGroups, toggleGroupCollapse } =
        useComposerGallery(matched, query.sort, query.dir, query.group);

    /* Progressive reveal for the results grid (the Collected contract). */
    const REVEAL_FIRST = 24;
    const REVEAL_STEP = 48;
    const [revealCount, setRevealCount] = useState(REVEAL_FIRST);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => { setRevealCount(REVEAL_FIRST); }, [matched, view]);
    useEffect(() => {
        if (view !== 'results' || revealCount >= matched.length) return;
        const el = sentinelRef.current;
        if (!el) return;
        if (typeof IntersectionObserver === 'undefined') { setRevealCount(matched.length); return; }
        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setRevealCount((c) => Math.min(c + REVEAL_STEP, matched.length));
                }
            },
            { rootMargin: '1200px 0px' },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [view, revealCount, matched.length]);
    const revealSet = useMemo(() => {
        if (revealCount >= matched.length) return null;      // all mounted
        const keys = new Set<string>();
        let n = 0;
        for (const r of matched) {
            if (n >= revealCount) break;
            keys.add(`${r.slug}-${r.token_id}`);
            n++;
        }
        return keys;
    }, [matched, revealCount]);
    const cardShown = (slug: string, id: number) =>
        revealSet === null || revealSet.has(`${slug}-${id}`);

    /* ── query editing helpers ──────────────────────────────────────── */
    const patchRule = (i: number, r: ComposerRule) =>
        setQuery((q) => ({ ...q, rules: q.rules.map((old, j) => (j === i ? r : old)) }));
    const removeRule = (i: number) => {
        setQuery((q) => ({ ...q, rules: q.rules.filter((_, j) => j !== i) }));
        setEditing(null);
    };
    const addRule = () => {
        setQuery((q) => ({ ...q, rules: [...q.rules, defaultRuleFor('Artist')] }));
        setEditing({ rule: query.rules.length, seg: 'value' });
    };
    const toggleEdit = (rule: number, seg: Segment) =>
        setEditing((e) => (e && e.rule === rule && e.seg === seg ? null : { rule, seg }));

    const cycleGroup = () =>
        setQuery((q) => {
            const i = COMPOSER_GROUP_ORDER.indexOf(q.group);
            const next = COMPOSER_GROUP_ORDER[(i + 1) % COMPOSER_GROUP_ORDER.length];
            showToast(`Group: ${GROUP_LABEL[next]}`);
            return { ...q, group: next };
        });
    const tapSort = (key: ComposerSortKey) =>
        setQuery((q) =>
            q.sort === key
                ? { ...q, dir: q.dir === 'asc' ? 'desc' : 'asc' }
                : { ...q, sort: key, dir: 'asc' });

    const doSave = () => {
        const entry = saveProgram(saveName, query);
        setSaveOpen(false);
        setSaveName('');
        setProgramName(entry.name);
        showToast(`Program: SAVED ⊚︎ ${entry.name}`);
        setView('programs');
    };
    const openProgram = (p: ComposerProgram) => {
        setQuery(JSON.parse(JSON.stringify(p.query)) as ComposerQuery);
        setProgramName(p.name);
        setEditing(null);
        setView('results');
    };
    const newProgram = () => {
        setQuery(EMPTY_QUERY);
        setProgramName(null);
        setEditing(null);
        setView('builder');
    };

    /* ── Program row long-press (ProjectTitleStar mechanics: 460ms hold,
          10px drift cancel) → reveals the RENAME / DELETE affordances. ── */
    const [manageIdx, setManageIdx] = useState<number | null>(null);
    const [renameIdx, setRenameIdx] = useState<number | null>(null);
    const [renameVal, setRenameVal] = useState('');
    const pressTimer = useRef<number | null>(null);
    const pressFired = useRef(false);
    const pressPt = useRef<{ x: number; y: number } | null>(null);
    const clearPress = () => {
        if (pressTimer.current != null) { window.clearTimeout(pressTimer.current); pressTimer.current = null; }
    };
    const rowPressDown = (i: number) => (e: React.PointerEvent) => {
        pressFired.current = false;
        pressPt.current = { x: e.clientX, y: e.clientY };
        clearPress();
        pressTimer.current = window.setTimeout(() => {
            pressFired.current = true;
            pressTimer.current = null;
            setManageIdx((cur) => (cur === i ? null : i));
            setRenameIdx(null);
        }, 460);
    };
    const rowPressMove = (e: React.PointerEvent) => {
        if (pressTimer.current == null || !pressPt.current) return;
        const dx = e.clientX - pressPt.current.x;
        const dy = e.clientY - pressPt.current.y;
        if (dx * dx + dy * dy > 100) clearPress();
    };
    const rowPressUp = (p: ComposerProgram) => () => {
        const wasPending = pressTimer.current != null;
        clearPress();
        if (!wasPending || pressFired.current) return;
        openProgram(p);
    };
    useEffect(() => { if (view !== 'programs') { setManageIdx(null); setRenameIdx(null); } }, [view]);

    /* Live counts on the shelf. */
    const programCounts = useMemo(
        () => programs.map((p) => runQuery(p.query, rows, ctx).length),
        [programs, rows, ctx],
    );

    /* ── render helpers ─────────────────────────────────────────────── */

    const editingRule = editing ? query.rules[editing.rule] : null;

    const renderTray = () => {
        if (!editing || !editingRule) return null;
        const i = editing.rule;
        const r = editingRule;

        if (editing.seg === 'field') {
            const fields: { key: string; glyph: string; label: string }[] = [
                { key: 'Artist', glyph: FIELD_GLYPH.Artist, label: 'ARTIST' },
                { key: 'Project', glyph: FIELD_GLYPH.Project, label: 'PROJECT' },
                { key: 'Fate', glyph: FIELD_GLYPH.Fate, label: 'FATE' },
                { key: 'listed', glyph: FIELD_GLYPH.listed, label: 'LISTED' },
                { key: 'owner', glyph: FIELD_GLYPH.owner, label: 'OWNER' },
                { key: 'color', glyph: FIELD_GLYPH.color, label: 'COLOUR' },
                { key: 'rarity', glyph: FIELD_GLYPH.rarity, label: 'RARITY' },
                { key: 'list', glyph: FIELD_GLYPH.list, label: 'MY LISTS' },
                /* Scope narrowed to ONE project → its own trait vocabulary
                   joins the fields (the schema behind the trait pills). */
                ...(query.scope?.length === 1
                    ? Object.keys(fullTraitSchema(query.scope[0])).map((name) => ({
                          key: `trait:${name}`,
                          glyph: FIELD_GLYPH.trait,
                          label: name.toUpperCase(),
                      }))
                    : []),
            ];
            return (
                <div className="cmp-tray">
                    {fields.map((f) => (
                        <button
                            key={f.key}
                            className={`cmp-pill${fieldKeyOf(r) === f.key ? ' is-on' : ''}`}
                            onClick={() => {
                                if (fieldKeyOf(r) !== f.key) patchRule(i, defaultRuleFor(f.key));
                                setEditing({ rule: i, seg: 'value' });
                            }}
                        >
                            <span className="cmp-pill-glyph">{f.glyph}</span> {f.label}
                        </button>
                    ))}
                </div>
            );
        }

        if (editing.seg === 'op') {
            const ops: { label: string; apply: () => void; on: boolean }[] = [];
            if (r.kind === 'facet') {
                ops.push(
                    { label: 'IS ANY OF', on: r.op === 'is', apply: () => patchRule(i, { ...r, op: 'is' }) },
                    { label: 'IS NOT', on: r.op === 'isNot', apply: () => patchRule(i, { ...r, op: 'isNot' }) },
                );
            } else if (r.kind === 'listed') {
                ops.push(
                    { label: 'YES', on: r.op === 'listed', apply: () => patchRule(i, { kind: 'listed', op: 'listed' }) },
                    { label: 'NO', on: r.op === 'unlisted', apply: () => patchRule(i, { kind: 'listed', op: 'unlisted' }) },
                    { label: 'BELOW ◊︎', on: r.op === 'below', apply: () => patchRule(i, { kind: 'listed', op: 'below', eth: r.eth ?? '0.5' }) },
                    { label: 'ABOVE ◊︎', on: r.op === 'above', apply: () => patchRule(i, { kind: 'listed', op: 'above', eth: r.eth ?? '0.5' }) },
                );
            } else if (r.kind === 'owner') {
                ops.push(
                    { label: 'IS ME', on: r.op === 'me', apply: () => patchRule(i, { kind: 'owner', op: 'me' }) },
                    { label: 'IS NOT ME', on: r.op === 'notMe', apply: () => patchRule(i, { kind: 'owner', op: 'notMe' }) },
                    /* The social classes — Network filter + Friend Inspector
                       vocabulary, canonical glyphs. */
                    ...(['mutuals', 'following', 'followers', 'topHolders', 'cartel'] as OwnerClass[]).map((cls) => ({
                        label: `${OWNER_CLASS_FACE[cls].glyph} ${OWNER_CLASS_FACE[cls].label}`,
                        on: r.op === cls,
                        apply: () => patchRule(i, { kind: 'owner', op: cls }),
                    })),
                    { label: 'IS @…', on: r.op === 'handle', apply: () => patchRule(i, { kind: 'owner', op: 'handle', handle: r.handle ?? '' }) },
                );
            } else if (r.kind === 'list') {
                ops.push(
                    { label: 'IS ON', on: r.op === 'in', apply: () => patchRule(i, { ...r, op: 'in' }) },
                    { label: 'IS NOT ON', on: r.op === 'notIn', apply: () => patchRule(i, { ...r, op: 'notIn' }) },
                );
            } else if (r.kind === 'trait') {
                ops.push(
                    { label: 'IS ANY OF', on: r.op === 'is', apply: () => patchRule(i, { ...r, op: 'is' }) },
                    { label: 'IS NOT', on: r.op === 'isNot', apply: () => patchRule(i, { ...r, op: 'isNot' }) },
                );
            } else if (r.kind === 'rarity') {
                ops.push(
                    { label: 'TOP', on: r.op === 'top', apply: () => patchRule(i, { ...r, op: 'top' }) },
                    { label: 'BOTTOM', on: r.op === 'bottom', apply: () => patchRule(i, { ...r, op: 'bottom' }) },
                );
            } else {
                ops.push({ label: 'IS ANY OF', on: true, apply: () => {} });
            }
            return (
                <div className="cmp-tray">
                    {ops.map((o) => (
                        <button
                            key={o.label}
                            className={`cmp-pill${o.on ? ' is-on' : ''}`}
                            onClick={() => {
                                o.apply();
                                const needsValue =
                                    r.kind === 'facet' || r.kind === 'color' || r.kind === 'trait'
                                    || (r.kind === 'listed' && (o.label.startsWith('BELOW') || o.label.startsWith('ABOVE')))
                                    || (r.kind === 'owner' && o.label === 'IS @…')
                                    || r.kind === 'rarity'
                                    || r.kind === 'list';
                                setEditing(needsValue ? { rule: i, seg: 'value' } : null);
                            }}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            );
        }

        // value tray
        if (r.kind === 'facet') {
            const pool = facetPools[r.field];
            return (
                <div className="cmp-tray">
                    {pool.length === 0 && <span className="cmp-tray-note">NOTHING MINTED YET</span>}
                    {pool.map((v) => {
                        const on = r.values.includes(v);
                        return (
                            <button
                                key={v}
                                className={`cmp-pill${on ? ' is-on' : ''}`}
                                onClick={() =>
                                    patchRule(i, {
                                        ...r,
                                        values: on ? r.values.filter((x) => x !== v) : [...r.values, v],
                                    })}
                            >
                                {facetValueFace(r.field, v)}
                            </button>
                        );
                    })}
                </div>
            );
        }
        if (r.kind === 'color') {
            const pool = [...(COLOR_BUCKET_ORDER as readonly string[]), 'Other'];
            return (
                <div className="cmp-tray">
                    {pool.map((v) => {
                        const on = r.values.includes(v);
                        return (
                            <button
                                key={v}
                                className={`cmp-pill${on ? ' is-on' : ''}`}
                                onClick={() =>
                                    patchRule(i, {
                                        ...r,
                                        values: on ? r.values.filter((x) => x !== v) : [...r.values, v],
                                    })}
                            >
                                {v.toUpperCase()}
                            </button>
                        );
                    })}
                </div>
            );
        }
        if (r.kind === 'listed' && (r.op === 'below' || r.op === 'above')) {
            return (
                <div className="cmp-tray">
                    <input
                        className="cmp-input"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.5"
                        value={r.eth ?? ''}
                        onChange={(e) => patchRule(i, { ...r, eth: e.target.value })}
                        autoFocus
                    />
                    <span className="cmp-tray-note">◊︎ ETH</span>
                </div>
            );
        }
        if (r.kind === 'owner' && r.op === 'handle') {
            return (
                <div className="cmp-tray">
                    <input
                        className="cmp-input"
                        type="text"
                        placeholder="@handle"
                        value={r.handle ?? ''}
                        onChange={(e) => patchRule(i, { ...r, handle: e.target.value })}
                        autoFocus
                    />
                </div>
            );
        }
        if (r.kind === 'list') {
            return (
                <div className="cmp-tray">
                    {(['starred', 'wishlist', 'album'] as MyList[]).map((l) => (
                        <button
                            key={l}
                            className={`cmp-pill${r.list === l ? ' is-on' : ''}`}
                            onClick={() => { patchRule(i, { ...r, list: l }); setEditing(null); }}
                        >
                            <span className="cmp-pill-glyph">{LIST_FACE[l].glyph}</span> {LIST_FACE[l].label}
                        </button>
                    ))}
                </div>
            );
        }
        if (r.kind === 'trait') {
            const pool: string[] = [];
            const seen = new Set<string>();
            for (const row of scopeRows) {
                const v = row.traits[r.name];
                if (v != null && !seen.has(v)) { seen.add(v); pool.push(v); }
            }
            pool.sort((a, b) => a.localeCompare(b));
            return (
                <div className="cmp-tray">
                    {pool.length === 0 && <span className="cmp-tray-note">NOTHING MINTED YET</span>}
                    {pool.map((v) => {
                        const on = r.values.includes(v);
                        return (
                            <button
                                key={v}
                                className={`cmp-pill${on ? ' is-on' : ''}`}
                                onClick={() =>
                                    patchRule(i, {
                                        ...r,
                                        values: on ? r.values.filter((x) => x !== v) : [...r.values, v],
                                    })}
                            >
                                {v.toUpperCase()}
                            </button>
                        );
                    })}
                </div>
            );
        }
        if (r.kind === 'rarity') {
            return (
                <div className="cmp-tray">
                    {RARITY_PCTS.map((p) => (
                        <button
                            key={p}
                            className={`cmp-pill${r.pct === p ? ' is-on' : ''}`}
                            onClick={() => { patchRule(i, { ...r, pct: p }); setEditing(null); }}
                        >
                            {p}%
                        </button>
                    ))}
                </div>
            );
        }
        return null;
    };

    const liveStrip = (withView: boolean, groupedFace = false) => (
        <div className="cmp-live">
            <span className={`cmp-live-dot${loading ? ' is-loading' : ''}`} aria-hidden="true" />
            <span className="cmp-live-count">
                {loading
                    ? 'COMPOSING…'
                    : <>
                        <b key={matched.length} className="cmp-count-pop">{matched.length}</b>
                        {' '}MATCH · LIVE<span className="cmp-ms"> · {queryMs}ms</span>
                    </>}
            </span>
            {delta != null && !loading && (
                <span className="cmp-delta" aria-hidden="true">
                    {delta > 0 ? '+' : ''}{delta}
                </span>
            )}
            {withView ? (
                <button className="cmp-live-open" onClick={() => setView('results')}>
                    VIEW ▸︎
                </button>
            ) : groupedFace && query.group !== 'none' ? (
                <span className="cmp-live-open is-static">
                    {GROUP_GLYPH[query.group]} GROUPED
                </span>
            ) : null}
        </div>
    );

    const chips = query.rules.filter(ruleIsComplete).map((r, i) => {
        const f = ruleFieldLabel(r);
        const v = ruleValueLabel(r);
        return (
            <span key={i} className="cmp-chip" style={{ ['--i' as string]: i }}>
                <span className="cmp-pill-glyph">{f.glyph}</span>{' '}
                {r.kind === 'listed' && !v
                    ? <>listed <b>{ruleOpLabel(r)}</b></>
                    : <>{ruleOpLabel(r).toLowerCase()} <b>{v}</b></>}
            </span>
        );
    });

    const gallery = (
        <div className="cmp-gallery" id="composerGallery">
            {blocks
                ? blocks.map((blk) => {
                      const g = blk.group;
                      const cards = blk.cards;
                      const l1Collapsed = collapsedGroups.has(blk.l1Key);
                      const l2Collapsed = blk.l2Key ? collapsedGroups.has(blk.l2Key) : false;
                      const cardsHidden = l1Collapsed || l2Collapsed;
                      return (
                          <Fragment key={blk.key}>
                              {blk.heads.map((h, hi) => {
                                  const isL2 = h.level === 2;
                                  if (isL2 && l1Collapsed) return null;
                                  const ckey = isL2 ? blk.l2Key! : blk.l1Key;
                                  const folded = isL2 ? l2Collapsed : l1Collapsed;
                                  return (
                                      <div
                                          key={hi}
                                          className={`gallery-group-header is-collapsible${isL2 ? ' level-2' : ''}${h.soon ? ' soon' : ''}${folded ? ' collapsed' : ''}`}
                                          role="button"
                                          tabIndex={0}
                                          aria-expanded={!folded}
                                          onClick={() => toggleGroupCollapse(ckey)}
                                          onKeyDown={(e) => {
                                              if (e.key === 'Enter' || e.key === ' ') {
                                                  e.preventDefault();
                                                  toggleGroupCollapse(ckey);
                                              }
                                          }}
                                      >
                                          <span className="ggh-arrow" aria-hidden="true">
                                              {folded ? '▸︎' : '▾︎'}
                                          </span>
                                          <span className="ggh-label">{h.label}</span>
                                          {h.by ? <span className="ggh-by"> by @{h.by.replace(/^@/, '')}</span> : null}
                                          {h.soon ? <span className="ggh-soon">coming soon</span> : null}
                                          {!h.soon && h.count != null && h.count > 0
                                              ? <span className="ggh-count">{h.count}</span>
                                              : null}
                                          {!h.soon && groupHeaderGlyph(query.group, h.level)
                                              ? <span className="ggh-glyph" aria-hidden="true">{groupHeaderGlyph(query.group, h.level)}</span>
                                              : null}
                                      </div>
                                  );
                              })}
                              {cardsHidden
                                  ? null
                                  : g
                                  ? (
                                      <ProjectProvider slug={g.slug}>
                                          {g.ids.filter((id) => cardShown(g.slug, id)).map((id) => (
                                              <ArtworkCard key={`${g.slug}-${id}`} id={id} hideOwnedBadge showProjectName />
                                          ))}
                                      </ProjectProvider>
                                  )
                                  : cards?.filter((c) => cardShown(c.slug, c.id)).map((c) => (
                                      <ProjectProvider key={`${c.slug}-${c.id}`} slug={c.slug}>
                                          <ArtworkCard id={c.id} hideOwnedBadge showProjectName />
                                      </ProjectProvider>
                                  ))}
                          </Fragment>
                      );
                  })
                : runs.map((run, ri) => (
                      <ProjectProvider key={`${run.slug}-${ri}`} slug={run.slug}>
                          {run.ids.filter((id) => cardShown(run.slug, id)).map((id) => (
                              <ArtworkCard key={`${run.slug}-${id}`} id={id} hideOwnedBadge showProjectName />
                          ))}
                      </ProjectProvider>
                  ))}
            {matched.length === 0 && !loading && (
                <div className="cmp-empty">NO MATCH — LOOSEN A RULE</div>
            )}
            {revealSet !== null && (
                <div ref={sentinelRef} className="gallery-load-sentinel" aria-hidden="true" />
            )}
        </div>
    );

    return (
        <div
            id="composerModal"
            className={`platform-modal composer-modal${isOpen ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="The Composer"
        >
            {isOpen && (
                <div className="cmp-stage">
                    {/* ── top bar ── */}
                    <div className="cmp-topbar">
                        <span className="cmp-title">
                            <span className="cmp-title-glyph">⊚︎</span>
                            {view === 'programs'
                                ? 'PROGRAMS'
                                : view === 'results'
                                ? (programName ?? 'RESULTS')
                                : 'THE COMPOSER'}
                        </span>
                        <span className="cmp-topbar-right">
                            {view === 'builder' && (
                                <button className="cmp-nav-btn" onClick={() => setView('programs')}>
                                    PROGRAMS{programs.length > 0 ? ` · ${programs.length}` : ''}
                                </button>
                            )}
                            <button className="cmp-close" onClick={close} title="Close" aria-label="Close">
                                ✕︎
                            </button>
                        </span>
                    </div>

                    {/* ── BUILDER ── */}
                    {view === 'builder' && (
                        <div className="cmp-scroll">
                            <div className="cmp-scope-row">
                                <span className="cmp-prefix">OVER</span>
                                <button
                                    className="cmp-pill is-on"
                                    onClick={() => setScopeOpen((v) => !v)}
                                >
                                    {query.scope == null
                                        ? 'ALL PROJECTS'
                                        : query.scope.length === 1
                                        ? (getProject(query.scope[0])?.displayName ?? query.scope[0])
                                        : `${query.scope.length} PROJECTS`}
                                    {' '}<span className="cmp-caret">▾︎</span>
                                </button>
                                <span className="cmp-pill is-dim">{scopeRows.length} PIECES</span>
                            </div>
                            {scopeOpen && (
                                <div className="cmp-tray">
                                    <button
                                        className={`cmp-pill${query.scope == null ? ' is-on' : ''}`}
                                        onClick={() => setQuery((q) => ({ ...q, scope: null }))}
                                    >
                                        ALL PROJECTS
                                    </button>
                                    {mintedSlugs.map((slug) => {
                                        const on = query.scope?.includes(slug) ?? false;
                                        return (
                                            <button
                                                key={slug}
                                                className={`cmp-pill${on ? ' is-on' : ''}`}
                                                onClick={() =>
                                                    setQuery((q) => {
                                                        const cur = q.scope ?? [];
                                                        const next = on
                                                            ? cur.filter((s) => s !== slug)
                                                            : [...cur, slug];
                                                        return { ...q, scope: next.length === 0 ? null : next };
                                                    })}
                                            >
                                                {getProject(slug)?.displayName ?? slug.toUpperCase()}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="cmp-rules">
                                {query.rules.map((r, i) => {
                                    const f = ruleFieldLabel(r);
                                    const v = ruleValueLabel(r);
                                    const isEditing = (seg: Segment) =>
                                        editing?.rule === i && editing.seg === seg;
                                    return (
                                        <Fragment key={i}>
                                            <div className={`cmp-rule-row${ruleIsComplete(r) ? '' : ' is-pending'}`}>
                                                <span className="cmp-prefix">{i === 0 ? 'WHERE' : 'AND'}</span>
                                                <button
                                                    className={`cmp-pill${isEditing('field') ? ' is-editing' : ''}`}
                                                    onClick={() => toggleEdit(i, 'field')}
                                                >
                                                    <span className="cmp-pill-glyph">{f.glyph}</span> {f.label}
                                                </button>
                                                <button
                                                    className={`cmp-pill is-op${isEditing('op') ? ' is-editing' : ''}`}
                                                    onClick={() => toggleEdit(i, 'op')}
                                                >
                                                    {ruleOpLabel(r)}
                                                </button>
                                                {v !== '' && (
                                                    <button
                                                        className={`cmp-pill is-on${isEditing('value') ? ' is-editing' : ''}`}
                                                        onClick={() => toggleEdit(i, 'value')}
                                                    >
                                                        {v}
                                                    </button>
                                                )}
                                                <button
                                                    className="cmp-rule-x"
                                                    onClick={() => removeRule(i)}
                                                    title="Remove rule"
                                                    aria-label="Remove rule"
                                                >
                                                    ✕︎
                                                </button>
                                            </div>
                                            {editing?.rule === i && renderTray()}
                                        </Fragment>
                                    );
                                })}
                                <button className="cmp-rule-add" onClick={addRule}>+ RULE</button>
                            </div>

                            <div className="cmp-sortbar">
                                <button
                                    className={`cmp-sort-btn cmp-group-btn${query.group !== 'none' ? ' is-on' : ''}`}
                                    onClick={cycleGroup}
                                    title={`Group: ${GROUP_LABEL[query.group]}`}
                                >
                                    <span className="cmp-sort-glyph">
                                        {query.group === 'none' ? GROUP_BTN_ICON : GROUP_GLYPH[query.group]}
                                    </span>
                                </button>
                                {SORT_PILLS.map((s) => (
                                    <button
                                        key={s.key}
                                        className={`cmp-sort-btn${query.sort === s.key ? ' is-on' : ''}`}
                                        onClick={() => tapSort(s.key)}
                                    >
                                        {s.label}
                                        {query.sort === s.key && (
                                            <span className="cmp-sort-arrow">{query.dir === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* The readout — the query reading itself back in
                                plain English, live with every tap. */}
                            <div className="cmp-readout">
                                <span className="cmp-readout-glyph">⊚︎</span>
                                {querySentence(query)}
                            </div>

                            {liveStrip(true)}

                            {saveOpen ? (
                                <div className="cmp-save-row">
                                    <input
                                        className="cmp-input cmp-save-input"
                                        type="text"
                                        placeholder="NAME THE PROGRAM"
                                        value={saveName}
                                        onChange={(e) => setSaveName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') doSave(); }}
                                        autoFocus
                                    />
                                    <button className="cmp-btn-primary cmp-save-go" onClick={doSave}>
                                        SAVE ⊚︎
                                    </button>
                                </div>
                            ) : (
                                <div className="cmp-save-row">
                                    <button className="cmp-btn-primary" onClick={() => setSaveOpen(true)}>
                                        SAVE AS PROGRAM ⊚︎
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── RESULTS ── */}
                    {view === 'results' && (
                        <div className="cmp-scroll">
                            <div className="cmp-chips">
                                {chips.length > 0 ? chips : <span className="cmp-chip" style={{ ['--i' as string]: 0 }}>everything</span>}
                                <button
                                    className="cmp-chip is-btn"
                                    style={{ ['--i' as string]: chips.length || 1 }}
                                    onClick={() => setView('builder')}
                                >
                                    EDIT ▸︎
                                </button>
                            </div>
                            {liveStrip(false, true)}
                            {gallery}
                        </div>
                    )}

                    {/* ── PROGRAMS ── */}
                    {view === 'programs' && (
                        <div className="cmp-scroll">
                            <div className="cmp-prog-list">
                                {programs.map((p, i) => (
                                    <div
                                        key={`${p.name}-${p.created_at}`}
                                        className="cmp-prog-row"
                                        style={{ ['--i' as string]: i }}
                                        role="button"
                                        tabIndex={0}
                                        onPointerDown={rowPressDown(i)}
                                        onPointerMove={rowPressMove}
                                        onPointerUp={rowPressUp(p)}
                                        onPointerCancel={clearPress}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                openProgram(p);
                                            }
                                        }}
                                    >
                                        <div className="cmp-prog-top">
                                            {renameIdx === i ? (
                                                <input
                                                    className="cmp-input cmp-rename-input"
                                                    value={renameVal}
                                                    onChange={(e) => setRenameVal(e.target.value)}
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            renameProgram(i, renameVal);
                                                            showToast(`Program: RENAMED · ${renameVal.trim().toUpperCase()}`);
                                                            setRenameIdx(null);
                                                            setManageIdx(null);
                                                        }
                                                    }}
                                                    autoFocus
                                                />
                                            ) : (
                                                <span className="cmp-prog-name">{p.name.toUpperCase()}</span>
                                            )}
                                            <span className="cmp-prog-count">
                                                {loading ? '…' : programCounts[i]}
                                            </span>
                                        </div>
                                        <div className="cmp-prog-sub">{querySummary(p.query)}</div>
                                        {manageIdx === i && (
                                            <div className="cmp-prog-manage" onPointerDown={(e) => e.stopPropagation()}>
                                                <button
                                                    className="cmp-pill"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setRenameIdx(i);
                                                        setRenameVal(p.name);
                                                    }}
                                                >
                                                    RENAME
                                                </button>
                                                <button
                                                    className="cmp-pill is-danger"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteProgram(i);
                                                        showToast(`Program: DELETED · ${p.name.toUpperCase()}`);
                                                        setManageIdx(null);
                                                    }}
                                                >
                                                    DELETE
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <button className="cmp-prog-new" onClick={newProgram}>
                                    + NEW PROGRAM ⊚︎
                                </button>
                            </div>
                            <div className="cmp-note">
                                A PROGRAM RE-RUNS LIVE EVERY TIME IT OPENS · LONG-PRESS TO RENAME OR DELETE
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
