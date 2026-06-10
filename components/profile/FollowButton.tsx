'use client';

/*
 * FollowButton — the profile CTA. Follow / unfollow a User via /api/follows
 * (SIWE-gated; @name-keyed). Hidden on your own profile. Fires
 * 'pd:follows-changed' so follower/following counts refresh.
 *
 * Note: following requires both parties to have claimed an @name (handle).
 * A 204 from the API means the target hasn't claimed one yet — surfaced to
 * the user rather than silently "succeeding".
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';

export default function FollowButton({
  targetAddress,
  targetHandle,
}: {
  targetAddress: string;
  targetHandle?: string | null;
}) {
  const { siweAddress } = useAuth();
  const { showToast } = useToast();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  const me = siweAddress?.toLowerCase() ?? null;
  const target = targetAddress.toLowerCase();
  const isSelf = me === target;
  const label = targetHandle ? `@${targetHandle}` : 'wallet';

  useEffect(() => {
    if (!me || isSelf) return;
    let cancelled = false;
    fetch(`/api/follows/${target}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        const followers = ((d.followers ?? []) as string[]).map((a) => a.toLowerCase());
        setFollowing(followers.includes(me));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [me, target, isSelf]);

  if (isSelf) return null;

  const toggle = async () => {
    if (!me) { showToast('Wallet: CONNECT TO FOLLOW'); return; }
    setBusy(true);
    try {
      if (following) {
        const r = await fetch(`/api/follows?target=${target}`, { method: 'DELETE' });
        if (r.ok) {
          setFollowing(false);
          showToast(`${label}: UNFOLLOWED`);
          window.dispatchEvent(new Event('pd:follows-changed'));
        } else {
          showToast('Unfollow: FAILED');
        }
      } else {
        const r = await fetch('/api/follows', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ target }),
        });
        if (r.status === 201) {
          setFollowing(true);
          showToast(`${label}: FOLLOWED`);
          window.dispatchEvent(new Event('pd:follows-changed'));
        } else if (r.status === 204) {
          showToast(`${label}: NO @NAME YET`);
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
