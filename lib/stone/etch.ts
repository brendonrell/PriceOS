/*
 * ETCH — the Command Stone's creation grammar (docs/briefs/command-stone.md).
 *
 * "Say it, it exists": a verb word turns the typed line into a thing —
 *
 *   todo: buy prisms 22 under 0.1     → output To-Do, ◊ target (Sentinel arms)
 *   todo: renew ens friday p1         → raw To-Do
 *   note on prisms #7: minter said …  → private per-Output note
 *   anchor fumage at 0.2              → D17 personal anchor price
 *   watch voltaic                     → project star (drives interest pings)
 *   wishlist arcology #3              → wishlist the piece
 *
 * The rule (Brendon's intent model): bare words = GO/FIND; a verb word =
 * ETCH. Parsing is deterministic — no model, $0 forever.
 *
 * parseEtch is PURE (no DOM, no storage) so it's unit-testable; commitEtch
 * performs the write through the real stores — the same paths the buttons
 * use (Rule #0): todoStore · tokenNotes/notesSync · anchorStore ·
 * projectStarStore · wishlistStore. Every plan renders a preview chip
 * first ("❍ BUY · Prisms #22 · ◊0.1 — etch?") so a mis-heard line never
 * carves junk; commit happens only on the user's second touch.
 */

import { getProject, allProjects } from '../project/registry';
import { parseTodo } from '../todos/parse';
import {
    addOutputTodo,
    addRawTodo,
    outputLabel,
    type RawTodoInput,
} from '../todos/todoStore';
import type { TodoVerb } from '../todos/types';
import { readNoteFor, writeNoteFor } from '../notes/tokenNotes';
import { scheduleNotesPush } from '../notes/notesSync';
import { writeAnchor } from '../pins/anchorStore';
import { toggleProjectStar } from '../pins/projectStarStore';
import { toggleWishlist, isWishlisted } from '../pins/wishlistStore';
import { pdRarityRank } from '../output/rarity';

const VS15 = '︎';

export type EtchPlan =
    | {
          kind: 'todo-output';
          slug: string;
          tokenId: number;
          verb: TodoVerb;
          priceEth: number | null;
          due: string | null;
          chip: string;
      }
    | { kind: 'todo-raw'; input: RawTodoInput; chip: string }
    | { kind: 'note'; slug: string; tokenId: number; text: string; chip: string }
    | { kind: 'anchor'; title: string; price: number; chip: string }
    | { kind: 'watch'; slug: string; title: string; chip: string }
    | { kind: 'wishlist'; slug: string; tokenId: number; title: string; chip: string }
    /* ── the superpower pass (2026-07-28): bulk acts, one confirm ── */
    /* "wishlist the 3 rarest teletext" — the rarity engine picks at commit. */
    | { kind: 'wishlist-bulk'; slug: string; title: string; n: number; chip: string }
    /* "anchor everything i hold at floor" — async commit (holdings + floors). */
    | { kind: 'anchor-bulk'; chip: string };

/** "Prisms" — the piece-naming sentence case the whole app speaks. */
function sentenceCase(title: string): string {
    return `${title.charAt(0)}${title.slice(1).toLowerCase()}`;
}

/** Resolve a typed name to a project: slug exact → title exact → prefix. */
export function resolveProject(name: string): { slug: string; title: string } | null {
    const n = name.trim().toLowerCase();
    if (!n) return null;
    const direct = getProject(n);
    if (direct) return { slug: n, title: direct.displayName };
    const all = allProjects();
    const exact = all.find((p) => p.displayName.toLowerCase() === n);
    if (exact) return { slug: exact.slug, title: exact.displayName };
    const prefix = all.filter((p) =>
        p.displayName.toLowerCase().startsWith(n) || p.slug.startsWith(n)
    );
    return prefix.length === 1
        ? { slug: prefix[0].slug, title: prefix[0].displayName }
        : null;
}

/** The etch mark each plan kind wears — the concept's own canonical glyph.
    Anchor = ♆ (U+2646, NEPTUNE — the trident, Brendon's pick 2026-07-31): ⚓ is
    emoji-default on iOS and banned (Brendon, 2026-07-19), and the first
    swap ⏚ turned out to be the Grid Presets button (in code, uncatalogued
    — now in GLYPHS.md §12a). ♆ is grep-verified unused: nautical, one
    distinct mark, and text-presentation on iOS. */
