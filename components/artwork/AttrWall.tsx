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

import type { AttrGroup } from '../../lib/output/attributes';

const VS15 = '︎';

export default function AttrWall({
    groups,
    reading = null,
    offerTraits = null,
    onTraitOffer,
}: {
    groups: AttrGroup[];
    reading?: string | null;
    /** category → value map of the piece's offerable traits (outputTraits). */
    offerTraits?: Record<string, string> | null;
    onTraitOffer?: (category: string, value: string) => void;
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
                        {g.tiles.map((t, i) => {
                            const offerable =
                                !!offerTraits && !!onTraitOffer &&
                                typeof t.value === 'string' &&
                                offerTraits[t.label] === t.value;
                            return (
                            <div className={`attr-tile${t.rare ? ' rare' : ''}${t.grid ? ' attr-tile-glyphcard' : ''}${offerable ? ' has-offer' : ''}`} key={`${g.key}-${i}`}>
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
