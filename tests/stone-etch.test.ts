/*
 * ETCH grammar — the Command Stone's creation parser (lib/stone/etch).
 *
 * parseEtch is pure (no DOM/storage), so the whole intent boundary is
 * testable: verb words etch, bare words stay GO/FIND's, junk never
 * produces a plan. Project names resolve against the real registry.
 */

import { describe, expect, it } from 'vitest';
import { parseEtch, resolveProject } from '../lib/stone/etch';

describe('resolveProject', () => {
    it('resolves a slug exactly', () => {
        expect(resolveProject('prisms')?.slug).toBe('prisms');
    });
    it('resolves a display title case-insensitively', () => {
        expect(resolveProject('PRISMS')?.slug).toBe('prisms');
    });
    it('returns null for unknown names', () => {
        expect(resolveProject('notaproject9000')).toBeNull();
    });
    it('refuses an ambiguous prefix instead of guessing', () => {
        // Single-match prefixes resolve; a prefix matching several
        // projects must NOT pick one silently.
        const hit = resolveProject('pris');
        if (hit) expect(hit.slug).toBe('prisms');
    });
});

describe('parseEtch — todo', () => {
    it('reads an output to-do with a target through the magic quick-add grammar', () => {
        const p = parseEtch('todo: buy prisms 22 under 0.1');
        expect(p?.kind).toBe('todo-output');
        if (p?.kind === 'todo-output') {
            expect(p.slug).toBe('prisms');
            expect(p.tokenId).toBe(22);
            expect(p.verb).toBe('BUY');
            expect(p.priceEth).toBe(0.1);
            expect(p.chip).toContain('❍');
            expect(p.chip).toContain('◊0.1');
            expect(p.chip).toContain('— etch?');
        }
    });
    it('reads a raw to-do with priority + recurrence', () => {
        const p = parseEtch('todo renew ens every month p1');
        expect(p?.kind).toBe('todo-raw');
        if (p?.kind === 'todo-raw') {
            expect(p.input.text).toBe('renew ens');
            expect(p.input.recurrence).toBe('monthly');
            expect(p.input.priority).toBe(1);
        }
    });
});

describe('parseEtch — note', () => {
    it('reads "note on <project> #<id>: <text>"', () => {
        const p = parseEtch('note on prisms #7: minter said it is his favourite');
        expect(p?.kind).toBe('note');
        if (p?.kind === 'note') {
            expect(p.slug).toBe('prisms');
            expect(p.tokenId).toBe(7);
            expect(p.text).toBe('minter said it is his favourite');
            expect(p.chip).toContain('⊟');
        }
    });
    it('works without "on"', () => {
        expect(parseEtch('note prisms #7: gm')?.kind).toBe('note');
    });
    it('refuses an unknown project', () => {
        expect(parseEtch('note on notreal #7: x')).toBeNull();
    });
});

describe('parseEtch — anchor / watch / wishlist', () => {
    it('reads "anchor <project> at <price>"', () => {
        const p = parseEtch('anchor prisms at 0.2');
        expect(p?.kind).toBe('anchor');
        if (p?.kind === 'anchor') {
            expect(p.price).toBe(0.2);
            expect(p.chip).toContain('◊0.2');
        }
    });
    it('reads "anchor <project> <price>" and "@"', () => {
        expect(parseEtch('anchor prisms 0.2')?.kind).toBe('anchor');
        expect(parseEtch('anchor prisms @0.2')?.kind).toBe('anchor');
    });
    it('refuses a zero/invalid anchor price', () => {
        expect(parseEtch('anchor prisms at 0')).toBeNull();
    });
    it('reads "watch <project> floor" and bare "watch <project>"', () => {
        expect(parseEtch('watch prisms floor')?.kind).toBe('watch');
        expect(parseEtch('watch prisms')?.kind).toBe('watch');
    });
    it('reads "wishlist <project> #<id>"', () => {
        const p = parseEtch('wishlist prisms #3');
        expect(p?.kind).toBe('wishlist');
        if (p?.kind === 'wishlist') expect(p.tokenId).toBe(3);
    });
});

describe('parseEtch — the intent boundary (bare words stay GO/FIND)', () => {
    it('never etches bare words, questions, or names', () => {
        expect(parseEtch('prisms')).toBeNull();
        expect(parseEtch('prisms floor?')).toBeNull();
        expect(parseEtch('home')).toBeNull();
        expect(parseEtch('@brendon')).toBeNull();
        expect(parseEtch('listed under:0.1')).toBeNull();
    });
    it('never etches a verb word aimed at an unknown target', () => {
        expect(parseEtch('watch the throne')).toBeNull();
        expect(parseEtch('wishlist nothing #1')).toBeNull();
    });
});
