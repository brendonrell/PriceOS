'use client';

/* Split out of components/project/TraitsUI.tsx 2026-07-06 (tech-debt pass)
   — pure move, no behavior change. */

import React from 'react';
import { useToast } from '../../lib/state/ToastContext';
import {
    getPresets,
    getLoadedIndex,
    savePreset,
    deletePreset,
    setLoadedIndex,
    subscribePresets,
    type PresetEntry,
} from '../../lib/pins/presetStore';

/* ── PresetRow ─────────────────────────────────────────────────────── */
/*
 * Gallery View Presets row. Repurposed from MultiSelectRow — same
 * position in the render tree (between sort-bar and search-row),
 * same open/close pattern.
 *
 * Layout: [SAVE] [① Preset Name ✕] [② Preset Name ✕] [③ Preset Name ✕]
 *
 * Pill style: dashed border when idle (signals "snapshot slot"),
 * solid border + inverted bg when that preset is the currently-loaded
 * view. A ✕ on each pill deletes that slot.
 *
 * Numbered index prefixes (①②③) make slots scannable without a label.
 *
 * The SAVE pill always captures the current full gallery state into the
 * next available slot (or replaces the oldest). presetStore owns all
 * persistence and auto-naming.
 */

const SLOT_GLYPHS = ['①', '②', '③'] as const;

interface PresetRowProps {
    open: boolean;
    /* Store scope. The project page uses the constant 'project' so the 3
       Grid Presets are SHARED across every Project (not per-Project) — a
       deliberate change (WIP decision 3). */
    slug: string;
    /* The Project actually being viewed. Captured into each saved preset so
       recall restores trait filters only when you're back on the same Project;
       the universal parts (sort / price / search) restore on any Project. */
    projectSlug: string;
    /* Current sort state — needed both for snapshot and for apply */
    sort: import('../../lib/state/SortContext').SortKey;
    dir: import('../../lib/state/SortContext').SortDir;
    feedKind: import('../../lib/state/SortContext').FeedKind;
    /* Active grouping dimension — captured into the preset so recall restores it. */
    group: import('../../lib/state/SortContext').GroupKey;
    applySort: (
        sort: import('../../lib/state/SortContext').SortKey,
        dir: import('../../lib/state/SortContext').SortDir,
        feedKind: import('../../lib/state/SortContext').FeedKind,
        group?: import('../../lib/state/SortContext').GroupKey,
    ) => void;
    applyPreset: (state: Parameters<import('../../lib/state/TraitsContext').TraitsContextValue['applyPreset']>[0]) => void;
    /* Current traits/search/price state — for snapshot */
    activeFilters: import('../../lib/state/TraitsContext').ActiveFilters;
    activeCategory: import('../../lib/state/TraitsContext').TraitCategory | null;
    activeFeedCategory: import('../../lib/state/TraitsContext').FeedCategory | null;
    activeSubFilter: string;
    myNotesActive: boolean;
    searchQuery: string;
    priceMin: string;
    priceMax: string;
}

