'use client';

/*
 * SoundtrackManager — the artist's live-Project soundtrack control, one row
 * per analytics card (studio-phase2 #3). Paste a public YouTube playlist
 * (URL or bare id), the same public check the workbench runs, SAVE writes
 * through the artist-wallet-gated route. The server is the enforcement;
 * this row just tells the truth about it.
 */

import { useEffect, useState } from 'react';
import { useToast } from '../../lib/state/ToastContext';
import { normalizePlaylistId } from '../../lib/project/soundtrack';

export function SoundtrackManager({ slug }: { slug: string }) {
    const { showToast } = useToast();
    const [value, setValue] = useState('');
    const [check, setCheck] = useState<'idle' | 'checking' | 'public' | 'bad'>('idle');
    /* v2 (2026-07-27): the server now answers "will this PLAY in the
       miniplayer" (live-video count + first-track embeddability), not just
       "is it public" — with a reason when it won't. */
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    const playlistId = normalizePlaylistId(value);
    useEffect(() => {
        if (!playlistId) { setCheck('idle'); setReason(''); return; }
        let cancel = false;
        setCheck('checking');
        setReason('');
        const t = window.setTimeout(() => {
            fetch(`/api/studio/playlist?list=${encodeURIComponent(playlistId)}`)
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => {
                    if (cancel) return;
                    setCheck(d?.public === true ? 'public' : d?.public === false ? 'bad' : 'idle');
                    setReason(typeof d?.reason === 'string' ? d.reason : '');
                })
                .catch(() => { if (!cancel) setCheck('idle'); });
        }, 600);
        return () => { cancel = true; window.clearTimeout(t); };
    }, [playlistId]);

    const save = async () => {
        if (!playlistId || saving) return;
        setSaving(true);
        try {
            const r = await fetch('/api/studio/soundtrack', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, playlist: value }),
            });
            if (r.ok) {
                setValue('');
                showToast('Soundtrack: UPDATED');
            } else if (r.status === 403) {
                showToast('Soundtrack: ARTIST ONLY');
            } else {
                showToast('Soundtrack: TRY AGAIN');
            }
        } catch {
            showToast('Soundtrack: TRY AGAIN');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="pd-studio-strack">
            <label className="pd-studio-label" htmlFor={`strack-${slug}`}>
                Soundtrack — swap the public YouTube playlist
            </label>
            <div className="pd-studio-strack-row">
                <input
                    id={`strack-${slug}`}
                    className="pd-studio-input"
                    placeholder="youtube.com/playlist?list=…"
                    inputMode="url"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                />
                <button
                    type="button"
                    className="pd-studio-btn primary pd-studio-strack-save"
                    disabled={!playlistId || check === 'bad' || saving}
                    onClick={() => void save()}
                >
                    {saving ? 'SAVING…' : 'SAVE'}
                </button>
            </div>
            {check !== 'idle' && (
                <p className="pd-studio-note" role="status">
                    {check === 'checking' && 'Playlist: checking…'}
                    {check === 'public' && 'Playlist: PLAYS ✓'}
                    {check === 'bad' && `Playlist: WON'T PLAY${reason ? ` — ${reason}` : ''}`}
                </p>
            )}
        </div>
    );
}
