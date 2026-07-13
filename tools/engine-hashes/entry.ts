/* Engine-hash entry — bundled to a browser IIFE (same pattern as simrender).
 * Exposes the slug list and a renderer that returns the RAW PIXEL hash basis
 * (not PNG bytes — raw pixels are stable across browser builds; PNG encoding
 * is not). The runner hashes the returned pixel buffer. */
import { renderArtwork, allProjects } from '../../lib/project/registry';

(window as unknown as { __slugs: string[] }).__slugs = allProjects().map((p) => p.slug);

(window as unknown as {
  __renderPixels: (slug: string, id: number, size: number) => { pixels: number[]; w: number; h: number };
}).__renderPixels = (slug, id, size) => {
  const c = document.createElement('canvas');
  renderArtwork(c, slug, id, size, true);
  const x = c.getContext('2d')!;
  const d = x.getImageData(0, 0, c.width, c.height).data;
  // Sample every 97th byte (prime stride): ~45k samples of a 4-6MB buffer —
  // plenty to catch any visual change, cheap to ship across the page bridge.
  const pixels: number[] = [];
  for (let i = 0; i < d.length; i += 97) pixels.push(d[i]);
  return { pixels, w: c.width, h: c.height };
};
