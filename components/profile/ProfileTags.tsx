'use client';

/*
 * ProfileTags — the identity tag pills on a profile hero, sitting right above
 * the stickers. Dumb renderer: the parent resolves the ordered list (personas
 * the user picked + earned + granted + the platform-number tag) via
 * lib/tags/derive and hands it here.
 *
 * Each pill wears the site pill shape with the tag's flair colour as a
 * full-strength accent (border + glyph in the tag colour; the label stays the
 * colorway text colour so it's always legible on any repainted page).
 */

import type { ReactNode } from 'react';
import { type Tag, tagPaintHex, tagTextOn } from '../../lib/tags/catalog';
import { styleName } from '../../lib/profile/nameFont';
import { PriceMark } from '../brand/PriceMark';
import { useModal } from '../../lib/state/ModalContext';

export function ProfileTags({ tags, font, paint, onTagTap, className, trailing }: {
    tags: Tag[];
    /** Wrapper class — the hero's own row by default. The list surfaces
     *  (leaderboards, collectors, followers, dossier, owner line, search) pass
     *  the compact row instead, so a tag pill is drawn from THIS one renderer
     *  everywhere it appears (Brendon, 2026-07-24). */
    className?: string;
    /** The owner's chosen @name font (users.name_font) — tag labels wear it
     *  too (Brendon, 2026-07-20). Untouched underneath: display-only, same
     *  as the @name itself. */
    font?: string | null;
    /** The owner's all-tags paint (users.tag_paint) — every pill one colour,
     *  lettering contrast-flipped. null = each tag's own colour. */
    paint?: string | null;
    /** Own profile only: tapping a tag opens the customization menu, same as
     *  long-pressing the @name (Brendon, 2026-07-22). Receives the tapped tag so
     *  the owner of a WTBS-family chip can cycle THAT chip's treatment instead
     *  (Brendon, 2026-07-26). Absent = display-only. */
    onTagTap?: (t: Tag) => void;
    /** Rides at the END of the pill row — the equipped keychain mini charm
     *  (Brendon-confirmed placement, 2026-07-27). */
    trailing?: ReactNode;
}) {
    /* WITHOUT an owner handler, a tag opens ITS ROOM (Brendon, 2026-07-27):
       everyone wearing it, sliceable — a popup over wherever you are, never a
       nav. On your OWN profile the tap is already spoken for (the customization
       menu / the WTBS cycle), and that keeps priority. */
    const { open } = useModal();
    /* A PROJECT tag goes TO that Project (Brendon, 2026-07-29) — it stands for a
       piece of work, so the tap is a visit, not a room. Every other tag opens
       its room as before. An owner handler (the customization menu on your own
       profile) still wins over both. */
    const tap = onTagTap ?? ((t: Tag) => {
        if (t.project) { window.location.href = `/art/${t.project}`; return; }
        open('tag', t.id);
    });
    if (!tags.length && !trailing) return null;
    const paintHex = tagPaintHex(paint);
    return (
        <div className={className ?? 'profile-tags'} aria-label="Tags">
            {tags.map((t) => {
                /* Locked-style tags (the CEO chip) wear their OWN colours and
                   font — the all-tags paint and the @name font can't touch
                   them (Brendon, 2026-07-22). */
                const hex = t.lockStyle ? t.color : (paintHex ?? t.color);
                const textHex = t.lockStyle && t.textColor ? t.textColor : tagTextOn(hex);
                return (
                <span
                    key={t.id}
                    className={`profile-tag profile-tag--${t.id}${t.project ? ' profile-tag--proj' : ''}${t.stroke ? ' profile-tag--outlined' : ''}${t.noBorder ? ' profile-tag--edgeless' : ''}`}
                    style={{
                        ['--tag' as string]: hex,
                        ['--tag-text' as string]: textHex,
                        /* The WTBS-family treatments (Brendon, 2026-07-26): hollow
                           stroked letters and/or no pill edge. */
                        ...(t.stroke ? { ['--tag-stroke' as string]: t.stroke } : null),
                        cursor: 'pointer',
                    }}
                    title={t.label}
                    role="button"
                    tabIndex={0}
                    /* Tag pills ride inside rows that are themselves links, so
                       the tap is claimed here — it opens the room, it never
                       also fires the row underneath. */
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); tap(t); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); tap(t); } }}
                >
                    {t.svgGlyph === 'price'
                        ? <PriceMark className="profile-tag-mark" />
                        : t.glyph && <span className="profile-tag-glyph">{t.glyph}</span>}
                    <span className={`profile-tag-label${t.rotate ? ' profile-tag-label--rot180' : ''}`}>
                        {/* CEO stays locked (its own treatment). WTBS renders its
                           label plain so its Inter face shows — the @name Unicode
                           restyle never touches either. A two-tone label (the
                           BitVerse wordmark) draws as coloured runs. */}
                        {t.labelParts
                            ? t.labelParts.map((p, i) => (
                                <span key={i} style={{ color: p.color }}>{p.text}</span>
                            ))
                            : (t.lockStyle || t.font) ? t.label : styleName(t.label, font)}
                    </span>
                </span>
                );
            })}
            {trailing}
        </div>
    );
}
