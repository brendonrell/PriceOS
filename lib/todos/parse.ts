/*
 * Magic quick-add parser — turns natural language into a structured to-do.
 *
 *   "buy prisms 22 under .4 fri"  →  output BUY prisms#22, target ◊0.4, due Fri
 *   "renew ens every month p1"    →  raw "renew ens", monthly, P1
 *   "check floors #watchlist mon" →  raw "check floors", label watchlist, due Mon
 *
 * Best-effort + non-destructive: anything it can't classify stays in the title.
 * Explicit composer controls (a picked date / typed price / priority) override
 * whatever the text implied — merged by the caller.
 */

import { getProject } from '../project/registry';
import type { TodoPriority, TodoRecurrence, TodoVerb } from './types';

export interface ParsedTodo {
    text: string;
    due: string | null;
    /** Time-of-day as 'HH:MM' (24h), parsed from "3pm" / "3:30 pm" / "15:30". */
    dueTime: string | null;
    priceEth: number | null;
    priority: TodoPriority;
    labels: string[];
    recurrence: TodoRecurrence | null;
    output: { slug: string; tokenId: number; verb: TodoVerb } | null;
}

const VERBS: TodoVerb[] = ['BUY', 'OFFER', 'LIST', 'DELIST', 'SEND'];
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WEEKDAY_ABBR = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function iso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
}

/** Next date (>= today) whose weekday matches `dow` (0=Sun). */
function nextWeekday(from: Date, dow: number): Date {
    const d = new Date(from);
    const delta = (dow - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + (delta === 0 ? 7 : delta)); // "friday" = the coming Friday, not today
    return d;
}

