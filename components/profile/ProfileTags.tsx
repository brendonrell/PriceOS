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

import type { Tag } from '../../lib/tags/catalog';

export function ProfileTags({ tags }: { tags: Tag[] }) {
    if (!tags.length) return null;
    return (
        <div className="profile-tags" aria-label="Tags">
            {tags.map((t) => (
                <span
                    key={t.id}
                    className="profile-tag"
                    style={{ ['--tag' as string]: t.color }}
                    title={t.label}
                >
                    {t.glyph && <span className="profile-tag-glyph">{t.glyph}</span>}
                    <span className="profile-tag-label">{t.label}</span>
                </span>
            ))}
        </div>
    );
}
