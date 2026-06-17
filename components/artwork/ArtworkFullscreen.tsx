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
                connect-menu back rows. */}
            <a className="fullscreen-back" href={`/art/${slug}/${id}`} title="Back" aria-label="Back">
                {'⇠⇠︎'}
            </a>
            <ArtworkLive slug={slug} id={id} contain className="artwork-fullscreen-art" />
        </div>
    );
}
