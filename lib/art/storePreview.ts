import { renderArtwork } from '../project/registry';
import { buildAsciiArtifact } from './ascii';

/*
 * storeMintPreviews — the Arweave-writer simulation, client side.
 *
 * At the moment a piece mints, deterministically render THAT token with the REAL
 * engine (never a screen snapshot — a fresh render of the exact token) and pin
 * its PNG to storage, once. This is the per-mint mirror of the on-chain flow
 * where the storage fee funds the platform writer pinning preview.png. Per-mint
 * only — never bulk.
 *
 * Best-effort, fire-and-forget: if an upload fails after its retries (or the tab
 * closes mid-batch), that piece stays un-pinned and keeps live-rendering — the
 * display seam falls back to the live engine whenever a stored PNG is missing, so
 * nothing ever shows blank. There is no automatic re-pin of a missed piece (a
 * reconcile sweep could backfill later if guaranteed pinning is ever wanted).
 */

// Stored-preview resolution. Measured across all 120 projects (headless render,
// supply-weighted): full sell-out (60×222 + 60×111 = 19,980 pieces) projects to
// ~7.7GB at 512px — under R2's 10GB with real buffer. 640px would project to
// ~11.6GB, over the tier. The Output feature page still renders live at full
// quality.
// ── Preview sizing — the PROFESSIONAL way (Brendon 2026-07-07) ────────────────
// How Art Blocks / canvas-sketch do it: a piece is rendered to a fixed box tied
// to the piece itself, never to the display or the gallery grid. We anchor on
// CONSTANT PIXEL AREA so every aspect gets the SAME pixel budget — a wide piece
// is no longer shrunk into a short, low-res strip. Total catalog stays under the
// 9GB R2 ceiling (masters ~6.4GB + thumbs ~1.5GB at full sell-out).
//   • MASTER_AREA — every master has this many pixels, distributed by its aspect
//     (wide → wider, tall → taller), so w·h ≈ MASTER_AREA for all.
//   • REF_PX — we render the engine at a reference width big enough that its
//     native area exceeds MASTER_AREA for every catalog aspect (≤ ~1.6), then
//     downscale to the exact area — a quality-safe shrink, never an upscale.
const MASTER_AREA = 230400; // ≈ 480×480; wide 1.5 → 588×392, tall 0.75 → 392×588
const REF_PX = 640;

// Tile thumbnail: longest edge. A proportional shrink of the master keeps true
// aspect and lands each tile at ~30–90KB, so a home full of tiles loads in a
// beat. Retina-safe for the ~120–240px card tiles.
const THUMB_PX = 256;

/** Draw `src` into a fresh canvas scaled to exactly `targetArea` pixels, keeping
 *  aspect. Only ever shrinks (REF render is larger than any master), so quality
 *  holds. Returns the scaled canvas. */
function scaleCanvasToArea(src: HTMLCanvasElement, targetArea: number): HTMLCanvasElement {
  const area = src.width * src.height;
  const scale = area > 0 ? Math.min(1, Math.sqrt(targetArea / area)) : 1;
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(src.width * scale));
  out.height = Math.max(1, Math.round(src.height * scale));
  const ctx = out.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, out.width, out.height);
  }
  return out;
}

/** Render a token to the constant-area master canvas — the pinned artifact and
 *  the source for its thumbnail. Renders at the reference size then shrinks to
 *  MASTER_AREA, so wide and tall pieces carry the same pixel budget. */
function renderMasterCanvas(slug: string, tokenId: number): HTMLCanvasElement {
  const ref = document.createElement('canvas');
  // live=true forces the generative engine, bypassing the stored-image path.
  renderArtwork(ref, slug, tokenId, REF_PX, true);
  return scaleCanvasToArea(ref, MASTER_AREA);
}

/** Shrink a master canvas to the tile thumbnail (longest edge THUMB_PX, true
 *  aspect preserved) and return it as a PNG blob. Null if no 2D context. */
export async function makeThumbBlob(master: HTMLCanvasElement): Promise<Blob | null> {
  const w = master.width;
  const h = master.height;
  if (!w || !h) return null;
  const scale = Math.min(1, THUMB_PX / Math.max(w, h));
  const thumb = document.createElement('canvas');
  thumb.width = Math.max(1, Math.round(w * scale));
  thumb.height = Math.max(1, Math.round(h * scale));
  const ctx = thumb.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(master, 0, 0, thumb.width, thumb.height);
  return new Promise<Blob | null>((resolve) => thumb.toBlob(resolve, 'image/png'));
}

/** Render a token's master, then pin its thumbnail variant (only). Used by the
 *  thumb self-heal path — existing masters get their small tile backfilled the
 *  first time a grid asks for it, exactly like masters self-heal today. */
export async function storeThumb(slug: string, tokenId: number): Promise<void> {
  if (typeof document === 'undefined') return;
  try {
    const master = renderMasterCanvas(slug, tokenId);
    const thumbBlob = await makeThumbBlob(master);
    if (thumbBlob) await uploadWithRetry(`/api/preview/${slug}/${tokenId}?v=t256`, thumbBlob);
  } catch {
    /* best-effort — the card falls back to the master meanwhile */
  }
}

export async function storeMintPreviews(slug: string, tokenIds: number[]): Promise<void> {
  if (typeof document === 'undefined') return;
  for (const tokenId of tokenIds) {
    try {
      // Constant-area master (fixed pixel budget per piece, aspect preserved).
      const master = renderMasterCanvas(slug, tokenId);
      const blob = await new Promise<Blob | null>((resolve) => master.toBlob(resolve, 'image/png'));
      if (blob) await uploadWithRetry(`/api/preview/${slug}/${tokenId}`, blob);
      // Small tile thumbnail — a proportional shrink of the master (true aspect
      // kept, longest edge THUMB_PX), stored beside it so cards/home/grids pull
      // ~30–90KB instead of the full master (Brendon 2026-07-07).
      const thumbBlob = await makeThumbBlob(master);
      if (thumbBlob) await uploadWithRetry(`/api/preview/${slug}/${tokenId}?v=t256`, thumbBlob);
      // ASCII Backup rides the same mint moment: derive the text+colour
      // artifact from the SAME render and pin it beside the PNG
      // ({slug}/{id}.ascii.json — write-once, ClickUp 86bahh9f5).
      const artifact = buildAsciiArtifact(master, slug, tokenId);
      if (artifact) {
        await uploadWithRetry(
          `/api/ascii/${slug}/${tokenId}`,
          new Blob([JSON.stringify(artifact)], { type: 'application/json' }),
        );
      }
    } catch {
      /* best-effort — the display seam covers any miss with the live engine */
    }
    // Yield between pieces so a big batch (up to 22) never blocks the UI thread.
    await new Promise((r) => setTimeout(r, 0));
  }
}

async function uploadWithRetry(url: string, blob: Blob, attempts = 2): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': blob.type || 'image/png' },
        body: blob,
      });
      if (r.ok) return;
    } catch {
      /* network — retry */
    }
    if (i < attempts - 1) await new Promise((res) => setTimeout(res, 400 * (i + 1)));
  }
}
