/*
 * Quiet Hours — the Silent Mode pill's second stage (Brendon, 2026-07-20).
 *
 * The ⏾ pill cycles OFF → ON → QUIET HOURS → OFF (the Pingtoasts-cycle
 * grammar). QUIET HOURS silences NATIVE push inside a user-set local-time
 * window; in-app pings and toasts still land (per the brief — only the
 * lock-screen push sleeps). Full Silent Mode (ON) keeps its existing
 * everything-quiet behaviour.
 *
 * Pure + server-safe: the schedule rides the notifs settings bag
 * (users.settings.notifs.quietHours) so the push sender reads the same
 * shape this file types. Times are the USER's local wall clock; the IANA
 * zone is captured when the window is set and the server evaluates "is it
 * quiet there right now" against that zone.
 */

export interface QuietHours {
    /** The pill sits on the QUIET HOURS stage. */
    on: boolean;
    /** Window start, 'HH:MM' 24h, user-local. */
    start: string;
    /** Window end, 'HH:MM' 24h, user-local. May wrap past midnight. */
    end: string;
    /** IANA zone captured when the window was set (e.g. 'America/Montreal'). */
    tz: string;
}

export const QUIET_DEFAULT_START = '22:00';
export const QUIET_DEFAULT_END = '08:00';

/**
 * Parse one clock time the way the quick-add parser does — "10pm" /
 * "10:30 pm" / "22:00" / bare "22" — to 'HH:MM' 24h, or null.
 */
export function parseClockTime(raw: string): string | null {
    const s = ` ${String(raw ?? '').trim()} `;
    const ampm = /\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*([ap])\.?m\.?(?=[\s,.!]|$)/i.exec(s);
    if (ampm) {
        let h = Number(ampm[1]) % 12;
        if (ampm[3].toLowerCase() === 'p') h += 12;
        return `${String(h).padStart(2, '0')}:${ampm[2] ?? '00'}`;
    }
    const h24 = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(s);
    if (h24) return `${String(Number(h24[1])).padStart(2, '0')}:${h24[2]}`;
    const bare = /^\s*([01]?\d|2[0-3])\s*$/.exec(raw ?? '');
    if (bare) return `${String(Number(bare[1])).padStart(2, '0')}:00`;
    return null;
}

function toMinutes(hhmm: string): number | null {
    const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm ?? '');
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** The user's current wall-clock minutes-of-day in their captured zone.
 *  Null when the zone can't be resolved — callers FAIL OPEN (deliver):
 *  a broken zone must never silently kill push (the 2026-07-18 lesson). */
export function minutesNowInZone(tz: string, now: Date): number | null {
    try {
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
        }).formatToParts(now);
        const h = Number(parts.find((p) => p.type === 'hour')?.value);
        const min = Number(parts.find((p) => p.type === 'minute')?.value);
        if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
        return (h % 24) * 60 + min;
    } catch {
        return null;
    }
}

/**
 * Is this quiet window active right now? Handles overnight wrap
 * (22:00–08:00). start === end, an unset window, or an unresolvable zone
 * all read NOT quiet (deliver).
 */
export function quietWindowActive(q: QuietHours | null | undefined, now: Date): boolean {
    if (!q || !q.on) return false;
    const start = toMinutes(q.start);
    const end = toMinutes(q.end);
    if (start == null || end == null || start === end) return false;
    const cur = minutesNowInZone(q.tz, now);
    if (cur == null) return false;
    return start < end
        ? cur >= start && cur < end // same-day window
        : cur >= start || cur < end; // wraps midnight
}
