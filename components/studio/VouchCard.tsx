'use client';

/*
 * VouchCard — a whitelisted artist's two vouch slots in the Studio (the
 * artist batch, 2026-07-13). Renders nothing for everyone else: the server
 * self-read says whether the section exists at all, so non-artists never
 * see a locked door.
 */

import { useEffect, useState } from 'react';
import { useToast } from '../../lib/state/ToastContext';

interface VouchState {
    is_artist: boolean;
    slots: number;
    used: number;
    vouches: { vouched: string; note: string | null; created_at: string }[];
}

export function VouchCard({ address }: { address: string | null }) {
    const { showToast } = useToast();
    const [state, setState] = useState<VouchState | null>(null);
    const [who, setWho] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!address) { setState(null); return; }
        let live = true;
        fetch('/api/studio/vouch')
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (live && d) setState(d as VouchState); })
            .catch(() => {});
        return () => { live = false; };
    }, [address]);

    if (!address || !state?.is_artist) return null;
    const left = Math.max(0, state.slots - state.used);

    const submit = async () => {
        if (!who.trim() || busy) return;
        setBusy(true);
        try {
            const r = await fetch('/api/studio/vouch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ who: who.trim(), note: note.trim() }),
            });
            const j = (await r.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
            if (j?.ok) {
                setState((s) => s ? {
                    ...s,
                    used: s.used + 1,
                    vouches: [...s.vouches, { vouched: who.trim(), note: note.trim() || null, created_at: new Date().toISOString() }],
                } : s);
                setWho('');
                setNote('');
                showToast('Vouch: SENT');
            } else {
                showToast(`Vouch: ${(j?.error ?? 'try again').toUpperCase()}`);
            }
        } catch {
            showToast('Vouch: TRY AGAIN');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="pd-studio-section">
            <div className="pd-studio-section-title">Vouch — send an artist through the door</div>
            <p className="pd-studio-note">
                You hold {state.slots} vouch slots ({left} left). Put an artist forward for
                the filter — a vouch goes straight to the founder&apos;s desk. It opens the
                conversation, not the gate.
            </p>
            {state.vouches.map((v) => (
                <div key={v.vouched} className="pd-studio-row">
                    <span className="pd-studio-row-name">{v.vouched}</span>
                    <span className="pd-studio-row-stat">VOUCHED</span>
                </div>
            ))}
            {left > 0 && (
                <>
                    <label className="pd-studio-label" htmlFor="pdVouchWho">Who — handle, site, or contact</label>
                    <input
                        id="pdVouchWho"
                        className="pd-studio-input"
                        placeholder="@artist · their site · their email"
                        value={who}
                        maxLength={120}
                        onChange={(e) => setWho(e.target.value)}
                    />
                    <label className="pd-studio-label" htmlFor="pdVouchNote">Why them (optional)</label>
                    <input
                        id="pdVouchNote"
                        className="pd-studio-input"
                        placeholder="one line on the work"
                        value={note}
                        maxLength={280}
                        onChange={(e) => setNote(e.target.value)}
                    />
                    <button
                        type="button"
                        className="pd-studio-btn primary"
                        disabled={!who.trim() || busy}
                        onClick={() => void submit()}
                    >
                        {busy ? 'SENDING…' : 'SEND THE VOUCH'}
                    </button>
                </>
            )}
        </div>
    );
}
