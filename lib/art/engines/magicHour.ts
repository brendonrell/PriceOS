/*
 * Magic Hour placeholder art — PURE JS canvas (no SVG), the same discipline as the
 * Prisms / Oracle engines. This is NOT a real Project: it paints the fake
 * "welcome" pieces that fill a user's EMPTY Collected tab until they collect
 * something real. Artist is always @petey (PD's mascot).
 *
 * Deterministic per (seed, style). Six soft / inert style options so Brendon can
 * pick the visual — all muted + low-contrast on purpose (it should read as a
 * gentle placeholder, never as a real collected Output).
 */

export const MAGIC_HOUR_STYLES = [
  'bloom', // centre glow
  'wash', // diagonal pastel sweep
  'rings', // soft concentric rings
  'haze', // drifting blurred blobs
  'horizon', // two-tone soft band
  'dust', // faint grain field
] as const;
export type MagicHourStyle = (typeof MAGIC_HOUR_STYLES)[number];

/* Tiny self-contained RNG (mulberry32) — keeps this placeholder fully isolated
   from the real per-Project art RNG contract. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Muted pastel palettes — soft, desaturated, low-contrast. */
const PALETTES: readonly [string, string, string][] = [
  ['#e9d9f2', '#c9b3e6', '#9d86c9'], // lilac
  ['#d9ecf2', '#aacfe0', '#7fb0c9'], // mist blue
  ['#f2e6d9', '#e0c9aa', '#c9a880'], // sand
  ['#d9f2e6', '#aae0c9', '#86c9a8'], // sage
  ['#f2dce0', '#e6b3bf', '#c98699'], // rose
  ['#e6e6ea', '#c9c9d2', '#a8a8b5'], // greige
];

function paint(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  style: MagicHourStyle,
  r: () => number,
) {
  const pal = PALETTES[Math.floor(r() * PALETTES.length)];
  const [c0, c1, c2] = pal;

  // Soft base wash so no style ever leaves hard edges.
  const base = ctx.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, c0);
  base.addColorStop(1, c1);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = 'source-over';

  if (style === 'bloom') {
    const g = ctx.createRadialGradient(w * (0.35 + r() * 0.3), h * (0.3 + r() * 0.3), 0, w / 2, h / 2, w * 0.75);
    g.addColorStop(0, c2);
    g.addColorStop(0.5, c1);
    g.addColorStop(1, c0);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (style === 'wash') {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, c2);
    g.addColorStop(0.5, c1);
    g.addColorStop(1, c0);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (style === 'rings') {
    const cx = w * (0.4 + r() * 0.2);
    const cy = h * (0.4 + r() * 0.2);
    const n = 5 + Math.floor(r() * 4);
    for (let i = n; i > 0; i--) {
      ctx.beginPath();
      ctx.arc(cx, cy, (w * 0.55 * i) / n, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 ? c2 : c1;
      ctx.globalAlpha = 0.5;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (style === 'haze') {
    for (let i = 0; i < 5; i++) {
      const g = ctx.createRadialGradient(w * r(), h * r(), 0, w * r(), h * r(), w * (0.25 + r() * 0.3));
      g.addColorStop(0, i % 2 ? c2 : c1);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  } else if (style === 'horizon') {
    const y = h * (0.4 + r() * 0.2);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, c0);
    g.addColorStop(Math.max(0, y / h - 0.12), c1);
    g.addColorStop(Math.min(1, y / h + 0.12), c2);
    g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (style === 'dust') {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < w * h * 0.04; i++) {
      ctx.fillStyle = r() > 0.5 ? '#ffffff' : '#000000';
      ctx.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}

/**
 * Paint a Magic Hour placeholder piece. Square (aspect 1) for clean grid rhythm.
 * `seed` varies the piece; `style` selects one of the six soft options.
 */
export function renderMagicHour(
  canvas: HTMLCanvasElement,
  seed: number,
  width: number,
  style: MagicHourStyle = 'bloom',
): { aspect: number } {
  const aspect = 1;
  const w = width;
  const h = Math.round(width / aspect);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { aspect };
  paint(ctx, w, h, style, rng(seed));
  return { aspect };
}
