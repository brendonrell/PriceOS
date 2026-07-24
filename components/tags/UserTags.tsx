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

export function UserTags({ set, size = 'row' }: {
    /** This person's resolved tags, from useUserTags. Absent = render nothing. */
    set: UserTagSet | undefined;
    /** 'row' = the list-row strip. 'inline' = the same pills at hero weight,
     *  for the roomier surfaces (the dossier head, the artwork owner line). */
    size?: 'row' | 'inline';
}) {
    if (!set?.tags.length) return null;
    return (
        <ProfileTags
            className={`user-tags${size === 'row' ? ' user-tags--row' : ''}`}
            tags={set.tags}
            font={set.font}
            paint={set.paint}
        />
    );
}

/** Convenience for a surface showing a SINGLE person (the owner line, the
 *  dossier) — does its own one-handle lookup off the shared cache. */
export function UserTagsFor({ handle, size = 'inline' }: {
    handle: string | null | undefined;
    size?: 'row' | 'inline';
}) {
    const tagSets = useUserTags(handle ? [handle] : []);
    return <UserTags set={handle ? tagSets[handle.toLowerCase()] : undefined} size={size} />;
}
