import type { Metadata } from 'next';
import { FeatureAtlas } from '../../../components/docs/FeatureAtlas';
import { ATLAS, atlasId } from '../../../lib/docs/features';

/*
 * /docs/features — the PriceOS Feature Atlas catalog. A static segment, so
 * it wins over the [[...slug]] markdown renderer; the interactive catalog
 * is a client island over the build-time registry. Raw-markdown parity is
 * served at /docs/features.md via the same registry.
 */

export const dynamic = 'force-static';

export const metadata: Metadata = {
    title: 'The Feature Atlas',
    description:
        `The canonical numbered catalog of every named PriceOS feature — ${ATLAS.length} entries from ${atlasId(1)} to ${atlasId(ATLAS.length)}, sortable and filterable by section.`,
};

export default function FeatureAtlasPage() {
    return (
        <div className="pd-docs-page">
            <article className="pd-docs-article pd-docs-article--atlas">
                <div className="pd-docs-pagemeta">
                    <span>Updated 2026-07-10</span>
                    <span className="pd-docs-sep">·</span>
                    <a href="/docs/features.md" title="The Atlas as raw markdown">
                        View as Markdown
                    </a>
                </div>
                <h1>The Feature Atlas</h1>
                <p>
                    Every named feature on PriceOS, in one continuous catalog. Each feature carries a
                    permanent number — {atlasId(1)} through {atlasId(ATLAS.length)} today, with room for a
                    thousand — assigned once and never reused, the way token IDs work. The name is the
                    stable key; the number is the collectible.
                </p>
                <FeatureAtlas />
            </article>
        </div>
    );
}
