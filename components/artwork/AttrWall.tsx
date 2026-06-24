'use client';

/*
 * AttrWall — the shared presentational "character sheet": a grouped tile grid
 * (Identity / Form / Sky / …). Used by BOTH the Output attributes panel and the
 * Project attributes panel so they render identically (Brendon, 2026-06-24).
 * Pure render — callers pass the prebuilt groups (+ an optional reading line).
 */

import type { AttrGroup } from '../../lib/output/attributes';

const VS15 = '︎';

export default function AttrWall({
    groups,
    reading = null,
}: {
    groups: AttrGroup[];
    reading?: string | null;
}) {
    return (
        <div className="attr-wall">
            {reading && (
                <div className="attr-reading">
                    <span className="attr-reading-head">{`☽${VS15} THE READING`}</span>
                    <p className="attr-reading-body">{reading}</p>
                </div>
            )}
            {groups.map((g) => (
                <section className="attr-group" key={g.key} aria-label={g.label}>
                    <div className="attr-group-head">
                        <span className="attr-group-name">{g.label}</span>
                        <span className="attr-group-count">{g.tiles.length}</span>
                    </div>
                    <div className="attr-grid">
                        {g.tiles.map((t, i) => (
                            <div className={`attr-tile${t.rare ? ' rare' : ''}${t.grid ? ' attr-tile-glyphcard' : ''}`} key={`${g.key}-${i}`}>
                                <span className="attr-tile-glyph">{t.glyph}{VS15}</span>
                                <span className="attr-tile-label">{t.label}</span>
                                {t.grid ? (
                                    <span className="attr-entropy" role="img" aria-label="Entropy barcode">
                                        {t.grid.map((on, gi) => (
                                            <span key={gi} className={`attr-entropy-cell${on ? ' on' : ''}`} />
                                        ))}
                                    </span>
                                ) : (
                                    <span className="attr-tile-value">
                                        {t.swatch && <span className="attr-swatch" style={{ background: t.swatch }} />}
                                        {t.value}
                                    </span>
                                )}
                                {t.sub && <span className="attr-tile-sub">{t.sub}</span>}
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
