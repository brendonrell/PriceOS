/*
 * THE WIDGET DECK — the Command Stone's summonable hands (stage 4, the
 * presentation pass — docs/briefs/command-stone.md ⛔ STAGE 4 ADDENDUM).
 *
 * "Magic tablet meets Spotlight meets TARS meets watchOS; Raycast is a
 * big inspo" — each capability is its own summonable widget: a big-type,
 * real-data, glanceable black card inside the tab. watchOS is the
 * REFERENCE, not the blueprint (Brendon, 2026-07-20): the cards speak
 * PD's own language — Courier, square corners, the canon glyphs.
 *
 * This file is the PURE summon grammar (testable, no DOM): a typed line
 * → the widget it calls, or null so the line falls through to GO/FIND.
 * Same discipline as CAST: exact words summon; anything inexact is a
 * search. Priority in the stone: ETCH > CAST > WIDGET > GO/FIND.
 *
 *   calendar                     → the week, real /api/calendar + to-dos
 *   priceday                     → today's almanac, big number
 *   calc prisms 0.5              → the P&L ladder vs the live floor
 *   dossier @gmoney · @gmoney    → the collector/artist read
 *   gallery prisms               → mini gallery, ‹ › through the pieces
 *   matrix prisms vs fumage      → the mini table maker (live stats)
 *   ascii                        → wallet ASCII gen art (deterministic)
 *   docs <query>                 → search inside the published docs
 */

import { resolveProject } from './etch';
import { evalMath } from './mathEval';
import { parseConvert, type ConvertPlan } from '../fx/convert';
import { parseStoneDate, type StoneDate } from './dates';
import { TAGS, type Tag } from '../tags/catalog';
import { MOODS_WORDS } from './moods';

export type WidgetPlan =
    | { kind: 'calendar' }
    | { kind: 'priceday' }
    | { kind: 'math'; expr: string; value: number }
    | { kind: 'convert'; conv: ConvertPlan }
    | { kind: 'calc'; slug: string | null; title: string | null; price: number | null }
    | { kind: 'dossier'; name: string }
    | { kind: 'gallery'; slug: string | null; title: string | null }
    | { kind: 'matrix'; names: string[] }
    | { kind: 'ascii' }
    | { kind: 'docs'; query: string }
    /* stage 5 hands */
    | { kind: 'glance' }
    | { kind: 'trend'; slug: string; title: string; days: number }
    /* the familiar's Omniscience, ported to the stone — the read on YOU. */
    | { kind: 'omni' }
    /* PD WRAPPED (2026-07-20) — your own recap; cadence-agnostic (days). */
    | { kind: 'wrapped'; days: number }
    /* ── the abilities pass (2026-07-28) ── */
    /* "tomorrow" · "next week tuesday" · "in 18 days" → the day, resolved. */
    | { kind: 'date'; date: StoneDate }
    /* "first ever mint" (the platform's) · "my first ever mint" (yours). */
    | { kind: 'firstmint'; mine: boolean }
    /* "teletext release date" → when the project first minted. */
    | { kind: 'release'; slug: string; title: string }
    /* "top 20 mutuals by volume spent" · "top 50 followers by wallet age" ·
       "highest spenders on the platform top 15" — `holding` composes it with
       ownership: "top 5 spenders who hold teletext". */
    | { kind: 'rank'; cohort: 'spenders' | 'mutuals' | 'followers'; by: 'spent' | 'age'; n: number; holding: { slug: string; title: string } | null }
    /* "all carnivale owned by podcasters" → project holdings × a profile tag —
       or × your mutuals ("carnivale owned by mutuals"). */
    | { kind: 'cohort'; slug: string; title: string; source: 'tag' | 'mutuals'; tag: string; tagLabel: string }
    /* ── the superpower pass (2026-07-28) ── */
    /* "why is this rare" — the rarity breakdown of the piece on screen (the
       vessel fills slug/id from SEEING; explicit "why is prisms 7 rare" too). */
    | { kind: 'why'; slug: string | null; title: string | null; id: number | null }
    /* "good price?" — the gap read on the project in sight or named. */
    | { kind: 'verdict'; slug: string | null; title: string | null }
    /* "when will teletext sell out" — sellout arithmetic spoken as prophecy. */
    | { kind: 'prophecy'; slug: string; title: string }
    /* ── the fun wave (2026-07-28, Brendon: "add them all") ── */
    /* "roast me" — the dry verdict on your own real ledger. */
    | { kind: 'roast' }
    /* "should i buy?" — the committed 8-ball, seeded so it can't be re-rolled. */
    | { kind: 'eightball'; topic: string | null }
    /* "fortune" / "my horoscope" — the daily reading. */
    | { kind: 'fortune' }
    /* "play me something" — the DJ picks from your held soundtracks. */
    | { kind: 'dj' }
    /* "who are you" — the stone speaks about itself. */
    | { kind: 'lore'; q: string }
    /* "the floor is right" — guess the floor, the ledger scores you. */
    | { kind: 'floorgame' }
    /* ── the moods set (2026-07-28) ── */
    /* "moods" — the whole set dealt as a tappable hand (lib/stone/moods). */
    | { kind: 'moods' }
    /* "tell me a joke" — the told-ledger means never a repeat (2026-07-28). */
    | { kind: 'joke' };

