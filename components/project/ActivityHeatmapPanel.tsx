'use client';

/*
 * ActivityHeatmapPanel — ACTIVITY HEATMAP (Brendon, 2026-08-21). A GitHub-
 * contributions-style grid of the project's whole life: one cell per day,
 * darker = busier (mints + trades combined). Two zoom levels off the one
 * `/api/project/[slug]/activity` feed:
 *   CALENDAR (default) — every day the project has been alive, grouped into
 *     month columns / weekday rows, exactly like the GitHub grid.
 *   HOUR (drill-down)   — tap any day cell to zoom into its 24 hourly bars.
 *     A ZOOM OUT breadcrumb returns to the calendar.
 * Read-only, no writes — same "click a cell → toast the number" pattern as
 * the Disagreement Score / Price Targets cards above it in this panel.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../../lib/state/ToastContext';

interface DayBucket { date: string; mints: number; trades: number; }
interface HourBucket { hour: number; mints: number; trades: number; }
interface DayResponse { level: 'day'; days: DayBucket[]; }
interface HourResponse { level: 'hour'; day: string; hours: HourBucket[]; }

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function total(b: { mints: number; trades: number }): number {
    return b.mints + b.trades;
}

/** 0 (none) through 4 (busiest) — quantized against the set's own max, same
    idea as GitHub's relative-intensity buckets. */
function levelFor(count: number, max: number): number {
    if (count === 0 || max === 0) return 0;
    const pct = count / max;
    if (pct > 0.75) return 4;
    if (pct > 0.5) return 3;
    if (pct > 0.25) return 2;
    return 1;
}

