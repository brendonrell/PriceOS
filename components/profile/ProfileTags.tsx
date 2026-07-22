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

import { type Tag, tagPaintHex, tagTextOn } from '../../lib/tags/catalog';
import { styleName } from '../../lib/profile/nameFont';

export function ProfileTags({ tags, font, paint }: {
    tags: Tag[];
    /** The owner's chosen @name font (users.name_font) — tag labels wear it
     *  too (Brendon, 2026-07-20). Untouched underneath: display-only, same
     *  as the @name itself. */
    font?: string | null;
    /** The owner's all-tags paint (users.tag_paint) — every pill one colour,
     *  lettering contrast-flipped. null = each tag's own colour. */
    paint?: string | null;
}) {
    if (!tags.length) return null;
    const paintHex = tagPaintHex(paint);
    return (
        <div className="profile-tags" aria-label="Tags">
            {tags.map((t) => {
                /* Locked-style tags (the CEO chip) wear their OWN colours and
                   font — the all-tags paint and the @name font can't touch
                   them (Brendon, 2026-07-22). */
                const hex = t.lockStyle ? t.color : (paintHex ?? t.color);
                const textHex = t.lockStyle && t.textColor ? t.textColor : tagTextOn(hex);
                return (
                <span
                    key={t.id}
                    className={`profile-tag${t.lockStyle ? ` profile-tag--${t.id}` : ''}`}
                    style={{ ['--tag' as string]: hex, ['--tag-text' as string]: textHex }}
                    title={t.label}
                >
                    {t.glyph && <span className="profile-tag-glyph">{t.glyph}</span>}
                    <span className="profile-tag-label">
                        {t.lockStyle ? t.label : styleName(t.label, font)}
                    </span>
                </span>
                );
            })}
        </div>
    );
}
