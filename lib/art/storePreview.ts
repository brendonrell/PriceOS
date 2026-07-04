import { renderArtwork } from '../project/registry';

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

// Thumbnail resolution. Keeps the whole catalog (132 projects × 222 max = 29,304
// pieces) under R2's 10GB free tier at full sell-out (~6.6GB worst case), with a
// comfortable buffer. The Output feature page still renders live at full quality.
const PREVIEW_PX = 384;

export async function storeMintPreviews(slug: string, tokenIds: number[]): Promise<void> {
  if (typeof document === 'undefined') return;
  for (const tokenId of tokenIds) {
    try {
      const canvas = document.createElement('canvas');
      // live=true forces the generative engine, bypassing the stored-image path.
      renderArtwork(canvas, slug, tokenId, PREVIEW_PX, true);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob) await uploadWithRetry(`/api/preview/${slug}/${tokenId}`, blob);
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
        headers: { 'content-type': 'image/png' },
        body: blob,
      });
      if (r.ok) return;
    } catch {
      /* network — retry */
    }
    if (i < attempts - 1) await new Promise((res) => setTimeout(res, 400 * (i + 1)));
  }
}
