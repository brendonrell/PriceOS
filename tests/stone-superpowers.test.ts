/*
 * The superpower + fun waves (2026-07-28): compound sentences, saying-it-
 * arms-it, bulk etches, sight questions, prophecy, recall, and the fun
 * bench. All pure parses — the summon discipline throughout.
 */

import { describe, expect, it } from 'vitest';
import { parseWidget } from '../lib/stone/widgets';
import { parseEtch } from '../lib/stone/etch';
import { matchCast } from '../lib/stone/cast';
import { recallSubject, type SubjectMemo } from '../lib/stone/subjects';
import { loreAnswer, eightballVerdict } from '../lib/stone/voice';

const NOW = new Date(2026, 6, 28, 15, 30); // Tuesday

describe('compound sentences', () => {
    it('composes rank with ownership', () => {
        expect(parseWidget('top 5 spenders who hold teletext', NOW)).toMatchObject({
            kind: 'rank', cohort: 'spenders', n: 5, holding: { slug: 'teletext' },
        });
        expect(parseWidget('top 10 mutuals who hold carnivale', NOW)).toMatchObject({
            kind: 'rank', cohort: 'mutuals', holding: { slug: 'carnivale' },
        });
        /* unresolved holding → search, never a guess */
        expect(parseWidget('top 5 spenders who hold nonsuch', NOW)).toBeNull();
    });
    it('slices holdings by the mutual circle', () => {
        expect(parseWidget('carnivale owned by mutuals', NOW)).toMatchObject({
            kind: 'cohort', slug: 'carnivale', source: 'mutuals',
        });
        expect(parseWidget('all teletext held by my mutuals', NOW)).toMatchObject({
            kind: 'cohort', source: 'mutuals',
        });
    });
});

describe('sight questions + prophecy', () => {
    it('parses "why is this rare" open (the vessel fills the piece)', () => {
        expect(parseWidget('why is this rare', NOW)).toEqual({ kind: 'why', slug: null, title: null, id: null });
        expect(parseWidget('why is teletext 7 rare', NOW)).toMatchObject({ kind: 'why', slug: 'teletext', id: 7 });
    });
    it('parses the price verdict', () => {
        expect(parseWidget('good price?', NOW)).toEqual({ kind: 'verdict', slug: null, title: null });
        expect(parseWidget('is teletext a good price', NOW)).toMatchObject({ kind: 'verdict', slug: 'teletext' });
    });
    it('parses prophecy', () => {
        expect(parseWidget('when will teletext sell out', NOW)).toMatchObject({ kind: 'prophecy', slug: 'teletext' });
        expect(parseWidget('teletext pace', NOW)).toMatchObject({ kind: 'prophecy', slug: 'teletext' });
    });
});

