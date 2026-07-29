'use client';

/*
 * EquippedCharm — the mini charm worn at the END of the profile tags
 * (Brendon-confirmed placement, 2026-07-27). Default-off: renders NOTHING
 * unless the owner has equipped a charm in the Depanneur. Tap → the full
 * charm popup (never a nav).
 */

import { useMemo } from 'react';
import { useModal } from '../../lib/state/ModalContext';
import { charmSVG } from '../../lib/keychains/engine';
import { useKeychainRack } from '../../lib/keychains/rack';

export default function EquippedCharm({ address }: { address: string }) {
    const { open } = useModal();
    const rack = useKeychainRack(address);
    const charm = rack?.equipped != null
        ? rack.charms.find((c) => c.id === rack.equipped) ?? null
        : null;

    const svg = useMemo(
        /* No chain AND no name tag on the worn charm — the view tightens to the
           character itself so it fills its box at this size instead of giving
           half of it to a banner nobody can read (Brendon, 2026-07-29). */
        () => (charm && rack ? charmSVG(charm.seed, `eq${charm.id}`, rack.streak, rack.rank, '', charm.coin, true) : ''),
        [charm, rack],
    );

    if (!charm) return null;
    return (
        <span
            className="pd-charm-worn"
            role="button"
            tabIndex={0}
            title={charm.name || 'Keychain'}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); open('keychain', `${address.toLowerCase()}:${charm.id}`); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); open('keychain', `${address.toLowerCase()}:${charm.id}`); } }}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}
