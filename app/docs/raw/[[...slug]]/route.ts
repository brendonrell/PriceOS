import { getAllDocs, getDoc } from '../../../../lib/docs/content';
import { atlasAsMarkdown } from '../../../../lib/docs/features';

/*
 * Raw-markdown endpoint — the agent-facing half of every docs page. The
 * public URL shape is the page URL + ".md" (e.g. /docs/quickstart.md);
 * middleware rewrites those here. Serves the exact source file (frontmatter
 * included), so agent-visible content is byte-identical to what the HTML
 * page was rendered from.
 */

export const dynamic = 'force-static';
export const dynamicParams = false;

type Params = { slug?: string[] };

export function generateStaticParams(): Params[] {
    return [
        ...getAllDocs().map((d) => ({
            slug: d.slug === '' ? ['index'] : d.slug.split('/'),
        })),
        { slug: ['features'] },
    ];
}

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
    const parts = (await ctx.params).slug ?? [];
    const slug = parts.join('/') === 'index' ? '' : parts.join('/');
    if (slug === 'features') {
        // The Atlas catalog's markdown twin — generated from the registry.
        return new Response(atlasAsMarkdown(), {
            headers: {
                'Content-Type': 'text/markdown; charset=utf-8',
                'Cache-Control': 'public, max-age=300',
            },
        });
    }
    const doc = getDoc(slug);
    if (!doc) return new Response('Not found', { status: 404 });
    return new Response(doc.raw, {
        headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
        },
    });
}
