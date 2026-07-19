import { buildSearchIndex } from '../../../lib/docs/search';

/*
 * /docs/search-index.json — the docs search corpus, prerendered at build
 * (same force-static pattern as /llms.txt). The DocsSearch client fetches
 * this once on first use; no fs call ever runs on the Worker.
 */

export const dynamic = 'force-static';

export function GET() {
    return Response.json(buildSearchIndex(), {
        headers: { 'Cache-Control': 'public, max-age=300' },
    });
}
