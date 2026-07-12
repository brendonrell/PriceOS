'use client';

/*
 * ArtistPush — the Studio perk control, one per live Project card.
 *
 * An artist gets ONE ping per month per Project to ALL its holders, preset
 * messages only. The row shows availability plainly: pick a preset → SEND
 * arms into a CONFIRM (holder count shown) → sends. On cooldown the row says
 * exactly when the next push unlocks. All limits are enforced server-side —
 * this control just tells the truth about them.
 */

import { useEffect, useState } from 'react';
import { useToast } from '../../lib/state/ToastContext';
import { ARTIST_PUSH_PRESETS } from '../../lib/pings/artistPushPresets';

interface Status {
    holders: number;
    last_push_at: string | null;
    next_available_at: string | null;
}

function fmtDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ArtistPush({ slug }: { slug: string }) {
    const { showToast } = useToast();
    const [status, setStatus] = useState<Status | null>(null);
    const [preset, setPreset] = useState(ARTIST_PUSH_PRESETS[0].id);
    const [armed, setArmed] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        let live = true;
        fetch(`/api/project/${slug}/artist-push`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => { if (live && j) setStatus(j as Status); })
            .catch(() => {});
        return () => { live = false; };
    }, [slug]);

    if (!status) return null;

    const coolingDown = !!status.next_available_at;

    const send = async () => {
        if (!armed) { setArmed(true); return; }
        setSending(true);
        try {
            const r = await fetch(`/api/project/${slug}/artist-push`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ preset }),
            });
            const j = (await r.json()) as { sent?: number; next_available_at?: string };
            if (r.ok) {
                showToast(`Artist Push: SENT · ${j.sent ?? 0} holders`);
                setStatus({
                    ...status,
                    last_push_at: new Date().toISOString(),
                    next_available_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
                });
            } else if (r.status === 429 && j.next_available_at) {
                showToast(`Artist Push: NEXT ${fmtDate(j.next_available_at)}`);
                setStatus({ ...status, next_available_at: j.next_available_at });
            } else {
                showToast('Artist Push: FAILED');
            }
        } catch {
            showToast('Artist Push: FAILED');
        } finally {
            setSending(false);
            setArmed(false);
        }
    };

    return (
        <div className="pd-studio-apush">
            <span className="pd-studio-apush-label">✺︎ ARTIST PUSH</span>
            {coolingDown ? (
                <span className="pd-studio-apush-next">
                    used — next {fmtDate(status.next_available_at as string)}
                </span>
            ) : (
                <>
                    <select
                        className="pd-studio-apush-select"
                        value={preset}
                        onChange={(e) => { setPreset(e.target.value); setArmed(false); }}
                        aria-label="Artist Push preset"
                    >
                        {ARTIST_PUSH_PRESETS.map((p) => (
                            <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        className={`pd-studio-btn${armed ? ' primary' : ''}`}
                        disabled={sending || status.holders === 0}
                        title={status.holders === 0 ? 'No holders yet' : 'One push per month per project'}
                        onClick={() => void send()}
                    >
                        {sending ? 'SENDING…' : armed ? `CONFIRM · ${status.holders} HOLDERS` : 'SEND'}
                    </button>
                </>
            )}
        </div>
    );
}
