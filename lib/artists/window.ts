/*
 * THE UPLOAD WINDOW — how long until an artist can upload again.
 *
 * The 60-day cooldown starts at upload, so `projects.cooldown_until` is the
 * moment the artist's next window opens. Three surfaces show it and they all
 * format it here, so they can never disagree (Brendon, 2026-07-29): the home
 * news rail, the Studio dashboard, and the bottom of an artist's Created tab.
 *
 * Pure + client-safe — the live tickers just call this on a timer.
 */

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/**
 * "12d 4h 33m 12s" from a remaining duration. Leading zero units are dropped,
 * so a countdown under an hour reads "33m 12s" rather than "0d 0h 33m 12s".
 *
 * `coarse` keeps only the two largest units — what the news rail wants, since
 * a ticking seconds figure there would restart the marquee on every frame.
 */
export function formatWindowRemaining(msRemaining: number, coarse = false): string {
    const ms = Math.max(0, msRemaining);
    const parts: string[] = [];
    const d = Math.floor(ms / DAY);
    const h = Math.floor((ms % DAY) / HOUR);
    const m = Math.floor((ms % HOUR) / MIN);
    const s = Math.floor((ms % MIN) / SEC);
    if (d > 0) parts.push(`${d}d`);
    if (d > 0 || h > 0) parts.push(`${h}h`);
    if (d > 0 || h > 0 || m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    // Never return an empty string: at zero the last push leaves "0s".
    return (coarse ? parts.slice(0, 2) : parts).join(' ');
}

/** True while the window is still shut. */
export function windowClosed(opensAtMs: number | null | undefined, now = Date.now()): boolean {
    return opensAtMs != null && opensAtMs > now;
}
