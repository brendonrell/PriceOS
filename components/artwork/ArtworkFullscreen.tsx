'use client';

/*
 * ArtworkFullscreen — the live artwork, alone, as large as its aspect ratio
 * allows, centred in a tasteful frame of the user's background colour. No card,
 * no frame, no chrome — just the running art. The background reads the live
 * --bg-color, so whatever colorway (or custom default) the user has set is the
 * frame colour automatically.
 *
 * Mounted by app/art/[slug]/[localId]/full/page.tsx.
 */

import ArtworkLive from './ArtworkLive';

export default function ArtworkFullscreen({ slug, id }: { slug: string; id: number }) {
    return (
        <div className="artwork-fullscreen">
            {/* Back to the artwork page — sits just under the connect-menu
                square in the top-right corner. Same arrow family as the
                connect-menu back rows.

                Goes BACK, not forward (Brendon, 2026-07-06): pushing the
                output page from here stacked an output↔fullscreen ping-pong
                into history, so Back got stuck bouncing between the two. Use
                real history when this session has any; the href stays the
                fallback for a cold deep-link (fresh tab, nothing to go back
                to). */}
            <a
                className="fullscreen-back"
                href={`/art/${slug}/${id}`}
                title="Back"
                aria-label="Back"
                /* Opt out of the shell's in-app click router (capture phase runs
                   before this onClick and would push the href forward again). */
                data-native-nav=""
                onClick={(e) => {
                    if (window.history.length > 1) {
                        e.preventDefault();
                        e.stopPropagation();
                        const from = window.location.href;
                        window.history.back();
                        /* history.length > 1 can still mean "nothing BEHIND us"
                           (first entry of a tab that later went forward). If
                           back() moved nothing, land on the artwork page via
                           the href so the arrow is never a dead button. */
                        window.setTimeout(() => {
                            if (window.location.href === from) {
                                window.location.assign(`/art/${slug}/${id}`);
                            }
                        }, 400);
                    }
                }}
            >
                {'⇠⇠︎'}
            </a>
            <ArtworkLive slug={slug} id={id} contain className="artwork-fullscreen-art" />
        </div>
    );
}
