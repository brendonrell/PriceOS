/*
 * F42 / BUG-04 — Tabstract title generator
 *
 * Sim 5510-5526. On every page load the document title is set to:
 *
 *     `Price Discussion ⋮ ${COLLECTION_TITLE} ⋮ ${tabstract}`
 *
 * where `tabstract` is six glyphs randomly drawn (with replacement)
 * from a randomly-chosen pattern set.
 *
 * Pattern-set count: sim's source layout has additional sets
 * appended in `// Phase Lines[…]` style comments on lines 5514-5518.
 * Those comments end the JS line, so the runtime literal evaluates
 * to six sets — Phase Lines, Fiber Optic, Geomancer, Braille Tear,
 * Vector Stream, Geometric Cryptography. Per the bootstrap rule
 * "verbatim from sim", we port the runtime literal — six sets —
 * not the comment-only sets the spec author counted by reading.
 *
 * COLLECTION_TITLE is duplicated here from CollectionContext:
 * sim 5510 declares it inline in the same block, and this generator
 * runs before any provider mounts (it's called from PriceOSShell's
 * mount effect, before useCollection is available).
 *
 * Wire site: PriceOSShell mounts a one-shot useEffect that calls
 * pickTabstractTitle() and assigns to document.title. Next.js
 * `metadata.title` is server-rendered and can't rotate per load,
 * so the rotation has to be a client-mount effect.
 */

const COLLECTION_TITLE = 'PRISMS';

const TABSTRACT_SETS: ReadonlyArray<readonly string[]> = [
    ['☱', '☲', '☳', '☴', '☵', '☶'],                                      // Phase Lines
    ['│', '┃', '┆', '┇', '┊', '┋'],                                      // Fiber Optic
    ['◧', '◨', '◩', '◪', '◫', '◰', '◱', '◲', '◳'],                        // Geomancer
    ['▚', '⣿', '▞', '⣷', '▤', '⣧', '▥', '⣇'],                            // Braille Tear
    ['⇡', '│', '⇣', '┃', '⇢', '┆', '⇠', '┇'],                            // Vector Stream
    ['⊚', '◰', '⊛', '◱', '⊜', '◲', '⊙', '◳'],                            // Geometric Cryptography
];

export function pickTabstractTitle(): string {
    const set = TABSTRACT_SETS[Math.floor(Math.random() * TABSTRACT_SETS.length)];
    let tabstract = '';
    for (let i = 0; i < 6; i++) {
        tabstract += set[Math.floor(Math.random() * set.length)];
    }
    return `Price Discussion ⋮ ${COLLECTION_TITLE} ⋮ ${tabstract}`;
}
