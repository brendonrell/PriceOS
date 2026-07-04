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
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { composeCelestialReading } from '../../lib/output/celestialReading';
import { useMarketSheet } from '../../lib/state/MarketSheetContext';
import AttrWall from './AttrWall';
import RarityReceiptButton from './RarityReceiptButton';

export default function AttributesPanel(props: AttrInput) {
    const groups = useMemo(() => buildOutputAttributes(props), [props]);
    const { notifs } = usePdNotifs();
    const { openCriteriaOfferSheet } = useMarketSheet();

    /* Celestial Tracker — the piece's birth-sky reading, composed from its real
       attributes (no model, $0). Shown only while the spell is on. */
    const reading = useMemo(
        () =>
            notifs.spell_celestial
                ? composeCelestialReading({
                      slug: props.slug,
                      id: props.id,
                      mintMs: props.mintMs,
                      sun: props.traits?.Sun,
                      moon: props.traits?.Moon,
                      rising: props.traits?.Rising,
                  })
                : null,
        [notifs.spell_celestial, props.slug, props.id, props.mintMs, props.traits]
    );

    /* Trait offers, straight off the character sheet (Brendon, 2026-07-02):
       every tile that IS a real offerable trait (the server-computable
       outputTraits vocabulary — props.traits) wears the ✦ chip. */
    return (
        <>
            <RarityReceiptButton slug={props.slug} id={props.id} />
            <AttrWall
                groups={groups}
                reading={reading}
                offerTraits={props.traits ?? null}
                onTraitOffer={(category, value) =>
                    openCriteriaOfferSheet({ kind: 'trait', slug: props.slug, category, value })
                }
            />
        </>
    );
}
