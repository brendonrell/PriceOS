'use client';

/*
 * PD-Docs search. A SEARCH button in the docs top bar (the INDEX button's
 * exact treatment) opens a full-height panel — the INDEX drop-down's own
 * chrome — with one input and ranked results over the whole corpus:
 * titles, keywords, headings (H2+H3, deep-linked), and full body text,
 * served from the build-time /docs/search-index.json (lazy, fetched once).
 * Every term must match somewhere on the page (AND), tiers rank the hits:
 * title > heading > keyword > description > body. Enter opens the top hit.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SearchEntry } from '../../lib/docs/search';

type Hit = {
    entry: SearchEntry;
    score: number;
    /* Best matching heading (deep anchor), when the match is heading-tier. */
    heading: { id: string; text: string } | null;
    /* Body snippet around the first term hit, split for <mark> rendering. */
    snippet: { pre: string; hit: string; post: string } | null;
};

function hrefFor(hit: Hit): string {
    const base = hit.entry.slug === '' ? '/docs' : `/docs/${hit.entry.slug}`;
    return hit.heading ? `${base}#${hit.heading.id}` : base;
}

function snippetAround(text: string, term: string): Hit['snippet'] {
    const at = text.toLowerCase().indexOf(term);
    if (at < 0) return null;
    const start = Math.max(0, at - 56);
    const end = Math.min(text.length, at + term.length + 72);
    return {
        pre: (start > 0 ? '…' : '') + text.slice(start, at),
        hit: text.slice(at, at + term.length),
        post: text.slice(at + term.length, end) + (end < text.length ? '…' : ''),
    };
}

function searchIndex(index: SearchEntry[], query: string): Hit[] {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];
    const hits: Hit[] = [];
    for (const entry of index) {
        const title = entry.title.toLowerCase();
        const desc = entry.description.toLowerCase();
        const section = entry.section.toLowerCase();
        const body = entry.text.toLowerCase();
        const keywords = entry.keywords.map((k) => k.toLowerCase());
        let score = 0;
        let heading: Hit['heading'] = null;
        let ok = true;
        for (const term of terms) {
            let t = 0;
            if (title.includes(term)) t += 100;
            const h = entry.headings.find((x) => x.text.toLowerCase().includes(term));
            if (h) { t += 40; if (!heading && !title.includes(term)) heading = h; }
            if (keywords.some((k) => k.includes(term))) t += 50;
            if (section.includes(term)) t += 20;
            if (desc.includes(term)) t += 25;
            if (body.includes(term)) t += 10;
            if (t === 0) { ok = false; break; }
            score += t;
        }
        if (!ok) continue;
        /* Whole-phrase bonus keeps multi-word lookups honest. */
        const phrase = terms.join(' ');
        if (terms.length > 1 && (title.includes(phrase) || body.includes(phrase))) score += 60;
        const snippet = snippetAround(entry.text, terms.length > 1 && body.includes(phrase) ? phrase : terms[0]);
        hits.push({ entry, score, heading, snippet });
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, 30);
}

export function DocsSearch({ open, onToggle }: { open: boolean; onToggle: (v: boolean) => void }) {
    const router = useRouter();
    const [index, setIndex] = useState<SearchEntry[] | null>(null);
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const fetching = useRef(false);

    /* Lazy corpus fetch — once, on first open. */
    useEffect(() => {
        if (!open || index || fetching.current) return;
        fetching.current = true;
        fetch('/docs/search-index.json')
            .then((r) => r.json())
            .then((data: SearchEntry[]) => setIndex(data))
            .catch(() => { fetching.current = false; });
    }, [open, index]);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    const hits = index && open ? searchIndex(index, query) : [];

    const go = (hit: Hit) => {
        onToggle(false);
        setQuery('');
        router.push(hrefFor(hit));
    };

    return (
        <>
            <button
                type="button"
                className={`pd-docs-index-btn pd-docs-search-btn${open ? ' open' : ''}`}
                aria-expanded={open}
                aria-controls="pdDocsSearchPanel"
                onClick={() => onToggle(!open)}
            >
                {open ? 'CLOSE' : 'SEARCH'}
            </button>
            {open && (
                <div id="pdDocsSearchPanel" className="pd-docs-mobile-nav pd-docs-search-panel">
                    <input
                        ref={inputRef}
                        type="search"
                        className="pd-docs-search-input"
                        placeholder="Search the docs…"
                        aria-label="Search the docs"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && hits.length > 0) { e.preventDefault(); go(hits[0]); }
                            if (e.key === 'Escape') onToggle(false);
                        }}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                    />
                    {query.trim() !== '' && index && (
                        <div className="pd-docs-search-count">
                            {hits.length === 0 ? 'NO MATCHES' : `${hits.length} PAGE${hits.length === 1 ? '' : 'S'}`}
                        </div>
                    )}
                    {query.trim() !== '' && !index && (
                        <div className="pd-docs-search-count">LOADING INDEX…</div>
                    )}
                    <ul className="pd-docs-search-results">
                        {hits.map((hit) => (
                            <li key={hit.entry.slug + (hit.heading?.id ?? '')}>
                                <button type="button" className="pd-docs-search-hit" onClick={() => go(hit)}>
                                    <span className="pd-docs-search-hit-meta">{hit.entry.section}</span>
                                    <span className="pd-docs-search-hit-title">
                                        {hit.entry.title}
                                        {hit.heading && <span className="pd-docs-search-hit-heading"> § {hit.heading.text}</span>}
                                    </span>
                                    {hit.snippet && (
                                        <span className="pd-docs-search-hit-snippet">
                                            {hit.snippet.pre}<mark>{hit.snippet.hit}</mark>{hit.snippet.post}
                                        </span>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </>
    );
}
