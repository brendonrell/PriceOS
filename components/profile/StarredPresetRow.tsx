'use client';

/*
 * StarredPresetRow — "Starred Presets": save/recall up to 3 named Starred views,
 * exactly like Grid Presets but scoped to the Starred surface (Brendon
 * 2026-06-19). Same pill/preset CSS as the gallery preset row.
 */

import { useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useToast } from '../../lib/state/ToastContext';
import {
    getStarredPresets,
    getStarredLoadedIndex,
    saveStarredPreset,
    deleteStarredPreset,
    setStarredLoadedIndex,
    subscribeStarredPresets,
    type StarredPreset,
    type StarredPresetState,
} from '../../lib/pins/starredPresetStore';

const SLOT_GLYPHS = ['①', '②', '③'] as const;

export default function StarredPresetRow({
    open,
    current,
    onApply,
}: {
    open: boolean;
    current: StarredPresetState;
    onApply: (s: StarredPresetState) => void;
}) {
    const { showToast } = useToast();
    const [presets, setPresets] = useState<readonly StarredPreset[]>(() => getStarredPresets());
    const [loadedIndex, setLoadedIndexState] = useState<number>(() => getStarredLoadedIndex());
    useEffect(() => subscribeStarredPresets((next, idx) => { setPresets(next); setLoadedIndexState(idx); }), []);

    if (!open) return null;

    const handleSave = () => {
        const { result, index } = saveStarredPreset(current);
        const slot = SLOT_GLYPHS[index] ?? `${index + 1}`;
        showToast(`Starred Preset ${slot}: ${result === 'replaced' ? 'REPLACED' : 'SAVED'}`);
    };
    const handleRecall = (index: number, p: StarredPreset) => {
        onApply(p.state);
        setStarredLoadedIndex(index);
        const slot = SLOT_GLYPHS[index] ?? `${index + 1}`;
        showToast(`Starred Preset ${slot}: LOADED`);
    };
    const handleDelete = (e: ReactMouseEvent, index: number) => {
        e.stopPropagation();
        deleteStarredPreset(index);
        const slot = SLOT_GLYPHS[index] ?? `${index + 1}`;
        showToast(`Starred Preset ${slot}: CLEARED`);
    };

    return (
        <div className="preset-row open">
            <button className="pill-preset pill-preset--save" onClick={handleSave} title="Save current Starred view as a preset">
                SAVE
            </button>
            {presets.map((p, index) => (
                <button
                    key={index}
                    className={`pill-preset${loadedIndex === index ? ' pill-preset--loaded' : ''}`}
                    onClick={() => handleRecall(index, p)}
                    title={`Load: ${p.name}`}
                >
                    <span className="pill-preset__index">{SLOT_GLYPHS[index]}</span>
                    <span className="pill-preset__name">{p.name}</span>
                    <span
                        className="pill-preset__delete"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleDelete(e, index)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDelete(e as unknown as ReactMouseEvent, index); } }}
                        title="Clear preset"
                        aria-label="Clear preset"
                    >
                        ✕&#xFE0E;
                    </span>
                </button>
            ))}
            {Array.from({ length: 3 - presets.length }).map((_, i) => (
                <span key={`empty-${i}`} className="pill-preset pill-preset--empty" title="Empty preset slot">
                    {SLOT_GLYPHS[presets.length + i]}
                </span>
            ))}
        </div>
    );
}
