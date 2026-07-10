'use client';

/*
 * AsciiBackupPanel — the "+More ▸ ASCII Backup" section on the Output page
 * (its reserved pill existed as an empty box; this fills it — ClickUp
 * 86bahh9f5, corrected spec Brendon 2026-07-05).
 *
 * Shows the piece's STORED ASCII Backup — the high-res, full-colour artifact
 * pinned to R2 at mint beside the preview PNG ({slug}/{id}.ascii.json). Reads
 * stored-first (the whole point of a backup is the stored copy); a missing pin
 * falls back to a fresh deterministic derivation AND self-heals by pinning it,
 * exactly like the preview-PNG display seam.
 *
 * Copy affordances:
 *   COPY .TXT  — the raw plain-text glyphs.
 *   COPY .JSON — the full colour artifact, the true copy/paste-able backup.
 */

import { useEffect, useRef, useState } from 'react';
import { paintOutput } from '../../lib/state/ProjectContext';
import { ART_IMAGE_BASE } from '../../lib/project/registry';
import {
    buildAsciiArtifact,
    paintAsciiArtifact,
    isValidAsciiArtifact,
    type AsciiArtifact,
} from '../../lib/art/ascii';
import { useToast } from '../../lib/state/ToastContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';

export default function AsciiBackupPanel({ slug, id }: { slug: string; id: number }) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [artifact, setArtifact] = useState<AsciiArtifact | null>(null);
    const { showToast } = useToast();
    const { notifs, toggle } = usePdNotifs();

    useEffect(() => {
        let cancelled = false;
        let raf = 0;

        const paint = (a: AsciiArtifact) => {
            if (cancelled) return;
            setArtifact(a);
            const canvas = canvasRef.current;
            if (!canvas) return;
            // Paint at FULL device resolution for the panel's width so the
            // glyphs stay razor-crisp — the "wait, that's ASCII??" moment.
            // No dpr cap: the internal render must be ≥ the screen's device
            // pixels so the browser only ever scales it DOWN — an upscale
            // (dpr-3 phones under the old cap of 2) re-creates the faint
            // horizontal moiré lines the integer cell grid exists to kill.
            const dpr = window.devicePixelRatio || 1;
            const box = canvas.parentElement?.clientWidth || Math.min(window.innerWidth, 900);
            const widthPx = Math.min(2400, Math.round(box * dpr));

            // Full card painted once, offscreen…
            const full = document.createElement('canvas');
            paintAsciiArtifact(full, a, widthPx);
            canvas.width = full.width;
            canvas.height = full.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const reduced = typeof window.matchMedia === 'function'
                && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (reduced) {
                ctx.drawImage(full, 0, 0);
                return;
            }

            // …then the backup TYPES ITSELF IN: rows sweep down over ~1.4s
            // behind an accent scanline, like a plotter printing the piece.
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, full.width, full.height);
            const rowH = full.height / a.rows;
            const DURATION = 1400;
            const start = performance.now();
            const accent = getComputedStyle(canvas).color || '#F2F2F2';
            const step = (now: number) => {
                if (cancelled) return;
                const t = Math.min(1, (now - start) / DURATION);
                const eased = 1 - Math.pow(1 - t, 3);
                const rows = Math.floor(eased * a.rows);
                const h = Math.max(1, Math.round(rows * rowH));
                ctx.drawImage(full, 0, 0, full.width, h, 0, 0, full.width, h);
                if (t < 1) {
                    // The printing scanline.
                    ctx.fillStyle = accent;
                    ctx.globalAlpha = 0.55;
                    ctx.fillRect(0, h, full.width, Math.max(2, rowH * 0.6));
                    ctx.globalAlpha = 1;
                    raf = requestAnimationFrame(step);
                } else {
                    ctx.drawImage(full, 0, 0);
                }
            };
            raf = requestAnimationFrame(step);
        };

        // Derive fresh from the engine (identical bytes to any pin) and
        // self-heal the missing pin — same philosophy as the PNG display seam.
        const deriveAndHeal = (heal: boolean) => {
            const live = document.createElement('canvas');
            paintOutput(live, slug, id, 512, true);
            const a = buildAsciiArtifact(live, slug, id);
            if (!a) return;
            paint(a);
            if (heal) {
                void fetch(`/api/ascii/${slug}/${id}`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(a),
                }).catch(() => { /* best-effort — next viewer heals it */ });
            }
        };

        if (ART_IMAGE_BASE) {
            fetch(`${ART_IMAGE_BASE}/${slug}/${id}.ascii.json`)
                .then((r) => (r.ok ? r.json() : null))
                .then((j) => {
                    if (cancelled) return;
                    if (isValidAsciiArtifact(j)) paint(j);
                    else deriveAndHeal(true);
                })
                .catch(() => { if (!cancelled) deriveAndHeal(true); });
        } else {
            // Storage base not wired yet — derive locally, no pin attempt.
            deriveAndHeal(false);
        }

        return () => { cancelled = true; if (raf) cancelAnimationFrame(raf); };
    }, [slug, id]);

    const copy = (what: 'txt' | 'json') => {
        if (!artifact) { showToast('ASCII Backup: NOT READY'); return; }
        const payload = what === 'txt' ? artifact.text : JSON.stringify(artifact);
        try { navigator.clipboard?.writeText(payload); } catch { /* ignore */ }
        showToast(`ASCII Backup: ${what === 'txt' ? '.TXT' : '.JSON'} COPIED`);
    };

    // No box, no title — just the artwork (full width) with the two buttons
    // below it (Brendon 2026-07-08).
    return (
        <div className="ascii-backup-wrap">
            <canvas
                ref={canvasRef}
                className="ascii-backup-canvas"
                style={{ display: 'block', width: '100%', height: 'auto' }}
                aria-label="ASCII backup of this artwork"
            />
            <div className="action-row" style={{ marginTop: 10 }}>
                <button
                    className="btn-soundtrack"
                    title="Copy the raw text glyphs"
                    onClick={() => copy('txt')}
                >
                    COPY .TXT
                </button>
                <button
                    className="btn-soundtrack"
                    title="Copy the full-colour backup — paste-able JSON that restores the piece"
                    onClick={() => copy('json')}
                >
                    COPY .JSON
                </button>
                {/* ASCII Art Mode — the SITEWIDE toggle lives here, beside the
                    backup's own buttons (Brendon, 2026-07-10): every artwork
                    surface renders its ASCII standin while it's on. Glyph
                    ⍞ (U+235E, APL quote-quad = character I/O) — same proven
                    family as ⍟/⍢; device-verify per the glyph gate. */}
                <button
                    className={`btn-soundtrack ascii-mode-btn${notifs.asciiArt ? ' active' : ''}`}
                    title="ASCII Art Mode — every artwork on the site renders as its text backup"
                    aria-pressed={notifs.asciiArt}
                    onClick={() => {
                        const next = !notifs.asciiArt;
                        toggle('asciiArt');
                        showToast(next ? 'ASCII Art Mode: ON — the whole site, in text' : 'ASCII Art Mode: OFF');
                    }}
                >
                    {'\u235E\uFE0E'} SITE
                </button>
            </div>
        </div>
    );
}
