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

type Props = { params: Promise<{ slug: string }> };

/* Legacy fallback only: before the dedicated projects.uploaded_at column, the
   upload moment was derived from cooldown_until − 60d (the 60-day artist
   cooldown clock fires at upload). uploaded_at is now the source of truth. */
const COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000;

/* Server-side seed read. Best-effort: any failure falls back to (0, [], null)
   so the page still renders (ghosts + client reconcile) rather than erroring. */
async function fetchSeed(
    slug: string,
): Promise<{ total: number; showcaseIds: number[]; uploadedAt: number | null }> {
    try {
        const supabase = getSupabaseService();
        const { data } = await supabase
            .from('projects')
            .select('minted_count, showcase_ids, uploaded_at, cooldown_until')
            .eq('id', slug)
            .maybeSingle();
        const row = data as {
            minted_count?: number;
            showcase_ids?: number[];
            uploaded_at?: string | null;
            cooldown_until?: string | null;
        } | null;
        const uploadedAt = row?.uploaded_at
            ? new Date(row.uploaded_at).getTime()
            : row?.cooldown_until
                ? new Date(row.cooldown_until).getTime() - COOLDOWN_MS
                : null;
        return {
            total: typeof row?.minted_count === 'number' ? row.minted_count : 0,
            showcaseIds: Array.isArray(row?.showcase_ids) ? row!.showcase_ids! : [],
            uploadedAt,
        };
    } catch {
        return { total: 0, showcaseIds: [], uploadedAt: null };
    }
}

export default async function ProjectPage(props: Props) {
    const params = await props.params;
    const slug = params.slug.toLowerCase();
    if (!getProject(slug)) notFound();
    const { total, showcaseIds, uploadedAt } = await fetchSeed(slug);
    return (
        <ProjectPageBody
            slug={slug}
            initialTotal={total}
            initialShowcaseIds={showcaseIds}
            uploadedAt={uploadedAt}
        />
    );
}

export async function generateMetadata(props: Props): Promise<Metadata> {
    const params = await props.params;
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
