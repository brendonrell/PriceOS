'use client';

/*
 * DevLoginButton — small fixed "Login Brendon" button for the dev
 * preview only. Lets Brendon test the logged-in app on desktop without
 * a wallet. The normal wallet sign-in is untouched (mobile still uses
 * it for real wallet testing).
 *
 * Rendering is gated in layout.tsx to non-production deploys, and the
 * /api/auth/dev-login route it calls is gated server-side too — so this
 * never appears or works on production. CSS hides it on mobile (this is
 * a desktop convenience; mobile uses the real wallet).
 *
 * On click: POST the shortcut login, then full-page reload so the
 * provider tree re-boots already authenticated as Brendon (same path a
 * real returning-session reload takes).
 */

import { useState } from 'react';

export function DevLoginButton() {
    const [busy, setBusy] = useState(false);

    const handleClick = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const res = await fetch('/api/auth/dev-login', {
                method: 'POST',
                credentials: 'same-origin',
            });
            if (res.ok) {
                window.location.reload();
                return;
            }
        } catch {
            /* fall through to re-enable the button */
        }
        setBusy(false);
    };

    return (
        <button
            type="button"
            className="pd-dev-login"
            onClick={handleClick}
            disabled={busy}
            aria-label="Log in as Brendon (dev only)"
            title="Log in as Brendon — dev preview only"
        >
            {busy ? 'Logging in…' : 'Login Brendon'}
        </button>
    );
}