const CHIP_GLYPH: Record<EtchPlan['kind'], string> = {
    'todo-output': `❍${VS15}`,
    'todo-raw': `❍${VS15}`,
    note: `⊟${VS15}`,
    anchor: `♆${VS15}`,
    watch: `⬚${VS15}`,
    wishlist: `✛${VS15}`,
    'wishlist-bulk': `✛${VS15}`,
    'anchor-bulk': `♆${VS15}`,
};

function chipFor(kind: EtchPlan['kind'], parts: string[]): string {
    return `${CHIP_GLYPH[kind]} ${parts.filter(Boolean).join(' · ')} — etch?`;
}

/**
 * Read the typed line as an ETCH intent. Null = not an etch (the line is
 * GO/FIND's). Pure — safe to run on every keystroke.
 */
export function parseEtch(line: string): EtchPlan | null {
    const s = line.trim();
    if (s.length < 4) return null;

    // ── todo: <anything> — the existing magic quick-add grammar, verbatim ──
    const todoM = /^todo:?\s+(.+)$/i.exec(s);
    if (todoM) {
        const parsed = parseTodo(todoM[1]);
        if (parsed.output) {
            const { slug, tokenId, verb } = parsed.output;
            return {
                kind: 'todo-output',
                slug,
                tokenId,
                verb,
                priceEth: parsed.priceEth,
                due: parsed.due,
                chip: chipFor('todo-output', [
                    verb,
                    `${sentenceCase(getProject(slug)?.displayName ?? slug)} #${tokenId}`,
                    parsed.priceEth != null ? `◊${parsed.priceEth}` : '',
                    parsed.due ?? '',
                ]),
            };
        }
        if (!parsed.text) return null;
        return {
            kind: 'todo-raw',
            input: {
                text: parsed.text,
                due: parsed.due,
                priority: parsed.priority,
                priceEth: parsed.priceEth,
                labels: parsed.labels,
                recurrence: parsed.recurrence,
            },
            chip: chipFor('todo-raw', [
                parsed.text,
                parsed.priceEth != null ? `◊${parsed.priceEth}` : '',
                parsed.due ?? '',
                parsed.priority ? `P${parsed.priority}` : '',
            ]),
        };
    }

    // ── tell me when <project> drops under <price> — SAYING IT ARMS IT
    //    (2026-07-28): compiles to a Sentinel-armed watch to-do (the same
    //    ◊-target to-dos the Sentinel already watches server-side). ──
    const sentinelM =
        /^(?:tell|warn|alert)\s+me\s+when\s+(.+?)\s+(?:(?:drops?|falls?|goes|dips?|is)\s+)?(?:under|below|to|at|hits?)\s*(\d*\.?\d+)\s*(?:eth)?\s*$/i.exec(s);
    if (sentinelM) {
        const proj = resolveProject(sentinelM[1]);
        const price = parseFloat(sentinelM[2]);
        if (proj && price > 0 && isFinite(price)) {
            return {
                kind: 'todo-raw',
                input: {
                    text: `watch ${proj.title.toLowerCase()}`,
                    due: null,
                    priority: 0,
                    priceEth: price,
                    labels: [],
                    recurrence: null,
                },
                chip: chipFor('todo-raw', [
                    'SENTINEL',
                    sentenceCase(proj.title),
                    `◊${price}`,
                ]),
            };
        }
    }

    // ── remind me … / ping me in 3 days about … — a dated to-do, said
    //    naturally. "in N days/weeks/months" is read here; every other date
    //    word rides the to-do parser's own grammar. ──
    const remindM = /^(?:remind|ping)\s+me\s+(?:to\s+)?(.+)$/i.exec(s);
    if (remindM) {
        let rest = remindM[1].trim();
        let due: string | null = null;
        const inN = /\bin\s+(\d{1,3}|a|an|one)\s+(day|week|month)s?\b/i.exec(rest);
        if (inN) {
            const n = /^\d+$/.test(inN[1]) ? parseInt(inN[1], 10) : 1;
            if (n >= 1 && n <= 366) {
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                if (inN[2].toLowerCase() === 'day') d.setDate(d.getDate() + n);
                else if (inN[2].toLowerCase() === 'week') d.setDate(d.getDate() + n * 7);
                else d.setMonth(d.getMonth() + n);
                due = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                rest = rest.replace(inN[0], ' ').trim();
            }
        }
        rest = rest.replace(/^about\s+/i, '').trim();
        const parsed = parseTodo(rest || 'check in');
        const finalDue = due ?? parsed.due;
        const text = (parsed.text || 'check in').trim();
        if (finalDue) {
            return {
                kind: 'todo-raw',
                input: {
                    text,
                    due: finalDue,
                    priority: parsed.priority,
                    priceEth: parsed.priceEth,
                    labels: parsed.labels,
                    recurrence: parsed.recurrence,
                },
                chip: chipFor('todo-raw', ['REMIND', text, finalDue]),
            };
        }
    }

    // ── wishlist the <n> rarest <project> — BULK, one confirm; the rarity
    //    engine picks the pieces at commit time. ──
    const bulkWishM = /^wishlist\s+(?:the\s+)?(\d{1,2})\s+rarest\s+(.+?)\s*$/i.exec(s);
    if (bulkWishM) {
        const n = Math.max(1, Math.min(22, parseInt(bulkWishM[1], 10)));
        const proj = resolveProject(bulkWishM[2]);
        if (proj) {
            return {
                kind: 'wishlist-bulk',
                slug: proj.slug,
                title: proj.title,
                n,
                chip: chipFor('wishlist-bulk', [
                    'WISHLIST',
                    `${n} RAREST`,
                    sentenceCase(proj.title),
                ]),
            };
        }
    }

    // ── anchor everything i hold at floor — BULK anchors, one confirm;
    //    holdings + live floors are read at commit (async). ──
    if (/^anchor\s+(?:everything|all)(?:\s+(?:i\s+hold|my\s+projects|i\s+own))?\s+at\s+(?:the\s+)?floor\s*$/i.test(s)) {
        return {
            kind: 'anchor-bulk',
            chip: chipFor('anchor-bulk', ['ANCHOR', 'EVERYTHING YOU HOLD', 'AT FLOOR']),
        };
    }

    // ── note on <project> #<id>: <text> ──
    const noteM = /^note\s+(?:on\s+)?(.+?)\s*#(\d{1,6})\s*[:—–-]\s*(\S.*)$/i.exec(s);
    if (noteM) {
        const proj = resolveProject(noteM[1]);
        if (!proj) return null;
        const tokenId = Number(noteM[2]);
        const text = noteM[3].trim();
        return {
            kind: 'note',
            slug: proj.slug,
            tokenId,
            text,
            chip: chipFor('note', [
                'NOTE',
                `${sentenceCase(proj.title)} #${tokenId}`,
            ]),
        };
    }

    // ── anchor <project> [at|@] <price> ──
    const anchorM = /^anchor\s+(.+?)\s+(?:at\s+|@\s*)?(\d*\.?\d+)\s*(?:eth)?$/i.exec(s);
    if (anchorM) {
        const proj = resolveProject(anchorM[1]);
        const price = parseFloat(anchorM[2]);
        if (!proj || !(price > 0) || !isFinite(price)) return null;
        return {
            kind: 'anchor',
            title: proj.title,
            price,
            chip: chipFor('anchor', [
                'ANCHOR',
                sentenceCase(proj.title),
                `◊${price}`,
            ]),
        };
    }

    // ── watch <project> [floor] ──
    const watchM = /^watch\s+(.+?)(?:\s+floor)?\s*$/i.exec(s);
    if (watchM) {
        const proj = resolveProject(watchM[1]);
        if (!proj) return null;
        return {
            kind: 'watch',
            slug: proj.slug,
            title: proj.title,
            chip: chipFor('watch', ['WATCH', sentenceCase(proj.title)]),
        };
    }

    // ── wishlist <project> #<id> ──
    const wishM = /^wishlist\s+(.+?)\s*#?(\d{1,6})\s*$/i.exec(s);
    if (wishM) {
        const proj = resolveProject(wishM[1]);
        if (!proj) return null;
        const tokenId = Number(wishM[2]);
        return {
            kind: 'wishlist',
            slug: proj.slug,
            tokenId,
            title: proj.title,
            chip: chipFor('wishlist', [
                'WISHLIST',
                `${sentenceCase(proj.title)} #${tokenId}`,
            ]),
        };
    }

    return null;
}

