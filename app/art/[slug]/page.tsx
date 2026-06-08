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
import { notFound } from 'next/navigation';
import ProjectPageBody from '../../../components/project/ProjectPageBody';
import { getProject } from '../../../lib/project/registry';
import { getSupabaseService } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };

/* Server-side seed read. Best-effort: any failure falls back to (0, []) so the
   page still renders (ghosts + client reconcile) rather than erroring. */
async function fetchSeed(
    slug: string,
): Promise<{ total: number; showcaseIds: number[] }> {
    try {
        const supabase = getSupabaseService();
        const { data } = await supabase
            .from('projects')
            .select('minted_count, showcase_ids')
            .eq('id', slug)
            .maybeSingle();
        const row = data as { minted_count?: number; showcase_ids?: number[] } | null;
        return {
            total: typeof row?.minted_count === 'number' ? row.minted_count : 0,
            showcaseIds: Array.isArray(row?.showcase_ids) ? row!.showcase_ids! : [],
        };
    } catch {
        return { total: 0, showcaseIds: [] };
    }
}

export default async function ProjectPage({ params }: Props) {
    const slug = params.slug.toLowerCase();
    if (!getProject(slug)) notFound();
    const { total, showcaseIds } = await fetchSeed(slug);
    return (
        <ProjectPageBody
            slug={slug}
            initialTotal={total}
            initialShowcaseIds={showcaseIds}
        />
    );
}

export function generateMetadata({ params }: Props): Metadata {
    const slug = params.slug.toLowerCase();
    const def = getProject(slug);
    if (!def) {
        return { title: 'Not Found · Price Discussion' };
    }
    return {
        title: `${def.displayName} · Price Discussion`,
        alternates: { canonical: `/art/${slug}` },
    };
}
