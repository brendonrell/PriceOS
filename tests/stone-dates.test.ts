/*
 * The Command Stone's natural-language date reader (lib/stone/dates) +
 * the abilities-pass summon grammar riding it (lib/stone/widgets).
 * Pure and clock-injectable: every case pins `now`.
 */

import { describe, expect, it } from 'vitest';
import { parseStoneDate, formatStoneDate, formatDaysAway, todoPhrase } from '../lib/stone/dates';
import { parseWidget } from '../lib/stone/widgets';

/* Tuesday, 2026-07-28 — the day the ability shipped. */
const NOW = new Date(2026, 6, 28, 15, 30);

describe('parseStoneDate', () => {
    it('reads "tomorrow"', () => {
        const d = parseStoneDate('tomorrow', NOW);
        expect(d).toMatchObject({ y: 2026, m: 6, d: 29, daysAway: 1 });
    });
    it('reads "in 18 days"', () => {
        const d = parseStoneDate('in 18 days', NOW);
        expect(d).toMatchObject({ y: 2026, m: 7, d: 15, daysAway: 18 });
    });
    it('reads "in a week" and "in 2 months"', () => {
        expect(parseStoneDate('in a week', NOW)).toMatchObject({ m: 7, d: 4, daysAway: 7 });
        expect(parseStoneDate('in 2 months', NOW)).toMatchObject({ y: 2026, m: 8, d: 28 });
    });
    it('reads "next week" / "next month"', () => {
        expect(parseStoneDate('next week', NOW)).toMatchObject({ m: 7, d: 4 });
        expect(parseStoneDate('next month', NOW)).toMatchObject({ m: 7, d: 28 });
    });
    it('reads "next friday" as the coming friday, never today', () => {
        expect(parseStoneDate('next friday', NOW)).toMatchObject({ m: 6, d: 31, daysAway: 3 });
        /* "next tuesday" on a Tuesday rolls a full week */
        expect(parseStoneDate('next tuesday', NOW)).toMatchObject({ m: 7, d: 4, daysAway: 7 });
    });
    it('reads "next week tuesday" as NEXT week\'s tuesday (Sunday-start weeks)', () => {
        expect(parseStoneDate('next week tuesday', NOW)).toMatchObject({ m: 7, d: 4 });
        expect(parseStoneDate('tuesday next week', NOW)).toMatchObject({ m: 7, d: 4 });
        /* distinct from "next tuesday" only when the days differ — friday: */
        expect(parseStoneDate('next week friday', NOW)).toMatchObject({ m: 7, d: 7 });
    });
    it('reads month-day forms, rolling past dates a year', () => {
        expect(parseStoneDate('aug 30', NOW)).toMatchObject({ y: 2026, m: 7, d: 30 });
        expect(parseStoneDate('30 aug', NOW)).toMatchObject({ y: 2026, m: 7, d: 30 });
        expect(parseStoneDate('january 5', NOW)).toMatchObject({ y: 2027, m: 0, d: 5 });
    });
    it('never guesses — bare weekdays and non-dates fall through', () => {
        expect(parseStoneDate('friday', NOW)).toBeNull();     // could be a name
        expect(parseStoneDate('prisms', NOW)).toBeNull();
        expect(parseStoneDate('in 0 days', NOW)).toBeNull();
        expect(parseStoneDate('feb 31', NOW)).toBeNull();
        expect(parseStoneDate('', NOW)).toBeNull();
    });
    it('formats the readouts', () => {
        const d = parseStoneDate('in 18 days', NOW)!;
        expect(formatStoneDate(d)).toBe('SAT · AUG 15');
        expect(formatDaysAway(d.daysAway)).toBe('IN 18 DAYS');
        expect(formatDaysAway(1)).toBe('TOMORROW');
        expect(todoPhrase(d)).toBe('aug 15');
    });
});

describe('parseWidget — the abilities pass', () => {
    it('summons THE DAY on a date phrase', () => {
        expect(parseWidget('tomorrow', NOW)).toMatchObject({ kind: 'date' });
        expect(parseWidget('next week tuesday', NOW)).toMatchObject({ kind: 'date' });
        expect(parseWidget('in 18 days', NOW)).toMatchObject({ kind: 'date' });
    });
    it('summons FIRST MINT — the platform\'s vs yours', () => {
        expect(parseWidget('first ever mint', NOW)).toEqual({ kind: 'firstmint', mine: false });
        expect(parseWidget('first mint', NOW)).toEqual({ kind: 'firstmint', mine: false });
        expect(parseWidget('my first ever mint', NOW)).toEqual({ kind: 'firstmint', mine: true });
    });
    it('summons RELEASE on a resolvable project', () => {
        expect(parseWidget('teletext release date', NOW)).toMatchObject({ kind: 'release', slug: 'teletext' });
        expect(parseWidget('when did teletext launch', NOW)).toMatchObject({ kind: 'release', slug: 'teletext' });
        /* unresolved name falls through to search */
        expect(parseWidget('nonsuch release date', NOW)).toBeNull();
    });
    it('summons the SPENDERS standings', () => {
        expect(parseWidget('highest spenders on the platform top 15', NOW))
            .toEqual({ kind: 'rank', cohort: 'spenders', by: 'spent', n: 15, holding: null });
        expect(parseWidget('top 15 spenders', NOW))
            .toEqual({ kind: 'rank', cohort: 'spenders', by: 'spent', n: 15, holding: null });
        expect(parseWidget('biggest spenders', NOW))
            .toEqual({ kind: 'rank', cohort: 'spenders', by: 'spent', n: 10, holding: null });
    });
    it('summons MUTUALS / FOLLOWERS standings with a named metric', () => {
        expect(parseWidget('top 20 mutuals by volume spent', NOW))
            .toEqual({ kind: 'rank', cohort: 'mutuals', by: 'spent', n: 20, holding: null });
        expect(parseWidget('top 50 followers by wallet age', NOW))
            .toEqual({ kind: 'rank', cohort: 'followers', by: 'age', n: 50, holding: null });
        expect(parseWidget('top mutuals', NOW))
            .toEqual({ kind: 'rank', cohort: 'mutuals', by: 'spent', n: 10, holding: null });
        /* an unknown metric never guesses */
        expect(parseWidget('top 10 mutuals by vibes', NOW)).toBeNull();
    });
    it('summons THE OVERLAP on a project × a real Profile Tag', () => {
        expect(parseWidget('all carnivale owned by podcasters', NOW))
            .toMatchObject({ kind: 'cohort', slug: 'carnivale', tag: 'podcaster' });
        expect(parseWidget('carnivale held by collectors', NOW))
            .toMatchObject({ kind: 'cohort', slug: 'carnivale', tag: 'collector' });
        /* not a real tag → falls through to search */
        expect(parseWidget('all carnivale owned by wizards', NOW)).toBeNull();
    });
    it('leaves the neighbours alone — convert and trend still win their lines', () => {
        expect(parseWidget('0.05 eth to cad', NOW)?.kind).toBe('convert');
        expect(parseWidget('3*67', NOW)?.kind).toBe('math');
        expect(parseWidget('teletext 30d', NOW)?.kind).toBe('trend');
    });
});
