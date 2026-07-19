/*
 * PD-Docs search index. Build-time only (the /docs/search-index.json route
 * is force-static) — derives one compact JSON entry per docs page from the
 * SAME content tree as the HTML pages, the .md URLs, and llms.txt, so the
 * search corpus can never drift from what's published. The client-side
 * search UI (components/docs/DocsSearch.tsx) fetches this once, lazily.
 */

import { getAllDocs, getNav } from './content';

export type SearchEntry = {
    /* URL slug relative to /docs — '' for the root Introduction page. */
    slug: string;
    title: string;
    /* Sidebar section the page lives under ("For Collectors", …). */
    section: string;
    description: string;
    keywords: string[];
    /* H2/H3 heading texts, for heading-tier matches + deep anchors. */
    headings: { id: string; text: string }[];
    /* The whole body as searchable plain text (markdown syntax stripped). */
    text: string;
};

/* Markdown → plain searchable text. Keeps every word a reader can see;
   drops syntax, link targets, and raw HTML/SVG blocks (diagrams). */
export function stripMarkdown(body: string): string {
    return body
        // fenced code blocks: keep the code text, drop the fences
        .replace(/```[^\n]*\n/g, ' ')
        .replace(/```/g, ' ')
        // inline HTML / SVG (the docs diagrams) — not reader-searchable prose
        .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        // images: keep alt text
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        // links: keep the label, drop the target
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        // emphasis / code / heading / quote / list markers
        .replace(/[*_`~]/g, '')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^>\s?/gm, '')
        .replace(/^[-+]\s+/gm, '')
        .replace(/^\d+\.\s+/gm, '')
        // table pipes and rules
        .replace(/\|/g, ' ')
        .replace(/^[-:\s|]+$/gm, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function slugifyHeading(text: string): string {
    return text
        .toLowerCase()
        .replace(/<[^>]+>/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

/* H2 + H3 — search goes one tier deeper than the page rail so sub-concepts
   (fee lines, spell names, contract calls) are findable by their heading. */
function extractHeadings(body: string): { id: string; text: string }[] {
    const out: { id: string; text: string }[] = [];
    for (const line of body.split('\n')) {
        const m = line.match(/^(##|###) (.+)$/);
        if (m) {
            const text = m[2].replace(/[*_`]/g, '').trim();
            out.push({ id: slugifyHeading(text), text });
        }
    }
    return out;
}

export function buildSearchIndex(): SearchEntry[] {
    const sectionOf = new Map<string, string>();
    for (const section of getNav()) {
        for (const item of section.items) sectionOf.set(item.slug, section.title);
    }
    return getAllDocs().map((d) => ({
        slug: d.slug,
        title: d.frontmatter.title,
        section: sectionOf.get(d.slug) ?? '',
        description: d.frontmatter.description,
        keywords: d.frontmatter.keywords,
        headings: extractHeadings(d.body),
        text: stripMarkdown(d.body),
    }));
}
