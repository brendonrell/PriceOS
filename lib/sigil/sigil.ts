/*
 * THE SIGIL — the personal mark. (Factions v3.1 §1 · ClickUp 86b9erfwp.)
 *
 * A deterministic 3–4 glyph rune-string forged from the wallet address —
 * unforgeable, permanent, "must function like a tattoo". Pure text in the
 * app's fixed glyph family, so it renders anywhere a name renders: the
 * tape, the navbar ASCII-ID, the profile identity row, the Marginalia
 * corner stamps.
 *
 * Grammar locked with Brendon 2026-07-13 (the approved concept pass):
 *   EDGES  — paired angular fences (no brow-curves — they read as faces)
 *   CORES  — heavy geometric anchors (stars · diamonds · wheels · orbs)
 *   SIDES  — companions (dots · threads · sparks)
 *   ABOVE  — combining accents (the PriceSprite-eyebrow mechanic)
 * Four composition forms: edged ⟨✦⟩ · edged+companion ⟨✦·⟩ (asymmetric,
 * never mirrored squiggles — the kaomoji/face recipe is banned) · open
 * mirrored with STRAIGHT marks only —✦— · twin cores ✦—◆.
 *
 * Every glyph ships VS-15 where it has an emoji risk; the whole string is
 * Courier-forced by the render sites per the GLYPHS.md conventions. The
 * pools are LOCKED — changing them re-rolls every forged tattoo on the
 * platform. Never reorder, remove, or insert mid-pool; append-only, and
 * only behind Brendon's explicit sign-off.
 */

function fnv(str: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}
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

const EDGES: [string, string][] = [
    ['⟨', '⟩'], // ⟨ ⟩
    ['❮', '❯'], // ❮ ❯
    ['◁', '▷'], // ◁ ▷
    ['⌐', '¬'], // ⌐ ¬
    ['⌜', '⌝'], // ⌜ ⌝
    ['⌞', '⌟'], // ⌞ ⌟
    ['⟦', '⟧'], // ⟦ ⟧
    ['‹', '›'], // ‹ ›
];
const CORES = [
    '✦', '◆', '❖', '✛', '◈', '⌖', '✜',
    '⊕', '✚', '◍', '❂', '⍟', '✢', '⟡',
    '✣', '◉',
]; // ✦ ◆ ❖ ✛ ◈ ⌖ ✜ ⊕ ✚ ◍ ❂ ⍟ ✢ ⟡ ✣ ◉
const SIDES = ['·', '∙', ':', '⋮', '—', '~', '≡', '°', '∴'];
/** Mirrored flanks are STRAIGHT marks only — a pair of squiggles round a
 *  core is the face recipe, and Sigils are never faces. */
const MIRROR_SIDES = ['·', '∙', '—', '≡', '∴'];
const ABOVE = [
    '̀', '́', '̂', '̃', '̄', '̆', '̇',
    '̈', '̊', '̋', '̌', '', '', '',
];
const BELOW = ['̣', '̤', '̥', '̭', '̮', '', '', '', '', ''];

/** The wallet's Sigil — deterministic, permanent, the same everywhere. */
export function sigilFor(address: string): string {
    const r = rng(fnv(`sigil:${address.toLowerCase()}`));
    const core =
        CORES[Math.floor(r() * CORES.length)]! +
        ABOVE[Math.floor(r() * ABOVE.length)]! +
        BELOW[Math.floor(r() * BELOW.length)]!;
    const form = Math.floor(r() * 4);
    if (form === 0) {
        const [l, q] = EDGES[Math.floor(r() * EDGES.length)]!;
        return l + core + q;
    }
    if (form === 1) {
        const [l, q] = EDGES[Math.floor(r() * EDGES.length)]!;
        const s = SIDES[Math.floor(r() * SIDES.length)]!;
        return r() < 0.5 ? l + core + s + q : l + s + core + q;
    }
    if (form === 2) {
        const s = MIRROR_SIDES[Math.floor(r() * MIRROR_SIDES.length)]!;
        return s + core + s;
    }
    const c2 = CORES[Math.floor(r() * CORES.length)]! + ABOVE[Math.floor(r() * ABOVE.length)]!;
    const s = SIDES[Math.floor(r() * SIDES.length)]!;
    return r() < 0.4 ? core + s + c2 : core + s + s + c2;
}

/** Bone — the Sigil's resting ink for the unenlisted (matches the map's). */
export const SIGIL_BONE = '#E9EDF4';
