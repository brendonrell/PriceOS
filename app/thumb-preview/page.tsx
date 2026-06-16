'use client';

/*
 * Dev tool — on-chain thumbnail preview (Brendon, 2026-06-16).
 *
 * Shows the static on-chain WebP previews IN the real gallery grid (#gallery, so
 * it's 2-up on mobile exactly like the live gallery) — this is "what the gallery
 * looks like once we switch to on-chain previews." Each tile is the piece
 * squeezed under the size cap, with its real byte count + the quality/pixel size
 * it dropped to. Toggle 16 / 22 / 36 / 48 KB. Unlinked route: /thumb-preview.
 */

import { useEffect, useRef, useState } from 'react';
import { paintOutput } from '../../lib/state/ProjectContext';
import { allProjects } from '../../lib/project/registry';

const TARGETS = [16384, 22528, 36864, 49152]; // 16 · 22 · 36 · 48 KB
const RENDER_W = 512; // source render width; the WebP is encoded from this

function toWebp(canvas: HTMLCanvasElement, q: number): Promise<Blob | null> {
    return new Promise((res) => canvas.toBlob(res, 'image/webp', q));
}

/* Squeeze a canvas to a WebP at or under maxBytes: drop quality first, then
   shrink dimensions. Returns the smallest that fits (or the floor attempt). */
async function encodeUnder(src: HTMLCanvasElement, maxBytes: number) {
    for (const scale of [1, 0.85, 0.7, 0.55, 0.42, 0.32, 0.24]) {
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(src.width * scale));
        c.height = Math.max(1, Math.round(src.height * scale));
        const ctx = c.getContext('2d');
        if (!ctx) continue;
        ctx.drawImage(src, 0, 0, c.width, c.height);
        for (const q of [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.22, 0.15, 0.1]) {
            const b = await toWebp(c, q);
            if (b && b.size <= maxBytes) return { blob: b, quality: q, w: c.width, h: c.height };
        }
    }
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    c.getContext('2d')?.drawImage(src, 0, 0, 64, 64);
    const b = await toWebp(c, 0.1);
    return b ? { blob: b, quality: 0.1, w: 64, h: 64 } : null;
}

const capCss: React.CSSProperties = {
    fontFamily: "'Courier New', monospace", fontSize: 10, lineHeight: 1.3,
    color: '#9a9a9a', paddingTop: 6, wordBreak: 'break-word',
};

function ThumbCard({ slug, id, target }: { slug: string; id: number; target: number }) {
    const srcRef = useRef<HTMLCanvasElement>(null);
    const [webp, setWebp] = useState<{ url: string; bytes: number; q: number; w: number; h: number } | null>(null);
    const [err, setErr] = useState(false);

    useEffect(() => {
        const cv = srcRef.current;
        if (!cv) return;
        let url: string | undefined;
        setWebp(null); setErr(false);
        try {
            paintOutput(cv, slug, id, RENDER_W);
        } catch { setErr(true); return; }
        encodeUnder(cv, target)
            .then((r) => {
                if (!r) { setErr(true); return; }
                url = URL.createObjectURL(r.blob);
                setWebp({ url, bytes: r.blob.size, q: r.quality, w: r.w, h: r.h });
            })
            .catch(() => setErr(true));
        return () => { if (url) URL.revokeObjectURL(url); };
    }, [slug, id, target]);

    return (
        <div className="output-card">
            {/* Off-screen source canvas — only used to encode the WebP. */}
            <canvas ref={srcRef} style={{ display: 'none' }} />
            {webp ? (
                <img
                    src={webp.url}
                    alt=""
                    style={{ width: '100%', height: 'auto', display: 'block', background: '#111', border: '1px solid #2a2a2a' }}
                />
            ) : (
                <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#111', border: '1px solid #2a2a2a' }} />
            )}
            <div style={capCss}>
                {slug} #{id}<br />
                {err ? 'error' : webp ? `${webp.bytes.toLocaleString()}b · q${webp.q} · ${webp.w}×${webp.h}` : 'encoding…'}
            </div>
        </div>
    );
}

export default function ThumbPreviewPage() {
    const [target, setTarget] = useState(16384);
    const projects = allProjects().slice(0, 12);
    return (
        <div style={{ background: '#000', minHeight: '100vh', color: '#ddd' }}>
            <div style={{ padding: '18px 20px 4px' }}>
                <h1 style={{ fontFamily: "'Courier New', monospace", fontSize: 15, margin: '0 0 4px' }}>
                    On-chain thumbnail preview — gallery grid
                </h1>
                <p style={{ ...capCss, paddingTop: 0, marginBottom: 12 }}>
                    The static on-chain WebP under the size cap, in the real gallery grid.
                </p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    {TARGETS.map((t) => (
                        <button
                            key={t}
                            onClick={() => setTarget(t)}
                            style={{
                                fontFamily: "'Courier New', monospace", fontSize: 12, padding: '6px 12px',
                                cursor: 'pointer', border: '1px solid #444',
                                background: target === t ? '#e8ff47' : '#111',
                                color: target === t ? '#000' : '#ddd',
                            }}
                        >
                            {Math.round(t / 1024)} KB
                        </button>
                    ))}
                </div>
            </div>
            <div id="gallery">
                {projects.map((p) => (
                    <ThumbCard key={p.slug} slug={p.slug} id={1} target={target} />
                ))}
            </div>
        </div>
    );
}
