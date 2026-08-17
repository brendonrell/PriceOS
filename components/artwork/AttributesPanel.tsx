'use client';

/*
 * AttributesPanel — an Output's full "character sheet" under Artwork ▸ + More ▸
 * Attributes. Reuses the achievements-wall design language (grouped tile grid)
 * and paints every attribute we capture: identity + true name, sampled form,
 * natal sky, mint-moment almanac, the I Ching oracle, and deterministic
 * edition-set rarity. Data comes from buildOutputAttributes (live derivations +
 * rarity), fed by the single-output API + the stored fingerprint.
 */

import { useEffect, useMemo, useState } from 'react';
import { buildOutputAttributes, type AttrInput } from '../../lib/output/attributes';
import { fetchEditionStats, type EditionStats } from '../../lib/output/editionStats';
import { samplePaletteChips, sampleGeometry, type PaletteChip } from '../../lib/output/paletteChips';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useToast } from '../../lib/state/ToastContext';
import { useModal } from '../../lib/state/ModalContext';
import { composeCelestialReading } from '../../lib/output/celestialReading';
import { useMarketSheet } from '../../lib/state/MarketSheetContext';
import AttrWall from './AttrWall';
import RarityReceiptButton from './RarityReceiptButton';

export default function AttributesPanel({ query, ...props }: AttrInput & { query?: string }) {
    /* Edition context — percentile tags + mint order/speed, from the real
       stored rows. One cached fetch per project; the sheet fills in as it
       lands (tags are gated on coverage, never faked). */
    const [edition, setEdition] = useState<EditionStats | null>(null);
    useEffect(() => {
        let cancelled = false;
        fetchEditionStats(props.slug).then((s) => { if (!cancelled) setEdition(s); });
        return () => { cancelled = true; };
    }, [props.slug]);

    /* Swatches — the piece's actual colours, sampled once from its own
       offscreen render (cached per piece). */
    const [palette, setPalette] = useState<PaletteChip[] | null>(null);
    useEffect(() => {
        let cancelled = false;
        const t = window.setTimeout(() => {
            const chips = samplePaletteChips(props.slug, props.id);
            if (!cancelled) setPalette(chips);
        }, 0);
        return () => { cancelled = true; window.clearTimeout(t); };
    }, [props.slug, props.id]);

    /* Geometry (taste axes, v4) — stored value when the row has it; otherwise
       read live from the piece's own offscreen render (same deferred pattern
       as the swatches; cached per piece). Rows captured before the v4 read
       never re-capture (first-viewer-wins), so live IS their permanent path. */
    const [liveGeometry, setLiveGeometry] = useState<number | null>(null);
    useEffect(() => {
        if (props.fingerprint?.geometry != null) return;
        let cancelled = false;
        const t = window.setTimeout(() => {
            const g = sampleGeometry(props.slug, props.id);
            if (!cancelled) setLiveGeometry(g);
        }, 0);
        return () => { cancelled = true; window.clearTimeout(t); };
    }, [props.slug, props.id, props.fingerprint?.geometry]);

    const groups = useMemo(() => {
        const geometry = props.fingerprint?.geometry ?? liveGeometry;
        const fingerprint = props.fingerprint
            ? { ...props.fingerprint, geometry }
            : geometry != null
                ? {
                      dominant_color: null, aspect: null, brightness: null,
                      saturation: null, complexity: null, geometry,
                  }
                : null;
        return buildOutputAttributes({ ...props, fingerprint, edition, palette });
    }, [props, edition, palette, liveGeometry]);
    const { notifs } = usePdNotifs();
    const { showToast } = useToast();
    const { openCriteriaOfferSheet } = useMarketSheet();
    const { open } = useModal();

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
       outputTraits vocabulary — props.traits) wears the ✶ chip. */
    return (
        <>
            <AttrWall
                groups={groups}
                reading={reading}
                query={query}
                offerTraits={props.traits ?? null}
                onTraitOffer={(category, value) =>
                    openCriteriaOfferSheet({ kind: 'trait', slug: props.slug, category, value })
                }
                onChipTap={(hex) => {
                    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                        navigator.clipboard.writeText(hex).catch(() => {});
                    }
                    showToast(`${hex}: COPIED`);
                }}
                onTileTap={(key) => {
                    /* Golf Score tile — opens the Clubhouse leaderboard, same
                       tap as the Project attributes sheet (Brendon, 2026-08-18). */
                    if (key === 'golf') open('golf-leaderboard', undefined, props.slug);
                }}
            />
            <RarityReceiptButton slug={props.slug} id={props.id} />
        </>
    );
}
