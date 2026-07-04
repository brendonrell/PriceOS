/* Sim-render entry — bundled to a browser IIFE and injected into a headless
 * page so we can render each Output's REAL Artwork (the same engines the app
 * uses) to a PNG. `live: true` forces the generative engine, never the stored
 * image. Exposes the project slug list + a per-piece render function. */
import { renderArtwork, allProjects } from '../../lib/project/registry';

(window as unknown as { __slugs: string[] }).__slugs = allProjects().map((p) => p.slug);

(window as unknown as {
  __renderPiece: (slug: string, id: number, size: number) => { url: string; aspect: number; w: number; h: number };
}).__renderPiece = (slug, id, size) => {
  const c = document.createElement('canvas');
  const { aspect } = renderArtwork(c, slug, id, size, true);
  return { url: c.toDataURL('image/png'), aspect, w: c.width, h: c.height };
};
