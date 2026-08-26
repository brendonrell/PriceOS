/*
 * formatFeedUploadDate — "JUN 11 ’26": the home feed's compact date stamp
 * WITH year (Brendon, 2026-07-13 origin, on the New Uploads feed; pulled out
 * here 2026-08-26 so New Signups reuses the exact same formatter instead of
 * a second one drifting out of sync). Viewer-local — the date tracks the
 * same zone as the time shown beside it.
 */
export function formatFeedUploadDate(ms: number | null): string {
    if (ms == null) return '—';
    const d = new Date(ms);
    const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = String(d.getDate()).padStart(2, '0');
    return `${mon} ${day} ’${String(d.getFullYear()).slice(-2)}`;
}
