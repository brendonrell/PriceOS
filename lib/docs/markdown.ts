/*
 * PD-Docs markdown → HTML. Build-time only (every docs route is
 * force-static). marked with GFM tables, plus heading ids so the desktop
 * "On this page" rail and cross-page #anchors work. Content is our own
 * authored markdown — no user input ever flows through here.
 */

import { marked, type Tokens } from 'marked';

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/<[^>]+>/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

export type TocEntry = { id: string; text: string };

/* H2s only — the docs authoring conventions keep pages one-concept-deep, so
   the section rail never needs the h3 tier. */
export function extractToc(body: string): TocEntry[] {
    const entries: TocEntry[] = [];
    for (const line of body.split('\n')) {
        const m = line.match(/^## (.+)$/);
        if (m) {
            const text = m[1].replace(/[*_`]/g, '').trim();
            entries.push({ id: slugify(text), text });
        }
    }
    return entries;
}

const renderer = {
    heading(this: { parser: { parseInline: (t: Tokens.Heading['tokens']) => string } }, { tokens, depth }: Tokens.Heading) {
        const text = this.parser.parseInline(tokens);
        const id = slugify(text);
        return `<h${depth} id="${id}">${text}</h${depth}>\n`;
    },
};

marked.use({ gfm: true, renderer });

export function renderMarkdown(body: string): string {
    return marked.parse(body, { async: false }) as string;
}
