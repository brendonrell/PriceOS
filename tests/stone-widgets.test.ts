/*
 * WIDGET DECK summon grammar (lib/stone/widgets) + the wallet mark
 * (lib/stone/mark) — stage 4 of the Command Stone. Pure: exact words
 * summon a widget, everything else falls through to GO/FIND, and the
 * mark is deterministic per wallet, forever.
 */

import { describe, expect, it } from 'vitest';
import { parseWidget } from '../lib/stone/widgets';
import { buildWalletMark, MARK_COLS, MARK_ROWS } from '../lib/stone/mark';
import { expandFollowUp, type StoneSubject } from '../lib/stone/memory';

describe('parseWidget — bare-word summons', () => {
    it('summons the calendar', () => {
        expect(parseWidget('calendar')?.kind).toBe('calendar');
        expect(parseWidget('  WEEK ')?.kind).toBe('calendar');
        expect(parseWidget('cal')?.kind).toBe('calendar');
    });
    it('summons priceday', () => {
        expect(parseWidget('priceday')?.kind).toBe('priceday');
        expect(parseWidget('today')?.kind).toBe('priceday');
        expect(parseWidget('price day')?.kind).toBe('priceday');
    });
    it('summons the wallet ascii mark', () => {
        expect(parseWidget('ascii')?.kind).toBe('ascii');
        expect(parseWidget('my mark')?.kind).toBe('ascii');
    });
    it('never prefix-guesses — inexact words fall through to GO/FIND', () => {
        expect(parseWidget('calen')).toBeNull();
        expect(parseWidget('calendars')).toBeNull();
        expect(parseWidget('prisms')).toBeNull();
        expect(parseWidget('')).toBeNull();
    });

    it('summons PD Wrapped — bare = 30d, `wrapped 90d` picks the window', () => {
        expect(parseWidget('wrapped')).toEqual({ kind: 'wrapped', days: 30 });
        expect(parseWidget('recap')).toEqual({ kind: 'wrapped', days: 30 });
        expect(parseWidget('my wrapped')).toEqual({ kind: 'wrapped', days: 30 });
        expect(parseWidget('wrapped 90d')).toEqual({ kind: 'wrapped', days: 90 });
        expect(parseWidget('recap 7')).toEqual({ kind: 'wrapped', days: 7 });
        expect(parseWidget('wrappedd')).toBeNull(); // inexact falls through
    });
});

describe('parseWidget — dossier', () => {
    it('a bare @handle is a dossier summon', () => {
        const p = parseWidget('@gmoney');
        expect(p).toEqual({ kind: 'dossier', name: 'gmoney' });
    });
    it('dossier / who is forms', () => {
        expect(parseWidget('dossier gmoney')).toEqual({ kind: 'dossier', name: 'gmoney' });
        expect(parseWidget('dossier @gmoney')).toEqual({ kind: 'dossier', name: 'gmoney' });
        expect(parseWidget('who is gmoney?')).toEqual({ kind: 'dossier', name: 'gmoney' });
    });
    it('a mid-sentence @ is not a dossier', () => {
        expect(parseWidget('offers @ 0.5')).toBeNull();
    });
});

describe('parseWidget — docs · matrix · calc · gallery', () => {
    it('docs carries the query through', () => {
        expect(parseWidget('docs sticker fees')).toEqual({ kind: 'docs', query: 'sticker fees' });
        expect(parseWidget('docs')).toEqual({ kind: 'docs', query: '' });
    });
    it('matrix splits on vs / commas and caps at three', () => {
        expect(parseWidget('matrix prisms vs fumage')).toEqual({
            kind: 'matrix', names: ['prisms', 'fumage'],
        });
        expect(parseWidget('matrix a, b, c, d')).toEqual({
            kind: 'matrix', names: ['a', 'b', 'c'],
        });
        expect(parseWidget('matrix')).toEqual({ kind: 'matrix', names: [] });
    });
    it('calc resolves a real project + trailing price', () => {
        const p = parseWidget('calc prisms 0.5');
        expect(p?.kind).toBe('calc');
        if (p?.kind === 'calc') {
            expect(p.slug).toBe('prisms');
            expect(p.price).toBe(0.5);
        }
        const bare = parseWidget('calc');
        expect(bare?.kind).toBe('calc');
        if (bare?.kind === 'calc') expect(bare.slug).toBeNull();
    });
    it('gallery resolves a real project; an unresolved name falls through', () => {
        const p = parseWidget('gallery prisms');
        expect(p?.kind).toBe('gallery');
        if (p?.kind === 'gallery') expect(p.slug).toBe('prisms');
        expect(parseWidget('gallery zzzznope')).toBeNull();
        expect(parseWidget('gallery')?.kind).toBe('gallery');
    });
});

