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
import { useSpiteMatcher } from '../../lib/pins/spiteStore';

export default function CollectedPair({
    handle,
    onSpriteTap,
}: {
    handle: string;
    /** When set, tapping ONLY the sprite face fires this with the face's on-screen
     *  rect (the @name link still navigates). Used by the Friend Inspector to pop
     *  a PriceRank card off a sprite (Brendon, 2026-07-11). */
    onSpriteTap?: (rect: DOMRect) => void;
}) {
    const h = handle.toLowerCase().replace(/^@/, '');
    const face = useSpriteFace(h);
    /* Spite Book — a spited handle renders redacted in every chip. */
    const isSpited = useSpiteMatcher();
    return (
        <span className="collected-pair">
            {face && (onSpriteTap ? (
                <span
                    className="collected-sprite-tap"
                    role="button"
                    tabIndex={0}
                    title="PriceRank"
                    onClick={(e) => { e.stopPropagation(); onSpriteTap(e.currentTarget.getBoundingClientRect()); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onSpriteTap(e.currentTarget.getBoundingClientRect()); } }}
                >
                    <SpriteFace className="collected-sprite" face={face} />
                </span>
            ) : (
                <SpriteFace className="collected-sprite" face={face} />
            ))}
            <a className={`profile-link${isSpited(h) ? ' spited' : ''}`} href={`/${h}`}>
                @{h}
            </a>
        </span>
    );
}
