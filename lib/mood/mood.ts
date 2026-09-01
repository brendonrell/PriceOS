/*
 * Mood Ring — the platform's daily vibe (Brendon, 2026-06-12).
 *
 * A tiny built-in generative art project: every PriceDay the platform wakes
 * up with a new mood — a colour and a name — deterministic from the day
 * number, generative forever. The colour IS the home page's Custom (page-
 * owner) colour for the day (ColorwayContext's home branch reads it); the
 * name surfaces as the footer easter egg ("Platform vibe today: …").
 *
 * Same source rules as everything else daily on PD: keyed off PriceDay
 * (lib/priceday), UTC-bound, so every visitor worldwide shares one mood and
 * SSR/CSR can't disagree except across a midnight boundary (callers compute
 * after mount, same as the hero date).
 *
 * DECOUPLE GUARD: this is NOT the viewer's "Custom" slot (`pd_custom_color`),
 * NOT "Haze Mode" (`pd_haze_color`), and NOT a profile's `profile_hex`. It is
 * the HOME PAGE's own daily colour, computed — never persisted.
 */

import { PRICEDAY_EPOCH } from '../priceday/priceday';
import { liftWarmFloor } from '../color/warmGuard';

/* The mood flips at MIDNIGHT IN MONTREAL (Brendon, 2026-06-12 — it's his
   wall clock, not UTC's). Day number = days since the PriceDay epoch of
   the date a Montreal clock shows, DST handled by the timezone database.
   ⚠ Must mirror the boot-paint script in app/layout.tsx exactly. */
function montrealDayNumber(d: Date): number {
    const ymd = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Montreal',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d); // "2026-06-12"
    const [y, m, day] = ymd.split('-').map(Number);
    return Math.max(
        1,
        Math.floor((Date.UTC(y, m - 1, day) - PRICEDAY_EPOCH) / 86400000) + 1,
    );
}

export interface Mood {
    /** Today's mood colour — the home page's daily Custom colour. */
    hex: string;
    /** Today's mood, chart-read from the colour — e.g. "MELLOW". */
    name: string;
    /** PriceDay number the mood derives from. */
    day: number;
}

/* Deterministic per-day rng — mulberry32 over the day number. One stream
   per day, drawn in a FIXED order (hue jitter, sat, light) — colour draws
   only; the name comes from the chart walk below, not from this stream.
   Do not reorder the colour draws: they must keep matching the boot-paint
   script in app/layout.tsx draw-for-draw (the lockstep test enforces it). */
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

/* The mood chart — a real 90s mood ring reads its colour against a chart,
   and so does this one: the day's HUE picks the mood family. One word,
   gas-station-ring vocabulary (CALM, MELLOW, PASSIONATE…) — never a
   two-word combo (Brendon, 2026-06-12). The colour MEANS the mood, exactly
   like the ring on the chart card it came with.

   2026-07-17 — THE NO-REPEAT WALK (Brendon: "FLIRTY twice in a month").
   The word inside the band is no longer a random roll (random draws from a
   small book collide birthday-paradox fast — a repeat every few weeks was
   guaranteed). Each band is now a BOOK walked without replacement: the Nth
   visit to a band reads the Nth word of the band's seeded order, so a word
   cannot reappear until its whole book has been read. Word counts are
   sized to each band's hue width, so every family's book takes the same
   ~year-plus to exhaust before its walk wraps.
   Rules: bands stay APPEND-ONLY (appending grows the book — never insert
   mid-band, never reorder; the first four of every band are the founding
   2026-06-12 chart). Every word must be globally unique across all bands —
   duplicates would quietly halve the guarantee (a test enforces this). */
