import { getAllDocs } from '../../lib/docs/content';
import { getNav } from '../../lib/docs/content';

/*
 * /llms.txt — the machine-readable index of PD-Docs, per the llms.txt
 * convention: an H1, a one-paragraph summary, then H2 sections whose links
 * carry one-sentence descriptions. Generated from the same content tree as
 * the pages themselves, so every link resolves and every page is covered —
 * by construction, not by discipline.
 */

export const dynamic = 'force-static';

const ORIGIN = 'https://docs.pricediscussion.com';

export function GET() {
    const docs = getAllDocs();
    const nav = getNav();

    const lines: string[] = [
        '# Price Discussion Documentation',
        '',
        '> Price Discussion (PD) is a curated generative art platform on Ethereum where',
        '> the community discussing prices is the product. This documentation covers the',
        '> PriceOS app surface, the smart contracts, and the $PRICE token. Every page',
        '> here is also available as raw markdown by appending .md to its URL.',
        '',
    ];

    for (const section of nav) {
        lines.push(`## ${section.title}`, '');
        for (const item of section.items) {
            const url = item.slug === '' ? `${ORIGIN}/docs` : `${ORIGIN}/docs/${item.slug}`;
            const doc = docs.find((d) => d.slug === item.slug);
            if (doc) {
                lines.push(`- [${doc.frontmatter.title}](${url}): ${doc.frontmatter.description}`);
            } else if (item.slug === 'features') {
                lines.push(`- [The Feature Atlas](${url}): The canonical numbered catalog of every named PriceOS feature, sortable and filterable by section. Markdown form at ${ORIGIN}/docs/features.md.`);
            }
        }
        lines.push('');
    }

    lines.push('## Optional', '');
    lines.push(`- [Full documentation as one file](${ORIGIN}/llms-full.txt): every page of this site concatenated as plain markdown.`);
    lines.push('');

    return new Response(lines.join('\n'), {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
        },
    });
}
