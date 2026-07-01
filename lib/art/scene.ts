/*
 * art/scene — the QUANTITATIVE read of a piece: the countable things a human
 * actually says out loud ("two blue squares and a yellow circle"), built from
 * the shape pass in sampleColor. Pure + shared: the attribute sheet, the
 * capture route and the NPC Cast all speak through describeScene so the
 * sentence is identical everywhere (Brendon, 2026-07-01 — people notice
 * counts and objects, not adjectives).
 */

/** One detected region of colour. */
export interface ShapeInfo {
    /** Colour bucket of the region (the fixed 14-word vocabulary). */
    bucket: string;
    /** What it reads as. */
    kind: 'circle' | 'square' | 'bar' | 'shape';
    /** Share of the canvas it covers, 0..1. */
    share: number;
    /** Where it sits: centre / top / bottom / left / right / corner. */
    pos: string;
}

/** How the shapes arrange: stripes / field / scatter / null (no read). */
export type PatternKind = 'stripes' | 'field' | 'scatter' | null;

/* How a colour bucket sounds out loud (matches the NPC voice). */
export function sceneColorWord(bucket: string): string {
    if (bucket === 'Hothurt') return 'Hothurt';
    if (bucket === 'Moon') return 'moon-grey';
    return bucket.toLowerCase();
}

const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
function countWord(n: number): string {
    return n < NUM_WORDS.length ? NUM_WORDS[n] : `${n}`;
}

function plural(kind: ShapeInfo['kind'], n: number): string {
    if (n === 1) return kind;
    return `${kind}s`;
}

const POS_PHRASE: Record<string, string> = {
    centre: 'dead centre',
    top: 'up top',
    bottom: 'down low',
    left: 'off to the left',
    right: 'off to the right',
    corner: 'in the corner',
};

/**
 * The one-line human read of a piece. Deterministic from the shape list, so
 * stored + live copies always agree. Null when the eye found nothing countable
 * (a wash, a gradient, pure noise) — callers fall back to the qualitative axes.
 */
export function describeScene(shapes: ShapeInfo[], pattern: PatternKind): string | null {
    if (pattern === 'stripes') {
        const colors = [...new Set(shapes.map((s) => sceneColorWord(s.bucket)))].slice(0, 2);
        return colors.length > 1 ? `stripes of ${colors[0]} and ${colors[1]}` : `${colors[0] ?? ''} stripes`.trim();
    }
    if (pattern === 'scatter') {
        const top = shapes[0];
        return top ? `a scatter of little ${sceneColorWord(top.bucket)} bits` : 'a scatter of little bits';
    }
    if (pattern === 'field') {
        const top = shapes[0];
        if (top) {
            return `a field of ${sceneColorWord(top.bucket)} ${plural(top.kind, shapes.length)}`;
        }
    }
    if (!shapes.length) return null;

    // Group by colour + kind, largest first, name the top three groups.
    const groups = new Map<string, { bucket: string; kind: ShapeInfo['kind']; n: number; share: number }>();
    for (const s of shapes) {
        const k = `${s.bucket}:${s.kind}`;
        const g = groups.get(k);
        if (g) { g.n += 1; g.share += s.share; }
        else groups.set(k, { bucket: s.bucket, kind: s.kind, n: 1, share: s.share });
    }
    const ranked = [...groups.values()].sort((a, b) => b.share - a.share).slice(0, 3);
    const parts = ranked.map((g) =>
        g.n === 1
            ? `a ${sceneColorWord(g.bucket)} ${g.kind}`
            : `${countWord(g.n)} ${sceneColorWord(g.bucket)} ${plural(g.kind, g.n)}`,
    );
    let line =
        parts.length === 1 ? parts[0]
        : parts.length === 2 ? `${parts[0]} and ${parts[1]}`
        : `${parts[0]}, ${parts[1]} and ${parts[2]}`;

    // A lone shape earns its placement ("a yellow circle, dead centre").
    if (shapes.length === 1) {
        const p = POS_PHRASE[shapes[0].pos];
        if (p && shapes[0].pos !== 'centre') line += `, ${p}`;
        else if (p) line += ', dead centre';
    }
    return line;
}
