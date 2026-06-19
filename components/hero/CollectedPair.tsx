'use client';

/*
 * CollectedPair — the sim's sprite+name chip (sim 5113 + 2080-2133):
 * a quiet auto-tinted rectangle grouping the user's PriceSprite face and
 * their @name as one atomic, wrap-safe unit. Markup + classes mirror the
 * sim verbatim (.collected-pair › .collected-sprite + .profile-link) so
 * the already-ported CSS applies untouched.
 *
 * The face comes from useSpriteFace (live DB sprite, wallet-derived
 * fallback). While it loads — or for unknown users — the chip renders
 * name-only; the rectangle never waits.
 */

import { useSpriteFace } from '../../lib/hooks/useSpriteFace';
import SpriteFace from '../SpriteFace';

export default function CollectedPair({ handle }: { handle: string }) {
    const h = handle.toLowerCase().replace(/^@/, '');
    const face = useSpriteFace(h);
    return (
        <span className="collected-pair">
            {face && <SpriteFace className="collected-sprite" face={face} />}
            <a className="profile-link" href={`/${h}`}>
                @{h}
            </a>
        </span>
    );
}
