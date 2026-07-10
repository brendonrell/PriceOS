'use client';

/*
 * The Feature Atlas catalog — the interactive index at /docs/features.
 * Client-side sort / section-filter / search over the build-time registry
 * (lib/docs/features). Mobile-first rows; the section pills scroll
 * horizontally on phones and wrap on desktop.
 */

import { useMemo, useState } from 'react';
import { ATLAS, ATLAS_SECTIONS, atlasId, type AtlasFeature } from '../../lib/docs/features';

type SortKey = 'number' | 'name' | 'section';

export function FeatureAtlas() {
    const [query, setQuery] = useState('');
    const [section, setSection] = useState<string | null>(null);
    const [sort, setSort] = useState<SortKey>('number');

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        let list = ATLAS.filter((f) => {
            if (section && f.section !== section) return false;
            if (!q) return true;
            return (
                f.name.toLowerCase().includes(q) ||
                atlasId(f.n).includes(q) ||
                String(f.n) === q ||
                f.section.toLowerCase().includes(q)
            );
        });
        if (sort === 'name') {
            list = [...list].sort((a, b) =>
                a.name.replace(/^The /, '').localeCompare(b.name.replace(/^The /, '')));
        } else if (sort === 'section') {
            list = [...list].sort((a, b) =>
                a.section === b.section ? a.n - b.n
                    : ATLAS_SECTIONS.indexOf(a.section as never) - ATLAS_SECTIONS.indexOf(b.section as never));
        }
        return list;
    }, [query, section, sort]);

    const SORTS: { key: SortKey; label: string }[] = [
        { key: 'number', label: '#' },
        { key: 'name', label: 'A–Z' },
        { key: 'section', label: 'SECTION' },
    ];

    return (
        <div className="pd-atlas">
            <div className="pd-atlas-controls">
                <input
                    type="search"
                    className="pd-atlas-search"
                    placeholder="Search the Atlas…"
                    value={query}
                    spellCheck={false}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search features"
                />
                <div className="pd-atlas-sorts" role="group" aria-label="Sort">
                    {SORTS.map((s) => (
                        <button
                            key={s.key}
                            type="button"
                            className={`pd-atlas-pill${sort === s.key ? ' active' : ''}`}
                            aria-pressed={sort === s.key}
                            onClick={() => setSort(s.key)}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="pd-atlas-sections" role="group" aria-label="Filter by section">
                <button
                    type="button"
                    className={`pd-atlas-pill${section === null ? ' active' : ''}`}
                    aria-pressed={section === null}
                    onClick={() => setSection(null)}
                >
                    ALL
                </button>
                {ATLAS_SECTIONS.map((s) => (
                    <button
                        key={s}
                        type="button"
                        className={`pd-atlas-pill${section === s ? ' active' : ''}`}
                        aria-pressed={section === s}
                        onClick={() => setSection(section === s ? null : s)}
                    >
                        {s.toUpperCase()}
                    </button>
                ))}
            </div>
            <div className="pd-atlas-count">
                {shown.length} of {ATLAS.length} features{section ? ` · ${section}` : ''}
            </div>
            <ul className="pd-atlas-list">
                {shown.map((f: AtlasFeature) => (
                    <li key={f.n} className="pd-atlas-row">
                        <span className="pd-atlas-num">{atlasId(f.n)}</span>
                        <span className="pd-atlas-glyph">{f.glyph ? `${f.glyph}︎` : ''}</span>
                        <span className="pd-atlas-name">
                            {f.name}
                            {f.tag && <span className="pd-atlas-tag">{f.tag}</span>}
                        </span>
                        <span className="pd-atlas-section">{f.section}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
