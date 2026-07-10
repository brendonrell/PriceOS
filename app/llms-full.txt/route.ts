import { getAllDocs } from '../../lib/docs/content';

/*
 * /llms-full.txt — the whole documentation site as one plain-markdown file,
 * in sidebar order, for agents that prefer a single fetch over walking
 * llms.txt links. Same source files as the HTML pages; parity is structural.
 */

export const dynamic = 'force-static';

export function GET() {
    const docs = getAllDocs();
    const out = docs.map((d) => d.raw.trim()).join('\n\n---\n\n') + '\n';
    return new Response(out, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
        },
    });
}