const MOOD_CHART: ReadonlyArray<{ maxHue: number; moods: readonly string[] }> = [
    /* reds — the ring runs hot (0–15 plus the 345–360 wrap) */
    { maxHue: 15, moods: [
        'EXCITED', 'AMPED', 'FIRED UP', 'BOLD',
        'FEARLESS', 'FIERY', 'BLAZING', 'CHARGED', 'REVVED', 'PUMPED',
        'FEISTY', 'SIZZLING', 'SCRAPPY', 'GUTSY', 'SCORCHING', 'UNSTOPPABLE',
        'SPICY', 'RILED', 'BRASH', 'BURNING', 'MOLTEN', 'IGNITED',
        'TURBO', 'NERVY', 'RARING', 'JACKED', 'JUICED', 'LIVEWIRE',
        'VOLCANIC', 'FEVERISH', 'DYNAMITE', 'ROWDY',
    ] },
    /* oranges */
    { maxHue: 45, moods: [
        'DARING', 'RESTLESS', 'STOKED', 'ADVENTUROUS',
        'PLUCKY', 'SPUNKY', 'ANTSY', 'ROVING', 'ROAMING', 'RECKLESS',
        'WILD', 'FREEWHEELING', 'EAGER', 'HUNGRY', 'ITCHY', 'SPIRITED',
        'SWASHBUCKLING', 'BRAVE', 'HEADSTRONG', 'IMPULSIVE', 'UNTAMED',
        'KINETIC', 'RAMBUNCTIOUS', 'PEPPY', 'ZESTY', 'GRITTY', 'NOMADIC',
        'FIDGETY', 'DAREDEVIL', 'MAVERICK', 'FOOTLOOSE', 'BREAKNECK',
    ] },
    /* yellows */
    { maxHue: 70, moods: [
        'NERVOUS', 'GIDDY', 'JITTERY', 'WIRED',
        'BUZZING', 'TWITCHY', 'SPARKY', 'FIZZY', 'JUMPY', 'SKITTISH',
        'FLUSTERED', 'FRAZZLED', 'TINGLY', 'CAFFEINATED', 'HYPER',
        'SQUIRRELLY', 'TENSE', 'BREATHLESS', 'DIZZY', 'GIGGLY', 'SNAPPY',
        'CRACKLING', 'STATIC', 'ZIPPY', 'ELECTRIC', 'SHIVERY',
    ] },
    /* yellow-greens */
    { maxHue: 105, moods: [
        'UPBEAT', 'HOPEFUL', 'FRESH', 'SUNNY',
        'BRIGHT', 'CHIPPER', 'PERKY', 'BOUNCY', 'SPRIGHTLY', 'LIVELY',
        'BUDDING', 'BLOOMING', 'SPROUTING', 'MINTY', 'CRISP', 'DEWY',
        'VERDANT', 'LIMBER', 'SPRINGY', 'BUOYANT', 'CHEERFUL', 'GLEEFUL',
        'SMILEY', 'RADIANT', 'BEAMING', 'GRINNING', 'HUMMING', 'THRIVING',
        'VIVID', 'JAUNTY', 'PLAYFUL', 'SUNLIT', 'GOLDEN', 'REFRESHED',
        'INVIGORATED', 'NIMBLE',
    ] },
    /* greens — the chart's resting state */
    { maxHue: 150, moods: [
        'CALM', 'MELLOW', 'CHILL', 'STEADY',
        'GROUNDED', 'ROOTED', 'EASYGOING', 'UNHURRIED', 'SETTLED',
        'BALANCED', 'CENTERED', 'EVEN', 'LEVEL', 'PATIENT', 'GENTLE',
        'SOFT', 'QUIET', 'STILL', 'RESTFUL', 'SOOTHED', 'COMFY', 'COZY',
        'SNUG', 'LAZY', 'DROWSY', 'HOMEY', 'TEMPERATE', 'MILD', 'PLACID',
        'SMOOTH', 'UNRUFFLED', 'UNBOTHERED', 'CASUAL', 'NEUTRAL', 'STABLE',
        'SLOW', 'AMBLING', 'WHOLESOME', 'HUSHED', 'SIMPLE', 'HARMONIOUS',
        'AGREEABLE', 'CONTENT', 'SATISFIED', 'PEACEFUL', 'MOSSY',
    ] },
    /* teals */
    { maxHue: 195, moods: [
        'RELAXED', 'SERENE', 'BREEZY', 'ZEN',
        'COOL', 'FLOATY', 'DRIFTING', 'GLIDING', 'FLOWING', 'LIQUID',
        'FLUID', 'TIDAL', 'OCEANIC', 'AIRY', 'LIGHT', 'WEIGHTLESS',
        'LOOSE', 'CLEAR', 'CLEANSED', 'MISTY', 'SWAYING', 'BOBBING',
        'ADRIFT', 'UNTROUBLED', 'CAREFREE', 'EASY', 'LULLED', 'WAVY',
        'RIPPLING', 'SHIMMERING', 'GLASSY', 'PEARLY', 'SUSPENDED', 'BALMY',
        'SILKY', 'BUOYED', 'HALCYON', 'LANGUID', 'BASKING', 'LOUNGING',
        'AMBIENT', 'ETHEREAL', 'FEATHERY', 'DOZY', 'PURRING', 'GOSSAMER',
    ] },
    /* blues */
    { maxHue: 240, moods: [
        'HAPPY', 'OPTIMISTIC', 'DREAMY', 'TRANQUIL',
        'SLEEPY', 'WISTFUL', 'PENSIVE', 'THOUGHTFUL', 'REFLECTIVE',
        'MUSING', 'CLOUDLESS', 'SKYWARD', 'SOARING', 'ALOFT', 'LOFTY',
        'OPEN', 'VAST', 'BOUNDLESS', 'LIMITLESS', 'FREE', 'LIBERATED',
        'UNBURDENED', 'LIGHTHEARTED', 'MERRY', 'JOLLY', 'JOYFUL', 'JOVIAL',
        'GLAD', 'BLITHE', 'CHARMED', 'LUCKY', 'FORTUNATE', 'GRATEFUL',
        'THANKFUL', 'BLESSED', 'TICKLED', 'DELIGHTED', 'PLEASED', 'ELATED',
        'EUPHORIC', 'UPLIFTED', 'FANCIFUL', 'WHIMSICAL', 'SANGUINE',
        'STARRY', 'JUBILANT',
    ] },
    /* deep blues — the chart's best-case ring */
    { maxHue: 270, moods: [
        'ROMANTIC', 'BLISSFUL', 'SMITTEN', 'MOONSTRUCK',
        'ENCHANTED', 'SPELLBOUND', 'BEWITCHED', 'ENAMORED', 'ENTRANCED',
        'MESMERIZED', 'CAPTIVATED', 'BESOTTED', 'SWOONING', 'DEVOTED',
        'ADORING', 'TWITTERPATED', 'HEARTFELT', 'SOULFUL', 'DOTING',
        'YEARNING', 'LONGING', 'PINING', 'INFATUATED', 'AMOROUS', 'RAPT',
        'TRANSFIXED', 'DAZZLED', 'MOONLIT', 'GOOEY', 'MUSHY', 'SAPPY',
        'BEGUILED',
    ] },
    /* purples */
    { maxHue: 300, moods: [
        'PASSIONATE', 'INTENSE', 'MAGNETIC', 'MYSTERIOUS',
        'SMOLDERING', 'SULTRY', 'HYPNOTIC', 'ARCANE', 'CRYPTIC',
        'ENIGMATIC', 'SHADOWY', 'VELVETY', 'NOCTURNAL', 'MOODY',
        'BROODING', 'SIMMERING', 'ALLURING', 'SEDUCTIVE', 'TEMPESTUOUS',
        'STORMY', 'FIERCE', 'POTENT', 'PRIMAL', 'UNCANNY', 'SPOOKY',
        'HAUNTING', 'WITCHY', 'DUSKY', 'SECRETIVE', 'CLANDESTINE',
        'FERVENT', 'ARDENT',
    ] },
    /* pinks/magentas — wraps back to red at 345 */
    { maxHue: 360, moods: [
        'FLIRTY', 'LOVESTRUCK', 'AFFECTIONATE', 'SWEET',
        'TENDER', 'CUDDLY', 'SNUGGLY', 'BUBBLY', 'GLITTERY', 'SPARKLY',
        'ROSY', 'BLUSHING', 'BASHFUL', 'COY', 'WINSOME', 'CHARMING',
        'DARLING', 'KITTENISH', 'FRISKY', 'SASSY', 'CHEEKY', 'SAUCY',
        'TEASING', 'WINKING', 'PRECIOUS', 'ADORABLE', 'LOVABLE',
        'HUGGABLE', 'KISSABLE', 'SMOOCHY', 'TWINKLY', 'PEACHY', 'SUGARY',
        'HONEYED', 'GLOWING', 'FLUTTERY', 'FOND', 'WARM', 'MELTY',
        'GUSHING', 'CHERUBIC', 'POUTY', 'FLUSHED', 'GLAMOROUS', 'DAINTY',
        'LOVESICK',
    ] },
] as const;

