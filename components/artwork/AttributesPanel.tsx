'use client';

/*
 * AttributesPanel — an Output's full "character sheet" under Artwork ▸ + More ▸
 * Attributes. Reuses the achievements-wall design language (grouped tile grid)
 * and paints every attribute we capture: identity + true name, sampled form,
 * natal sky, mint-moment almanac, the I Ching oracle, and deterministic
 * edition-set rarity. Data comes from buildOutputAttributes (live derivations +
 * rarity), fed by the single-output API + the stored fingerprint.
 */

import { useMemo } from 'react';
import { buildOutputAttributes, type AttrInput } from '../../lib/output/attributes';

const VS15 = '︎';

export default function AttributesPanel(props: AttrInput) {
    const groups = useMemo(() => buildOutputAttributes(props), [props]);

    return (
        <div className="attr-wall">
            {groups.map((g) => (
                <section className="attr-group" key={g.key} aria-label={g.label}>
                    <div className="attr-group-head">
                        <span className="attr-group-name">{g.label}</span>
                        <span className="attr-group-count">{g.tiles.length}</span>
                    </div>
                    <div className="attr-grid">
                        {g.tiles.map((t, i) => (
                            <div className={`attr-tile${t.rare ? ' rare' : ''}`} key={`${g.key}-${i}`}>
                                <span className="attr-tile-glyph">{t.glyph}{VS15}</span>
                                <span className="attr-tile-label">{t.label}</span>
                                <span className="attr-tile-value">
                                    {t.swatch && <span className="attr-swatch" style={{ background: t.swatch }} />}
                                    {t.value}
                                </span>
                                {t.sub && <span className="attr-tile-sub">{t.sub}</span>}
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
