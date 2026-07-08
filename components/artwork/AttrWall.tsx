'use client';

/*
 * AttrWall — the shared presentational "character sheet": a grouped tile grid
 * (Identity / Form / Sky / …). Used by BOTH the Output attributes panel and the
 * Project attributes panel so they render identically (Brendon, 2026-06-24).
 * Pure render — callers pass the prebuilt groups (+ an optional reading line).
 *
 * Trait offers (Brendon, 2026-07-02 — the community's #1 feature): when the
 * caller passes `offerTraits` + `onTraitOffer`, every tile whose label/value
 * is a real offerable trait wears the ✦ Trait Offer chip (the same ✦ the
 * Starred trait rows use). The Output panel passes them; the Project panel
 * doesn't — its wall stays untouched.
 */

import { useMemo, useState } from 'react';
import type { AttrGroup } from '../../lib/output/attributes';

const VS15 = '︎';

export default function AttrWall({
    groups,
    reading = null,
    offerTraits = null,
    onTraitOffer,
    searchable = false,
    query,
    onTileTap,
}: {
    groups: AttrGroup[];
    reading?: string | null;
    /** category → value map of the piece's offerable traits (outputTraits). */
    offerTraits?: Record<string, string> | null;
    onTraitOffer?: (category: string, value: string) => void;
    /** Show the wall's OWN search box (icon + input) that filters tiles. */
    searchable?: boolean;
    /** Controlled query — when provided, an external search (e.g. the +More pill
     *  row) drives the filter and the wall's own search box is not shown. */
    query?: string;
    /** Called with a tile's tapKey when a tappable tile is pressed. */
    onTileTap?: (tapKey: string) => void;
}) {
    const controlled = query !== undefined;
    const [internalQuery, setInternalQuery] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const q = (controlled ? (query ?? '') : internalQuery).trim().toLowerCase();

    /* Filter tiles by the query across label / value / sub; drop empty groups. */
    const shownGroups = useMemo(() => {
        if (!q) return groups;
        return groups
            .map((g) => ({
                ...g,
                tiles: g.tiles.filter((t) => {
                    const hay = `${t.label} ${typeof t.value === 'string' ? t.value : ''} ${t.sub ?? ''}`.toLowerCase();
                    return hay.includes(q);
                }),
            }))
            .filter((g) => g.tiles.length > 0);
    }, [groups, q]);

    return (
        <div className="attr-wall">
            {reading && (
                <div className="attr-reading">
                    <span className="attr-reading-head">{`☽${VS15} THE READING`}</span>
                    <p className="attr-reading-body">{reading}</p>
                </div>
            )}
            {searchable && !controlled && (
                /* Reuses the gen-art gallery search vocabulary — the ⌕ .search-btn
                   toggling a .search-input row (Brendon 2026-07-08). Only when the
                   wall owns its search; a controlled query hides this. */
                <div className="attr-search-bar">
                    <span
                        className={`search-btn${searchOpen ? ' active' : ''}`}
                        role="button"
                        tabIndex={0}
                        title="Search attributes"
                        onClick={() => setSearchOpen((v) => { const next = !v; if (!next) setInternalQuery(''); return next; })}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSearchOpen((v) => { const next = !v; if (!next) setInternalQuery(''); return next; }); } }}
                    >
                        {`⌕${VS15}`}
                    </span>
                    {searchOpen && (
                        <div className="attr-search-row">
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search attributes"
                                value={internalQuery}
                                onChange={(e) => setInternalQuery(e.target.value)}
                                spellCheck={false}
                                autoCapitalize="none"
                                autoCorrect="off"
                                aria-label="Search attributes"
                                autoFocus
                            />
                            {internalQuery && (
                                <span className="search-clear" role="button" tabIndex={0} title="Clear"
                                    onClick={() => setInternalQuery('')}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setInternalQuery(''); } }}>
                                    {`×${VS15}`}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}
            {q && shownGroups.length === 0 && (
                <div className="attr-search-empty">No attributes match your search.</div>
            )}
            {shownGroups.map((g) => (
                <section className="attr-group" key={g.key} aria-label={g.label}>
                    <div className="attr-group-head">
                        <span className="attr-group-name">{g.label}</span>
                        <span className="attr-group-count">{g.tiles.length}</span>
                    </div>
                    <div className="attr-grid">
                        {g.tiles.map((t, i) => {
                            const offerable =
                                !!offerTraits && !!onTraitOffer &&
                                typeof t.value === 'string' &&
                                offerTraits[t.label] === t.value;
                            const tappable = !!t.tapKey && !!onTileTap;
                            return (
                            <div
                                className={`attr-tile${t.rare ? ' rare' : ''}${t.grid ? ' attr-tile-glyphcard' : ''}${offerable ? ' has-offer' : ''}${tappable ? ' attr-tile-tap' : ''}`}
                                key={`${g.key}-${i}`}
                                role={tappable ? 'button' : undefined}
                                tabIndex={tappable ? 0 : undefined}
                                onClick={tappable ? () => onTileTap!(t.tapKey as string) : undefined}
                                onKeyDown={tappable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTileTap!(t.tapKey as string); } } : undefined}
                            >
                                {offerable && (
                                    <button
                                        type="button"
                                        className="attr-tile-offer"
                                        title={`Trait offer — ${t.label}: ${t.value}`}
                                        aria-label={`Make a trait offer on ${t.label}: ${t.value}`}
                                        onClick={() => onTraitOffer!(t.label, t.value as string)}
                                    >
                                        {`✦${VS15}`}
                                    </button>
                                )}
                                <span className="attr-tile-glyph">{t.glyph}{VS15}</span>
                                <span className="attr-tile-label">{t.label}</span>
                                {t.grid ? (
                                    <span className="attr-entropy" role="img" aria-label="Entropy barcode">
                                        {t.grid.map((on, gi) => (
                                            <span key={gi} className={`attr-entropy-cell${on ? ' on' : ''}`} />
                                        ))}
                                    </span>
                                ) : (
                                    <>
                                        {t.spectrum && (
                                            <span className="attr-spectrum" role="img" aria-label="Palette spectrum">
                                                {t.spectrum.map((s, si) => (
                                                    <span key={si} className="attr-spectrum-seg" style={{ background: s.hex, flexGrow: s.weight }} />
                                                ))}
                                            </span>
                                        )}
                                        <span className="attr-tile-value">
                                            {t.swatch && <span className="attr-swatch" style={{ background: t.swatch }} />}
                                            {t.value}
                                        </span>
                                    </>
                                )}
                                {t.sub && <span className="attr-tile-sub">{t.sub}</span>}
                            </div>
                            );
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
}
