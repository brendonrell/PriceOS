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
 *
 * Restyled onto the Sigil tab's anatomy (Brendon, 2026-09-12) — the old
 * bespoke .anoint-card/.more-box-card look (still used verbatim by the
 * project-page Anointed tab, ProjectAnointPanel — untouched) is swapped here
 * for .ach-section/.attr-group/.attr-grid/.starred-row, the same "character
 * sheet" reuse Loyalty and Counterparties already share with Sigil.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
    const router = useRouter();
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
        <div className="ach-section cp-section anoint-section">
            {!loaded && <div className="nbhd-note">Reading the pledge<span className="nbhd-ellipsis">…</span></div>}

            {loaded && (
                <>
                    {/* PRIME RELICS — the clout badge, same starred-row grammar
                       as Sigil's Kin / Loyalty's Artists You Back. */}
                    {relics.length > 0 && (
                        <section className="attr-group" aria-label="Prime relics">
                            <div className="attr-group-head">
                                <span className="attr-group-name">Prime relics · clout</span>
                                <span className="attr-group-count">{relics.length}</span>
                            </div>
                            <div className="starred-rows loy-rows">
                                {relics.map((r) => (
                                    <div
                                        key={`${r.project_id}:${r.output_token_id}`}
                                        className="starred-row"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => router.push(`/art/${r.project_id}/${r.output_token_id}`)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/art/${r.project_id}/${r.output_token_id}`); } }}
                                    >
                                        <div className="trait-row-tile artist-tile">
                                            <span className="artist-row-tile-glyph">{`✢${VS15}`}</span>
                                        </div>
                                        <div className="starred-row-meta">
                                            <span className="starred-row-id">@{r.project_id}<em>{` #${r.output_token_id}`}</em></span>
                                            <span className="starred-row-sub">{r.votes} {r.votes === 1 ? 'vote' : 'votes'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* THE PLEDGE — Sigil's "unforged" empty-state pattern for
                       no pledge yet, an attr-group + one starred-row for a
                       placed one. */}
                    {!pledge ? (
                        <div className="nbhd-note">
                            {`NOT PLACED — ${isOwnProfile ? 'you have' : `${who.toLowerCase()}`} not placed ${isOwnProfile ? 'your' : 'their'} Anointment yet.${isOwnProfile ? ` Open any project's Anointed tab to pledge it.` : ''}`}
                        </div>
                    ) : (
                        <section className="attr-group" aria-label="Anointment">
                            <div className="attr-group-head">
                                <span className="attr-group-name">Anointment</span>
                                <span className="attr-group-count">{pledge.locked ? 'LOCKED' : 'UNLOCKED'}</span>
                            </div>
                            <div className="starred-rows loy-rows">
                                <div
                                    className="starred-row"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => router.push(`/art/${pledge.project_id}/${pledge.output_token_id}`)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/art/${pledge.project_id}/${pledge.output_token_id}`); } }}
                                >
                                    <div className="trait-row-tile artist-tile">
                                        <span className="artist-row-tile-glyph">{`✢${VS15}`}</span>
                                    </div>
                                    <div className="starred-row-meta">
                                        <span className="starred-row-id">@{pledge.project_id}<em>{` #${pledge.output_token_id}`}</em></span>
                                        <span className="starred-row-sub">
                                            placed {fmtDate(pledge.placed_at)}
                                            {pledge.locked ? ` · LOCKED until ${fmtDate(pledge.unlocksAt)}` : ' · UNLOCKED'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {isOwnProfile && (
                                <button
                                    type="button"
                                    className={`btn-mint anoint-withdraw-btn${pledge.locked ? ' locked' : ''}`}
                                    disabled={busy || pledge.locked}
                                    onClick={doWithdraw}
                                    title={pledge.locked ? `Locked until ${fmtDate(pledge.unlocksAt)}` : 'Withdraw your Anointment'}
                                >
                                    {pledge.locked ? `LOCKED UNTIL ${fmtDate(pledge.unlocksAt)}` : 'WITHDRAW'}
                                </button>
                            )}
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
