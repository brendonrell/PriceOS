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
import SigilArt from '../SigilArt';
import { useSpiteMatcher } from '../../lib/pins/spiteStore';
import { useUserIdentity, rankBadgeGlyph } from '../../lib/hooks/useUserRank';
import { ACHIEVEMENTS_ICON } from '../../lib/achievements/icon';

export default function CollectedPair({
    handle,
    onSpriteTap,
    showRank = false,
    showSigil = false,
    showScore = false,
}: {
    handle: string;
    /** When set, tapping ONLY the sprite face fires this with the face's on-screen
     *  rect (the @name link still navigates). Used by the Friend Inspector to pop
     *  a PriceRank card off a sprite (Brendon, 2026-07-11). */
    onSpriteTap?: (rect: DOMRect) => void;
    /** FULL ASCII-ID mode (Brendon, 2026-07-27): the chip carries the person's
     *  PriceRank badge between sprite and @name — the connect-menu identity,
     *  verbatim, at chip scale. Rank derives from their live PriceScore
     *  (cached per handle). */
    showRank?: boolean;
    /** THE SIGIL rides after the @name, exactly as it trails the name on the
     *  connect pill. Absent when the person hasn't forged one or has switched
     *  it off. (Brendon, 2026-07-29 — the output page's owner rectangle.) */
    showSigil?: boolean;
    /** The person's live PriceScore, ◍ + the number, closing the rectangle.
     *  (Brendon, 2026-07-29.) */
    showScore?: boolean;
}) {
    const h = handle.toLowerCase().replace(/^@/, '');
    const face = useSpriteFace(h);
    const id = useUserIdentity(h, showRank || showSigil || showScore);
    const rank = showRank ? id.rank : null;
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
            {showRank && rank !== null && (
                <span
                    className="collected-rank-badge"
                    aria-label={`PriceRank ${rank}`}
                    title={`PriceRank ${rank}`}
                >
                    {rankBadgeGlyph(rank)}
                </span>
            )}
            <a className={`profile-link${isSpited(h) ? ' spited' : ''}`} href={`/${h}`}>
                @{h}
            </a>
            {showSigil && id.sigilVisible && id.address && (
                <SigilArt
                    address={id.address}
                    hex="currentColor"
                    className="collected-sigil"
                    title="Sigil"
                />
            )}
            {showScore && id.score !== null && (
                <span className="collected-score" title="PriceScore">
                    <span className="collected-score-ic">{ACHIEVEMENTS_ICON}</span>
                    {id.score.toLocaleString('en-US')}
                </span>
            )}
        </span>
    );
}
