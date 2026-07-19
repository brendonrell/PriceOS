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
import { toggleWishlist } from '../pins/wishlistStore';

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
    | { kind: 'wishlist'; slug: string; tokenId: number; title: string; chip: string };

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

/** The etch mark each plan kind wears — the concept's own canonical glyph. */
const CHIP_GLYPH: Record<EtchPlan['kind'], string> = {
    'todo-output': `❍${VS15}`,
    'todo-raw': `❍${VS15}`,
    note: `⊟${VS15}`,
    anchor: `⚓${VS15}`,
    watch: `⬚${VS15}`,
    wishlist: `✛${VS15}`,
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
    }
}
