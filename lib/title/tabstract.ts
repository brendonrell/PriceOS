/*
 * F42 / BUG-04 — Tabstract title generator
 *
 * Sim 5510-5526. On every page load the document title is set to:
 *
 *     `${CONTEXT} ⋮ Price Discussion ⋮ ${tabstract}`
 *
 * where `tabstract` is six glyphs randomly drawn (with replacement)
 * from a randomly-chosen pattern set, and CONTEXT names what's IN the
 * tab (the project, or the profile handle). Order swapped 2026-06-12
 * (Brendon): the specific thing leads, the platform name follows, so a
 * row of PD tabs reads by content. Context-less pages (home etc.) are
 * just `Price Discussion ⋮ ${tabstract}`.
 *
 * Pattern-set count: sim's source layout has additional sets
 * appended in `// Phase Lines[…]` style comments on lines 5514-5518.
 * Those comments end the JS line, so the runtime literal evaluates
 * to six sets — Phase Lines, Fiber Optic, Geomancer, Braille Tear,
 * Vector Stream, Geometric Cryptography. Per the bootstrap rule
 * "verbatim from sim", we port the runtime literal — six sets —
 * not the comment-only sets the spec author counted by reading.
 *
 * Wire site: PriceOSShell's pathname-keyed useEffect calls
 * pickTabstractTitle(context) and assigns to document.title (the
 * context is derived from the route there). Next.js `metadata.title`
 * is server-rendered and can't rotate per load, so the rotation has
 * to be a client effect.
 */

const TABSTRACT_SETS: ReadonlyArray<readonly string[]> = [
    ['☱', '☲', '☳', '☴', '☵', '☶'],                                      // Phase Lines
    ['│', '┃', '┆', '┇', '┊', '┋'],                                      // Fiber Optic
    ['◧', '◨', '◩', '◪', '◫', '◰', '◱', '◲', '◳'],                        // Geomancer
    ['▚', '⣿', '▞', '⣷', '▤', '⣧', '▥', '⣇'],                            // Braille Tear
    ['⇡', '│', '⇣', '┃', '⇢', '┆', '⇠', '┇'],                            // Vector Stream
    ['⊚', '◰', '⊛', '◱', '⊜', '◲', '⊙', '◳'],                            // Geometric Cryptography
];

export function pickTabstractTitle(context?: string | null): string {
    const set = TABSTRACT_SETS[Math.floor(Math.random() * TABSTRACT_SETS.length)];
    let tabstract = '';
    for (let i = 0; i < 6; i++) {
        tabstract += set[Math.floor(Math.random() * set.length)];
    }
    return context
        ? `${context} ⋮ Price Discussion ⋮ ${tabstract}`
        : `Price Discussion ⋮ ${tabstract}`;
}