describe('saying it arms it + bulk etches', () => {
    it('compiles a sentinel sentence to a ◊-target to-do', () => {
        const p = parseEtch('tell me when teletext drops under 0.2');
        expect(p).toMatchObject({ kind: 'todo-raw', input: { text: 'watch teletext', priceEth: 0.2 } });
        expect(p?.chip).toContain('SENTINEL');
    });
    it('compiles "ping me in 3 days about the mint" to a dated to-do', () => {
        const p = parseEtch('ping me in 3 days about the mint');
        expect(p?.kind).toBe('todo-raw');
        if (p?.kind === 'todo-raw') {
            expect(p.input.text).toBe('the mint');
            expect(p.input.due).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
    });
    it('parses the bulk plans', () => {
        expect(parseEtch('wishlist the 3 rarest teletext')).toMatchObject({
            kind: 'wishlist-bulk', slug: 'teletext', n: 3,
        });
        expect(parseEtch('anchor everything i hold at floor')?.kind).toBe('anchor-bulk');
    });
    it('a dateless reminder never half-fires', () => {
        expect(parseEtch('remind me to breathe')).toBeNull();
    });
});

describe('recall — the long memory', () => {
    const H: SubjectMemo[] = [
        { kind: 'project', name: 'Carnivale', ts: NOW.getTime() - 1 * 3_600_000 },        // today (Tue)
        { kind: 'user', name: '@gmoney', ts: NOW.getTime() - 26 * 3_600_000 },            // yesterday (Mon)
        { kind: 'project', name: 'Teletext', ts: NOW.getTime() - 26 * 3_600_000 },        // Monday
    ];
    it('resolves "last project" and weekday recalls', () => {
        expect(recallSubject('last project', H, NOW)).toBe('Carnivale');
        expect(recallSubject('that project from monday', H, NOW)).toBe('Teletext');
        expect(recallSubject('that collector from yesterday', H, NOW)).toBe('@gmoney');
    });
    it('returns null when nothing matches', () => {
        expect(recallSubject('that project from friday', H, NOW)).toBeNull();
        expect(recallSubject('teletext floor', H, NOW)).toBeNull();
    });
});

describe('the fun wave', () => {
    it('parses the whole bench', () => {
        expect(parseWidget('roast me', NOW)?.kind).toBe('roast');
        expect(parseWidget('should i buy', NOW)).toMatchObject({ kind: 'eightball' });
        expect(parseWidget('should i buy teletext', NOW)).toMatchObject({ kind: 'eightball', topic: 'teletext' });
        expect(parseWidget('my horoscope', NOW)?.kind).toBe('fortune');
        expect(parseWidget('play me something', NOW)?.kind).toBe('dj');
        expect(parseWidget('who are you', NOW)).toMatchObject({ kind: 'lore', q: 'who are you' });
        expect(parseWidget('the floor is right', NOW)?.kind).toBe('floorgame');
    });
    it('the 8-ball and lore are deterministic per seed', () => {
        expect(eightballVerdict('a·b·c')).toBe(eightballVerdict('a·b·c'));
        expect(loreAnswer('who are you', 'd1')).toBe(loreAnswer('who are you', 'd1'));
    });
    it('cozy mood is castable by all its names (now via the moods registry)', () => {
        for (const w of ['mood', 'cozy', 'cozy mood']) {
            const hit = matchCast(w, []);
            expect(hit?.kind).toBe('mood');
            if (hit?.kind === 'mood') expect(hit.mood.key).toBe('cozy');
        }
    });
    it('bare `moods` deals the set as a widget', () => {
        expect(parseWidget('moods', NOW)?.kind).toBe('moods');
        expect(parseWidget('the moods', NOW)?.kind).toBe('moods');
        /* the singular words stay CASTS, never the widget */
        expect(parseWidget('moods extra words', NOW)).toBeNull();
    });
    it('the joke summons by every phrase and the bank never repeats until dry', async () => {
        expect(parseWidget('tell me a joke', NOW)?.kind).toBe('joke');
        expect(parseWidget('tell a joke', NOW)?.kind).toBe('joke');
        expect(parseWidget('joke', NOW)?.kind).toBe('joke');
        const { JOKES, pickJoke } = await import('../lib/stone/voice');
        const told = new Set<number>();
        for (let n = 0; n < JOKES.length; n++) {
            const p = pickJoke(told, `joke·${told.size}`);
            expect(p.exhausted).toBe(false);
            expect(told.has(p.i)).toBe(false);
            told.add(p.i);
        }
        expect(pickJoke(told, 'joke·full').exhausted).toBe(true);
    });
    it('coin cards summon by $symbol and extra words', () => {
        expect(parseWidget('$price', NOW)).toMatchObject({ kind: 'token', symbol: 'PRICE' });
        expect(parseWidget('price token', NOW)).toMatchObject({ kind: 'token', symbol: 'PRICE' });
        expect(parseWidget('$eth', NOW)).toMatchObject({ kind: 'token', symbol: 'ETH' });
        expect(parseWidget('$fwa', NOW)).toMatchObject({ kind: 'token', symbol: 'FWA' });
        expect(parseWidget('$doge', NOW)).toBeNull(); // unregistered → search
    });
    it('bare feature topics open the manual pre-queried', () => {
        expect(parseWidget('gnomes', NOW)).toMatchObject({ kind: 'docs', query: 'gnomes' });
        expect(parseWidget('keychains', NOW)).toMatchObject({ kind: 'docs', query: 'keychains' });
        expect(parseWidget('stickers', NOW)).toMatchObject({ kind: 'docs', query: 'stickers' });
    });
});

describe('the world — the stone knows its ecosystem (2026-07-28)', () => {
    it('answers PD identity with the channel FIRST, then the platform', async () => {
        const { WORLD, matchWorld, worldAnswer } = await import('../lib/stone/world');
        for (const w of ['what is price discussion', 'what is pd', 'price discussion',
            'what does price discussion mean to you']) {
            expect(matchWorld(w)?.key).toBe('pd');
        }
        const pd = WORLD.find((e) => e.key === 'pd')!;
        /* EVERY variant must lead with the channel and land on the platform —
           Brendon's order: the origin first, the platform second. */
        for (const ans of pd.answers) {
            const whole = ans.join(' ').toLowerCase();
            const first = ans[0]!.toLowerCase();
            expect(first).toContain('channel');
            expect(whole).toContain('fxhash');
            expect(whole).toMatch(/platform|discord/);
        }
        expect(worldAnswer(pd, 'seed')).toBe(worldAnswer(pd, 'seed'));
    });
    it('summons the platform knowledge and the house takes', async () => {
        const { matchWorld } = await import('../lib/stone/world');
        expect(matchWorld('art blocks')?.key).toBe('artblocks');
        expect(matchWorld('fxhash')?.key).toBe('fxhash');
        expect(matchWorld('larva labs')?.key).toBe('larvalabs');
        expect(matchWorld('cryptopunks')?.key).toBe('cryptopunks');
        expect(matchWorld('autoglyphs')?.key).toBe('autoglyphs');
        expect(matchWorld('meebits')?.key).toBe('meebits');
        expect(matchWorld('verse')?.key).toBe('verse');
        expect(matchWorld('heft')?.key).toBe('heft');
        expect(matchWorld('something else entirely')).toBeNull();
        expect(parseWidget('art blocks', NOW)).toMatchObject({ kind: 'world', topic: 'artblocks' });
    });
    it('the Verse bit never reads as a real knowledge gap', async () => {
        const { WORLD } = await import('../lib/stone/world');
        const verse = WORLD.find((e) => e.key === 'verse')!;
        /* Every variant must undercut itself — the joke only works if the
           stone insists it knows everything else. */
        for (const ans of verse.answers) {
            expect(ans.length).toBeGreaterThan(1);
            expect(ans.join(' ').toLowerCase()).toMatch(/every|complete|never fail|everything|remarkable/);
        }
    });
});

describe('the @ law — an @ in the stone ALWAYS means a PD username', () => {
    it('never puts an @ on an outside name (Brendon, 2026-07-28)', async () => {
        const { WORLD } = await import('../lib/stone/world');
        /* world.ts is entirely about people and places OUTSIDE PD, so no
           @ belongs anywhere in it — ajberni, punevyr, Snowfro and the
           rest are named plainly. */
        for (const e of WORLD) {
            for (const ans of e.answers) {
                expect(ans.join(' ')).not.toContain('@');
            }
        }
    });
    it('tells Tender straight: the history, then the sentiment', async () => {
        const { WORLD, matchWorld } = await import('../lib/stone/world');
        expect(matchWorld('tender')?.key).toBe('tender');
        const t = WORLD.find((e) => e.key === 'tender')!;
        expect(t.answers.some((a) => a.join(' ').includes('ajberni'))).toBe(true);
        expect(t.answers.some((a) => /R\.I\.P\.|could have been|should have worked/.test(a.join(' ')))).toBe(true);
    });
});