/* Day → hue, exactly as moodOfDay computes it (the jitter is the day's FIRST
   rng draw — same stream, same value). Used to replay which band any past
   day landed in. */
function hueOfDay(day: number): number {
    const r = rng(day * 2654435761);
    return (day * 137.508 + HUE_SALT + r() * 24) % 360;
}

function bandIndexForHue(hue: number): number {
    /* 345–360 reads as red, like the wheel (and the ring) actually wraps. */
    const h = hue >= 345 ? hue - 345 : hue;
    const i = MOOD_CHART.findIndex((b) => h < b.maxHue);
    return i === -1 ? MOOD_CHART.length - 1 : i;
}

/* How many days (1..day inclusive) have landed in `day`'s band — i.e. this
   day is the band's Nth visit. O(day) with a tiny constant: a century is
   ~36k cheap iterations, well under a millisecond, and moods are computed
   on demand (never stored), so there is nothing to cache or migrate. */
function bandVisit(day: number): { band: number; visit: number } {
    const band = bandIndexForHue(hueOfDay(day));
    let visit = 0;
    for (let d = 1; d <= day; d++) {
        if (bandIndexForHue(hueOfDay(d)) === band) visit++;
    }
    return { band, visit };
}

/* The walk: visit N reads position N of the band's ONE seeded shuffled
   order, wrapping forever. Every word's return gap is therefore exactly a
   full read of the book — the maximum guarantee a finite book allows
   (pigeonhole: K words revisited K+1 times must repeat). A fresh shuffle
   per cycle was tried and rejected 2026-07-17: independent shuffles let a
   word at the end of one cycle reappear at the start of the next (measured:
   a 13-day repeat), which is the exact failure this walk exists to kill.
   The golden-angle visit rhythm (gaps of a few–thirteen days per band)
   keeps the fixed order from ever reading as a schedule. */
