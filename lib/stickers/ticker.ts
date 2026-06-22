/*
 * ticker — the Sticker Store news crawl, auto-generated from the store itself.
 *
 * Set-and-forget: every line is built from the live SHEETS catalog plus a
 * pre-baked release date per sheet, so adding a sheet (or time passing) updates
 * the crawl with zero edits. News lines carry the sheet's real count/price/tier
 * and a recency badge; between them we sprinkle flavour — PriceSprite faces,
 * familiars, quips, true names, and the ⊞ Stickers mark — kept dry, not corny.
 */

import { SHEETS, stickersForSheet, type SheetId } from './catalog';

const STICKER_ICON = '⊞︎';

/* When each sheet went up. Drives the recency badge; missing → treated as old
   stock. Add a date when a new sheet ships (or it just reads as catalog). */
const RELEASES: Partial<Record<SheetId, string>> = {
    genesis: '2026-06-08', petey: '2026-06-08', icon: '2026-06-10',
    familiar: '2026-06-11', project: '2026-06-12', artist: '2026-06-12',
    pricesprite: '2026-06-13', handle: '2026-06-14', projectname: '2026-06-14',
    output: '2026-06-15', achievement: '2026-06-16', rarity: '2026-06-17',
    truename: '2026-06-18', quip: '2026-06-19', holo: '2026-06-20', animated: '2026-06-21',
};

/* Rare secret lines — ~12% of opens show exactly one, dropped at a random spot. */
const EGGS: string[] = [
    'Petey saw the top. ▶︎ Petey said nothing.',
    'a GRAIL familiar blinks once, then is gone',
    '◊︎ 0.000 — nice try',
    'the ticker is watching you back',
    'someone just paper-handed a MYTHIC. we do not discuss it',
    '⊞︎ you found the secret line — tell no one',
    'in here, the chart only goes up',
    'GM to Petey, and Petey only',
];

function daysSince(iso?: string): number {
    if (!iso) return 999;
    const then = Date.parse(`${iso}T00:00:00`);
    if (Number.isNaN(then)) return 999;
    return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

/* Faces can in theory carry newlines; the crawl is one line, so flatten. */
const oneLine = (s: string): string => s.replace(/\s*\n\s*/g, ' ').trim();

/** Build the full crawl string. Pure-ish (reads the clock for recency). */
export function buildTickerText(): string {
    const familiars = stickersForSheet('familiar');
    const sprites = stickersForSheet('pricesprite');
    const trueNames = stickersForSheet('truename');

    const pickAt = <T,>(arr: T[], i: number): T | undefined => (arr.length ? arr[i % arr.length] : undefined);

    // Flavour interstitials, cycled between news lines — dry, a little playful.
    const flavour: string[] = [];
    const fam = pickAt(familiars, 0);
    const fam2 = pickAt(familiars, 3);
    const sp = pickAt(sprites, 1);
    const sp2 = pickAt(sprites, 4);
    const tn = pickAt(trueNames, 2);

    // Live store facts — all read off the catalog, so they stay true on their own.
    const totalStickers = SHEETS.reduce((a, s) => a + s.count, 0);
    const byPrice = [...SHEETS].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    const cheapest = byPrice[0];
    const priciest = byPrice[byPrice.length - 1];
    const newest = [...SHEETS].sort((a, b) => daysSince(RELEASES[a.id]) - daysSince(RELEASES[b.id]))[0];
    const mythic = SHEETS.filter((s) => s.tag === 'MYTHIC').length;

    flavour.push(`${STICKER_ICON} ${SHEETS.length} SHEETS LIVE · ${totalStickers} STICKERS IN STORE`);
    if (fam) flavour.push(`${oneLine(fam.glyph ?? '')} ${fam.name.toUpperCase()} SPOTTED IN FAMILIARS`);
    if (cheapest) flavour.push(`CHEAPEST IN · ${cheapest.name} · ◊︎ ${cheapest.price}`);
    if (sp) flavour.push(`${oneLine(sp.glyph ?? '')} ${sp.name} RESTOCKED`);
    flavour.push('SHEETS SELL WHOLE · NO SINGLES · PRIMARY ONLY');
    if (priciest) flavour.push(`TOP SHELF · ${priciest.name} · ◊︎ ${priciest.price}`);
    if (tn) flavour.push(`${tn.glyph} SPEAKS ITS NAME`);
    if (newest) flavour.push(`NEWEST DROP · ${newest.name}`);
    if (fam2) flavour.push(`${oneLine(fam2.glyph ?? '')} ${fam2.name.toUpperCase()} ON THE LOOSE`);
    flavour.push(`${mythic} MYTHIC SHEETS ON THE WALL`);
    flavour.push('HOLO ✦ CATCHES THE LIGHT');
    if (sp2) flavour.push(`${oneLine(sp2.glyph ?? '')} @${sp2.name.replace(/^@/, '')} IS COLLECTING`);
    flavour.push(`${STICKER_ICON} TAP A SHEET TO PEEK INSIDE`);

    // Each sheet gets a salesman's line — the ticker is here to MOVE stickers.
    // Recency leads; older stock rotates through a few pitches so it never reads
    // like the same template twice. Dry, confident, never corny.
    const pitches = [
        (s: typeof SHEETS[number], px: string) => `${s.name} · ${s.tag} · ${px} · whole sheet, one tap`,
        (s: typeof SHEETS[number], px: string) => `collect all ${s.count} in ${s.name} · ${px}`,
        (s: typeof SHEETS[number], px: string) => `${s.name} sells whole · ${s.tag} · ${px}`,
        (s: typeof SHEETS[number], px: string) => `still room on the ${s.name} sheet · ${px}`,
    ];
    const news = SHEETS.map((s, i) => {
        const d = daysSince(RELEASES[s.id]);
        const px = `◊︎ ${s.price}`;
        if (d <= 1) return `JUST DROPPED ✦ ${s.name} — ${s.count} stickers, ${px} · first pick of the litter`;
        if (d <= 4) return `STILL WARM · ${s.name} · ${s.tag} · ${px}`;
        if (d <= 9) return `${s.name} is moving · ${s.count} stickers · grab the set`;
        return pitches[i % pitches.length]!(s, px);
    });

    // Interleave: a flavour beat every couple of news lines.
    const out: string[] = [];
    let f = 0;
    news.forEach((line, i) => {
        out.push(line);
        if (i % 2 === 1 && f < flavour.length) out.push(flavour[f++]!);
    });
    while (f < flavour.length) out.push(flavour[f++]!);

    // Rare eggs — on a small fraction of opens one secret line slips in at a
    // random spot. Dry, blink-and-miss-it. Most visits never see one.
    if (Math.random() < 0.12) {
        const egg = EGGS[Math.floor(Math.random() * EGGS.length)]!;
        const at = 1 + Math.floor(Math.random() * Math.max(1, out.length - 1));
        out.splice(at, 0, egg);
    }

    return `${out.join('  ·  ')}  ·  `;
}