/**
 * Carve the plan into the real stores. Returns the toast line — each one
 * is the EXACT string that surface already speaks (todo composer, note
 * editor, anchor prompt, star rows, artwork wishlist), so the stone never
 * invents a second voice.
 */
export function commitEtch(plan: EtchPlan): string {
    switch (plan.kind) {
        case 'todo-output': {
            const r = addOutputTodo(plan.slug, plan.tokenId, plan.verb, {
                priceEth: plan.priceEth,
                due: plan.due,
            });
            return r === 'added'
                ? `To-Do: ADDED · ${outputLabel(plan.verb, plan.slug, plan.tokenId)}`
                : 'To-Do: ALREADY THERE';
        }
        case 'todo-raw': {
            const item = addRawTodo(plan.input);
            return item ? 'To-Do: ADDED' : 'To-Do: EMPTY';
        }
        case 'note': {
            /* Append, never clobber — an existing note keeps its text and
               the etched line lands underneath. */
            const existing = readNoteFor(plan.slug, plan.tokenId);
            const next = existing ? `${existing}\n${plan.text}` : plan.text;
            writeNoteFor(plan.slug, plan.tokenId, next);
            scheduleNotesPush();
            return 'Note: SAVED';
        }
        case 'anchor': {
            writeAnchor(plan.title, plan.price);
            return `Anchor: ${plan.price} ETH`;
        }
        case 'watch': {
            const r = toggleProjectStar(plan.slug);
            return `Starred: ${r === 'starred' ? 'ADDED' : 'REMOVED'}`;
        }
        case 'wishlist': {
            const r = toggleWishlist(plan.slug, plan.tokenId);
            return r === 'added'
                ? 'Added to your Wishlist (Private)'
                : 'Removed from your Wishlist';
        }
        case 'wishlist-bulk': {
            /* The rarity ladder picks the pieces (pdRarityRank, the Vault's
               read); add-only — already-wishlisted pieces are left alone. */
            const project = getProject(plan.slug);
            const total = project?.outputs ?? 0;
            if (!total) return 'Wishlist: NOTHING MINTABLE';
            const ids = Array.from({ length: total }, (_, i) => i + 1)
                .map((id) => ({ id, rank: pdRarityRank(plan.slug, id)?.rank ?? Number.MAX_SAFE_INTEGER }))
                .sort((a, b) => a.rank - b.rank || a.id - b.id)
                .slice(0, plan.n)
                .map((x) => x.id);
            let added = 0;
            for (const id of ids) {
                if (!isWishlisted(plan.slug, id)) {
                    if (toggleWishlist(plan.slug, id) === 'added') added += 1;
                }
            }
            return added > 0
                ? `Wishlist: ADDED · ${added} RAREST ${plan.title.toUpperCase()}`
                : 'Wishlist: ALREADY THERE';
        }
        case 'anchor-bulk':
            /* Async by nature — the vessel routes this kind through
               commitEtchBulk; reaching here is a wiring error, kept honest. */
            return 'Anchor: USE THE CHIP';
    }
}

