'use client';

/*
 * UpdateWatcher — kills stale-bundle staleness for good (Brendon, 2026-07-08).
 *
 * The app is a single-page app + an installed PWA, so once the bundle is in
 * memory a new Cloudflare deploy is NOT picked up until a FULL reload — and an
 * installed PWA rarely gets one. Result: pushes land on the server but the
 * screen keeps showing the old build for hours.
 *
 * Fix: fingerprint the current build (the set of hashed /_next/static asset
 * URLs the live HTML references) and, whenever the user returns to the app or
 * on a slow interval, re-fetch the shell and compare. A different fingerprint
 * means a new deploy is live → hard-reload ONCE to swap onto it. No caching,
 * no version endpoint, no build tooling — the asset hashes already change every
 * deploy, so their signature IS the version.
 *
 * Safeguards: only fires while visible, only reloads on a real change (so no
 * loop — after the reload the signature matches the server), best-effort (a
 * failed fetch just leaves the current build up).
 */

import { useEffect } from 'react';

/** A stable signature of the deployed bundle = its sorted static-asset hashes. */
function bundleSignature(html: string): string {
    const refs = html.match(/\/_next\/static\/[^"']+/g);
    if (!refs || refs.length === 0) return '';
    return Array.from(new Set(refs)).sort().join('|');
}

export default function UpdateWatcher() {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        let baseline = '';
        let reloading = false;

        const fetchSignature = async (): Promise<string> => {
            try {
                const res = await fetch(window.location.pathname, { cache: 'no-store' });
                if (!res.ok) return '';
                return bundleSignature(await res.text());
            } catch {
                return '';
            }
        };

        const check = async () => {
            if (reloading || document.visibilityState !== 'visible') return;
            const sig = await fetchSignature();
            if (!sig) return;
            if (!baseline) { baseline = sig; return; }
            if (sig !== baseline) {
                reloading = true;
                window.location.reload();
            }
        };

        // Establish the baseline for THIS session, then watch.
        void fetchSignature().then((sig) => { if (sig) baseline = sig; });

        const onVisible = () => { if (document.visibilityState === 'visible') void check(); };
        const onFocus = () => { void check(); };
        // Re-check when the user comes back to the app (the natural swap moment)
        // plus a slow heartbeat so a foreground tab also catches a fresh deploy.
        const interval = window.setInterval(() => { void check(); }, 90_000);
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onFocus);

        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onFocus);
        };
    }, []);

    return null;
}
