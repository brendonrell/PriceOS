// Project page shell — `/art/{slug}`.
// Replaces D1 scaffolds at /collection/[slug] and /mint/[slug].
// Mint UI lives inside this page during the mint window;
// no separate /mint/{slug} route exists.
//
// Server component validates the slug against the Project registry + emits
// metadata, then renders <ProjectPageBody slug> (client). The body re-provides
// ProjectContext with this slug so the hero/gallery/traits bind to the right
// Project. Unknown slugs 404.
//
// First-paint seed: we read projects.minted_count + showcase_ids here on the
// server and hand them to ProjectPageBody, so the gallery renders the REAL
// minted cards in the initial HTML instead of booting empty and waiting on a
// client fetch (the old ghost→art flip + "appear late" gap). The client
// reconcile in ProjectContext still runs for live owners/prices/stats.
import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import ProjectPageBody from '../../../components/project/ProjectPageBody';
import { getProject, artImageUrl } from '../../../lib/project/registry';
import { getSupabaseService } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

/* Legacy fallback only: before the dedicated projects.uploaded_at column, the
   upload moment was derived from cooldown_until − 60d (the 60-day artist
   cooldown clock fires at upload). uploaded_at is now the source of truth. */
const COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000;

/* Server-side seed read. Best-effort: any failure falls back to (0, [], null)
   so the page still renders (ghosts + client reconcile) rather than erroring.
   Request-deduped via cache() — generateMetadata and the page share ONE read. */
const fetchSeed = cache(async function fetchSeed(
    slug: string,
): Promise<{ total: number; showcaseIds: number[]; uploadedAt: number | null; floorEth: number | null; projectNo: number | null }> {
    try {
        const supabase = getSupabaseService();
        const { data } = await supabase
            .from('projects')
            .select('minted_count, showcase_ids, uploaded_at, cooldown_until, floor_price_eth, project_no')
            .eq('id', slug)
            .maybeSingle();
        const row = data as {
            minted_count?: number;
            showcase_ids?: number[];
            uploaded_at?: string | null;
            cooldown_until?: string | null;
            floor_price_eth?: string | number | null;
            project_no?: number | null;
        } | null;
        const uploadedAt = row?.uploaded_at
            ? new Date(row.uploaded_at).getTime()
            : row?.cooldown_until
                ? new Date(row.cooldown_until).getTime() - COOLDOWN_MS
                : null;
        const floor = row?.floor_price_eth != null ? Number(row.floor_price_eth) : null;
        return {
            total: typeof row?.minted_count === 'number' ? row.minted_count : 0,
            showcaseIds: Array.isArray(row?.showcase_ids) ? row!.showcase_ids! : [],
            uploadedAt,
            floorEth: floor != null && floor > 0 ? floor : null,
            projectNo: typeof row?.project_no === 'number' ? row.project_no : null,
        };
    } catch {
        return { total: 0, showcaseIds: [], uploadedAt: null, floorEth: null, projectNo: null };
    }
});

export default async function ProjectPage(props: Props) {
    const params = await props.params;
    const slug = params.slug.toLowerCase();
    const def = getProject(slug);
    if (!def) notFound();
    const { total, showcaseIds, uploadedAt, floorEth, projectNo } = await fetchSeed(slug);
    // Machine-readable facts for agents + search + assistive tech — the
    // project as a collection of generative artworks, from registry truth
    // plus the live floor when one exists.
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Collection',
        name: def.displayName,
        creator: def.artistHandle ? { '@type': 'Person', name: `@${def.artistHandle}` } : undefined,
        size: def.outputs,
        about: 'Generative art — every piece renders live from deterministic on-chain code.',
        url: `/art/${slug}`,
        offers: floorEth
            ? { '@type': 'AggregateOffer', lowPrice: floorEth, priceCurrency: 'ETH' }
            : undefined,
    };
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <ProjectPageBody
                slug={slug}
                initialTotal={total}
                initialShowcaseIds={showcaseIds}
                uploadedAt={uploadedAt}
                projectNo={projectNo}
            />
        </>
    );
}

export async function generateMetadata(props: Props): Promise<Metadata> {
    const params = await props.params;
    const slug = params.slug.toLowerCase();
    const def = getProject(slug);
    if (!def) {
        return { title: 'Not Found · Price Discussion' };
    }
    const description = [
        `${def.displayName} — a generative art project`,
        def.artistHandle ? `by @${def.artistHandle}` : null,
        `on Price Discussion. ${def.outputs} pieces, each rendered live from deterministic code.`,
    ].filter(Boolean).join(' ');
    // Share/unfurl image — a real piece from the project (the first showcase
    // pick, else #1), as a large card. Unminted projects fall back to the mark.
    const { total, showcaseIds } = await fetchSeed(slug);
    const art = total > 0 ? artImageUrl(slug, showcaseIds[0] ?? 1) : null;
    const ogTitle = `${def.displayName} on Price Discussion`;
    return {
        title: `${def.displayName} · Price Discussion`,
        description,
        alternates: { canonical: `/art/${slug}` },
        openGraph: {
            title: ogTitle,
            description,
            type: 'website',
            url: `/art/${slug}`,
            images: art
                ? [{ url: art, alt: ogTitle }]
                : [{ url: '/icon-1024px.png', width: 1024, height: 1024, alt: 'Price Discussion' }],
        },
        twitter: {
            card: art ? 'summary_large_image' : 'summary',
            title: ogTitle,
            description,
            images: [art ?? '/icon-1024px.png'],
        },
    };
}
