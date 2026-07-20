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

import { type Tag, tagTextOn } from '../../lib/tags/catalog';
import { styleName } from '../../lib/profile/nameFont';

export function ProfileTags({ tags, font }: {
    tags: Tag[];
    /** The owner's chosen @name font (users.name_font) — tag labels wear it
     *  too (Brendon, 2026-07-20). Untouched underneath: display-only, same
     *  as the @name itself. */
    font?: string | null;
}) {
    if (!tags.length) return null;
    return (
        <div className="profile-tags" aria-label="Tags">
            {tags.map((t) => (
                <span
                    key={t.id}
                    className="profile-tag"
                    style={{ ['--tag' as string]: t.color, ['--tag-text' as string]: tagTextOn(t.color) }}
                    title={t.label}
                >
                    {t.glyph && <span className="profile-tag-glyph">{t.glyph}</span>}
                    <span className="profile-tag-label">{styleName(t.label, font)}</span>
                </span>
            ))}
        </div>
    );
}
