'use client';

/*
 * UploadWindowCountdown — the live clock to an artist's next upload window
 * (Brendon, 2026-07-29). The 60-day cooldown starts at upload, so this ticks
 * down to the moment they can publish again.
 *
 * Two homes: the Studio dashboard, and the bottom of an artist's Created tab.
 * Give it a wallet and it resolves the cooldown itself off the artist read;
 * formatting is shared with the home news rail (lib/artists/window), so all
 * three surfaces always agree.
 *
 * Renders nothing when the window is already open — an expired countdown is
 * noise, and the Studio's publish section already states the chain-side checks.
 */

import { useEffect, useState } from 'react';
import { formatWindowRemaining } from '../../lib/artists/window';

export default function UploadWindowCountdown({
    address,
    label = 'Next upload window',
    tiles = false,
}: {
    /** The artist's wallet. Null / not-an-artist renders nothing. */
    address: string | null | undefined;
    label?: string;
    /* The profile's Cooldown tab wears the site's ORDINARY tab furniture —
       the square tile row + the bordered line block every other +More tab
       uses (Brendon, 2026-08-01). The Studio and the showcase keep the bar. */
    tiles?: boolean;
}) {
    const [opensAt, setOpensAt] = useState<number | null>(null);
    useEffect(() => {
        const addr = address?.toLowerCase();
        if (!addr) { setOpensAt(null); return; }
        let live = true;
        fetch(`/api/artist/${addr}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d: { cooldown_until?: string | null } | null) => {
                if (!live) return;
                const t = d?.cooldown_until ? Date.parse(d.cooldown_until) : NaN;
                setOpensAt(Number.isFinite(t) ? t : null);
            })
            .catch(() => { /* no countdown is a fine outcome */ });
        return () => { live = false; };
    }, [address]);

    /* Ticks every second. Null until the first tick so the server paint and the
       first client paint agree (the remaining time differs between them). */
    const [remaining, setRemaining] = useState<number | null>(null);
    useEffect(() => {
        if (opensAt == null) return;
        const tick = () => setRemaining(opensAt - Date.now());
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [opensAt]);

    if (opensAt == null || remaining == null || remaining <= 0) return null;

    const opensOn = new Date(opensAt).toLocaleDateString(undefined, {
        month: 'short', day: '2-digit', year: 'numeric',
    }).toUpperCase();

    if (tiles) {
        const s = Math.floor(remaining / 1000);
        const parts: [string, number][] = [
            ['DAYS', Math.floor(s / 86400)],
            ['HOURS', Math.floor((s % 86400) / 3600)],
            ['MINS', Math.floor((s % 3600) / 60)],
            ['SECS', s % 60],
        ];
        return (
            <div className="cd-panel" role="status">
                <div className="cpl-tiles cd-tiles">
                    {parts.map(([l, v]) => (
                        <div className="cpl-tile" key={l}>
                            <span className="cpl-tile-label">{l}</span>
                            <span className="cpl-tile-value">{v}</span>
                        </div>
                    ))}
                </div>
                <div className="vault-stat-lines">
                    <div className="vault-stat-line">{label.toUpperCase()} · {opensOn}</div>
                    <div className="vault-stat-line">STATUS · COOLING DOWN</div>
                </div>
            </div>
        );
    }

    return (
        <div className="upload-window" role="status">
            <span className="upload-window-label">{label}</span>
            <span className="upload-window-clock">{formatWindowRemaining(remaining)}</span>
            <span className="upload-window-date">{opensOn}</span>
        </div>
    );
}