describe('parseWidget — glance + trend (stage 5)', () => {
    it('summons the glance', () => {
        expect(parseWidget('brief')?.kind).toBe('glance');
        expect(parseWidget('glance')?.kind).toBe('glance');
        expect(parseWidget('morning')?.kind).toBe('glance');
    });
    it('a project + Nd summons the trend; unresolved names fall through', () => {
        const p = parseWidget('prisms 30d');
        expect(p?.kind).toBe('trend');
        if (p?.kind === 'trend') {
            expect(p.slug).toBe('prisms');
            expect(p.days).toBe(30);
        }
        expect(parseWidget('zzzznope 30d')).toBeNull();
        expect(parseWidget('30d')).toBeNull();
    });
});

describe('expandFollowUp — the stone remembers its subject (stage 5)', () => {
    const PROJ: StoneSubject = { kind: 'project', name: 'PRISMS' };
    const USER: StoneSubject = { kind: 'user', name: '@gmoney' };
    it('bare answer words ride the project subject', () => {
        expect(expandFollowUp('ath', PROJ)).toBe('PRISMS ath');
        expect(expandFollowUp('floor?', PROJ)).toBe('PRISMS floor');
        expect(expandFollowUp('volume', PROJ)).toBe('PRISMS volume');
        expect(expandFollowUp('who holds 7', PROJ)).toBe('who holds PRISMS 7');
        expect(expandFollowUp('holds 7', PROJ)).toBe('who holds PRISMS 7');
    });
    it('bare summons ride the project subject too', () => {
        expect(expandFollowUp('calc 0.5', PROJ)).toBe('calc PRISMS 0.5');
        expect(expandFollowUp('calc', PROJ)).toBe('calc PRISMS');
        expect(expandFollowUp('gallery', PROJ)).toBe('gallery PRISMS');
        expect(expandFollowUp('30d', PROJ)).toBe('PRISMS 30d');
    });
    it('user words ride the user subject', () => {
        expect(expandFollowUp('spent', USER)).toBe('@gmoney spent');
        expect(expandFollowUp('followers?', USER)).toBe('@gmoney followers');
        expect(expandFollowUp('floor', USER)).toBeNull(); // project word, user subject
    });
    it('never expands a line that stands on its own', () => {
        expect(expandFollowUp('fumage floor', PROJ)).toBeNull();
        expect(expandFollowUp('todo: buy prisms', PROJ)).toBeNull();
        expect(expandFollowUp('ath', null)).toBeNull();
        expect(expandFollowUp('', PROJ)).toBeNull();
    });
});

describe('buildWalletMark — deterministic wallet ascii', () => {
    const A = '0x65c3000000000000000000000000000000009395';
    const B = '0x1460000000000000000000000000000000004242';
    it('same wallet → the same mark, every time (case-insensitive)', () => {
        const one = buildWalletMark(A);
        const two = buildWalletMark(A.toUpperCase());
        expect(one.lines).toEqual(two.lines);
        expect(one.hue).toBe(two.hue);
    });
    it('different wallets → different marks', () => {
        expect(buildWalletMark(A).lines.join('\n')).not.toBe(buildWalletMark(B).lines.join('\n'));
    });
    it('holds its stated geometry and draws real ink', () => {
        const m = buildWalletMark(A);
        expect(m.lines).toHaveLength(MARK_ROWS);
        for (const line of m.lines) expect(line).toHaveLength(MARK_COLS);
        expect(m.lines.join('').trim().length).toBeGreaterThan(50);
        expect(m.hue).toBeGreaterThanOrEqual(0);
        expect(m.hue).toBeLessThan(360);
    });
});

describe('searchAtlas — Spotlight for PriceOS (2026-07-28)', () => {
    it('matches feature names, starts-with first, 3+ chars only', async () => {
        const { searchAtlas } = await import('../lib/docs/features');
        expect(searchAtlas('grid presets')[0]?.name).toBe('Grid presets');
        expect(searchAtlas('stargazing')[0]?.name).toBe('Stargazing');
        expect(searchAtlas('gr')).toHaveLength(0);
        expect(searchAtlas('zzzznothing')).toHaveLength(0);
        expect(searchAtlas('the').length).toBeLessThanOrEqual(6);
    });
});