export default function PresetRow({
    open,
    slug,
    projectSlug,
    sort,
    dir,
    feedKind,
    group,
    applySort,
    applyPreset,
    activeFilters,
    activeCategory,
    activeFeedCategory,
    activeSubFilter,
    myNotesActive,
    searchQuery,
    priceMin,
    priceMax,
}: PresetRowProps) {
    const { showToast } = useToast();
    const [presets, setPresets] = React.useState<readonly PresetEntry[]>(
        () => getPresets(slug)
    );
    const [loadedIndex, setLoadedIndexState] = React.useState<number>(
        () => getLoadedIndex(slug)
    );

    React.useEffect(() => {
        return subscribePresets(slug, (next: readonly PresetEntry[], idx: number) => {
            setPresets(next);
            setLoadedIndexState(idx);
        });
    }, [slug]);

    if (!open) return null;

    const handleSave = () => {
        // Serialise activeFilters Sets → arrays for JSON storage
        const filtersSnapshot = Object.fromEntries(
            Object.entries(activeFilters).map(([k, v]) => [k, Array.from(v as Set<string>)])
        ) as Record<import('../../lib/state/TraitsContext').TraitCategory, string[]>;

        const { result, index } = savePreset(slug, {
            sort, dir, feedKind, group,
            activeFilters: filtersSnapshot,
            activeCategory,
            activeFeedCategory,
            activeSubFilter,
            myNotesActive,
            searchQuery,
            priceMin,
            priceMax,
            savedSlug: projectSlug,
        });
        const slotLabel = SLOT_GLYPHS[index] ?? `${index + 1}`;
        showToast(`PRESET ${slotLabel} ${result === 'replaced' ? 'REPLACED' : 'SAVED'}`);
    };

    const handleRecall = (index: number, preset: PresetEntry) => {
        const s = preset.state;
        // Universal parts (sort / grouping / price / search / notes) always restore.
        applySort(s.sort, s.dir, s.feedKind, s.group ?? 'none');
        // Trait filters only make sense on the Project they were captured on
        // (Layer/Mineral/etc. don't exist on a different Project's schema).
        // Legacy presets with no savedSlug are treated as same-Project.
        const sameProject = !s.savedSlug || s.savedSlug === projectSlug;
        if (sameProject) {
            // Reconstruct Sets from the stored string arrays
            const restoredFilters = Object.fromEntries(
                Object.entries(s.activeFilters).map(([k, arr]) => [k, new Set(arr as string[])])
            ) as unknown as import('../../lib/state/TraitsContext').ActiveFilters;
            applyPreset({
                activeFilters: restoredFilters,
                activeCategory: s.activeCategory,
                activeFeedCategory: s.activeFeedCategory,
                activeSubFilter: s.activeSubFilter,
                myNotesActive: s.myNotesActive,
                searchQuery: s.searchQuery,
                priceMin: s.priceMin,
                priceMax: s.priceMax,
            });
        } else {
            // Cross-Project recall — restore the universal view, and close any
            // open trait category so no mismatched trait row dangles. The
            // preset keeps its stored filters (no data loss) for when you
            // return to its origin Project.
            applyPreset({
                activeCategory: null,
                activeFeedCategory: null,
                activeSubFilter: 'All',
                myNotesActive: s.myNotesActive,
                searchQuery: s.searchQuery,
                priceMin: s.priceMin,
                priceMax: s.priceMax,
            });
        }
        setLoadedIndex(slug, index);
        const slotLabel = SLOT_GLYPHS[index] ?? `${index + 1}`;
        showToast(`PRESET ${slotLabel} LOADED`);
    };

    const handleDelete = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        deletePreset(slug, index);
        const slotLabel = SLOT_GLYPHS[index] ?? `${index + 1}`;
        showToast(`PRESET ${slotLabel} CLEARED`);
    };

    return (
        <div className="preset-row open">
            {/* SAVE pill — always present */}
            <button
                className="pill-preset pill-preset--save"
                onClick={handleSave}
                title="Save current view as preset"
            >
                SAVE
            </button>

            {/* Preset slots — up to 3 */}
            {presets.map((preset, index) => {
                const isLoaded = loadedIndex === index;
                return (
                    <button
                        key={index}
                        className={`pill-preset${isLoaded ? ' pill-preset--loaded' : ''}`}
                        onClick={() => handleRecall(index, preset)}
                        title={`Load: ${preset.name}`}
                    >
                        <span className="pill-preset__index">{SLOT_GLYPHS[index]}</span>
                        <span className="pill-preset__name">{preset.name}</span>
                        <span
                            className="pill-preset__delete"
                            role="button"
                            tabIndex={0}
                            onClick={(e) => handleDelete(e, index)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleDelete(e as unknown as React.MouseEvent, index);
                                }
                            }}
                            title="Clear preset"
                            aria-label="Clear preset"
                        >
                            ✕&#xFE0E;
                        </span>
                    </button>
                );
            })}

            {/* Empty slot indicators */}
            {Array.from({ length: 3 - presets.length }).map((_, i) => (
                <span
                    key={`empty-${i}`}
                    className="pill-preset pill-preset--empty"
                    title="Empty preset slot"
                >
                    {SLOT_GLYPHS[presets.length + i]}
                </span>
            ))}
        </div>
    );
}



