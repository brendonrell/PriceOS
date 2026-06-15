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
import { useModal } from '../../lib/state/ModalContext';
import { openExternal } from '../../lib/pwa/openExternal';
import { DISCORD_URL } from '../../lib/config/discord';

/* Own-profile CTA threshold: show "Mutuals" only once the circle is real
   (≥3 mutuals); below that the slot becomes the "Discord" join button. */
const MUTUALS_MIN = 3;

export default function FollowButton({
  targetAddress,
  targetHandle,
}: {
  targetAddress: string;
  targetHandle?: string | null;
}) {
  const { siweAddress } = useAuth();
  const { showToast } = useToast();
  const { open } = useModal();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mutualsCount, setMutualsCount] = useState<number | null>(null);

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

  /* Own profile: count my mutuals (same source the Followers modal uses —
     the people I follow who also follow me). Drives the CTA's two states.
     Refreshes whenever the follow graph changes anywhere. */
  useEffect(() => {
    if (!me || !isSelf) return;
    let cancelled = false;
    const load = () => {
      fetch(`/api/follows/${me}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled || !d) return;
          const following = (Array.isArray(d.following_handles) ? d.following_handles : [])
            .map((h: string) => h.toLowerCase());
          const followers = new Set(
            (Array.isArray(d.follower_handles) ? d.follower_handles : []).map((h: string) => h.toLowerCase())
          );
          setMutualsCount(following.filter((h: string) => followers.has(h)).length);
        })
        .catch(() => { if (!cancelled) setMutualsCount(0); });
    };
    load();
    const h = () => load();
    window.addEventListener('pd:follows-changed', h);
    return () => { cancelled = true; window.removeEventListener('pd:follows-changed', h); };
  }, [me, isSelf]);

  /* Own profile keeps a CTA in the follow slot. ≥3 mutuals → "Mutuals"
     (opens the Followers modal on the Mutuals tab); otherwise → "Discord"
     (the standard join-the-chat link). */
  if (isSelf) {
    if ((mutualsCount ?? 0) >= MUTUALS_MIN) {
      return (
        <button
          type="button"
          className="btn-mint btn-follow"
          title="Your mutuals"
          onClick={() => open('followers', 'mutuals')}
        >
          <span className="mint-lbl">MUTUALS</span>
        </button>
      );
    }
    return (
      <button
        type="button"
        className="btn-mint btn-follow"
        title="Join the chat on Discord"
        onClick={() => openExternal(DISCORD_URL)}
      >
        <span className="mint-lbl">DISCORD</span>
      </button>
    );
  }

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
