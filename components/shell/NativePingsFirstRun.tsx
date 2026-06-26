'use client';

/*
 * NativePingsFirstRun — the one-time "enable 3D Pingtoasts" ask, tied to the
 * moment PD first runs as an installed app.
 *
 * Brendon, 2026-06-26: the first time someone launches PD from their home
 * screen, prompt them to turn on native notifications — framed around the
 * add-to-home-screen they just did. If they decline, they re-enable any time via
 * the Pingtoasts pill in MY PINGS. Shown ONCE per device (localStorage flag).
 *
 * Gates (all must hold): running standalone, Web Push supported, permission not
 * already decided, signed in (the subscribe route is SIWE-gated), and not asked
 * before. Reuses the centred confirm-card markup (the mint/unstar confirm) so it
 * looks native to PD.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { isStandalone } from '../../lib/pwa/platform';
import { nativePushSupported, enableNativePings, getNativeStatus } from '../../lib/push/client';

const ASKED_KEY = 'pd_3d_firstrun_asked';

export default function NativePingsFirstRun() {
  const { siweAddress } = useAuth();
  const { showToast } = useToast();
  const { notifs, update } = usePdNotifs();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!siweAddress) return;
    if (!isStandalone() || !nativePushSupported()) return;
    let cancelled = false;
    try {
      if (localStorage.getItem(ASKED_KEY) === '1') return;
    } catch {
      return;
    }
    // Only ask if the user hasn't already decided on notifications.
    getNativeStatus().then((s) => {
      if (cancelled) return;
      if (s.permission !== 'default' || s.subscribed) return;
      // Small delay so it lands after the app paints, not on the cold frame.
      const t = window.setTimeout(() => { if (!cancelled) setOpen(true); }, 1200);
      return () => window.clearTimeout(t);
    });
    return () => { cancelled = true; };
  }, [siweAddress]);

  const markAsked = () => {
    try { localStorage.setItem(ASKED_KEY, '1'); } catch { /* ignore */ }
  };

  const decline = () => {
    markAsked();
    setOpen(false);
  };

  const enable = async () => {
    setBusy(true);
    const result = await enableNativePings();
    markAsked();
    setBusy(false);
    setOpen(false);
    if (result === 'enabled') {
      // Fold native on: keep regular toasts if they were on (→ COMBO), else 3D.
      update({ pingToasts: notifs.pingToasts === 'on' ? 'combo' : '3d' });
      showToast('3D Pingtoasts: ON');
    } else if (result === 'denied') {
      showToast('3D Pingtoasts: BLOCKED');
    } else if (result !== 'unsupported') {
      showToast('3D Pingtoasts: FAILED');
    }
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="starred-confirm-overlay" role="dialog" aria-modal="true" onClick={decline}>
      <div className="ms-confirm-card is-centered" onClick={(e) => e.stopPropagation()}>
        <div className="ms-confirm-question">
          PD&rsquo;s on your home screen — turn on <b>3D Pingtoasts</b>?
          <div className="ms-confirm-sub">
            Real notifications on your lock screen the moment a ping lands — even when PD is closed.
          </div>
        </div>
        <div className="ms-confirm-btns">
          <button type="button" className="ms-confirm-btn ms-confirm-btn--cancel" onClick={decline} disabled={busy}>
            Not now
          </button>
          <button type="button" className="ms-confirm-btn ms-confirm-btn--ok" onClick={() => void enable()} disabled={busy}>
            {busy ? '…' : 'Enable'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
