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
const PREVIEW_PX = 512;

// Tile thumbnail: longest edge. A 512→256 proportional shrink keeps true aspect
// and lands each tile at ~30–90KB vs the ~700KB master, so a home full of tiles
// loads in a beat (Brendon 2026-07-07). Retina-safe for the ~120px card tiles.
const THUMB_PX = 256;

/** Shrink a rendered master canvas to the tile thumbnail (longest edge THUMB_PX,
 *  true aspect preserved) and return it as a PNG blob. Null if the browser can't
 *  give us a 2D context. */
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

/** Render a single token's master, then pin its thumbnail variant (only). Used by
 *  the thumb self-heal path — existing masters get their small tile backfilled
 *  the first time a grid asks for it, exactly like masters self-heal today. */
export async function storeThumb(slug: string, tokenId: number): Promise<void> {
  if (typeof document === 'undefined') return;
  try {
    const canvas = document.createElement('canvas');
    renderArtwork(canvas, slug, tokenId, PREVIEW_PX, true);
    const thumbBlob = await makeThumbBlob(canvas);
    if (thumbBlob) await uploadWithRetry(`/api/preview/${slug}/${tokenId}?v=t256`, thumbBlob);
  } catch {
    /* best-effort — the card falls back to the master meanwhile */
  }
}

export async function storeMintPreviews(slug: string, tokenIds: number[]): Promise<void> {
  if (typeof document === 'undefined') return;
  for (const tokenId of tokenIds) {
    try {
      const canvas = document.createElement('canvas');
      // live=true forces the generative engine, bypassing the stored-image path.
      renderArtwork(canvas, slug, tokenId, PREVIEW_PX, true);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob) await uploadWithRetry(`/api/preview/${slug}/${tokenId}`, blob);
      // Small tile thumbnail — a proportional shrink of THIS render (true aspect
      // kept, longest edge THUMB_PX), stored beside the master so cards/home/grids
      // pull ~30–90KB instead of the ~700KB master (Brendon 2026-07-07).
      const thumbBlob = await makeThumbBlob(canvas);
      if (thumbBlob) await uploadWithRetry(`/api/preview/${slug}/${tokenId}?v=t256`, thumbBlob);
      // ASCII Backup rides the same mint moment: derive the text+colour
      // artifact from the SAME fresh render and pin it beside the PNG
      // ({slug}/{id}.ascii.json — write-once, ClickUp 86bahh9f5).
      const artifact = buildAsciiArtifact(canvas, slug, tokenId);
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
