/*
 * Test Pattern — an homage to artplusbrad's "Over the Air" (fxhash, 2022).
 *
 * His concept: when broadcast TV went analog→digital, signal breakup became a
 * NEW kind of static — blocky DIGITAL distortion, not analog snow. The piece is
 * a TV-style GRID of flat colour-field blocks, a selective subset of which is
 * "corrupted" by directional, datamosh-style patterns; the corruption CLUSTERS
 * in some outputs and SCATTERS in others (a smooth noise field drives per-cell
 * corruption odds). Flat, painterly, bold palettes — not neon cyberpunk.
 *
 * Static composition, fully deterministic in tokenId. cast() consumes a fixed
 * RNG prefix so render() and traitsOf() always agree; render() then draws extra
 * per-cell detail from the same stream.
 */

import { seededRng, pick } from '../rng';
import type { EngineFn, TraitsFn, TraitSchema, OutputTraits } from '../../project/types';

interface Palette { name: string; ground: string; ink: string; cols: string[] }

/* Flat, tasteful, broadcast-leaning palettes — bold but not neon. No mustard
   ground anywhere. */
const PALETTES: Palette[] = [
    { name: 'Primary', ground: '#f1e7d0', ink: '#161210', cols: ['#e23b3b', '#2347ff', '#f4c531', '#161210', '#f1e7d0'] },
    { name: 'Signal',  ground: '#0e1014', ink: '#e9eef2', cols: ['#13d0c8', '#ff3ba0', '#3a6bff', '#e9eef2', '#0e1014'] },
    { name: 'Dusk',    ground: '#16121f', ink: '#e8def2', cols: ['#ff7a3c', '#b14bff', '#2fb98a', '#ffd0e0', '#16121f'] },
    { name: 'Clay',    ground: '#efe3d2', ink: '#2a1d14', cols: ['#c2522e', '#7a8c46', '#d99a3c', '#2a4a52', '#2a1d14'] },
    { name: 'Bay',     ground: '#e7e2d4', ink: '#1d2630', cols: ['#2f7d77', '#d86a3c', '#385e8a', '#caa64e', '#1d2630'] },
    { name: 'Mono',    ground: '#ece9e3', ink: '#15140f', cols: ['#15140f', '#5a564d', '#9a958a', '#d92b2b', '#ece9e3'] },
];

const ASPECTS = [1, 1.25, 0.8, 1.5] as const;
const SIGNALS = ['Clean', 'Drift', 'Broken'] as const;
const FLOWS = ['→', '↓', '↘', '↗'] as const;
const DENS = ['Sparse', 'Balanced', 'Dense'] as const;

export const TEST_PATTERN_ASPECTS: readonly number[] = ASPECTS;

interface Params {
    palette: Palette;
    aspect: number;
    cols: number;
    rows: number;
    signal: typeof SIGNALS[number];
    flow: typeof FLOWS[number];
    density: typeof DENS[number];
    // cluster field phases (drive bunch-vs-spread)
    pa: number; pb: number; pc: number;
}

function cast(r: () => number): Params {
    const palette = pick(PALETTES, r);
    const aspect = pick(ASPECTS, r);
    const cols = 3 + Math.floor(r() * 5);          // 3..7
    const rows = Math.max(3, Math.round(cols / aspect));
    const signal = pick(SIGNALS, r);
    const flow = pick(FLOWS, r);
    const density = pick(DENS, r);
    const pa = r() * Math.PI * 2;
    const pb = r() * Math.PI * 2;
    const pc = r() * Math.PI * 2;
    return { palette, aspect, cols, rows, signal, flow, density, pa, pb, pc };
}

function traitsFrom(p: Params): OutputTraits {
    return {
        Palette: p.palette.name,
        Grid: `${p.cols}×${p.rows}`,
        Signal: p.signal,
        Flow: p.flow,
        Density: p.density,
    };
}

export const testPatternTraits: TraitsFn = (tokenId) => traitsFrom(cast(seededRng(tokenId)));

/* Smooth low-frequency field → clustered corruption (bunch vs spread). */
function field(nx: number, ny: number, p: Params): number {
    const v =
        Math.sin(nx * 6.2 + p.pa) +
        Math.sin(ny * 5.1 + p.pb) +
        Math.sin((nx + ny) * 4.3 + p.pc);
    return (v + 3) / 6; // 0..1
}

