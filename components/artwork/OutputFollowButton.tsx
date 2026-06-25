'use client';

/*
 * OutputFollowButton — the follow CTA for a single OUTPUT, mirroring
 * ProjectFollowButton. Follow / unfollow via /api/output-follows (SIWE-gated).
 *
 * The parent PROJECT always follows its own output (parental support, applied
 * at read time), so an output is never at 0 followers; this button is the
 * separate user→output follow on top of that.
 *
 * Fires 'pd:output-follows-changed' on every change so counts refresh.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';

export default function OutputFollowButton({
  outputId,
  label = 'output',
}: {
  /** Global output id, `{slug}-{tokenId}` (e.g. `oracle-234`). */
  outputId: string;
  /** Display name for the toast (the output's @name, e.g. @oracle234). */
  label?: string;
}) {
  const { siweAddress } = useAuth();
  const { showToast } = useToast();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  const me = siweAddress?.toLowerCase() ?? null;

  useEffect(() => {
    if (!me) { setFollowing(false); return; }
    let cancelled = false;
    fetch(`/api/output-follows?output=${encodeURIComponent(outputId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        const explicit = ((d.followers ?? []) as string[]).map((a) => a.toLowerCase());
        setFollowing(explicit.includes(me));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [outputId, me]);

  const toggle = async () => {
    if (!me) { showToast('Wallet: CONNECT TO FOLLOW'); return; }
    setBusy(true);
    try {
      if (following) {
        const r = await fetch(`/api/output-follows?output=${encodeURIComponent(outputId)}`, { method: 'DELETE' });
        if (r.ok) {
          setFollowing(false);
          showToast(`${label}: UNFOLLOWED`);
          window.dispatchEvent(new Event('pd:output-follows-changed'));
        } else {
          showToast('Unfollow: FAILED');
        }
      } else {
        const r = await fetch('/api/output-follows', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ output: outputId }),
        });
        if (r.status === 201) {
          setFollowing(true);
          showToast(`${label}: FOLLOWED`);
          window.dispatchEvent(new Event('pd:output-follows-changed'));
        } else {
          const j = await r.json().catch(() => ({}));
          showToast(j?.error ? String(j.error) : 'Follow: FAILED');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className="btn-mint btn-follow"
      title={following ? `Unfollow ${label}` : `Follow ${label}`}
      onClick={toggle}
      disabled={busy}
    >
      <span className="mint-lbl">{busy ? '…' : following ? 'FOLLOWING' : 'FOLLOW'}</span>
    </button>
  );
}
