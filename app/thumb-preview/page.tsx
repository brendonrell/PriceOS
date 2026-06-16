'use client';

/*
 * Dev tool — on-chain thumbnail preview (Brendon, 2026-06-16).
 *
 * Each row shows a piece rendered LIVE (the real engine output) next to the
 * static WebP squeezed under the on-chain size cap, with the actual byte count,
 * the quality + pixel size it had to drop to. This is the honest look at "what
 * the on-chain preview looks like on screen" — the WebP is the frozen image that
 * marketplaces/wallets would show. Toggle 16 KB (contract's current cap) vs
 * 48 KB (the new target). Unlinked route: open /thumb-preview on the dev preview.
 */

import { useEffect, useRef, useState } from 'react';
import { paintOutput } from '../../lib/state/ProjectContext';
import { allProjects } from '../../lib/project/registry';

const TARGETS = [16384, 49152]; // 16 KB · 48 KB
const RENDER_W = 512; // live render width; WebP is encoded from this canvas

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

const box: React.CSSProperties = {
    width: 260, height: 'auto', display: 'block', border: '1px solid #333', background: '#111',
};
const cap: React.CSSProperties = {
    fontFamily: "'Courier New', monospace", fontSize: 11, color: '#9a9a9a', margin: '0 0 6px',
};

function Sample({ slug, id, target }: { slug: string; id: number; target: number }) {
    const liveRef = useRef<HTMLCanvasElement>(null);
    const [webp, setWebp] = useState<{ url: string; bytes: number; q: number; w: number; h: number } | null>(null);
    const [err, setErr] = useState(false);

    useEffect(() => {
        const cv = liveRef.current;
        if (!cv) return;
        let url: string | undefined;
        try {
            paintOutput(cv, slug, id, RENDER_W);
        } catch { setErr(true); return; }
        setWebp(null);
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
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', marginBottom: 30, flexWrap: 'wrap' }}>
            <div>
                <p style={cap}>LIVE · {slug} #{id} · {RENDER_W}px</p>
                <canvas ref={liveRef} style={box} />
            </div>
            <div>
                <p style={cap}>
                    {Math.round(target / 1024)} KB WEBP ·{' '}
                    {err ? 'error' : webp ? `${webp.bytes.toLocaleString()} bytes · q${webp.q} · ${webp.w}×${webp.h}` : 'encoding…'}
                </p>
                {webp ? <img src={webp.url} alt="" style={box} /> : <div style={{ ...box, height: 260 }} />}
            </div>
        </div>
    );
}

export default function ThumbPreviewPage() {
    const [target, setTarget] = useState(16384);
    const projects = allProjects().slice(0, 8);
    return (
        <div style={{ padding: 24, maxWidth: 920, margin: '0 auto', color: '#ddd', background: '#000', minHeight: '100vh' }}>
            <h1 style={{ fontFamily: "'Courier New', monospace", fontSize: 16, marginBottom: 6 }}>
                On-chain thumbnail preview
            </h1>
            <p style={{ ...cap, marginBottom: 16 }}>
                LIVE engine render vs the static WebP squeezed under the on-chain cap (the frozen
                image marketplaces/wallets show). Both displayed at the same width.
            </p>
            <div style={{ marginBottom: 22, display: 'flex', gap: 8 }}>
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
            {projects.map((p) => (
                <Sample key={p.slug} slug={p.slug} id={1} target={target} />
            ))}
        </div>
    );
}
