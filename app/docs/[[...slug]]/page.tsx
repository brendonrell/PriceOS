import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllDocs, getDoc, getNav } from '../../../lib/docs/content';
import { renderMarkdown, extractToc } from '../../../lib/docs/markdown';
import { MarkdownView } from '../../../components/docs/MarkdownView';

/*
 * PD-Docs page renderer. Fully static: every page is prerendered at build
 * from content/docs/**\/*.md — the same files that serve the .md URLs and
 * llms.txt, so HTML and markdown can never drift apart.
 */

export const dynamic = 'force-static';
export const dynamicParams = false;

type Params = { slug?: string[] };

export function generateStaticParams(): Params[] {
    return getAllDocs().map((d) => ({
        slug: d.slug === '' ? [] : d.slug.split('/'),
    }));
}

function slugOf(params: Params): string {
    return (params.slug ?? []).join('/');
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const doc = getDoc(slugOf(await params));
    if (!doc) return {};
    return {
        title: doc.slug === '' ? { absolute: doc.frontmatter.title } : doc.frontmatter.title,
        description: doc.frontmatter.description,
        keywords: doc.frontmatter.keywords,
        openGraph: {
            title: doc.frontmatter.title,
            description: doc.frontmatter.description,
        },
    };
}

export default async function DocsPage({ params }: { params: Promise<Params> }) {
    const slug = slugOf(await params);
    const doc = getDoc(slug);
    if (!doc) notFound();

    const html = renderMarkdown(doc.body);
    const toc = extractToc(doc.body);

    /* Prev/next walk the sidebar order — the manifest, not the filesystem. */
    const ordered = getNav().flatMap((s) => s.items);
    const idx = ordered.findIndex((i) => i.slug === slug);
    const prev = idx > 0 ? ordered[idx - 1] : null;
    const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;
    const mdHref = slug === '' ? '/docs/index.md' : `/docs/${slug}.md`;

    return (
        <div className="pd-docs-page">
            <article className="pd-docs-article">
                <div className="pd-docs-pagemeta">
                    <span>Updated {doc.frontmatter.last_updated}</span>
                    <span className="pd-docs-sep">·</span>
                    <MarkdownView href={mdHref} />
                </div>
                <div dangerouslySetInnerHTML={{ __html: html }} />
                <nav className="pd-docs-pager" aria-label="Adjacent pages">
                    {prev ? (
                        <Link href={prev.slug === '' ? '/docs' : `/docs/${prev.slug}`} className="pd-docs-pager-link prev">
                            <span className="pd-docs-pager-dir">← Previous</span>
                            {prev.label}
                        </Link>
                    ) : <span />}
                    {next ? (
                        <Link href={`/docs/${next.slug}`} className="pd-docs-pager-link next">
                            <span className="pd-docs-pager-dir">Next →</span>
                            {next.label}
                        </Link>
                    ) : <span />}
                </nav>
            </article>
            {toc.length > 1 && (
                <aside className="pd-docs-toc" aria-label="On this page">
                    <div className="pd-docs-toc-title">On this page</div>
                    <ul>
                        {toc.map((t) => (
                            <li key={t.id}>
                                <a href={`#${t.id}`}>{t.text}</a>
                            </li>
                        ))}
                    </ul>
                </aside>
            )}
        </div>
    );
}
