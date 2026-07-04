/*
 * The Rarity Receipt — a shareable card with the piece's REAL canonical art
 * rendered live inside it, its PD Rarity headline, Isolation, and a mini Genome
 * showing where it sits in the space. Client-canvas only: renders via the same
 * deterministic path the app uses (renderArtwork), composites a mono overlay in
 * the colorway, and hands a PNG to the OS share sheet (download fallback). No
 * image hosting, no AI, $0.
 *
 * King-Mode card rules: near-black ground, mono / Rubik-Mono type, one colorway
 * accent, inverted pills, canonical art only.
 */

import { renderArtwork, getProject, projectColorway } from '../project/registry';
import { pdRarity } from './rarity';
import { outputIsolation } from './genome';
import { getGenome } from './genome';

const W = 1080;
const H = 1350;
const PAD = 64;
const BG = '#0B0B0D';
const INK = '#F2F2F2';

/** Computed font-family for a CSS font variable (Rubik Mono One via next/font),
 *  read off a probe so canvas uses the real loaded face. */
function cssFont(varName: string, fallback: string): string {
    if (typeof document === 'undefined') return fallback;
    const probe = document.createElement('span');
    probe.style.fontFamily = `var(${varName})`;
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    document.body.appendChild(probe);
    const fam = getComputedStyle(probe).fontFamily;
    probe.remove();
    return fam || fallback;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

/** Build the Rarity Receipt card canvas for an Output, or null if it can't. */
export async function buildRarityReceipt(slug: string, id: number): Promise<HTMLCanvasElement | null> {
    const project = getProject(slug);
    if (!project) return null;

    if (typeof document !== 'undefined' && document.fonts?.ready) {
        try { await document.fonts.ready; } catch { /* proceed with fallbacks */ }
    }

    const accent = (projectColorway(slug) || project.colorway || INK).trim();
    const mono = "'Courier New', Courier, monospace";
    const rubik = cssFont('--font-rubik-mono', 'monospace');

    const card = document.createElement('canvas');
    card.width = W;
    card.height = H;
    const ctx = card.getContext('2d');
    if (!ctx) return null;

    // Ground.
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // ── Art hero — rendered live, fit into the top box, colorway frame. ──────
    const boxX = PAD, boxY = PAD, boxW = W - PAD * 2, boxH = 760;
    try {
        const off = document.createElement('canvas');
        const { aspect } = renderArtwork(off, slug, id, 1080);
        const a = aspect > 0 ? aspect : (off.width / Math.max(1, off.height)) || 1;
        // Fit preserving aspect.
        let dw = boxW, dh = boxW / a;
        if (dh > boxH) { dh = boxH; dw = boxH * a; }
        const dx = boxX + (boxW - dw) / 2;
        const dy = boxY + (boxH - dh) / 2;
        ctx.drawImage(off, dx, dy, dw, dh);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.strokeRect(dx, dy, dw, dh);
    } catch {
        // Art failed to paint — leave the framed box empty rather than fake it.
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.strokeRect(boxX, boxY, boxW, boxH);
    }

    // ── Rarity data ──────────────────────────────────────────────────────────
    const pd = pdRarity(slug, id);
    const iso = outputIsolation(slug, id);

    let y = boxY + boxH + 64;

    // Collection · #id
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = INK;
    ctx.globalAlpha = 0.6;
    ctx.font = `28px ${mono}`;
    ctx.fillText(`${project.displayName.toUpperCase()} · #${id}`, PAD, y);
    ctx.globalAlpha = 1;

    // Big PD Rarity number.
    y += 118;
    if (pd) {
        ctx.fillStyle = accent;
        ctx.font = `120px ${rubik}`;
        const scoreText = String(pd.score);
        ctx.fillText(scoreText, PAD, y);
        const sw = ctx.measureText(scoreText).width;
        ctx.fillStyle = INK;
        ctx.globalAlpha = 0.55;
        ctx.font = `34px ${mono}`;
        ctx.fillText('/100', PAD + sw + 16, y);
        ctx.font = `24px ${mono}`;
        ctx.fillText('PD RARITY', PAD + sw + 16, y - 44);
        ctx.globalAlpha = 1;
    }

    // Isolation + rank + None-Alike pill.
    y += 60;
    if (iso) {
        ctx.fillStyle = INK;
        ctx.font = `30px ${mono}`;
        const isoLine = `ISOLATION ${iso.score}  ·  #${iso.rank} of ${iso.total}`;
        ctx.fillText(isoLine, PAD, y);
        if (iso.oneOfOne) {
            const pill = 'NONE ALIKE';
            ctx.font = `bold 24px ${mono}`;
            const pw = ctx.measureText(pill).width;
            const px = PAD, py = y + 26;
            ctx.fillStyle = accent;
            roundRect(ctx, px, py, pw + 28, 40, 6);
            ctx.fill();
            ctx.fillStyle = BG;
            ctx.fillText(pill, px + 14, py + 28);
        }
    }

    // ── Mini Genome — where this piece sits in the space. ────────────────────
    const g = getGenome(slug);
    const self = g?.byId.get(id);
    if (g && self) {
        const mgW = 300, mgH = 168;
        const mgX = W - PAD - mgW, mgY = boxY + boxH + 92;
        ctx.strokeStyle = INK;
        ctx.globalAlpha = 0.18;
        ctx.lineWidth = 1;
        roundRect(ctx, mgX, mgY, mgW, mgH, 6);
        ctx.stroke();
        ctx.globalAlpha = 1;
        const ip = 12;
        const step = Math.max(1, Math.floor(g.points.length / 260)); // cap dots drawn
        for (let i = 0; i < g.points.length; i += step) {
            const p = g.points[i];
            const dx = mgX + ip + p.x * (mgW - ip * 2);
            const dy = mgY + ip + p.y * (mgH - ip * 2);
            ctx.beginPath();
            ctx.arc(dx, dy, 1.4, 0, Math.PI * 2);
            ctx.fillStyle = INK;
            ctx.globalAlpha = 0.25;
            ctx.fill();
        }
        // The piece itself, lit.
        const sx = mgX + ip + self.x * (mgW - ip * 2);
        const sy = mgY + ip + self.y * (mgH - ip * 2);
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx, sy, 8, 0, Math.PI * 2);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = INK;
        ctx.globalAlpha = 0.5;
        ctx.font = `18px ${mono}`;
        ctx.fillText('THE GENOME', mgX, mgY - 12);
        ctx.globalAlpha = 1;
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    ctx.fillStyle = INK;
    ctx.globalAlpha = 0.5;
    ctx.font = `24px ${mono}`;
    ctx.fillText(`@${project.artistHandle} · PRICEOS`, PAD, H - PAD);
    const tag = 'provable from the seed';
    const tw = ctx.measureText(tag).width;
    ctx.fillText(tag, W - PAD - tw, H - PAD);
    ctx.globalAlpha = 1;

    return card;
}

export type ReceiptResult = 'shared' | 'downloaded' | 'unavailable';

/** Build + share the Rarity Receipt. Uses the native share sheet with the PNG
 *  where files are shareable; downloads it otherwise. */
export async function shareRarityReceipt(slug: string, id: number): Promise<ReceiptResult> {
    const card = await buildRarityReceipt(slug, id);
    if (!card) return 'unavailable';

    const blob = await new Promise<Blob | null>((res) => card.toBlob(res, 'image/png'));
    if (!blob) return 'unavailable';

    const project = getProject(slug);
    const name = `priceos-${slug}-${id}.png`;
    const file = new File([blob], name, { type: 'image/png' });

    const nav = typeof navigator !== 'undefined' ? navigator : null;
    if (nav && typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
        try {
            await nav.share({
                files: [file],
                title: `${project?.displayName ?? 'PRICEOS'} #${id}`,
                text: 'PD Rarity — provable from the seed',
            });
            return 'shared';
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return 'shared';
            // fall through to download
        }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return 'downloaded';
}
