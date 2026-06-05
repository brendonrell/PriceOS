/*
 * prismsEngine — PLACEHOLDER gradient renderer.
 *
 * The previous contents of this file (a verbatim port of a private
 * generative art system) have been removed. That artwork is the artist's
 * own IP and must not live in this repo. This stub renders a stable,
 * deterministic, colourful gradient per tokenId so the gallery and preview
 * surfaces keep working with placeholder art until real per-project art is
 * supplied via artist upload.
 *
 * Public contract is unchanged so all callers keep working:
 *   renderPrisms(canvas, tokenId, width) sizes the canvas internally and
 *   returns the aspect ratio (width / height) so callers can apply a
 *   matching CSS aspect-ratio on the wrapper element.
 */

/* mulberry32 — tiny deterministic PRNG seeded from the tokenId, so each id
   always paints the same gradient (prev/next nav reads as distinct art). */
function seeded(tokenId: number): () => number {
    let t = (tokenId >>> 0) + 0x9e3779b9;
    return function () {
        t = (t + 0x6d2b79f5) >>> 0;
        let x = Math.imul(t ^ (t >>> 15), 1 | t);
        x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
}

export function renderPrisms(
    canvas: HTMLCanvasElement,
    tokenId: number,
    width: number,
): number {
    const rnd = seeded(tokenId);

    /* Deterministic aspect ratio for a masonry-style grid
       (portrait .. square .. slightly landscape), stable per id. */
    const aspect = 0.78 + rnd() * 0.55; // ~0.78–1.33 (w / h)
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(w / aspect));
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return aspect;

    /* Vibrant, high-saturation stops from a seeded hue — lean colourful. */
    const baseHue = Math.floor(rnd() * 360);
    const spread = 40 + rnd() * 150;
    const c1 = `hsl(${baseHue}, 85%, 61%)`;
    const c2 = `hsl(${(baseHue + spread) % 360}, 80%, 57%)`;
    const c3 = `hsl(${(baseHue + spread * 1.7) % 360}, 78%, 54%)`;

    let grad: CanvasGradient;
    if (rnd() < 0.35) {
        const cx = w * (0.3 + rnd() * 0.4);
        const cy = h * (0.3 + rnd() * 0.4);
        grad = ctx.createRadialGradient(
            cx, cy, Math.min(w, h) * 0.05,
            cx, cy, Math.max(w, h) * 0.85,
        );
    } else {
        grad = ctx.createLinearGradient(0, 0, w, h);
    }
    grad.addColorStop(0, c1);
    grad.addColorStop(0.55, c2);
    grad.addColorStop(1, c3);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    return aspect;
}