function wordForVisit(band: number, visit: number): string {
    const words = MOOD_CHART[band].moods;
    const K = words.length;
    const pos = (visit - 1) % K;
    const order = Array.from({ length: K }, (_, i) => i);
    const r = rng(Math.imul(band + 1, 2654435761) ^ 0x9e3779b9);
    for (let i = K - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    return words[order[pos]];
}

/* Hue offset over the golden-angle walk. 0 → 200 (2026-06-12) → 20 → 55
   (2026-06-15, reroll onto the new VIVID palette — today lands rich purple).
   Re-rolls the whole colour timeline (moods are computed, never stored) while
   keeping the consecutive-days-differ property.
   ⚠ Part of the boot-paint mirror contract (app/layout.tsx). */
const HUE_SALT = 55;

function hslToHex(h: number, s: number, l: number): string {
    const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const c = l / 100 - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
        return Math.round(255 * c)
            .toString(16)
            .padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

/** The mood for a given moment (defaults to now). Pure + deterministic. */
export function moodOfDay(d: Date = new Date()): Mood {
    const day = montrealDayNumber(d);
    const r = rng(day * 2654435761);
    /* Hue walks the golden angle day-over-day (consecutive days always read
       as different colours), with a per-day jitter so the walk never feels
       like a schedule. Sat/light stay in the bold-but-inhabitable band —
       the text colour auto-resolves off luminance (ColorwayContext YIQ). */
    const hue = (day * 137.508 + HUE_SALT + r() * 24) % 360;
    /* VIVID band (Brendon, 2026-06-15 — the old 38–85 / 42–76 band read washed
       out): high saturation + mid lightness so the daily colour is bold, the
       full wheel reachable. Text colour auto-resolves off luminance (the deep
       ones get white lettering; bright limes/yellows keep dark text). */
    const sat = 62 + r() * 38; // 62–100%
    /* Warm hues (brick/orange/mustard) still read muddy in this range even
       at high saturation — liftWarmFloor lifts only that band. See
       lib/color/warmGuard.ts (Brendon, 2026-09-01: today's mustard roll). */
    const light = liftWarmFloor(hue, 40 + r() * 20); // 40–60%, 52+ if warm
    /* The mood reads off the colour via the chart — the hue picks the band,
       the no-repeat walk picks the word (see wordForVisit). Colour math
       above stays untouched: it must keep matching the boot-paint script in
       app/layout.tsx (the lockstep test pins it). */
    const { band, visit } = bandVisit(day);
    const name = wordForVisit(band, visit);
    return { hex: hslToHex(hue, sat, light), name, day };
}

/** Today's mood colour — ColorwayContext's home-page Custom fill. */
export function moodHexToday(): string {
    return moodOfDay().hex;
}
