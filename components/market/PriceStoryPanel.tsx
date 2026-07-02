'use client';

/*
 * PriceStoryPanel — PRICE STORY, the piece's market biography. Lives in the
 * Output page's + More ▸ Price Story sub-tab (its reserved pill). Chapters
 * come whole from /api/output/[id]/story — real ledger moments told as
 * provenance literature, each wearing its canonical market glyph.
 *
 * Presentation rides the +More dotted-box language (more-box-wrap/card) so it
 * sits identically to Attributes et al., with a vertical chapter spine.
 */

import { useEffect, useState } from 'react';

interface Chapter {
    key: string;
    glyph: string;
    title: string;
    ts: number;
    line: string;
    sub?: string | null;
}

function fmtDate(tsSec: number): string {
    return new Date(tsSec * 1000).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });
}

export default function PriceStoryPanel({ slug, id }: { slug: string; id?: number }) {
    const [chapters, setChapters] = useState<Chapter[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = () => {
            fetch(id != null ? `/api/output/${slug}-${id}/story` : `/api/project/${slug}/story`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => { if (!cancelled && d) setChapters((d.chapters as Chapter[]) ?? []); })
                .catch(() => { if (!cancelled) setChapters([]); });
        };
        load();
        const onR = () => load();
        window.addEventListener('pd:project-refresh', onR);
        return () => { cancelled = true; window.removeEventListener('pd:project-refresh', onR); };
    }, [slug, id]);

    return (
        <div className="more-box-wrap">
            <div className="more-box-card">
                {chapters == null ? (
                    <div className="mk-story-loading">Reading the ledger…</div>
                ) : chapters.length === 0 ? (
                    <div className="mk-story-loading">No story yet — it begins at mint.</div>
                ) : (
                    <div className="mk-story">
                        {chapters.map((c, i) => (
                            <div className="mk-story-chapter" key={c.key}>
                                <div className="mk-story-rail" aria-hidden="true">
                                    <span className="mk-story-glyph">{c.glyph}</span>
                                    {i < chapters.length - 1 && <span className="mk-story-line" />}
                                </div>
                                <div className="mk-story-body">
                                    <div className="mk-story-head">
                                        <span className="mk-story-title">{c.title}</span>
                                        <span className="mk-story-date">{fmtDate(c.ts)}</span>
                                    </div>
                                    <p className="mk-story-text">{c.line}</p>
                                    {c.sub && <span className="mk-story-sub">{c.sub}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