export default function ActivityHeatmapPanel({ slug }: { slug: string }) {
    const { showToast } = useToast();
    const [days, setDays] = useState<DayBucket[] | null>(null);
    const [zoomDay, setZoomDay] = useState<string | null>(null);
    const [hours, setHours] = useState<HourBucket[] | null>(null);
    const [loadingHours, setLoadingHours] = useState(false);

    useEffect(() => {
        let live = true;
        fetch(`/api/project/${slug}/activity?level=day`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: DayResponse | null) => { if (live && d) setDays(d.days); })
            .catch(() => { if (live) setDays([]); });
        return () => { live = false; };
    }, [slug]);

    const openDay = useCallback((date: string) => {
        setZoomDay(date);
        setHours(null);
        setLoadingHours(true);
        fetch(`/api/project/${slug}/activity?level=hour&day=${date}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: HourResponse | null) => { if (d) setHours(d.hours); })
            .catch(() => setHours([]))
            .finally(() => setLoadingHours(false));
    }, [slug]);

    const zoomOut = useCallback(() => {
        setZoomDay(null);
        setHours(null);
    }, []);

    // Calendar grid: weeks as columns, Sun-Sat as rows, oldest → newest.
    // Extends through the END of the month containing the most recent real
    // activity (usually the current month) rather than stopping mid-week at
    // whatever day data happens to end — Brendon, 2026-09-06: "show the full
    // month... grey out the days in the future" instead of just cutting off.
    // Days strictly before launch (the leading partial week backed up to
    // Sunday) render fully blank — same as the trailing week-completion pad
    // — instead of a fake zero-activity cell, since the project didn't exist
    // yet. Days strictly after today render as a distinct FUTURE cell:
    // visible (so the month reads as complete) but dashed/inert, matching
    // the app's existing dashed-border = "pending, not yet filled" language
    // (the Grid Preset idle-slot convention, app/globals.css .pill-artist-
    // filter). Real past/present days keep the normal 0–4 intensity levels.
    const grid = useMemo(() => {
        if (!days || days.length === 0) return null;
        const byDate = new Map(days.map((d) => [d.date, d]));
        const first = new Date(`${days[0].date}T00:00:00Z`);
        const lastData = new Date(`${days[days.length - 1].date}T00:00:00Z`);
        // Complete the calendar month that the most recent activity falls in.
        const monthEnd = new Date(Date.UTC(lastData.getUTCFullYear(), lastData.getUTCMonth() + 1, 0));
        const start = new Date(first);
        start.setUTCDate(start.getUTCDate() - start.getUTCDay()); // back up to Sunday

        const todayKey = new Date().toISOString().slice(0, 10);
        const firstKey = days[0].date;

        const weeks: ({ date: string; mints: number; trades: number; kind: 'real' | 'blank' | 'future' })[][] = [];
        let cursor = new Date(start);
        let week: (typeof weeks)[number] = [];
        const monthLabels: { weekIndex: number; label: string }[] = [];
        let lastMonth = -1;

        while (cursor <= monthEnd || week.length > 0) {
            if (cursor > monthEnd && week.length === 0) break;
            const key = cursor.toISOString().slice(0, 10);
            if (cursor.getUTCDay() === 0 && week.length === 0) {
                const m = cursor.getUTCMonth();
                if (m !== lastMonth) {
                    monthLabels.push({ weekIndex: weeks.length, label: MONTH_NAMES[m] });
                    lastMonth = m;
                }
            }
            if (cursor <= monthEnd) {
                if (key < firstKey) {
                    week.push({ date: key, mints: 0, trades: 0, kind: 'blank' });
                } else if (key > todayKey) {
                    week.push({ date: key, mints: 0, trades: 0, kind: 'future' });
                } else {
                    const d = byDate.get(key);
                    week.push({ date: key, mints: d?.mints ?? 0, trades: d?.trades ?? 0, kind: 'real' });
                }
            }
            if (week.length === 7) { weeks.push(week); week = []; }
            cursor.setUTCDate(cursor.getUTCDate() + 1);
            if (cursor > monthEnd && week.length > 0 && week.length < 7) {
                while (week.length < 7) week.push({ date: '', mints: 0, trades: 0, kind: 'blank' });
                weeks.push(week);
                week = [];
            }
        }

        const max = Math.max(1, ...days.map(total));
        return { weeks, monthLabels, max };
    }, [days]);

    if (days === null) {
        return (
            <div className="activity-hm-wrap">
                <div className="activity-hm-empty">LOADING THE LEDGER…</div>
            </div>
        );
    }

    if (days.length === 0) {
        return (
            <div className="activity-hm-wrap">
                <div className="activity-hm-empty">ACTIVITY APPEARS WITH THE FIRST MINT</div>
            </div>
        );
    }

    if (zoomDay) {
        const dayLabel = (() => {
            const d = new Date(`${zoomDay}T00:00:00Z`);
            return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
        })();
        const maxHour = hours ? Math.max(1, ...hours.map(total)) : 1;

        return (
            <div className="activity-hm-wrap">
                <button type="button" className="activity-hm-zoomout" onClick={zoomOut}>
                    {'\u2039\uFE0E'} ZOOM OUT — BACK TO CALENDAR
                </button>
                <div className="activity-hm-day-label">{dayLabel}</div>
                <div className="activity-hm-legend">
                    <span>UTC HOURS · TAP A BAR FOR THE SPLIT</span>
                </div>
                {loadingHours || !hours ? (
                    <div className="activity-hm-empty">LOADING THE HOUR…</div>
                ) : (
                    <div className="activity-hm-hours">
                        {hours.map((h) => {
                            const t = total(h);
                            return (
                                <div
                                    key={h.hour}
                                    className="activity-hm-hourcol"
                                    onClick={() => showToast(
                                        t > 0
                                            ? `${String(h.hour).padStart(2, '0')}:00 — ${h.mints} mint${h.mints === 1 ? '' : 's'} · ${h.trades} trade${h.trades === 1 ? '' : 's'}`
                                            : `${String(h.hour).padStart(2, '0')}:00 — quiet`
                                    )}
                                >
                                    <div
                                        className="activity-hm-hourbar"
                                        style={{ height: `${t === 0 ? 2 : Math.max(6, Math.round((t / maxHour) * 100))}%` }}
                                        data-level={levelFor(t, maxHour)}
                                    />
                                    <div className="activity-hm-hourtick">{h.hour % 3 === 0 ? String(h.hour).padStart(2, '0') : ''}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="activity-hm-wrap">
            <div className="activity-hm-legend">
                <span>LESS</span>
                {[0, 1, 2, 3, 4].map((lv) => (
                    <div key={lv} className="activity-hm-legend-cell" data-level={lv} />
                ))}
                <span>MORE</span>
            </div>
            {grid && (
                <div className="activity-hm-cal">
                    <div className="activity-hm-months">
                        {grid.monthLabels.map((m) => (
                            <span
                                key={`${m.label}-${m.weekIndex}`}
                                className="activity-hm-month"
                                style={{ gridColumnStart: m.weekIndex + 2 }}
                            >
                                {m.label}
                            </span>
                        ))}
                    </div>
                    <div className="activity-hm-grid-row">
                        <div className="activity-hm-weekdays">
                            {WEEKDAY_LETTERS.map((w, i) => (
                                <span key={i} className="activity-hm-weekday">{i % 2 === 1 ? w : ''}</span>
                            ))}
                        </div>
                        <div className="activity-hm-weeks">
                            {grid.weeks.map((week, wi) => (
                                <div key={wi} className="activity-hm-week">
                                    {week.map((d, di) => {
                                        if (d.kind === 'blank') {
                                            return <div key={di} className="activity-hm-cell activity-hm-cell-empty" />;
                                        }
                                        if (d.kind === 'future') {
                                            return <div key={di} className="activity-hm-cell activity-hm-cell-future" />;
                                        }
                                        return (
                                            <div
                                                key={di}
                                                className="activity-hm-cell"
                                                data-level={levelFor(total(d), grid.max)}
                                                onClick={() => openDay(d.date)}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            <div className="activity-hm-intro">
                One cell per day, darker means busier. Tap a day to zoom into
                its 24 hours; tap ZOOM OUT to come back.
            </div>
        </div>
    );
}
