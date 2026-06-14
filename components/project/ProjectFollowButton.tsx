'use client';

/*
 * ProjectFollowButton — the Twitter-style follow CTA for a PROJECT, mirroring
 * the user FollowButton. Follow / unfollow via /api/project-follows (SIWE-gated).
 *
 * NOTE on the auto-follow mechanic (Brendon 2026-06-14): holding a piece makes
 * the PROJECT follow YOU (the holder appears in the project's FOLLOWING, and the
 * project shows up among the holder's FOLLOWERS) — dump the bag and it unfollows
 * you. That's a separate graph edge and does NOT change this button: a user can
 * still choose to follow the project itself, holder or not. So this stays a
 * plain follow/unfollow toggle.
 *
 * Fires 'pd:project-follows-changed' on every change so counts + the followers
 * modal refresh.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';

export default function ProjectFollowButton({
  projectId,
  projectHandle,
}: {
  /** Project id OR @handle — whatever the page already has. */
  projectId: string;
  projectHandle?: string | null;
}) {
  const { siweAddress } = useAuth();
  const { showToast } = useToast();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  const me = siweAddress?.toLowerCase() ?? null;
  const label = projectHandle ? `@${projectHandle}` : 'project';

  useEffect(() => {
    if (!me) { setFollowing(false); return; }
    let cancelled = false;
    fetch(`/api/project-follows/${encodeURIComponent(projectId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        const explicit = ((d.followers ?? []) as string[]).map((a) => a.toLowerCase());
        setFollowing(explicit.includes(me));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [projectId, me]);

  const toggle = async () => {
    if (!me) { showToast('Wallet: CONNECT TO FOLLOW'); return; }
    setBusy(true);
    try {
      if (following) {
        const r = await fetch(`/api/project-follows?project=${encodeURIComponent(projectId)}`, { method: 'DELETE' });
        if (r.ok) {
          setFollowing(false);
          showToast(`${label}: UNFOLLOWED`);
          window.dispatchEvent(new Event('pd:project-follows-changed'));
        } else {
          showToast('Unfollow: FAILED');
        }
      } else {
        const r = await fetch('/api/project-follows', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ project: projectId }),
        });
        if (r.status === 201) {
          setFollowing(true);
          showToast(`${label}: FOLLOWED`);
          window.dispatchEvent(new Event('pd:project-follows-changed'));
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
