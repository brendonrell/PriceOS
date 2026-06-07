// Project page shell — `/art/{slug}`.
// Replaces D1 scaffolds at /collection/[slug] and /mint/[slug].
// Mint UI lives inside this page during the mint window;
// no separate /mint/{slug} route exists.
//
// Server component validates the slug against the Project registry + emits
// metadata, then renders <ProjectPageBody slug> (client). The body re-provides
// ProjectContext with this slug so the hero/gallery/traits bind to the right
// Project. Unknown slugs 404.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProjectPageBody from '../../../components/project/ProjectPageBody';
import { getProject } from '../../../lib/project/registry';

export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };

export default function ProjectPage({ params }: Props) {
    const slug = params.slug.toLowerCase();
    if (!getProject(slug)) notFound();
    return <ProjectPageBody slug={slug} />;
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
