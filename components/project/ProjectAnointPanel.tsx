'use client';

/*
 * ProjectAnointPanel — the Project page's "Anointed" tab (a +More sub-tab,
 * same name as the profile's existing Anointed tab). Everything anointment for
 * THIS project lives here (Brendon 2026-07-07 — "put it all there, tucked away").
 *
 * Shows the project's standing (level Dormant/Cult/Egregore + progress + count),
 * the Prime Relic (the Output with the most conduit votes + its owner), and the
 * viewer's own action: place their one Anointment here (picking a conduit
 * Output), change the conduit, move it here from another project, or withdraw —
 * all lock-gated server-side. The Egregore treatment shows once a project hits
 * Level 2.
 *
 * Backend: app/api/anoint/route.ts. Client: lib/anoint/useAnoint.ts.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useProject } from '../../lib/state/ProjectContext';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import { useDragScroll } from '../../lib/hooks/useDragScroll';
import {
    useProjectAnoint,
    useMyAnoint,
    placeAnoint,
    withdrawAnoint,
} from '../../lib/anoint/useAnoint';

const VS15 = '︎';

/** Human date for a placed/unlock timestamp — "Jul 7, 2026". */
function fmtDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ProjectAnointPanel() {
    const project = useProject();
    const { siweAddress } = useAuth();
    const { showToast } = useToast();
    const { standing } = useProjectAnoint(project.slug);
    const { pledge } = useMyAnoint();

    const outputIds = useMemo(
        () => [...project.outputs.keys()].sort((a, b) => a - b),
        [project.outputs],
    );

    const pledgedHere = !!pledge && pledge.project_id === project.slug;
    const pledgedElsewhere = !!pledge && pledge.project_id !== project.slug;

    /* Selected conduit — preselects the viewer's existing conduit when their
       pledge is already on this project (applied once, so a later manual pick
       for "change conduit" isn't clobbered), otherwise the first Output. */
    const [conduit, setConduit] = useState<number | null>(null);
    const appliedPledgeConduit = useRef(false);
    useEffect(() => {
        if (pledgedHere && !appliedPledgeConduit.current) {
            setConduit(Number(pledge!.output_token_id));
            appliedPledgeConduit.current = true;
        } else if (conduit === null && outputIds.length > 0) {
            setConduit(outputIds[0]);
        }
    }, [pledgedHere, pledge, outputIds, conduit]);

    const [busy, setBusy] = useState(false);
    const conduitRowRef = useDragScroll<HTMLDivElement>();

    const level = standing?.level ?? 0;
    const levelName = standing?.levelName ?? 'Dormant';
    const count = standing?.count ?? 0;
    const nextThreshold = standing?.nextThreshold ?? null;
    const pct = Math.max(2, Math.round((standing?.progress ?? 0) * 100));
    const remaining = nextThreshold === null ? 0 : Math.max(0, nextThreshold - count);

    const doPlace = async () => {
        if (!siweAddress) { showToast('Anointment: CONNECT WALLET'); return; }
        if (conduit === null) { showToast('Anointment: PICK A CONDUIT'); return; }
        setBusy(true);
        try {
            const res = await placeAnoint(project.slug, String(conduit));
            if (res.ok) {
                showToast(`Anointment: ${res.moved ? 'MOVED HERE' : 'PLACED'} · via #${conduit}`);
            } else if (res.lockedUntil) {
                showToast(`Anointment: LOCKED until ${fmtDate(res.lockedUntil)}`);
            } else {
                showToast(`Anointment: ${(res.error ?? 'FAILED').toUpperCase()}`);
            }
        } finally {
            setBusy(false);
        }
    };

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

    /* The action button's label + handler shift with the viewer's state. */
    const primaryLabel = pledgedHere
        ? (conduit !== null && Number(pledge!.output_token_id) !== conduit ? 'CHANGE CONDUIT' : 'ANOINTED HERE')
        : pledgedElsewhere
            ? 'MOVE ANOINTMENT HERE'
            : 'PLACE ANOINTMENT';
    const primaryDisabled = busy || (pledgedHere && Number(pledge!.output_token_id) === conduit);

    return (
        <div className="anoint-panel">
            <div className="more-section-header">
                {`✢${VS15}`} ANOINTMENT
            </div>

            <div className="more-box-wrap">
              <div className="more-box-card anoint-card">

                {/* Level + count */}
                <div className="anoint-level-row">
                    <span className={`anoint-level-name anoint-level-${level}`}>{levelName.toUpperCase()}</span>
                    <span className="anoint-count">{count.toLocaleString()} {count === 1 ? 'ANOINTMENT' : 'ANOINTMENTS'}</span>
                </div>

                {/* Progress to next level */}
                <div className="anoint-bar">
                    <div className="anoint-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="anoint-bar-labels">
                    <span>{levelName}</span>
                    <span>
                        {nextThreshold === null
                            ? 'EGREGORE — APEX'
                            : `${remaining.toLocaleString()} → ${level === 0 ? 'The Cult' : 'The Egregore'}`}
                    </span>
                </div>

                {/* Prime Relic — the Output with the most conduit votes */}
                {standing?.primeRelic ? (
                    <div className="anoint-relic">
                        <span className="anoint-relic-label">PRIME RELIC</span>
                        <a className="anoint-relic-body" href={`/art/${project.slug}/${standing.primeRelic.output_token_id}`}>
                            <span className="anoint-relic-id">#{standing.primeRelic.output_token_id}</span>
                            <span className="anoint-relic-owner">
                                {standing.primeRelic.owner_handle
                                    ? `@${standing.primeRelic.owner_handle}`
                                    : (standing.primeRelic.owner_address
                                        ? `${standing.primeRelic.owner_address.slice(0, 6)}…${standing.primeRelic.owner_address.slice(-4)}`
                                        : 'unclaimed')}
                            </span>
                            <span className="anoint-relic-votes">{standing.primeRelic.votes} {standing.primeRelic.votes === 1 ? 'VOTE' : 'VOTES'}</span>
                        </a>
                    </div>
                ) : (
                    <div className="anoint-relic anoint-relic-empty">
                        <span className="anoint-relic-label">PRIME RELIC</span>
                        <span className="anoint-relic-none">none yet — the first conduit vote crowns it</span>
                    </div>
                )}

                {/* Egregore treatment — Level 2 only */}
                {level >= 2 && (
                    <div className="anoint-egregore" aria-hidden="true">
                        <span className="anoint-egregore-deity">{`⍎${VS15}`}</span>
                        <span className="anoint-egregore-copy">THE EGREGORE IS AWAKE</span>
                    </div>
                )}

                {/* Where the viewer's pledge currently sits, if elsewhere */}
                {pledgedElsewhere && (
                    <div className="anoint-note">
                        Your Anointment is on <strong>@{pledge!.project_id}</strong>
                        {pledge!.locked ? ` — locked until ${fmtDate(pledge!.unlocksAt)}` : ' — unlocked, free to move'}.
                    </div>
                )}
                {pledgedHere && (
                    <div className="anoint-note">
                        Your Anointment is <strong>here</strong>, via conduit #{pledge!.output_token_id}
                        {pledge!.locked ? ` — locked until ${fmtDate(pledge!.unlocksAt)}` : ' — unlocked'}.
                    </div>
                )}

                {/* Conduit picker — pick the Output that carries your vote */}
                <div className="anoint-conduit-label">CONDUIT · pick an Output</div>
                <div className="anoint-conduit-row" ref={conduitRowRef}>
                    {outputIds.map((id) => (
                        <button
                            key={id}
                            type="button"
                            className={`anoint-conduit-chip${conduit === id ? ' selected' : ''}`}
                            onClick={() => setConduit(id)}
                        >
                            #{id}
                        </button>
                    ))}
                </div>

                {/* Primary action */}
                <div className="anoint-actions">
                    <button
                        type="button"
                        className="btn-mint anoint-place-btn"
                        disabled={primaryDisabled}
                        onClick={doPlace}
                    >
                        {`✢${VS15}`} {primaryLabel}
                    </button>
                    {pledgedHere && (
                        <button
                            type="button"
                            className="btn-mint anoint-withdraw-btn"
                            disabled={busy}
                            onClick={doWithdraw}
                        >
                            WITHDRAW
                        </button>
                    )}
                </div>

                <div className="anoint-fine">
                    One Anointment per account — a Pledge of Fealty, not a like. Moving it
                    to another project removes your point here. Locks 60 days once placed.
                </div>

              </div>
            </div>
        </div>
    );
}
