/*
 * The colours the stone KNOWS by name (Brendon, 2026-07-21 — the recolour
 * easter egg). Written names → hex, so `stonecolor: cinnabar` paints it. Pure,
 * device-free, testable. CSS's named colours plus the good ones CSS forgot
 * (cinnabar, vermilion, viridian, oxblood…). Reverse lookup lets a raw hex
 * that lands on a known colour toast with its NAME instead of the digits.
 */

/** name (lowercased, spaces stripped) → #rrggbb. First name for a hex wins
    the reverse lookup, so the nicest word is listed first per colour. */
export const STONE_COLORS: Record<string, string> = {
    // reds
    red: '#ff0000', crimson: '#dc143c', scarlet: '#ff2400', vermilion: '#e34234',
    cinnabar: '#e44d2e', ruby: '#e0115f', garnet: '#733635', cherry: '#d2042d',
    carmine: '#960018', oxblood: '#4a0000', maroon: '#800000', wine: '#722f37',
    burgundy: '#800020', brick: '#b22222', rust: '#b7410e', firebrick: '#b22222',
    tomato: '#ff6347', coral: '#ff7f50', salmon: '#fa8072', blush: '#de5d83',
    // oranges / browns
    orange: '#ff7f00', tangerine: '#f28500', amber: '#ffbf00', apricot: '#fbceb1',
    peach: '#ffcba4', terracotta: '#e2725b', ochre: '#cc7722', copper: '#b87333',
    bronze: '#cd7f32', sienna: '#a0522d', umber: '#635147', sepia: '#704214',
    chocolate: '#7b3f00', coffee: '#6f4e37', mahogany: '#c04000', tan: '#d2b48c',
    khaki: '#c3b091', sand: '#c2b280', taupe: '#483c32', clay: '#b66a50',
    // yellows / golds
    yellow: '#ffea00', gold: '#ffd700', saffron: '#f4c430', mustard: '#e1ad01',
    honey: '#e6a817', lemon: '#fff44f', canary: '#ffef00', flax: '#eedc82',
    // greens
    green: '#008000', lime: '#bfff00', chartreuse: '#7fff00', olive: '#808000',
    moss: '#8a9a5b', fern: '#4f7942', forest: '#228b22', emerald: '#50c878',
    jade: '#00a86b', viridian: '#40826d', malachite: '#0bda51', mint: '#3eb489',
    seafoam: '#93e9be', celadon: '#ace1af', sage: '#9caf88', pistachio: '#93c572',
    // blues / teals
    teal: '#008080', turquoise: '#40e0d0', cyan: '#00ffff', aqua: '#00ffff',
    cerulean: '#2a52be', azure: '#007fff', cobalt: '#0047ab', sapphire: '#0f52ba',
    ultramarine: '#3f00ff', royal: '#4169e1', navy: '#000080', denim: '#1560bd',
    steel: '#4682b4', slate: '#708090', sky: '#87ceeb', powder: '#b0e0e6',
    periwinkle: '#ccccff', blue: '#0000ff', indigo: '#4b0082',
    // purples / pinks
    purple: '#800080', violet: '#8f00ff', amethyst: '#9966cc', mauve: '#e0b0ff',
    lavender: '#b57edc', lilac: '#c8a2c8', orchid: '#da70d6', plum: '#8e4585',
    aubergine: '#3b0910', eggplant: '#614051', magenta: '#ff00ff', fuchsia: '#ff00ff',
    pink: '#ffc0cb', hotpink: '#ff69b4', rose: '#ff007f', flamingo: '#fc8eac',
    // neutrals
    black: '#000000', onyx: '#0f0f0f', charcoal: '#36454f', gunmetal: '#2a3439',
    graphite: '#1c1c1c', slategray: '#708090', gray: '#808080', grey: '#808080',
    silver: '#c0c0c0', ash: '#b2beb5', smoke: '#738276', pewter: '#899499',
    white: '#ffffff', ivory: '#fffff0', cream: '#fffdd0', bone: '#e3dac9',
    pearl: '#eae0c8', linen: '#faf0e6', alabaster: '#edeae0', snow: '#fffafa',
};

/** Expand a #rgb shorthand to #rrggbb. */
function expandShort(hex: string): string {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
}

/** Resolve a written colour name OR a hex to a canonical #rrggbb, or null. */
export function resolveStoneColor(input: string): string | null {
    const q = input.trim().toLowerCase().replace(/\s+/g, '');
    if (/^#[0-9a-f]{6}$/.test(q)) return q;
    if (/^#[0-9a-f]{3}$/.test(q)) return expandShort(q);
    return STONE_COLORS[q] ?? null;
}

/** The prettiest known name for a hex (reverse lookup), or null. Lets a typed
    hex that lands on a known colour toast as the word. */
export function stoneColorName(hex: string): string | null {
    const h = hex.trim().toLowerCase();
    for (const [name, value] of Object.entries(STONE_COLORS)) {
        if (value === h) return name;
    }
    return null;
}
