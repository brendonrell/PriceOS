/*
 * DATES — the Command Stone's natural-language date reader (the abilities
 * pass). Type "tomorrow", "next week tuesday", "in 18 days", "next friday",
 * "aug 30" — the stone resolves the day and lays it out (that day's slate,
 * the countdown). Same $0 contract as every hand: deterministic parsing,
 * no model.
 *
 * Pure + testable — `now` is injectable. The summon discipline holds: only
 * EXACT date phrases summon (a bare weekday word stays a search — "friday"
 * alone could be a name; "next friday" cannot). Vocabulary mirrors the
 * to-do parser's own date words (lib/todos/parse — one grammar family, two
 * surfaces), extended with the relative forms the stone speaks.
 */

export interface StoneDate {
    y: number;
    /** 0-11 */
    m: number;
    d: number;
    /** Whole days from `now` (0 = today, 1 = tomorrow). */
    daysAway: number;
    /** The phrase as the stone heard it, for the card's title sub. */
    phrase: string;
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WEEKDAY_ABBR = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const WD_GROUP = [...WEEKDAYS, ...WEEKDAY_ABBR].join('|');
const MON_GROUP = MONTHS.join('|');

function dayIndex(name: string): number {
    const n = name.toLowerCase();
    const full = WEEKDAYS.indexOf(n);
    return full >= 0 ? full : WEEKDAY_ABBR.indexOf(n);
}

/** Next date strictly AFTER `from` whose weekday matches (the to-do
    parser's own rule: "friday" = the coming Friday, never today). */
function nextWeekday(from: Date, dow: number): Date {
    const d = new Date(from);
    const delta = (dow - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + (delta === 0 ? 7 : delta));
    return d;
}

function midnight(d: Date): Date {
    const out = new Date(d);
    out.setHours(0, 0, 0, 0);
    return out;
}

function finish(target: Date, now: Date, phrase: string): StoneDate {
    const t = midnight(target);
    const n = midnight(now);
    return {
        y: t.getFullYear(),
        m: t.getMonth(),
        d: t.getDate(),
        daysAway: Math.round((t.getTime() - n.getTime()) / 86_400_000),
        phrase,
    };
}

/**
 * Read a typed line as a date phrase, or null (the line falls through).
 * Exact-phrase discipline: the whole line must BE the date.
 */
export function parseStoneDate(line: string, now: Date = new Date()): StoneDate | null {
    const q = line.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\?+$/, '');
    if (!q || q.length > 32) return null;
    const base = midnight(now);

    /* tomorrow · day after tomorrow (— "today" stays PriceDay's summon) */
    if (q === 'tomorrow' || q === 'tmrw' || q === 'tmr') {
        const d = new Date(base);
        d.setDate(d.getDate() + 1);
        return finish(d, base, 'tomorrow');
    }
    if (q === 'day after tomorrow' || q === 'overmorrow') {
        const d = new Date(base);
        d.setDate(d.getDate() + 2);
        return finish(d, base, q);
    }

    /* in N days / weeks / months · in a day/week/month */
    const inN = /^in (\d{1,3}|a|an|one) (day|week|month)s?$/.exec(q);
    if (inN) {
        const n = /^\d+$/.test(inN[1]) ? parseInt(inN[1], 10) : 1;
        if (n < 1 || n > 366) return null;
        const d = new Date(base);
        if (inN[2] === 'day') d.setDate(d.getDate() + n);
        else if (inN[2] === 'week') d.setDate(d.getDate() + n * 7);
        else d.setMonth(d.getMonth() + n);
        return finish(d, base, q);
    }

    /* next week · next month (this day, shifted) */
    if (q === 'next week') {
        const d = new Date(base);
        d.setDate(d.getDate() + 7);
        return finish(d, base, q);
    }
    if (q === 'next month') {
        const d = new Date(base);
        d.setMonth(d.getMonth() + 1);
        return finish(d, base, q);
    }

    /* next tuesday · this friday — the coming one (never today) */
    const nextWd = new RegExp(`^(?:next|this) (${WD_GROUP})$`).exec(q);
    if (nextWd) {
        const dow = dayIndex(nextWd[1]);
        if (dow < 0) return null;
        return finish(nextWeekday(base, dow), base, q);
    }

    /* next week tuesday · tuesday next week — that weekday inside the NEXT
       calendar week (weeks start Sunday, the calendar widget's own read) */
    const nextWeekWd =
        new RegExp(`^next week (${WD_GROUP})$`).exec(q) ??
        new RegExp(`^(${WD_GROUP}) next week$`).exec(q);
    if (nextWeekWd) {
        const dow = dayIndex(nextWeekWd[1]);
        if (dow < 0) return null;
        const d = new Date(base);
        d.setDate(d.getDate() - d.getDay() + 7 + dow); // next week's Sunday + dow
        return finish(d, base, q);
    }

    /* aug 30 · august 30 · 30 aug — the next such date (rolls a year) */
    const monDay = new RegExp(`^(${MON_GROUP})[a-z]*\\.? (\\d{1,2})$`).exec(q);
    const dayMon = new RegExp(`^(\\d{1,2}) (${MON_GROUP})[a-z]*$`).exec(q);
    if (monDay || dayMon) {
        const mo = MONTHS.indexOf((monDay ? monDay[1] : dayMon![2]).slice(0, 3));
        const day = parseInt(monDay ? monDay[2] : dayMon![1], 10);
        if (mo < 0 || day < 1 || day > 31) return null;
        let d = new Date(base.getFullYear(), mo, day);
        if (d.getDate() !== day) return null; // "feb 31" never resolves
        if (d.getTime() < base.getTime()) d = new Date(base.getFullYear() + 1, mo, day);
        return finish(d, base, q);
    }

    return null;
}

const DAY_WORDS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
const MONTH_WORDS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;

/** "TUE · AUG 4" — the card's big readout. */
export function formatStoneDate(sd: StoneDate): string {
    const dow = new Date(sd.y, sd.m, sd.d).getDay();
    return `${DAY_WORDS[dow]} · ${MONTH_WORDS[sd.m]} ${sd.d}`;
}

/** "IN 18 DAYS" / "TOMORROW" / "TODAY" — the countdown line. */
export function formatDaysAway(daysAway: number): string {
    if (daysAway <= 0) return 'TODAY';
    if (daysAway === 1) return 'TOMORROW';
    return `IN ${daysAway} DAYS`;
}

/** "aug 4" — the phrase the to-do grammar understands, for the footer's
    etch seed (`todo: … aug 4`). */
export function todoPhrase(sd: StoneDate): string {
    return `${MONTHS[sd.m]} ${sd.d}`;
}
