/*
 * Placeholder Artwork Renderer
 *
 * Verbatim port of profile.html's gradient + aspect-ratio system
 * (mockup lines 1659–1732). Each token maps to one of 12 mock
 * collections by `id % N`, with a per-token rotation angle seeded
 * off the id. Output is purely a function of id, so the same token
 * paints identically across reloads, sort/filter changes, and the
 * gallery ↔ modal handoff.
 *
 * Replaces the old smooth-HSL gradient (three hues at near-identical
 * sat/light averaged to muddy neutrals — broke the hashsyn engine's
 * 60×60 center-patch sampling). Hand-picked hex palettes have real
 * chromatic distance, so the same center-patch read now lands on
 * meaningful color per piece, and the blended bg tracks the gallery
 * palette as you scroll. No hashsyn engine changes required.
 *
 * Mockup ref:
 *   COLLECTIONS array ............ profile.html 1659–1671
 *   per-token gradient build ..... profile.html 1727–1732
 *   wrapper aspect-ratio set ..... profile.html 1749
 */

export interface MockCollection {
    name: string;
    artist: string;
    ratio: number;
    colors: string[];
}

/* profile.html 1659–1671 verbatim. The aspect ratio + palette pair
   travels together — every token assigned to the same collection
   inherits both, matching the mockup's per-collection coherence. */
export const MOCK_COLLECTIONS: MockCollection[] = [
    { name: 'Chromie Squiggles',       artist: '@snowfro',        ratio: 1.0,  colors: ['#FF6B6B','#FFE66D','#4ECDC4'] },
    { name: 'Ringers',                 artist: '@dmitricherniak', ratio: 1.0,  colors: ['#2C3E50','#E74C3C','#ECF0F1'] },
    { name: 'Fidenza',                 artist: '@tylerxhobbs',    ratio: 0.75, colors: ['#F7DC6F','#AED6F1','#A9DFBF'] },
    { name: 'Geometry Runners',        artist: '@piterpasma',     ratio: 1.6,  colors: ['#1A1A2E','#16213E','#0F3460','#E94560'] },
    { name: 'Subscapes',               artist: '@mattdesl',       ratio: 1.6,  colors: ['#0D0221','#0A3463','#A64942','#BE8A60'] },
    { name: 'Meridian',                artist: '@mattdesl',       ratio: 1.0,  colors: ['#F5F5DC','#8B7355','#D2691E'] },
    { name: 'Anticyclone',             artist: '@ykx',            ratio: 1.0,  colors: ['#FF00FF','#00FFFF','#FF6600'] },
    { name: 'The Harvest',             artist: '@siggi',          ratio: 0.6,  colors: ['#2D5016','#8B4513','#DAA520','#DC143C'] },
    { name: 'Folio',                   artist: '@xlrdr',          ratio: 1.33, colors: ['#000000','#FFFFFF','#FF0000'] },
    { name: 'Memories of Qilin',       artist: '@lirona',         ratio: 1.25, colors: ['#1B4F72','#D4E6F1','#F9E79F','#F0B27A'] },
    { name: 'Elevated Deconstructions',artist: '@zeblocks',       ratio: 2.35, colors: ['#5D6D7E','#AEB6BF','#1B2631','#F0F3F4'] },
    { name: 'Eccentrics',              artist: '@radix',          ratio: 1.0,  colors: ['#FF4500','#FF8C00','#FFD700','#ADFF2F'] },
];

export interface TokenArtSpec {
    ratio: number;
    c1: string;
    c2: string;
    c3: string;
    angleDeg: number;
}

/**
 * Deterministic id → art spec. Collection picked by `id % N`; angle
 * follows the mockup's `(idx * 37 + 15) % 360` with idx swapped for
 * id so each token's rotation is stable across reloads. Color picks
 * mirror profile.html 1728–1730 verbatim (c1 = colors[0], c2 =
 * colors[1 % len], c3 = colors[2 % len] || c1).
 */
export function getTokenArtSpec(id: number): TokenArtSpec {
    const idx = ((id % MOCK_COLLECTIONS.length) + MOCK_COLLECTIONS.length) % MOCK_COLLECTIONS.length;
    const col = MOCK_COLLECTIONS[idx];
    const colors = col.colors;
    const c1 = colors[0];
    const c2 = colors[1 % colors.length];
    const c3 = colors[2 % colors.length] || c1;
    const angleDeg = (id * 37 + 15) % 360;
    return { ratio: col.ratio, c1, c2, c3, angleDeg };
}

/**
 * Paints the 3-stop linear gradient to a 2D canvas context.
 *
 * Converts the mockup's CSS angle convention (0deg = bottom-to-top,
 * clockwise) to canvas line endpoints centered on the box. Gradient
 * half-length |W·sin θ| + |H·cos θ| / 2 sized so the 0% and 100%
 * stops sit on the bounding-box edges at any angle — no color-stop
 * truncation at off-axis rotations.
 */
export function paintPlaceholder(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    spec: TokenArtSpec
): void {
    const angleRad = (spec.angleDeg * Math.PI) / 180;
    const sin = Math.sin(angleRad);
    const cos = Math.cos(angleRad);
    const cx = W / 2;
    const cy = H / 2;
    const halfLen = (Math.abs(W * sin) + Math.abs(H * cos)) / 2;
    const dx = sin * halfLen;
    const dy = -cos * halfLen;
    const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    grad.addColorStop(0, spec.c1);
    grad.addColorStop(0.5, spec.c2);
    grad.addColorStop(1, spec.c3);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
}
