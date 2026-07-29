'use client';

/*
 * ═══ THE ASCII-ID — PD's ONE identity unit. LOCKED (Brendon, 2026-07-29). ═══
 *
 * Wherever the platform shows a PERSON — every modal, every list row, the
 * Friend Inspector, the output page's owner line — it shows THIS, and the
 * anatomy is fixed, in this order, inside the tinted rectangle:
 *
 *     PriceSprite  ›  PriceRank  ›  @name  ›  Sigil
 *
 * That is the connect-menu identity, verbatim. Nothing is optional and
 * nothing is reordered per surface — one look, everywhere. A part is absent
 * only when the person genuinely has none: an unloaded/unknown sprite, an
 * unranked account, an unforged Sigil (or one its owner switched off).
 *
 * PROFILE TAGS ARE NOT PART OF THE ASCII-ID. They are their own thing, and
 * they ride in the same SPOT — the row immediately after the rectangle — but
 * they live outside it, drawn by UserTags. Never move a tag inside the
 * rectangle, and never treat a surface as "missing the ASCII-ID" because it
 * has no tags.
 *
 * The rectangle itself (the quiet auto-tinted grouping) is the sim's port —
 * .collected-pair › .collected-sprite + .collected-rank-badge +
 * .profile-link + .collected-sigil — so the already-ported CSS applies
 * untouched.
 *
 * The face comes from useSpriteFace (live DB sprite, wallet-derived
 * fallback); the rank and Sigil from one cached per-handle profile read.
 * While they load the ID renders with what it has — the rectangle never
 * waits.
 */

import { useSpriteFace } from '../../lib/hooks/useSpriteFace';
import SpriteFace from '../SpriteFace';
import SigilArt from '../SigilArt';
import { useSpiteMatcher } from '../../lib/pins/spiteStore';
import { useUserIdentity, rankBadgeGlyph } from '../../lib/hooks/useUserRank';

export default function AsciiId({
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
    const id = useUserIdentity(h);
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
            {id.rank !== null && (
                <span
                    className="collected-rank-badge"
                    aria-label={`PriceRank ${id.rank}`}
                    title={`PriceRank ${id.rank}`}
                >
                    {rankBadgeGlyph(id.rank)}
                </span>
            )}
            <a className={`profile-link${isSpited(h) ? ' spited' : ''}`} href={`/${h}`}>
                @{h}
            </a>
            {id.sigilVisible && id.address && (
                <SigilArt
                    address={id.address}
                    hex="currentColor"
                    className="collected-sigil"
                    title="Sigil"
                />
            )}
        </span>
    );
}