export const renderTestPattern: EngineFn = (canvas, tokenId, width) => {
    const r = seededRng(tokenId);
    const p = cast(r);
    const W = Math.max(1, Math.floor(width));
    const H = Math.max(1, Math.round(W / p.aspect));
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { aspect: p.aspect, traits: traitsFrom(p) };

    const { palette: pal } = p;
    ctx.fillStyle = pal.ground;
    ctx.fillRect(0, 0, W, H);

    const cw = W / p.cols;
    const ch = H / p.rows;
    const thresh = p.signal === 'Clean' ? 0.78 : p.signal === 'Drift' ? 0.58 : 0.4;
    const densMul = p.density === 'Sparse' ? 0.7 : p.density === 'Dense' ? 1.25 : 1;
    const flowDX = p.flow === '→' || p.flow === '↘' || p.flow === '↗' ? 1 : 0;
    const flowDY = p.flow === '↓' || p.flow === '↘' ? 1 : p.flow === '↗' ? -1 : 0;

    for (let gy = 0; gy < p.rows; gy++) {
        for (let gx = 0; gx < p.cols; gx++) {
            const x = gx * cw, y = gy * ch;
            const nx = gx / p.cols, ny = gy / p.rows;
            const base = pal.cols[Math.floor(r() * pal.cols.length)];

            // Calm field block — flat colour, hard edge.
            ctx.fillStyle = base;
            ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(cw) + 1, Math.ceil(ch) + 1);

            const corrupt = field(nx, ny, p) > thresh;
            if (!corrupt) continue;

            // Corrupted block — one of several digital-distortion patterns.
            const kind = Math.floor(r() * 6);
            const c2 = pal.cols[Math.floor(r() * pal.cols.length)];
            const c3 = pal.cols[Math.floor(r() * pal.cols.length)];
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, cw, ch);
            ctx.clip();

            if (kind === 0) {
                // Macroblock tear — sub-blocks shifted along the flow.
                const n = Math.max(2, Math.round(4 * densMul));
                const sh = cw * 0.22;
                for (let i = 0; i < n; i++) {
                    ctx.fillStyle = i % 2 ? c2 : c3;
                    const off = (i - n / 2) * (sh / n);
                    ctx.fillRect(x + flowDX * off, y + (ch / n) * i + flowDY * off, cw, ch / n + 1);
                }
            } else if (kind === 1) {
                // Channel offset — red/cyan split of a block.
                ctx.globalCompositeOperation = 'screen';
                const o = Math.max(2, cw * 0.06);
                ctx.fillStyle = '#ff2d4d'; ctx.fillRect(x - o * flowDX - o, y - o * flowDY, cw, ch);
                ctx.fillStyle = '#22e0ff'; ctx.fillRect(x + o * flowDX + o, y + o * flowDY, cw, ch);
            } else if (kind === 2) {
                // Dither / checker.
                const s = Math.max(3, (cw / 8) / densMul);
                for (let yy = 0; yy < ch; yy += s) for (let xx = 0; xx < cw; xx += s) {
                    if (((xx / s) ^ (yy / s)) & 1) { ctx.fillStyle = c2; ctx.fillRect(x + xx, y + yy, s, s); }
                }
            } else if (kind === 3) {
                // Ben-Day dots.
                const s = Math.max(4, (cw / 7) / densMul);
                ctx.fillStyle = c2;
                for (let yy = s / 2; yy < ch; yy += s) for (let xx = s / 2; xx < cw; xx += s) {
                    ctx.beginPath(); ctx.arc(x + xx, y + yy, s * 0.32, 0, Math.PI * 2); ctx.fill();
                }
            } else if (kind === 4) {
                // Datamosh smear — directional streaks.
                const n = Math.round(6 * densMul);
                for (let i = 0; i < n; i++) {
                    ctx.fillStyle = i % 2 ? c2 : c3;
                    const t = i / n;
                    if (flowDY === 0) ctx.fillRect(x, y + ch * t, cw, Math.max(1, ch / n * 0.5));
                    else ctx.fillRect(x + cw * t, y, Math.max(1, cw / n * 0.5), ch);
                }
            } else {
                // Diagonal stripes.
                ctx.strokeStyle = c2;
                ctx.lineWidth = Math.max(1.5, cw * 0.08 * densMul);
                const step = Math.max(5, cw / 4);
                for (let d = -ch; d < cw + ch; d += step) {
                    ctx.beginPath(); ctx.moveTo(x + d, y); ctx.lineTo(x + d + ch, y + ch); ctx.stroke();
                }
            }
            ctx.restore();
        }
    }

    // Scanline veil — keeps it reading as a signal, not a paint chart.
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = pal.ink;
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
    ctx.globalAlpha = 1;

    // CRT screen glow + vignette — a faint phosphor haze + darkened edges give
    // the flat grid the depth of a lit tube.
    const glow = ctx.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H / 2, Math.max(W, H) * 0.42);
    glow.addColorStop(0, 'rgba(255,255,255,0.05)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.34, W / 2, H / 2, Math.max(W, H) * 0.7);
    vg.addColorStop(0, 'transparent');
    vg.addColorStop(1, 'rgba(0,0,0,0.32)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    // Per-pixel film grain only on big single-view renders — getImageData per
    // tile would choke a gallery full of these.
    if (W >= 300) {
        const grain = ctx.getImageData(0, 0, W, H);
        const d = grain.data;
        for (let i = 0; i < d.length; i += 4) {
            const g = (r() - 0.5) * 14;
            d[i] += g; d[i + 1] += g; d[i + 2] += g;
        }
        ctx.putImageData(grain, 0, 0);
    }
    return { aspect: p.aspect, traits: traitsFrom(p) };
};

export const testPatternSchema: TraitSchema = {
    traits: [
        { name: 'Palette', values: PALETTES.map((x) => x.name) },
        { name: 'Signal', values: [...SIGNALS] },
        { name: 'Flow', values: [...FLOWS] },
        { name: 'Density', values: [...DENS] },
    ],
};