function norm(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Bare-word summons — exact matches only (a miscast is worse than a
    search result; CAST's own rule). */
const CALENDAR_WORDS = new Set(['calendar', 'cal', 'week', 'schedule']);
const PRICEDAY_WORDS = new Set(['priceday', 'price day', 'today', 'almanac']);
const ASCII_WORDS = new Set(['ascii', 'my ascii', 'my mark', 'wallet art']);
/** THE GLANCE — the composed morning card (stage 5). */
const GLANCE_WORDS = new Set(['brief', 'glance', 'morning', 'the glance']);
/** OMNISCIENCE — the familiar's read on YOU, summoned by name. */
const OMNI_WORDS = new Set(['me', 'myself', 'omniscience', 'about me', 'know me']);
/** PD WRAPPED — bare word = the default 30-day look-back; `wrapped 90d`
    picks the window (cadence is Brendon's open call — the days parameter
    IS the cadence-agnosticism). */
const WRAPPED_WORDS = new Set(['wrapped', 'my wrapped', 'pd wrapped', 'recap', 'my recap']);

/** `@handle` — bare handle lines summon the dossier (the stone's own
    presentation of the person). Same charset the app allows in handles. */
const HANDLE_RE = /^@([a-z0-9_.-]{2,})$/;

/** Split a matrix list on its separators: "a vs b", "a, b, c", "a · b". */
function splitMatrixNames(rest: string): string[] {
    return rest
        .split(/\s+vs\.?\s+|\s*,\s*|\s*·\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
}

/** Resolve a cohort word to a Profile Tag — "podcasters" → podcaster.
    Exact id/label match, singular or plural; never a prefix guess. */
export function resolveTag(word: string): Tag | null {
    const w = norm(word);
    if (!w) return null;
    const bare = w.replace(/s$/, '');
    for (const t of TAGS) {
        const id = t.id.toLowerCase();
        const label = t.label.toLowerCase();
        if (w === id || w === label || bare === id || bare === label) return t;
    }
    return null;
}

/** "by volume spent" / "by wallet age" → the rank metric. Null = the words
    weren't a metric (the summon falls through — never guess). */
function rankMetric(rest: string | undefined): 'spent' | 'age' | null {
    const r = norm(rest ?? '');
    if (!r) return 'spent'; // the unnamed default — money is the house metric
    if (['volume spent', 'spent', 'volume', 'spend', 'eth spent'].includes(r)) return 'spent';
    if (['wallet age', 'age', 'oldest', 'account age', 'join date'].includes(r)) return 'age';
    return null;
}

const clampN = (n: number) => Math.max(1, Math.min(50, n));

export function parseWidget(line: string, now: Date = new Date()): WidgetPlan | null {
    const q = norm(line);
    if (!q) return null;

    if (CALENDAR_WORDS.has(q)) return { kind: 'calendar' };
    if (PRICEDAY_WORDS.has(q)) return { kind: 'priceday' };
    if (ASCII_WORDS.has(q)) return { kind: 'ascii' };
    if (GLANCE_WORDS.has(q)) return { kind: 'glance' };
    if (OMNI_WORDS.has(q)) return { kind: 'omni' };
    if (WRAPPED_WORDS.has(q)) return { kind: 'wrapped', days: 30 };
    /* Bare `moods` deals the set — the singular words CAST (checked first
       in the stone, so `mood` still flips cozy, never lands here). */
    if (MOODS_WORDS.has(q)) return { kind: 'moods' };

    /* `wrapped 90d` / `recap 7d` — a chosen window. */
    const wrapped = /^(?:wrapped|recap)\s+(\d{1,3})d?$/.exec(q);
    if (wrapped) return { kind: 'wrapped', days: parseInt(wrapped[1], 10) };

    /* ── DATE — "tomorrow" · "next week tuesday" · "in 18 days" · "aug 30".
       Exact phrases only (a bare weekday stays a search — could be a name). */
    const date = parseStoneDate(q, now);
    if (date) return { kind: 'date', date };

    /* ── FIRST MINT — the platform's genesis, or yours ("my …"). */
    const firstMint = /^(my\s+)?first(?:\s+ever)?\s+mint(?:\s+ever)?\??$/.exec(q);
    if (firstMint) return { kind: 'firstmint', mine: !!firstMint[1] };

    /* ── RELEASE DATE — "teletext release date" · "when did teletext launch".
       An unresolved name falls through to search (mid-word discipline). */
    const release =
        /^(.+?)\s+release(?:\s+date)?\??$/.exec(q) ??
        /^when\s+did\s+(.+?)\s+(?:release|launch|drop|mint)\??$/.exec(q);
    if (release) {
        const proj = resolveProject(release[1]);
        if (proj) return { kind: 'release', slug: proj.slug, title: proj.title };
    }

    /* ── THE FUN WAVE — exact phrases, the summon discipline as ever. ── */
    if (['roast me', 'roast my ledger', 'roast my wallet', 'roast'].includes(q)) {
        return { kind: 'roast' };
    }
    const eightball =
        /^should\s+i\s+(buy|sell|mint|hold|ape)(?:\s+(?:it|this|(.+?)))?\??$/.exec(q) ??
        /^(?:8\s*ball|eightball)(?:\s+(.+?))?\??$/.exec(q);
    if (eightball) {
        const topic = (eightball[2] ?? eightball[1] ?? '').trim() || null;
        return { kind: 'eightball', topic };
    }
    if (['fortune', 'my fortune', 'fortune me', 'horoscope', 'my horoscope', 'daily fortune', 'read my fortune'].includes(q)) {
        return { kind: 'fortune' };
    }
    if (['dj', 'play me something', 'play something', 'play me a song', 'music', 'put something on'].includes(q)) {
        return { kind: 'dj' };
    }
    /* THE JOKE (2026-07-28) — never a repeat until the bank runs dry. */
    if (['tell me a joke', 'tell a joke', 'joke', 'another joke', 'tell me another', 'make me laugh'].includes(q)) {
        return { kind: 'joke' };
    }
    const LORE = new Set([
        'who are you', 'what are you', 'are you alive', 'are you real',
        'are you watching', 'are you there', 'what do you want', 'where are you',
        'how old are you', 'do you sleep', 'do you dream', 'what is the stone',
        'hello', 'hi', 'hey', 'gm', 'good morning', 'good night', 'gn',
        'thanks', 'thank you', 'i love you', 'help',
    ]);
    if (LORE.has(q)) return { kind: 'lore', q };
    if (['the floor is right', 'floor is right', 'play the floor is right', 'price is right'].includes(q)) {
        return { kind: 'floorgame' };
    }

    /* ── WHY RARE — "why is this rare" (the piece on screen; the vessel
       fills it) · "why is prisms 7 rare" (explicit). */
    const whyThis = /^(?:why\s+(?:is\s+)?(?:this\s+)?(?:so\s+)?rare|how\s+rare\s+is\s+this)\??$/.exec(q);
    if (whyThis) return { kind: 'why', slug: null, title: null, id: null };
    const whyPiece = /^(?:why\s+is|how\s+rare\s+is)\s+(.+?)\s*#?(\d{1,6})(?:\s+(?:so\s+)?rare)?\??$/.exec(q);
    if (whyPiece) {
        const proj = resolveProject(whyPiece[1]);
        if (proj) return { kind: 'why', slug: proj.slug, title: proj.title, id: parseInt(whyPiece[2], 10) };
    }

    /* ── THE VERDICT — "good price?" on the thing in sight, or named. */
    const verdictThis = /^(?:is\s+this\s+a\s+)?(?:good|fair)\s+price\??$/.exec(q);
    if (verdictThis) return { kind: 'verdict', slug: null, title: null };
    const verdictNamed = /^is\s+(.+?)\s+a\s+(?:good|fair)\s+price\??$/.exec(q);
    if (verdictNamed) {
        const proj = resolveProject(verdictNamed[1]);
        if (proj) return { kind: 'verdict', slug: proj.slug, title: proj.title };
    }

    /* ── PROPHECY — "when will teletext sell out" · "teletext sellout" ·
       "teletext pace". Sellout arithmetic on the real mint ledger. */
    const prophecy =
        /^when\s+(?:will|does)\s+(.+?)\s+sell\s*out\??$/.exec(q) ??
        /^(.+?)\s+(?:sell\s*out|sellout|pace)\??$/.exec(q);
    if (prophecy) {
        const proj = resolveProject(prophecy[1]);
        if (proj) return { kind: 'prophecy', slug: proj.slug, title: proj.title };
    }

    /* ── RANK · SPENDERS — "highest spenders on the platform top 15" ·
       "top 15 spenders" · "top 5 spenders who hold teletext". Default
       top 10, cap 50; "who hold <project>" composes with ownership. */
    const spenders =
        /^(?:the\s+)?(?:top|highest|biggest)\s+(?:(\d{1,2})\s+)?spenders?(?:\s+on\s+the\s+platform)?(?:\s+top\s+(\d{1,2}))?(?:\s+(?:who\s+)?(?:hold|holding|own|owning)\s+(.+?))?\??$/.exec(q);
    if (spenders) {
        const n = clampN(parseInt(spenders[1] ?? spenders[2] ?? '10', 10));
        let holding: { slug: string; title: string } | null = null;
        if (spenders[3]) {
            const proj = resolveProject(spenders[3]);
            if (!proj) return null; // unresolved holding → search, never guess
            holding = proj;
        }
        return { kind: 'rank', cohort: 'spenders', by: 'spent', n, holding };
    }

    /* ── RANK · MUTUALS / FOLLOWERS — "top 20 mutuals by volume spent" ·
       "top 50 followers by wallet age" · "top 10 mutuals who hold prisms".
       Metric words must be known. */
    const social =
        /^(?:my\s+)?top\s+(?:(\d{1,2})\s+)?(mutuals?|followers?)(?:\s+by\s+(.+?))??(?:\s+(?:who\s+)?(?:hold|holding|own|owning)\s+(.+?))?\??$/.exec(q);
    if (social) {
        const by = rankMetric(social[3]);
        if (by) {
            const cohort = social[2].startsWith('mutual') ? 'mutuals' : 'followers';
            let holding: { slug: string; title: string } | null = null;
            let ok = true;
            if (social[4]) {
                const proj = resolveProject(social[4]);
                if (proj) holding = proj;
                else ok = false;
            }
            if (ok) return { kind: 'rank', cohort, by, n: clampN(parseInt(social[1] ?? '10', 10)), holding };
        }
    }

    /* ── COHORT HOLDINGS — "all carnivale owned by podcasters" (a Profile
       Tag) or "carnivale owned by mutuals" (your circle). Both sides must
       resolve or it's a search. */
    const cohort = /^(?:all\s+)?(.+?)\s+(?:owned|held)\s+by\s+(?:the\s+)?(?:my\s+)?(.+?)\??$/.exec(q);
    if (cohort) {
        const proj = resolveProject(cohort[1]);
        const who = norm(cohort[2]);
        if (proj && (who === 'mutuals' || who === 'my mutuals' || who === 'the cabal')) {
            return { kind: 'cohort', slug: proj.slug, title: proj.title, source: 'mutuals', tag: '', tagLabel: 'Mutuals' };
        }
        const tag = resolveTag(cohort[2]);
        if (proj && tag) {
            return { kind: 'cohort', slug: proj.slug, title: proj.title, source: 'tag', tag: tag.id, tagLabel: tag.label };
        }
    }

    /* `<project> 30d` — the sales trend in Courier (stage 5). Window is
       clamped 7–90 by the API; unresolved names fall through to search. */
    const trend = /^(.+?)\s+(\d{1,3})d$/.exec(q);
    if (trend) {
        const proj = resolveProject(trend[1]);
        if (proj) return { kind: 'trend', slug: proj.slug, title: proj.title, days: parseInt(trend[2], 10) };
    }

    const handle = HANDLE_RE.exec(q);
    if (handle) return { kind: 'dossier', name: handle[1] };

    const dossier = /^(?:dossier|who is)\s+(.+)$/.exec(q);
    if (dossier) {
        const name = dossier[1].replace(/^@/, '').replace(/\?+$/, '').trim();
        if (name) return { kind: 'dossier', name };
    }

    const docs = /^docs\s+(.+)$/.exec(q);
    if (docs) return { kind: 'docs', query: docs[1] };
    if (q === 'docs') return { kind: 'docs', query: '' };

    const gallery = /^gallery(?:\s+(.+))?$/.exec(q);
    if (gallery) {
        const name = (gallery[1] ?? '').trim();
        if (!name) return { kind: 'gallery', slug: null, title: null };
        const proj = resolveProject(name);
        /* Unresolved name → keep falling through to GO/FIND (the user is
           mid-word; search stays live until the name lands). */
        return proj ? { kind: 'gallery', slug: proj.slug, title: proj.title } : null;
    }

    const matrix = /^matrix(?:\s+(.+))?$/.exec(q);
    if (matrix) {
        const rest = (matrix[1] ?? '').trim();
        if (!rest) return { kind: 'matrix', names: [] };
        return { kind: 'matrix', names: splitMatrixNames(rest).slice(0, 3) };
    }

    /* CONVERT — "1 eth", "0.5 eth in gbp", "500 usd to eth" (the $0 inline
       ETH↔fiat converter). Checked before the calc prefix so a bare amount
       reads as a conversion, not a project search. */
    const conv = parseConvert(q);
    if (conv) return { kind: 'convert', conv };

    /* MATH — "3*546" answers instantly. Needs an operator + a digit, so a
       bare number or a name never reads as a calculation. */
    const math = evalMath(q);
    if (math) return { kind: 'math', expr: math.expr, value: math.value };

    const calc = /^calc(?:\s+(.+))?$/.exec(q);
    if (calc) {
        const rest = (calc[1] ?? '').trim();
        if (!rest) return { kind: 'calc', slug: null, title: null, price: null };
        /* `calc <project> [price]` — a trailing number is the buy price. */
        const m = /^(.*?)(?:\s+(\d+(?:\.\d+)?))?$/.exec(rest);
        const name = (m?.[1] ?? '').trim();
        const price = m?.[2] != null ? parseFloat(m[2]) : null;
        if (!name && price != null) return { kind: 'calc', slug: null, title: null, price };
        const proj = name ? resolveProject(name) : null;
        if (!proj && name) return { kind: 'calc', slug: null, title: null, price };
        return {
            kind: 'calc',
            slug: proj?.slug ?? null,
            title: proj?.title ?? null,
            price,
        };
    }

    return null;
}
