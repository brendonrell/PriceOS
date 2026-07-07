'use client';

/*
 * ProfileAnointedPanel — content for the profile's existing "Anointed" +More
 * tab. Shows THIS profile's single Anointment: which project, through which
 * conduit Output, when placed, and whether the 60-day lock still holds.
 *
 * Reads GET /api/anoint?me={address} (anon — works for any profile). On your
 * OWN profile it adds the manage controls (withdraw once unlocked); placing /
 * moving a pledge happens on a project's Anointed tab, so the empty state points
 * there. Re-reads on pd:anoint-changed so it stays in sync with the project tab
 * and the PriceSprite modal socket.
 */

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../lib/state/ToastContext';
import { withdrawAnoint, type MyPledge } from '../../lib/anoint/useAnoint';

const VS15 = '︎';

function fmtDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ProfileAnointedPanel({
    address,
    handle,
    isOwnProfile,
}: {
    address: string;
    handle: string;
    isOwnProfile: boolean;
}) {
    const { showToast } = useToast();
    const [pledge, setPledge] = useState<MyPledge | null>(null);
    const [relics, setRelics] = useState<Array<{ project_id: string; output_token_id: string; votes: number }>>([]);
    const [loaded, setLoaded] = useState(false);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        const addr = address?.toLowerCase();
        if (!addr) return;
        fetch(`/api/anoint?me=${addr}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: { anointment?: MyPledge | null } | null) => setPledge(d?.anointment ?? null))
            .catch(() => {})
            .finally(() => setLoaded(true));
        // The clout badge — Prime Relics this wallet currently owns.
        fetch(`/api/anoint?relics_of=${addr}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: { relics?: Array<{ project_id: string; output_token_id: string; votes: number }> } | null) => {
                setRelics(d?.relics ?? []);
            })
            .catch(() => {});
    }, [address]);

    useEffect(() => {
        load();
        const onCh = () => load();
        window.addEventListener('pd:anoint-changed', onCh);
        return () => window.removeEventListener('pd:anoint-changed', onCh);
    }, [load]);

    const doWithdraw = async () => {
        setBusy(true);
        try {
            const res = await withdrawAnoint();
            if (res.ok) showToast('Anointment: WITHDRAWN');
            else if (res.lockedUntil) showToast(`Anointment: LOCKED until ${fmtDate(res.lockedUntil)}`);
            else showToast(`Anointment: ${(res.error ?? 'FAILED').toUpperCase()}`);
        } finally {
            setBusy(false);
        }
    };

    const who = isOwnProfile ? 'You have' : `${handle} has`;

    return (
        <div className="anoint-panel">
            <div className="more-section-header">{`✢${VS15}`} ANOINTMENT</div>
            <div className="more-box-wrap">
              <div className="more-box-card anoint-card">
                {/* Prime Relic clout badge — one per project this wallet owns
                    the top-voted conduit for (Brendon 2026-07-07 — lives in the
                    Anointed tab, not the profile header). */}
                {relics.length > 0 && (
                    <div className="anoint-clout">
                        <span className="anoint-clout-badge">PRIME RELIC {relics.length > 1 ? `HOLDER · ${relics.length}` : 'HOLDER'}</span>
                        <div className="anoint-clout-list">
                            {relics.map((r) => (
                                <a key={`${r.project_id}:${r.output_token_id}`} className="anoint-clout-item" href={`/art/${r.project_id}/${r.output_token_id}`}>
                                    @{r.project_id} #{r.output_token_id}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
                {!loaded ? (
                    <div className="anoint-note">Reading pledge…</div>
                ) : !pledge ? (
                    <div className="anoint-empty">
                        <span className="anoint-empty-mark">{`✢${VS15}`}</span>
                        <span className="anoint-empty-copy">
                            {who} not placed {isOwnProfile ? 'your' : 'their'} Anointment yet.
                            {isOwnProfile && ' Open any project’s Anointed tab to pledge it.'}
                        </span>
                    </div>
                ) : (
                    <>
                        <div className="anoint-note anoint-pledge-line">
                            {who} anointed <a href={`/art/${pledge.project_id}`}><strong>@{pledge.project_id}</strong></a>{' '}
                            through conduit <a href={`/art/${pledge.project_id}/${pledge.output_token_id}`}>#{pledge.output_token_id}</a>.
                        </div>
                        <div className="anoint-bar-labels anoint-pledge-meta">
                            <span>Placed {fmtDate(pledge.placed_at)}</span>
                            <span>{pledge.locked ? `LOCKED until ${fmtDate(pledge.unlocksAt)}` : 'UNLOCKED'}</span>
                        </div>
                        {isOwnProfile && (
                            <div className="anoint-actions">
                                <button
                                    type="button"
                                    className="btn-mint anoint-withdraw-btn"
                                    disabled={busy || pledge.locked}
                                    onClick={doWithdraw}
                                    title={pledge.locked ? 'Locked for 60 days from placement' : 'Withdraw your Anointment'}
                                >
                                    WITHDRAW
                                </button>
                            </div>
                        )}
                    </>
                )}
              </div>
            </div>
        </div>
    );
}
