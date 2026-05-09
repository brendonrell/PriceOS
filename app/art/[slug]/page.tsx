// Project page shell — `/art/{slug}`.
// Replaces D1 scaffolds at /collection/[slug] and /mint/[slug].
// Mint UI lives inside this page during the mint window;
// no separate /mint/{slug} route exists.
//
// V0 (ProjectPage v0): server component validates the slug + emits
// metadata, then renders <ProjectPageBody /> (client) for the actual
// hero + gallery surface. The body reads everything from
// CollectionContext — slug-data binding lands once the indexer is
// live and per-slug fetch is wired in. Until then every valid slug
// renders the same PRISMS demo data.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProjectPageBody from '../../../components/collection/ProjectPageBody';

type Props = { params: { slug: string } };

function isValidProjectSlug(s: string): boolean {
    const lower = s.toLowerCase();
    return /^[a-z0-9-]+$/.test(lower) && lower.length > 0 && lower.length <= 64;
}

export default function ProjectPage({ params }: Props) {
    if (!isValidProjectSlug(params.slug)) notFound();
    return <ProjectPageBody />;
}

export function generateMetadata({ params }: Props): Metadata {
    if (!isValidProjectSlug(params.slug)) {
        return { title: 'Not Found · Price Discussion' };
    }
    const slug = params.slug.toLowerCase();
    return {
        title: `${slug} · Price Discussion`,
        alternates: { canonical: `/art/${slug}` },
    };
}