export function parseTodo(raw: string): ParsedTodo {
    let s = ` ${raw.trim()} `;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const labels: string[] = [];
    let priority: TodoPriority = 0;
    let priceEth: number | null = null;
    let due: string | null = null;
    let recurrence: TodoRecurrence | null = null;

    // 1. Labels — #tag
    s = s.replace(/#(\w+)/g, (_, tag) => {
        labels.push(String(tag).toLowerCase());
        return ' ';
    });

    // 2. Priority — p1..p3 or trailing bangs
    s = s.replace(/\bp([1-3])\b/i, (_, n) => {
        priority = Number(n) as TodoPriority;
        return ' ';
    });
    if (priority === 0) {
        const bang = /(!{1,3})/.exec(s);
        if (bang) {
            priority = (4 - bang[1].length) as TodoPriority; // !!! = P1, !! = P2, ! = P3
            s = s.replace(/!{1,3}/, ' ');
        }
    }

    // 3. Recurrence — "every day/week/month" · "daily/weekly/monthly" · "every <weekday>"
    const everyWd = new RegExp(`\\bevery\\s+(${WEEKDAYS.join('|')}|${WEEKDAY_ABBR.join('|')})\\b`, 'i').exec(s);
    if (everyWd) {
        recurrence = 'weekly';
        const name = everyWd[1].toLowerCase();
        const dow = WEEKDAYS.indexOf(name) >= 0 ? WEEKDAYS.indexOf(name) : WEEKDAY_ABBR.indexOf(name);
        if (dow >= 0) due = iso(nextWeekday(now, dow));
        s = s.replace(everyWd[0], ' ');
    } else if (/\b(every\s+day|daily)\b/i.test(s)) {
        recurrence = 'daily';
        s = s.replace(/\b(every\s+day|daily)\b/i, ' ');
    } else if (/\b(every\s+week|weekly)\b/i.test(s)) {
        recurrence = 'weekly';
        s = s.replace(/\b(every\s+week|weekly)\b/i, ' ');
    } else if (/\b(every\s+month|monthly)\b/i.test(s)) {
        recurrence = 'monthly';
        s = s.replace(/\b(every\s+month|monthly)\b/i, ' ');
    }

    // 4. Price — qualified ("under .4", "@0.4", "◊0.4") or a bare decimal ("0.4 eth")
    /* `\.\d+` alternative: "under .4" (the header's own example) — the old
       \d+-first pattern silently missed bare-dot decimals (caught 2026-07-20
       by the time-parse tests). */
    const qualified = /(?:under|below|max|@|≤|<=|<|◊|Ξ)\s*(\d+(?:\.\d+)?|\.\d+)\s*(?:eth|Ξ|◊)?/i.exec(s);
    if (qualified) {
        priceEth = parseFloat(qualified[1]);
        s = s.replace(qualified[0], ' ');
    } else {
        const decimal = /\b(\d+\.\d+)\s*(?:eth|Ξ|◊)?\b/i.exec(s);
        if (decimal) {
            priceEth = parseFloat(decimal[1]);
            s = s.replace(decimal[0], ' ');
        }
    }
    if (priceEth != null && !(priceEth > 0)) priceEth = null;

    // 5. Time-of-day — "3pm" / "3 pm" / "3:30pm" / "at 3pm" / 24h "15:30".
    //    Runs before the date pass so the hour digits never get eaten by the
    //    M/D or output-id captures. am/pm forms win over the bare 24h form.
    let dueTime: string | null = null;
    const ampm = /(?:\bat\s+)?\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*([ap])\.?m\.?(?=[\s,.!]|$)/i.exec(s);
    if (ampm) {
        let h = Number(ampm[1]) % 12;
        if (ampm[3].toLowerCase() === 'p') h += 12;
        dueTime = `${String(h).padStart(2, '0')}:${ampm[2] ?? '00'}`;
        s = s.replace(ampm[0], ' ');
    } else {
        const h24 = /(?:\bat\s+)?\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(s);
        if (h24) {
            dueTime = `${String(Number(h24[1])).padStart(2, '0')}:${h24[2]}`;
            s = s.replace(h24[0], ' ');
        }
    }

    // 6. Date (only if a recurrence didn't already set one)
    if (!due) {
        if (/\btoday\b/i.test(s)) {
            due = iso(now);
            s = s.replace(/\btoday\b/i, ' ');
        } else if (/\b(tomorrow|tmrw|tmr)\b/i.test(s)) {
            const d = new Date(now);
            d.setDate(d.getDate() + 1);
            due = iso(d);
            s = s.replace(/\b(tomorrow|tmrw|tmr)\b/i, ' ');
        } else if (/\bnext\s+week\b/i.test(s)) {
            const d = new Date(now);
            d.setDate(d.getDate() + 7);
            due = iso(d);
            s = s.replace(/\bnext\s+week\b/i, ' ');
        } else {
            // "sep 22" / "22 sep"
            const monDay = new RegExp(`\\b(${MONTHS.join('|')})[a-z]*\\.?\\s+(\\d{1,2})\\b`, 'i').exec(s);
            const dayMon = new RegExp(`\\b(\\d{1,2})\\s+(${MONTHS.join('|')})[a-z]*\\b`, 'i').exec(s);
            const numeric = /\b(\d{1,2})\/(\d{1,2})\b/.exec(s); // M/D
            if (monDay) {
                const mo = MONTHS.indexOf(monDay[1].toLowerCase().slice(0, 3));
                due = dateForMonthDay(now, mo, Number(monDay[2]));
                s = s.replace(monDay[0], ' ');
            } else if (dayMon) {
                const mo = MONTHS.indexOf(dayMon[2].toLowerCase().slice(0, 3));
                due = dateForMonthDay(now, mo, Number(dayMon[1]));
                s = s.replace(dayMon[0], ' ');
            } else if (numeric) {
                due = dateForMonthDay(now, Number(numeric[1]) - 1, Number(numeric[2]));
                s = s.replace(numeric[0], ' ');
            } else {
                // bare weekday → the coming one
                const wd = new RegExp(`\\b(${WEEKDAYS.join('|')}|${WEEKDAY_ABBR.join('|')})\\b`, 'i').exec(s);
                if (wd) {
                    const name = wd[1].toLowerCase();
                    const dow = WEEKDAYS.indexOf(name) >= 0 ? WEEKDAYS.indexOf(name) : WEEKDAY_ABBR.indexOf(name);
                    if (dow >= 0) {
                        due = iso(nextWeekday(now, dow));
                        s = s.replace(wd[0], ' ');
                    }
                }
            }
        }
    }

    // A bare time with no date means TODAY — "call bank 3pm" is today's 3pm.
    if (dueTime && !due) due = iso(now);

    // 7. verb + project + id → an output to-do
    let output: ParsedTodo['output'] = null;
    const verbM = new RegExp(`\\b(${VERBS.join('|')})\\b`, 'i').exec(s);
    if (verbM) {
        const verb = verbM[1].toUpperCase() as TodoVerb;
        // remaining word tokens (drop pure numbers) → try each as a project slug
        const words = s.replace(new RegExp(`\\b${verbM[1]}\\b`, 'i'), ' ').match(/[a-z][a-z0-9-]{1,}/gi) ?? [];
        let slug: string | null = null;
        for (const w of words) {
            if (getProject(w.toLowerCase())) { slug = w.toLowerCase(); break; }
        }
        const idM = /\b(\d{1,6})\b/.exec(s);
        if (slug && idM) {
            output = { slug, tokenId: Number(idM[1]), verb };
        }
    }

    const text = s.replace(/\s+/g, ' ').trim();
    return { text, due, dueTime, priceEth, priority, labels, recurrence, output };
}

/** Resolve a month(0-11)+day to the next such date at-or-after today (rolls to
 *  next year if it already passed this year). */
function dateForMonthDay(now: Date, month: number, day: number): string {
    if (month < 0 || month > 11 || day < 1 || day > 31) return iso(now);
    let y = now.getFullYear();
    let d = new Date(y, month, day);
    if (d.getTime() < now.getTime()) {
        y += 1;
        d = new Date(y, month, day);
    }
    return iso(d);
}
