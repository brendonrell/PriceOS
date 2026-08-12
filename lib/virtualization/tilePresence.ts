'use client';

/*
 * tilePresence — the near-viewport bound for stored-picture tiles.
 *
 * The canvas gallery has always been bounded: canvasVirtualizer keeps one
 * module-scoped IntersectionObserver, paints a canvas as its wrapper comes
 * near, and evicts the least-recently-visible one past its LRU cap — so the
 * cost of a gallery is set by the SCREEN, never by how many pieces are in it.
 *
 * When tiles became stored pictures (2026-07-06) that bound was not carried
 * across. A tile that had loaded once was pinned to eager loading + a
 * main-thread decode forever, to stop it flashing blank on scroll-back
 * (2026-07-07, the carousel flash). Correct for the tiles you can reach —
 * but it applied to every tile ever scrolled past, so a 749-piece collection
 * ended up holding 749 pinned, synchronously-decoded pictures, and the page
 * got heavier the more its owner collected (Brendon, 2026-08-02: "we see like
 * 6 on screen at a time what the FUCK happened to the lazy loading we had").
 *
 * This is that same bound, in the canvasVirtualizer's shape (Rule #0): ONE
 * observer for the whole app, the same one-viewport lookahead, a single
 * near/far flag per tile. Near tiles keep the flash-free pinning exactly as
 * it is; far tiles hand their picture back to the browser. The tile itself
 * never leaves the page, so nothing reflows and nothing pops — only the
 * decoded copy is released, and it is re-taken a full viewport before the
 * tile can be seen again.
 */

/* One viewport-lookahead vertically (scroll-into-view), plus a couple of
   tiles' worth horizontally (2026-08-12) — carousels clip their own
   off-screen tiles via horizontal scroll, and this is the ONLY signal that
   gates whether a tile's <img src> gets set at all (see ArtworkCard's
   `shouldLoad`). It used to be vertical-only, so carousels leaned on a
   second, separate per-track observer to preload sideways — two mechanisms
   that only ever touched the `loading` HINT, never the actual fetch, which
   is exactly how "lazy loading" kept quietly not-actually-lazy-ing. One
   observer, one real gate, both directions. */
const ROOT_MARGIN = '400px 300px';

type Entry = { el: Element; onChange: (near: boolean) => void; near: boolean };

const entries = new Map<Element, Entry>();
let observer: IntersectionObserver | null = null;

function ensureObserver(): IntersectionObserver | null {
    if (typeof IntersectionObserver === 'undefined') return null;
    if (observer) return observer;
    observer = new IntersectionObserver(
        (records) => {
            for (const r of records) {
                const entry = entries.get(r.target);
                if (!entry || entry.near === r.isIntersecting) continue;
                entry.near = r.isIntersecting;
                entry.onChange(r.isIntersecting);
            }
        },
        { rootMargin: ROOT_MARGIN },
    );
    return observer;
}

/** Watch a tile's wrapper. `onChange(true)` fires as it comes within a
 *  viewport of the screen, `onChange(false)` as it leaves that band. Returns
 *  the unwatch function. Without IntersectionObserver support every tile is
 *  treated as near, which is exactly today's behaviour. */
export function watchTile(el: Element | null, onChange: (near: boolean) => void): () => void {
    if (!el) return () => {};
    const io = ensureObserver();
    if (!io) { onChange(true); return () => {}; }
    entries.set(el, { el, onChange, near: false });
    io.observe(el);
    return () => {
        entries.delete(el);
        io.unobserve(el);
    };
}
