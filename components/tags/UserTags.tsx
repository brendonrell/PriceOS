'use client';

/*
 * UserTags — one person's profile tags, drawn on a LIST surface (Brendon,
 * 2026-07-24: approved for the leaderboards, collectors, followers, the Friend
 * Inspector dossier, the artwork owner line and search).
 *
 * It is deliberately thin. The pill itself is drawn by ProfileTags — the SAME
 * renderer the profile hero uses — so a tag looks identical everywhere and there
 * is exactly one place its markup lives. All this adds is the row treatment a
 * dense list needs.
 *
 * Order is the tag's own order, untouched (Brendon: "just in the order they
 * appear already"). Nothing is capped or dropped: the row is a single line that
 * scrolls sideways if someone has a lot, so a tag-heavy user can never push a
 * list row taller than its neighbours. Pruning which tags show is a later call —
 * this shows them all so there's something to prune from.
 */

import { ProfileTags } from '../profile/ProfileTags';
import { useUserTags, type UserTagSet } from '../../lib/hooks/useUserTags';

export function UserTags({ set, size = 'row', themed = false, onTagTap }: {
    /** This person's resolved tags, from useUserTags. Absent = render nothing. */
    set: UserTagSet | undefined;
    /** 'row' = the list-row strip. 'inline' = the same pills at hero weight,
     *  for the roomier surfaces (the dossier head, the artwork owner line).
     *  'mini' = the half-scale pills that ride inline right after an
     *  ASCII-ID (Brendon, 2026-07-27). */
    size?: 'row' | 'inline' | 'mini';
    /** Paint the pills in the PAGE's colorway tokens instead of each tag's
     *  own colour — the output-page treatment for the mini row. */
    themed?: boolean;
    /** Override the pill tap (the mini↔big toggle). Absent = the default
     *  open-the-tag's-room behaviour. */
    onTagTap?: () => void;
}) {
    if (!set?.tags.length) return null;
    const cls = ['user-tags'];
    if (size === 'row') cls.push('user-tags--row');
    if (size === 'mini') cls.push('user-tags--mini');
    if (themed) cls.push('user-tags--themed');
    return (
        <ProfileTags
            className={cls.join(' ')}
            tags={set.tags}
            font={set.font}
            paint={set.paint}
            onTagTap={onTagTap ? () => onTagTap() : undefined}
        />
    );
}

/** Convenience for a surface showing a SINGLE person (the owner line, the
 *  dossier) — does its own one-handle lookup off the shared cache. */
export function UserTagsFor({ handle, size = 'inline', themed, onTagTap }: {
    handle: string | null | undefined;
    size?: 'row' | 'inline' | 'mini';
    themed?: boolean;
    onTagTap?: () => void;
}) {
    const tagSets = useUserTags(handle ? [handle] : []);
    return <UserTags set={handle ? tagSets[handle.toLowerCase()] : undefined} size={size} themed={themed} onTagTap={onTagTap} />;
}