/**
 * The async bulk commits — "anchor everything I hold at floor" needs the
 * wallet's holdings and each project's live floor. Same real stores, same
 * one-confirm discipline; the caller awaits and toasts the result.
 */
export async function commitEtchBulk(plan: EtchPlan, address: string): Promise<string> {
    if (plan.kind !== 'anchor-bulk') return commitEtch(plan);
    try {
        const r = await fetch(`/api/user/${address.toLowerCase()}/owned-projects`);
        const d = r.ok ? await r.json() : null;
        const slugs: string[] = (d?.slugs ?? []).slice(0, 12);
        if (slugs.length === 0) return 'Anchor: NOTHING HELD YET';
        let set = 0;
        for (const slug of slugs) {
            const proj = getProject(slug);
            if (!proj) continue;
            const sr = await fetch(`/api/search?q=${encodeURIComponent(proj.displayName)}`);
            const sj = sr.ok ? await sr.json() : null;
            const hit = (sj?.projects ?? []).find((p: { id: string }) => p.id === slug);
            const floor = hit?.floor_eth;
            if (typeof floor === 'number' && floor > 0) {
                writeAnchor(proj.displayName, floor);
                set += 1;
            }
        }
        return set > 0 ? `Anchor: SET · ${set} PROJECT${set === 1 ? '' : 'S'} AT FLOOR` : 'Anchor: NO LIVE FLOORS';
    } catch {
        return 'Anchor: THE LEDGER ISN’T ANSWERING';
    }
}
