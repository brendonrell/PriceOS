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

export default function AsciiBackupPanel({ slug, id }: { slug: string; id: number }) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [artifact, setArtifact] = useState<AsciiArtifact | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        let cancelled = false;

        const paint = (a: AsciiArtifact) => {
            if (cancelled) return;
            setArtifact(a);
            const canvas = canvasRef.current;
            if (!canvas) return;
            // Paint at device resolution for the panel's width so the glyphs
            // stay razor-crisp — the "wait, that's ASCII??" moment.
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const box = canvas.parentElement?.clientWidth || Math.min(window.innerWidth, 900);
            paintAsciiArtifact(canvas, a, Math.min(2200, Math.round(box * dpr)));
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

        return () => { cancelled = true; };
    }, [slug, id]);

    const copy = (what: 'txt' | 'json') => {
        if (!artifact) { showToast('ASCII Backup: NOT READY'); return; }
        const payload = what === 'txt' ? artifact.text : JSON.stringify(artifact);
        try { navigator.clipboard?.writeText(payload); } catch { /* ignore */ }
        showToast(`ASCII Backup: ${what === 'txt' ? '.TXT' : '.JSON'} COPIED`);
    };

    return (
        <div className="more-box-wrap">
            <div className="more-box-card">
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
                </div>
            </div>
        </div>
    );
}
